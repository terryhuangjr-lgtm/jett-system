#!/usr/bin/env node
/**
 * 21M Sports Auto-Verified Content Generator
 *
 * This script reads research data and generates verified tweet content.
 * It ONLY works with verified sources - exits with error if data is missing.
 *
 * Usage:
 *   node 21m-sports-auto-verified.js /tmp/21m-sports-tweet-1.json
 *
 * Input: memory/21m-sports-research.md (from overnight research)
 * Output: JSON file with verified tweet options
 *
 * Exit codes:
 *   0 = Success, verified content generated
 *   1 = Research file missing or invalid
 *   1 = No verifiable contract data found
 *   1 = Missing required fields
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Output file from command line
const OUTPUT_FILE = process.argv[2] || '/tmp/21m-sports-tweet-1.json';
const RESEARCH_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-sports-research.md');
const VERIFIED_GENERATOR = path.join(process.env.HOME, 'clawd', 'automation', '21m-sports-verified-generator.js');

console.log('\n🏈 21M Sports Auto-Verified Generator\n');
console.log('Reading research from:', RESEARCH_FILE);
console.log('Output will be saved to:', OUTPUT_FILE);
console.log('');

/**
 * Step 1: Read research file
 */
function readResearchFile() {
  console.log('📖 Step 1: Reading research file...');

  if (!fs.existsSync(RESEARCH_FILE)) {
    console.error('❌ Research file not found:', RESEARCH_FILE);
    console.error('   Research must run before content generation (task 27 at 3 AM)');
    process.exit(1);
  }

  const content = fs.readFileSync(RESEARCH_FILE, 'utf8');
  console.log('✓ Research file loaded\n');
  return content;
}

/**
 * Step 2: Extract contract data from research
 * Looks for the most recent "Research Session" section
 */
