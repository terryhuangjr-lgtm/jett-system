#!/usr/bin/env node
/**
 * 21M Sports Researcher
 * Searches X and web for Bitcoin sports topics and contract agreements
 * Logs findings to memory for content generation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const RESEARCH_FILE = path.join(MEMORY_DIR, '21m-sports-research.md');
const STEALTH_BROWSER = path.join(process.env.HOME, 'clawd', 'lib', 'stealth-browser', 'cli.js');

// Get BTC price from free API
async function getBTCPrice() {
  return new Promise((resolve, reject) => {
    https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(parseFloat(json.data.amount));
        } catch (e) {
          resolve(100000); // Fallback price
        }
      });
    }).on('error', () => resolve(100000));
  });
}

// Scrape ESPN for recent sports news
async function scrapeESPN() {
  try {
    const tmpFile = `/tmp/espn-scrape-${Date.now()}.json`;
    execSync(`node "${STEALTH_BROWSER}" scrape --url "https://www.espn.com/nba/" --output "${tmpFile}" --headless true`, {
      timeout: 30000,
      stdio: 'pipe'
    });
    const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    fs.unlinkSync(tmpFile);

    // Extract headlines from text content
    const text = data.text || '';
    const headlines = text.split('\n')
      .filter(line => line.length > 20 && line.length < 200)
      .filter(line => /\$|million|billion|contract|signs|trade|deal/i.test(line))
      .slice(0, 5);

    return headlines;
  } catch (error) {
    console.log('  ESPN scrape failed, using fallback');
    return [];
  }
}

// Scrape Spotrac for contract info
async function scrapeSpotrac() {
  try {
    const tmpFile = `/tmp/spotrac-scrape-${Date.now()}.json`;
    // Target the contracts page specifically
    execSync(`node "${STEALTH_BROWSER}" scrape --url "https://www.spotrac.com/nba/contracts/" --output "${tmpFile}" --headless true`, {
      timeout: 30000,
      stdio: 'pipe'
    });
    const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    fs.unlinkSync(tmpFile);

    // Extract contract details
    const text = data.text || '';
    const contracts = text.split('\n')
      .filter(line => /\$\d+|million|M\b/i.test(line))
      .filter(line => line.length > 15 && line.length < 200)
      .slice(0, 8);

    return contracts;
  } catch (error) {
    console.log('  Spotrac scrape failed, using fallback');
    return [];
  }
}

// Add recent major contracts as fallback knowledge
function getFallbackContracts() {
  return [
    'Juan Soto signs 15-year, $765M contract with Mets (largest in MLB history)',
    'Shohei Ohtani: 10-year, $700M deal with Dodgers',
    'Patrick Mahomes: 10-year, $450M extension with Chiefs',
    'Giannis Antetokounmpo: 3-year, $186M extension with Bucks',
    'Jaylen Brown: 5-year, $304M supermax with Celtics'
  ].map(headline => ({
    type: 'contract',
    source: 'Recent Major Deals',
    headline
  }));
}

// Search for recent major sports news
async function searchSportsNews() {
  const findings = [];

  // Try ESPN
  console.log('  Scraping ESPN...');
  const espnHeadlines = await scrapeESPN();
  espnHeadlines.forEach(headline => {
    findings.push({
      type: 'news',
      source: 'ESPN',
      headline: headline.trim()
    });
  });

  // Try Spotrac
  console.log('  Scraping Spotrac...');
  const spotracContracts = await scrapeSpotrac();
  spotracContracts.forEach(contract => {
    findings.push({
      type: 'contract',
      source: 'Spotrac',
      headline: contract.trim()
    });
  });

  // Add fallback contracts for BTC analysis
  if (findings.length < 5) {
    console.log('  Adding fallback contracts for analysis...');
    const fallback = getFallbackContracts();
    findings.push(...fallback);
  }

  return findings;
}

// Analyze findings and add BTC context
async function analyzeFindings(findings, btcPrice) {
  const analyzed = [];

  for (const finding of findings) {
    const headline = finding.headline;

    // Extract dollar amounts - support multiple formats
    const patterns = [
      // $276,122,630 format (full amount)
      /\$(\d{1,3}(?:,\d{3})+)/,
      // $765M or $765 million format
      /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|M|B)\b/i,
      // 10-year, $700M format
      /(\d+(?:,\d{3})*)-year,?\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)(M|million|B|billion)/i,
      // $700M format (standalone)
      /\$(\d+(?:,\d{3})*(?:\.\d+)?)(M|B)\b/i
    ];

    let btcContext = 'Track against Bitcoin standard';
    let btcEquivalent = null;
    let dollarAmount = null;

    for (const pattern of patterns) {
      const match = headline.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2]?.toLowerCase();

        // If it's a full dollar amount (like $276,122,630), no unit needed
        if (amount > 1000000 && !unit) {
          dollarAmount = amount;
        }
        // Handle "10-year, $700M" format
        else if (match.length > 3 && !isNaN(parseFloat(match[2]))) {
          amount = parseFloat(match[2].replace(/,/g, ''));
          const yearUnit = match[3]?.toLowerCase();
          if (yearUnit === 'million' || yearUnit === 'm') {
            dollarAmount = amount * 1000000;
          } else if (yearUnit === 'billion' || yearUnit === 'b') {
            dollarAmount = amount * 1000000000;
          }
        }
        // Standard M/B format
        else if (unit) {
          if (unit === 'million' || unit === 'm') {
            dollarAmount = amount * 1000000;
          } else if (unit === 'billion' || unit === 'b') {
            dollarAmount = amount * 1000000000;
          }
        }

        if (dollarAmount && dollarAmount >= 1000000) {
          btcEquivalent = Math.round(dollarAmount / btcPrice);
          const formattedAmount = dollarAmount >= 1000000000
            ? `$${(dollarAmount / 1000000000).toFixed(1)}B`
            : `$${(dollarAmount / 1000000).toFixed(0)}M`;
          btcContext = `${formattedAmount} = ${btcEquivalent.toLocaleString()} BTC @ $${Math.round(btcPrice).toLocaleString()}`;
          break;
        }
      }
    }

    analyzed.push({
      ...finding,
      btcContext,
      btcEquivalent,
      dollarAmount
    });
  }

  // Sort by BTC value (highest first)
  analyzed.sort((a, b) => (b.btcEquivalent || 0) - (a.btcEquivalent || 0));

  return analyzed;
}

// Format findings for memory
function formatFindings(analyzedFindings, btcPrice) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let markdown = `\n\n## Research Session - ${date}\n`;
  markdown += `_Generated at ${new Date().toLocaleTimeString()}_\n`;
  markdown += `_BTC Price: $${btcPrice.toLocaleString()}_\n\n`;

  if (analyzedFindings.length === 0) {
    markdown += `No new findings this session. Check X manually.\n\n`;
  } else {
    analyzedFindings.slice(0, 10).forEach(finding => {
      // Create headline with source
      const title = finding.headline.length > 80
        ? finding.headline.substring(0, 80) + '...'
        : finding.headline;

      markdown += `### ${title}\n`;
      markdown += `- **Source**: ${finding.source}\n`;
      markdown += `- **Type**: ${finding.type}\n`;
      markdown += `- **BTC Context**: ${finding.btcContext}\n`;

      // Add insights based on value
      if (finding.btcEquivalent) {
        if (finding.btcEquivalent > 1000) {
          markdown += `- **Insight**: Major contract - equivalent to ${finding.btcEquivalent.toLocaleString()} BTC. Compare to fixed supply of 21M.\n`;
        } else if (finding.btcEquivalent > 100) {
          markdown += `- **Insight**: Significant deal - track against Bitcoin accumulation trends.\n`;
        }
      }

      markdown += '\n';
    });
  }

  markdown += `### Next Steps\n`;
  markdown += `- [ ] Check X for athlete reactions and Bitcoin mentions\n`;
  markdown += `- [ ] Cross-reference with Bitcoin adoption news\n`;
  markdown += `- [ ] Look for franchise valuation updates\n`;
  markdown += `- [ ] Monitor macro trends (Fed, inflation data)\n`;

  return markdown;
}

// Main execution
(async () => {
  try {
    console.log('🔍 Starting 21M Sports research...\n');

    // Ensure memory directory exists
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    // Initialize research file if it doesn't exist
    if (!fs.existsSync(RESEARCH_FILE)) {
      const header = `# 21M Sports Research Log\n\n`;
      header += `This file tracks research for Bitcoin-denominated sports content.\n`;
      header += `Updated automatically by 21m-sports-researcher.js\n`;
      fs.writeFileSync(RESEARCH_FILE, header);
    }

    // Get current BTC price
    console.log('📊 Fetching BTC price...');
    const btcPrice = await getBTCPrice();
    console.log(`  BTC: $${btcPrice.toLocaleString()}\n`);

    // Search for sports news
    console.log('🔍 Searching sports news...');
    const rawFindings = await searchSportsNews();
    console.log(`  Found ${rawFindings.length} items\n`);

    // Analyze and add BTC context
    console.log('🧮 Analyzing findings...');
    const analyzedFindings = await analyzeFindings(rawFindings, btcPrice);
    console.log(`  Analyzed ${analyzedFindings.length} items\n`);

    // Format and append to research file
    const markdown = formatFindings(analyzedFindings, btcPrice);
    fs.appendFileSync(RESEARCH_FILE, markdown);

    console.log('✓ Research complete');
    console.log(`✓ Findings logged to ${RESEARCH_FILE}\n`);

    // Display top findings
    if (analyzedFindings.length > 0) {
      console.log('📋 Top Findings:');
      analyzedFindings.slice(0, 3).forEach((f, i) => {
        const headline = f.headline.length > 60
          ? f.headline.substring(0, 60) + '...'
          : f.headline;
        console.log(`  ${i + 1}. ${headline}`);
        console.log(`     BTC: ${f.btcContext}`);
      });
    } else {
      console.log('⚠️  No findings this session - check sites manually');
    }

    // Output summary for notifications
    const output = {
      type: '21m_research',
      timestamp: new Date().toISOString(),
      btcPrice,
      findingsCount: analyzedFindings.length,
      topFindings: analyzedFindings.slice(0, 3).map(f => ({
        headline: f.headline,
        btcContext: f.btcContext
      })),
      summary: analyzedFindings.length > 0
        ? `Found ${analyzedFindings.length} sports business items. Top item: ${analyzedFindings[0].headline.substring(0, 80)}`
        : 'No major findings - manual X check recommended'
    };

    const outputFile = '/tmp/21m-research-summary.json';
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n✓ Summary saved to ${outputFile}`);

  } catch (error) {
    console.error('Error during research:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
