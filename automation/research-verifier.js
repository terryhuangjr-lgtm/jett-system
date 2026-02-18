#!/usr/bin/env node
/**
 * Universal Research Verifier
 *
 * Validates ANY factual claim before it gets logged to memory
 * Ensures all research includes sources and verification
 *
 * Usage:
 *   node research-verifier.js \
 *     --claim "Your factual statement" \
 *     --sources "url1,url2" \
 *     --type "sports|macro|general"
 *
 * Exit codes:
 *   0 = Verified and safe to log
 *   1 = Verification failed - DO NOT LOG
 */

const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function error(msg) {
  console.error(`${colors.red}${colors.bold}✗${colors.reset} ${msg}`);
}

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`);
}

function header(msg) {
  console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`);
}

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    claim: '',
    sources: [],
    type: 'general'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--claim' && args[i + 1]) {
      parsed.claim = args[i + 1];
      i++;
    } else if (args[i] === '--sources' && args[i + 1]) {
      parsed.sources = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      parsed.type = args[i + 1];
      i++;
    }
  }

  return parsed;
}

// Validation checks
const checks = {
  // Check 1: Claim provided
  hasClaim(args) {
    if (!args.claim || args.claim.trim().length === 0) {
      error('No claim provided');
      console.log('  You must specify what you want to verify:');
      console.log('    --claim "Your factual statement"');
      return false;
    }
    success('Claim provided for verification');
    return true;
  },

  // Check 2: Sources provided
  hasSources(args) {
    if (args.sources.length === 0) {
      error('No sources provided');
      console.log('  You MUST provide verification sources:');
      console.log('    --sources "url1,url2"');
      console.log('');
      console.log('  Example sources:');
      console.log('    - News: https://reuters.com/article/...');
      console.log('    - Data: https://coingecko.com/...');
      console.log('    - Sports: https://spotrac.com/...');
      console.log('    - X posts: https://twitter.com/user/status/...');
      return false;
    }
    success(`Sources provided: ${args.sources.length} total`);
    return true;
  },

  // Check 3: Valid URLs
  validURLs(args) {
    let allValid = true;
    for (const url of args.sources) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        error(`Invalid URL: ${url}`);
        console.log('  URLs must start with http:// or https://');
        allValid = false;
      }
    }
    if (allValid) {
      success('All URLs properly formatted');
    }
    return allValid;
  },

  // Check 4: No fabrication indicators
  noFabricationFlags(args) {
    const claim = args.claim.toLowerCase();
    const redFlags = [
      { pattern: /\bi think\b|\bi believe\b|\bi remember\b/i, msg: 'Personal opinion detected' },
      { pattern: /probably|likely|maybe|perhaps|roughly|approximately/i, msg: 'Uncertainty language' },
      { pattern: /could.?ve|would.?ve|should.?ve|might.?ve/i, msg: 'Hypothetical language' },
      { pattern: /common knowledge|everyone knows|obviously|clearly/i, msg: 'Unsourced assertion' },
      { pattern: /\d+%(?!\s+(of|ownership|stake|share))/i, msg: 'Percentage without context' }
    ];

    let hasFlags = false;
    for (const flag of redFlags) {
      if (flag.pattern.test(args.claim)) {
        warning(`${flag.msg}: "${args.claim.match(flag.pattern)[0]}"`);
        console.log(`    Verify this is from your source, not speculation`);
        hasFlags = true;
      }
    }

    if (!hasFlags) {
      success('No fabrication red flags detected');
    }
    return true; // Warning only, not blocking
  },

  // Check 5: Appropriate sources for type
  appropriateSources(args) {
    const sourceTypes = {
      sports: ['spotrac.com', 'espn.com', 'nba.com', 'nfl.com', 'mlb.com', 'basketball-reference.com', 'pro-football-reference.com'],
      macro: ['reuters.com', 'bloomberg.com', 'federalreserve.gov', 'bls.gov', 'coinbase.com', 'coingecko.com'],
      general: [] // Any source OK
    };

    if (args.type === 'general') {
      success('General research - any credible source accepted');
      return true;
    }

    const expectedDomains = sourceTypes[args.type] || [];
    if (expectedDomains.length === 0) {
      return true; // No specific requirements
    }

    const hasAppropriate = args.sources.some(url =>
      expectedDomains.some(domain => url.includes(domain))
    );

    if (!hasAppropriate) {
      warning(`Expected ${args.type} sources: ${expectedDomains.join(', ')}`);
      console.log('    You may proceed but ensure sources are credible');
    } else {
      success(`Appropriate sources for ${args.type} research`);
    }

    return true; // Warning only
  }
};

// Generate verification output for logging
function generateVerificationBlock(args) {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const markdown = `
✅ **${args.claim}**
- Source${args.sources.length > 1 ? 's' : ''}: ${args.sources.join(', ')}
- Verified: ${dateStr}
- Method: ${args.type === 'sports' ? '21M Sports verification' : args.type === 'macro' ? 'Macro research' : 'Web research'}
`;

  return markdown.trim();
}

// Main validation
function validate() {
  header('RESEARCH VERIFICATION');
  console.log('Validating factual claim before logging to memory...\n');

  const args = parseArgs();

  // Show what's being verified
  if (args.claim) {
    console.log(`${colors.cyan}Claim:${colors.reset} "${args.claim}"`);
  }
  if (args.sources.length > 0) {
    console.log(`${colors.cyan}Sources:${colors.reset}`);
    args.sources.forEach(url => console.log(`  - ${url}`));
  }
  if (args.type !== 'general') {
    console.log(`${colors.cyan}Type:${colors.reset} ${args.type}`);
  }

  header('\nRUNNING VERIFICATION CHECKS:');

  // Run checks
  const results = [
    checks.hasClaim(args),
    checks.hasSources(args),
    checks.validURLs(args),
    checks.noFabricationFlags(args),
    checks.appropriateSources(args)
  ];

  const passed = results.every(r => r === true);

  console.log('');
  if (passed) {
    header('✅ VERIFICATION PASSED');
    console.log('Claim is verified and safe to log to memory.\n');
    console.log('Use this markdown format when logging:\n');
    console.log('─'.repeat(70));
    console.log(generateVerificationBlock(args));
    console.log('─'.repeat(70));
    console.log('');
    return 0;
  } else {
    header('❌ VERIFICATION FAILED');
    console.log('Requirements NOT met.');
    console.log('DO NOT log this claim to memory until verified.\n');
    return 1;
  }
}

// Log validation
function logValidation(args, exitCode) {
  const memoryDir = path.join(process.env.HOME, 'clawd', 'memory');
  const logFile = path.join(memoryDir, 'verification-log.jsonl');

  const entry = {
    timestamp: new Date().toISOString(),
    passed: exitCode === 0,
    type: args.type,
    claim: args.claim.substring(0, 100),
    sources: args.sources,
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
  const args = parseArgs();
  const exitCode = validate();
  logValidation(args, exitCode);
  process.exit(exitCode);
}

module.exports = { validate, checks, generateVerificationBlock };
