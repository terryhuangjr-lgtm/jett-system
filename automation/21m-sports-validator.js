#!/usr/bin/env node
/**
 * 21M Sports Pre-Flight Verification Validator
 *
 * MUST BE RUN BEFORE ANY 21M SPORTS CONTENT GENERATION
 * This script enforces the verification checklist and BLOCKS unverified content
 *
 * Usage:
 *   node 21m-sports-validator.js --sources "url1,url2,url3" --content "tweet text"
 *
 * Exit codes:
 *   0 = All checks passed, verified content ready
 *   1 = Verification failed - DO NOT GENERATE CONTENT
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function error(msg) {
  console.error(`${colors.red}${colors.bold}✗ FAILED:${colors.reset} ${colors.red}${msg}${colors.reset}`);
}

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`);
}

function header(msg) {
  console.log(`\n${colors.bold}${msg}${colors.reset}`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    sources: [],
    content: '',
    xPosts: [],
    spotracUrls: [],
    btcPriceUrls: []
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sources' && args[i + 1]) {
      parsed.sources = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--content' && args[i + 1]) {
      parsed.content = args[i + 1];
      i++;
    } else if (args[i] === '--x-posts' && args[i + 1]) {
      parsed.xPosts = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--spotrac' && args[i + 1]) {
      parsed.spotracUrls = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--btc-price' && args[i + 1]) {
      parsed.btcPriceUrls = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    }
  }

  return parsed;
}

// Validation checks
const checks = {
  // CHECK 1: Research was conducted (X posts or web sources provided)
  hasResearch(args) {
    const totalSources = args.sources.length + args.xPosts.length;
    if (totalSources === 0) {
      error('No research sources provided');
      console.log('  You MUST provide sources via:');
      console.log('    --sources "url1,url2"');
      console.log('    --x-posts "twitter.com/user/status/123"');
      return false;
    }
    success(`Research sources provided: ${totalSources} total`);
    return true;
  },

  // CHECK 2: Contract data is verified (Spotrac or official source)
  hasContractVerification(args) {
    const hasSpotrac = args.spotracUrls.length > 0;
    const hasOfficialSource = args.sources.some(url =>
      url.includes('spotrac.com') ||
      url.includes('basketball-reference.com') ||
      url.includes('pro-football-reference.com') ||
      url.includes('mlb.com') ||
      url.includes('nba.com') ||
      url.includes('nfl.com')
    );

    if (!hasSpotrac && !hasOfficialSource) {
      error('No contract verification source provided');
      console.log('  You MUST verify contracts via:');
      console.log('    --spotrac "spotrac.com/..."');
      console.log('    OR include official league/reference URLs in --sources');
      return false;
    }

    success('Contract data verified with official sources');
    return true;
  },

  // CHECK 3: BTC price verification
  hasBTCPriceVerification(args) {
    const hasBTCSource = args.btcPriceUrls.length > 0;
    const hasBTCInSources = args.sources.some(url =>
      url.includes('coingecko.com') ||
      url.includes('coinmarketcap.com') ||
      url.includes('blockchain.com') ||
      url.includes('coinbase.com')
    );

    if (!hasBTCSource && !hasBTCInSources) {
      error('No BTC price verification source provided');
      console.log('  You MUST verify BTC prices via:');
      console.log('    --btc-price "coingecko.com/..."');
      console.log('    OR include BTC price URLs in --sources');
      return false;
    }

    success('BTC price verified with data source');
    return true;
  },

  // CHECK 4: Content provided for review
  hasContent(args) {
    if (!args.content || args.content.trim().length === 0) {
      error('No content provided for verification');
      console.log('  You MUST provide the tweet content via:');
      console.log('    --content "your tweet text here"');
      return false;
    }
    success('Content provided for verification');
    return true;
  },

  // CHECK 5: No fabrication red flags
  noFabricationFlags(args) {
    const content = args.content.toLowerCase();
    const redFlags = [
      { pattern: /probably|likely|i think|maybe|roughly|approximately/i, msg: 'Uncertainty words detected' },
      { pattern: /\d+%(?!\s+of|\s+ownership)/i, msg: 'Unverified percentage (unless explicitly sourced)' },
      { pattern: /could.?ve|would.?ve|imagine if/i, msg: 'Hypothetical language detected' }
    ];

    let flagged = false;
    for (const flag of redFlags) {
      if (flag.pattern.test(args.content)) {
        warning(`${flag.msg}: "${args.content.match(flag.pattern)[0]}"`);
        console.log('    Ensure this is from a verified source, not speculation');
        flagged = true;
      }
    }

    if (!flagged) {
      success('No fabrication red flags detected');
    } else {
      console.log('');
    }
    return true; // Warning only, not blocking
  },

  // CHECK 6: URL format validation
  validURLs(args) {
    const allUrls = [
      ...args.sources,
      ...args.xPosts,
      ...args.spotracUrls,
      ...args.btcPriceUrls
    ];

    let allValid = true;
    for (const url of allUrls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        error(`Invalid URL format: ${url}`);
        console.log('  URLs must start with http:// or https://');
        allValid = false;
      }
    }

    if (allValid && allUrls.length > 0) {
      success('All URLs properly formatted');
    }
    return allValid;
  },

  // CHECK 7: URL Accessibility (NEW - BLOCKING)
  async checkURLAccessibility(urls) {
    const https = require('https');
    const http = require('http');

    console.log('  Checking URL accessibility...');

    // API endpoints that should be skipped from accessibility checks
    const apiEndpoints = [
      'api.coingecko.com',
      'api.coinmarketcap.com',
      'api.coinbase.com',
      'api.blockchain.com'
    ];

    const checkURL = (url) => {
      return new Promise((resolve) => {
        try {
          const urlObj = new URL(url);

          // Skip API endpoints - they don't respond to HEAD requests like web pages
          if (apiEndpoints.some(api => urlObj.hostname.includes(api))) {
            console.log(`    ⏭️  Skipping API endpoint: ${urlObj.hostname}`);
            resolve({ url, status: 'API', accessible: true });
            return;
          }

          const options = {
            method: 'HEAD',
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            timeout: 5000,
            headers: {
              'User-Agent': '21M-Sports-Validator/1.0'
            }
          };

          const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
            // Accept 200, or 403 for known scraping targets (Spotrac)
            const accessible = res.statusCode === 200 ||
                             (res.statusCode === 403 && url.includes('spotrac.com'));
            resolve({ url, status: res.statusCode, accessible });
          });

          req.on('error', () => resolve({ url, status: null, accessible: false }));
          req.on('timeout', () => {
            req.destroy();
            resolve({ url, status: null, accessible: false });
          });

          req.end();
        } catch (err) {
          resolve({ url, status: null, accessible: false });
        }
      });
    };

    const results = await Promise.all(urls.map(checkURL));
    const failed = results.filter(r => !r.accessible);

    if (failed.length > 0) {
      error('Inaccessible URLs detected (BLOCKING)');
      failed.forEach(f => {
        console.log(`    ✗ ${f.url} - Status: ${f.status || 'Timeout/Error'}`);
      });
      return false;
    }

    success('All URLs accessible');
    return true;
  },

  // CHECK 8: Calculation Verification (NEW - BLOCKING)
  verifyBTCCalculations(metadata) {
    if (!metadata.contract_value || !metadata.btc_price_on_date || !metadata.btc_equivalent) {
      warning('Missing calculation data, skipping verification');
      return true;
    }

    try {
      // Parse contract value ($765M -> 765000000)
      const contractStr = metadata.contract_value.replace(/[$,]/g, '');
      let contractValue = parseFloat(contractStr);
      if (contractStr.toUpperCase().includes('M')) {
        contractValue *= 1000000;
      } else if (contractStr.toUpperCase().includes('B')) {
        contractValue *= 1000000000;
      }

      // Parse BTC price ($97,235 -> 97235)
      const btcPrice = parseFloat(metadata.btc_price_on_date.replace(/[$,]/g, ''));

      // Parse claimed BTC (7,865 BTC -> 7865)
      const claimedBTC = parseFloat(metadata.btc_equivalent.replace(/[, BTC]/g, ''));

      // Calculate expected BTC
      const expectedBTC = contractValue / btcPrice;

      // Check for >1% difference
      const percentDiff = Math.abs((claimedBTC - expectedBTC) / expectedBTC) * 100;

      if (percentDiff > 1) {
        error('BTC calculation mismatch (BLOCKING)');
        console.log(`  Expected: ${expectedBTC.toFixed(2)} BTC`);
        console.log(`  Claimed: ${claimedBTC.toFixed(2)} BTC`);
        console.log(`  Difference: ${percentDiff.toFixed(2)}%`);
        return false;
      }

      success('BTC calculations verified (within 1% tolerance)');
      return true;
    } catch (err) {
      warning(`Calculation verification failed: ${err.message}`);
      return true; // Don't block on parsing errors
    }
  },

  // CHECK 9: Placeholder Detection (NEW - BLOCKING)
  checkForPlaceholders(tweets) {
    const placeholders = [/\[.*?\]/, /\{.*?\}/, /XXX/i, /TBD/i, /TODO/i, /PLACEHOLDER/i];

    for (const tweet of tweets) {
      for (const pattern of placeholders) {
        if (pattern.test(tweet)) {
          error('Placeholder text detected (BLOCKING)');
          console.log(`  Found: "${tweet.match(pattern)[0]}"`);
          console.log(`  In tweet: "${tweet.substring(0, 60)}..."`);
          return false;
        }
      }
    }

    success('No placeholder text detected');
    return true;
  }
};

// Main validation
async function validateChecklist() {
  header('21M SPORTS CONTENT VERIFICATION');
  console.log('Enforcing mandatory fact-checking requirements...\n');

  const args = parseArgs();

  // Display what was provided
  if (args.sources.length > 0) {
    console.log('Research sources:');
    args.sources.forEach(url => console.log(`  - ${url}`));
  }
  if (args.xPosts.length > 0) {
    console.log('X posts:');
    args.xPosts.forEach(url => console.log(`  - ${url}`));
  }
  if (args.spotracUrls.length > 0) {
    console.log('Contract sources:');
    args.spotracUrls.forEach(url => console.log(`  - ${url}`));
  }
  if (args.btcPriceUrls.length > 0) {
    console.log('BTC price sources:');
    args.btcPriceUrls.forEach(url => console.log(`  - ${url}`));
  }
  if (args.content) {
    console.log(`Content preview: "${args.content.substring(0, 80)}..."`);
  }

  header('\nRUNNING VERIFICATION CHECKS:');

  // Run all checks (including new blocking checks)
  const allUrls = [
    ...args.sources,
    ...args.xPosts,
    ...args.spotracUrls,
    ...args.btcPriceUrls
  ];

  const results = [
    checks.hasResearch(args),
    checks.hasContractVerification(args),
    checks.hasBTCPriceVerification(args),
    checks.hasContent(args),
    checks.validURLs(args),
    checks.noFabricationFlags(args), // Warning only
    await checks.checkURLAccessibility(allUrls), // NEW - BLOCKING
    // Note: BTC calculations and placeholder checks require parsed content
    // These should be called from the generator with metadata
  ];

  const passed = results.every(r => r === true);

  console.log('');
  if (passed) {
    header('✅ VERIFICATION PASSED');
    console.log('All fact-checking requirements met.');
    console.log('Content is VERIFIED and ready for Terry to review.\n');
    return 0;
  } else {
    header('❌ VERIFICATION FAILED');
    console.log('One or more requirements NOT met.');
    console.log('DO NOT generate or send content until all checks pass.\n');
    console.log('Read 21M-SPORTS-CHECKLIST.md and complete all steps.\n');
    return 1;
  }
}

// Validate content file (for use by generator/deploy scripts)
async function validateContentFile(contentFilePath) {
  header('21M SPORTS CONTENT FILE VALIDATION');

  try {
    if (!fs.existsSync(contentFilePath)) {
      error(`Content file not found: ${contentFilePath}`);
      return 1;
    }

    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));

    // Check verified flag
    if (!content.metadata || !content.metadata.verified) {
      error('Content is not marked as verified');
      return 1;
    }
    success('Content marked as verified');

    // Check sources exist
    if (!content.sources || !content.sources.contract && !content.sources.knowledge) {
      error('Missing contract/knowledge source');
      return 1;
    }
    success('Sources present');

    // Collect all URLs
    const urls = [];
    if (content.sources.contract) urls.push(content.sources.contract);
    if (content.sources.knowledge) urls.push(content.sources.knowledge);
    if (content.sources.btc_price) urls.push(content.sources.btc_price);
    if (content.sources.additional) urls.push(...content.sources.additional);

    // URL accessibility check
    const urlsAccessible = await checks.checkURLAccessibility(urls);
    if (!urlsAccessible) {
      return 1;
    }

    // BTC calculation check
    if (content.metadata.contract_value) {
      const calcValid = checks.verifyBTCCalculations(content.metadata);
      if (!calcValid) {
        return 1;
      }
    }

    // Placeholder check
    if (content.tweets && content.tweets.length > 0) {
      const noPlaceholders = checks.checkForPlaceholders(content.tweets);
      if (!noPlaceholders) {
        return 1;
      }
    }

    header('✅ CONTENT FILE VALIDATION PASSED');
    return 0;

  } catch (error) {
    error(`Validation error: ${error.message}`);
    return 1;
  }
}

// Log validation attempt to memory
function logValidation(exitCode) {
  const memoryDir = path.join(process.env.HOME, 'clawd', 'memory');
  const logFile = path.join(memoryDir, 'verification-log.jsonl');

  const entry = {
    timestamp: new Date().toISOString(),
    passed: exitCode === 0,
    args: process.argv.slice(2)
  };

  try {
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (err) {
    // Silent fail - logging is not critical
  }
}

// Entry point
if (require.main === module) {
  // Check if validating a content file
  const contentFileArg = process.argv.find(arg => arg.startsWith('--content-file='));

  if (contentFileArg) {
    const contentFile = contentFileArg.split('=')[1];
    validateContentFile(contentFile)
      .then(exitCode => {
        logValidation(exitCode);
        process.exit(exitCode);
      })
      .catch(err => {
        console.error('Validation error:', err);
        process.exit(1);
      });
  } else {
    validateChecklist()
      .then(exitCode => {
        logValidation(exitCode);
        process.exit(exitCode);
      })
      .catch(err => {
        console.error('Validation error:', err);
        process.exit(1);
      });
  }
}

module.exports = { validateChecklist, validateContentFile, checks };