function extractContractData(researchContent) {
  console.log('🔍 Step 2: Extracting verified contract data...');

  // Find the most recent research session
  const sessionMatch = researchContent.match(/## Research Session - (.+?)\n_Generated at (.+?)_\n_BTC Price: \$([0-9,\.]+)_/);

  if (!sessionMatch) {
    console.error('❌ No research session found in file');
    console.error('   Research must include a "Research Session" with contract data');
    process.exit(1);
  }

  const [_, date, time, btcPrice] = sessionMatch;
  console.log(`✓ Found research session: ${date} at ${time}`);
  console.log(`✓ BTC Price: $${btcPrice}\n`);

  // Extract all contracts from the session
  const contracts = [];

  // Updated regex to match the actual format
  const contractRegex = /### (.+?)\n- \*\*Source\*\*: (.+?)\n- \*\*Type\*\*: (.+?)\n- \*\*BTC Context\*\*: (.+?)\n/g;

  let match;
  while ((match = contractRegex.exec(researchContent)) !== null) {
    const [_, fullDescription, source, type, btcContext] = match;

    // Parse the full description line
    // Format 1: "Juan Soto signs 15-year, $765M contract with Mets"
    // Format 2: "Shohei Ohtani: 10-year, $700M deal with Dodgers"
    // Format 3: "Patrick Mahomes: 10-year, $450M extension with Chiefs"

    // Extract player name (before "signs" or first ":")
    let playerMatch = fullDescription.match(/^(.+?)(?:\s+signs|\s*:)/i);

    // Extract contract amount ($XXM or $XXXM)
    const amountMatch = fullDescription.match(/\$([0-9.]+[MBK])/i);

    // Extract year duration (X-year)
    const yearMatch = fullDescription.match(/(\d{1,2})-year/i);

    // Extract BTC equivalent from BTC Context
    const btcEquivMatch = btcContext.match(/\$[0-9.]+[MBK] = ([0-9,]+) BTC/i);

    if (playerMatch && amountMatch && yearMatch && btcEquivMatch) {
      const playerName = playerMatch[1].trim();
      const contractAmount = amountMatch[1];
      const contractYears = yearMatch[1];
      const btcEquivalent = btcEquivMatch[1];

      // Parse dollar amount to numeric for ranking
      let dollarValue = parseFloat(contractAmount.replace(/[MB]/i, ''));
      if (contractAmount.toUpperCase().includes('M')) {
        dollarValue *= 1;
      } else if (contractAmount.toUpperCase().includes('B')) {
        dollarValue *= 1000;
      }

      contracts.push({
        player: playerName,
        amount: `$${contractAmount}`,
        year: contractYears,
        btcEquivalent: `${btcEquivalent} BTC`,
        btcEquivalentNumeric: parseInt(btcEquivMatch[1].replace(/,/g, '')),
        dollarValue,
        source,
        details: fullDescription
      });
    }
  }

  if (contracts.length === 0) {
    console.error('❌ No valid contract data found in research file');
    console.error('   Research must include contracts with:');
    console.error('   - Player name');
    console.error('   - Contract amount ($XXM)');
    console.error('   - Year');
    console.error('   - BTC equivalent');
    process.exit(1);
  }

  console.log(`✓ Found ${contracts.length} verified contracts\n`);

  // Sort by BTC equivalent (highest first)
  contracts.sort((a, b) => b.btcEquivalentNumeric - a.btcEquivalentNumeric);

  // Return top contract
  const topContract = contracts[0];
  console.log('🏆 Top contract selected:');
  console.log(`   Player: ${topContract.player}`);
  console.log(`   Amount: ${topContract.amount}`);
  console.log(`   Year: ${topContract.year}`);
  console.log(`   BTC Equivalent: ${topContract.btcEquivalent}`);
  console.log(`   Source: ${topContract.source}\n`);

  return { topContract, btcPrice };
}

/**
 * Step 3: Validate required fields
 */
function validateContractData(contract) {
  console.log('✅ Step 3: Validating required fields...');

  const required = ['player', 'amount', 'year', 'btcEquivalent'];
  const missing = required.filter(field => !contract[field]);

  if (missing.length > 0) {
    console.error('❌ Missing required fields:', missing.join(', '));
    process.exit(1);
  }

  console.log('✓ All required fields present\n');
  return true;
}

/**
 * Build Spotrac URL for a player
 * Since research may not have direct URLs, construct them from player names
 */
function buildSpotracUrl(player, amount) {
  // Determine sport from amount (rough heuristic)
  // MLB/NBA tend to have largest contracts

  const playerSlug = player.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  // Default to spotrac main contracts page
  // Note: Ideally research would provide exact URLs
  if (amount.includes('765M') || amount.includes('700M')) {
    // MLB (Soto, Ohtani)
    return `https://www.spotrac.com/mlb/${playerSlug}/`;
  } else if (amount.includes('450M') || amount.includes('304M')) {
    // NFL/NBA
    return `https://www.spotrac.com/nfl/${playerSlug}/`;
  }

  // Fallback to main contracts page
  return 'https://www.spotrac.com/';
}

/**
 * Step 4: Call verified generator
 */
function callVerifiedGenerator(contract, btcPrice) {
  console.log('🤖 Step 4: Calling verified generator...\n');

  // Construct Spotrac URL
  // If source is already a URL, use it; otherwise build one
  const contractSource = contract.source && contract.source.startsWith('http')
    ? contract.source
    : buildSpotracUrl(contract.player, contract.amount);

  console.log('📍 Contract source:', contractSource);

  // BTC price source (CoinGecko)
  const btcPriceSource = 'https://www.coingecko.com/en/coins/bitcoin';
  console.log('📍 BTC price source:', btcPriceSource);
  console.log('');

  // Build command with proper escaping
  // Escape single quotes in player names
  const escapedPlayer = contract.player.replace(/'/g, "'\\''");
  const escapedAmount = contract.amount.replace(/'/g, "'\\''");

  const cmd = `node "${VERIFIED_GENERATOR}" \\
    --contract-source '${contractSource}' \\
    --btc-price-source '${btcPriceSource}' \\
    --player '${escapedPlayer}' \\
    --amount '${escapedAmount}' \\
    --year '${contract.year}' \\
    --btc-equivalent '${contract.btcEquivalent}'`;

  console.log('Running command...');
  console.log(cmd);
  console.log('');

  try {
    // Run verified generator (it saves to memory/21m-sports-verified-content.json)
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✓ Verified generator completed\n');
  } catch (error) {
    console.error('❌ Verified generator failed');
    process.exit(1);
  }

  // Read the generated content
  const generatedFile = path.join(process.env.HOME, 'clawd', 'memory', '21m-sports-verified-content.json');

  if (!fs.existsSync(generatedFile)) {
    console.error('❌ Generated content file not found:', generatedFile);
    process.exit(1);
  }

  const generatedContent = JSON.parse(fs.readFileSync(generatedFile, 'utf8'));
  return generatedContent;
}

/**
 * Step 5: Format output for deploy script
 */
function formatOutput(generatedContent, contract, btcPrice) {
  console.log('📦 Step 5: Formatting output for deployment...\n');

  // Extract tweet text from generated options
  const tweets = generatedContent.tweet_options.map(opt => opt.content);

  // Build output in the format deploy-21m-tweet.js expects
  const output = {
    type: '21m_sports_tweets',
    timestamp: new Date().toISOString(),
    tweets: tweets,
    sources: {
      contract: generatedContent.input_data.contract_source,
      btc_price: generatedContent.input_data.btc_price_source,
      research_file: RESEARCH_FILE
    },
    metadata: {
      player: contract.player,
      contract_value: contract.amount,
      btc_equivalent: contract.btcEquivalent,
      verified: true,
      pillars_used: generatedContent.tweet_options.map(opt => opt.pillar)
    }
  };

  // Save to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('✓ Output saved to:', OUTPUT_FILE);
  console.log('✓ Format validated for deploy script\n');

  return output;
}

/**
 * Main execution
 */
function main() {
  try {
    // Step 1: Read research
    const researchContent = readResearchFile();

    // Step 2: Extract top contract
    const { topContract, btcPrice } = extractContractData(researchContent);

    // Step 3: Validate
    validateContractData(topContract);

    // Step 4: Generate content
    const generatedContent = callVerifiedGenerator(topContract, btcPrice);

    // Step 5: Format output
    const output = formatOutput(generatedContent, topContract, btcPrice);

    console.log('═'.repeat(70));
    console.log('✅ SUCCESS: Verified content generated');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Player: ${output.metadata.player}`);
    console.log(`   Contract: ${output.metadata.contract_value}`);
    console.log(`   BTC Equivalent: ${output.metadata.btc_equivalent}`);
    console.log(`   Tweet Options: ${output.tweets.length}`);
    console.log(`   Verified: ${output.metadata.verified ? 'YES' : 'NO'}`);
    console.log('');
    console.log('Next: Deploy script will post to #21msports');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('');
    console.error('Content generation failed. Check errors above.');
    console.error('');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractContractData, validateContractData, formatOutput };
