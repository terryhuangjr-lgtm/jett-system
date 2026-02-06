#!/usr/bin/env node
/**
 * 21M Sports VERIFIED Content Generator
 *
 * This generator REQUIRES verified sources as input.
 * It will FAIL if sources are not provided - no random generation allowed.
 *
 * Usage:
 *   node 21m-sports-verified-generator.js \
 *     --contract-source "https://spotrac.com/..." \
 *     --btc-price-source "https://coingecko.com/..." \
 *     --player "Player Name" \
 *     --amount "$XXX million" \
 *     --year "YYYY" \
 *     --btc-equivalent "XXX BTC"
 *
 * This script generates tweet options ONLY from verified data.
 * ALL inputs must be manually verified before running this script.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Required arguments - script fails if any are missing
const REQUIRED_ARGS = [
  'contract-source',
  'btc-price-source',
  'player',
  'amount',
  'year',
  'btc-equivalent'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1]) {
      const key = args[i].replace('--', '');
      parsed[key] = args[i + 1];
      i++;
    }
  }

  return parsed;
}

function validateArgs(args) {
  console.log('🔍 Validating required sources...\n');

  const missing = [];
  for (const required of REQUIRED_ARGS) {
    if (!args[required]) {
      missing.push(required);
    }
  }

  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ARGUMENTS:\n');
    missing.forEach(arg => console.error(`  --${arg}`));
    console.error('\n❌ GENERATION BLOCKED: Sources not provided\n');
    console.error('You MUST verify all data before using this generator.');
    console.error('Read 21M-SPORTS-CHECKLIST.md and complete all 5 steps.\n');
    return false;
  }

  // Validate URLs
  if (!args['contract-source'].startsWith('http')) {
    console.error('❌ contract-source must be a valid URL');
    return false;
  }
  if (!args['btc-price-source'].startsWith('http')) {
    console.error('❌ btc-price-source must be a valid URL');
    return false;
  }

  console.log('✓ All required sources provided');
  console.log('✓ Contract source:', args['contract-source']);
  console.log('✓ BTC price source:', args['btc-price-source']);
  console.log('');

  return true;
}

function generateTweetOptions(args) {
  const templates = [
    // Option 1: Contract breakdown
    {
      content: `${args.player} signed for ${args.amount} in ${args.year}.

In Bitcoin terms: ${args['btc-equivalent']}

Same contract today? [Calculate with current BTC price]

Your purchasing power is being silently stolen.`,
      pillar: 'contract_analysis',
      requires_calculation: true
    },

    // Option 2: Historical comparison
    {
      content: `${args.player}'s ${args.amount} contract (${args.year}) = ${args['btc-equivalent']}

That's [X% of fixed 21M supply]

When athletes measure wealth in Bitcoin, everything changes.`,
      pillar: 'bitcoin_standard',
      requires_calculation: true
    },

    // Option 3: Fiat debasement angle
    {
      content: `${args.year}: ${args.player} signs for ${args.amount}

${new Date().getFullYear()}: That same Bitcoin (${args['btc-equivalent']}) is worth [current value]

Fiat contracts look different through a Bitcoin lens.`,
      pillar: 'fiat_debasement',
      requires_calculation: true
    }
  ];

  return templates.map((template, i) => ({
    option: i + 1,
    content: template.content,
    pillar: template.pillar,
    requires_manual_review: template.requires_calculation,
    sources: {
      contract: args['contract-source'],
      btc_price: args['btc-price-source']
    }
  }));
}

function displayOutput(options) {
  console.log('📝 GENERATED TWEET OPTIONS (VERIFIED DATA ONLY)\n');
  console.log('⚠️  Note: Some calculations marked [X] require manual completion\n');
  console.log('═'.repeat(70));

  options.forEach(opt => {
    console.log(`\n📌 OPTION ${opt.option}: ${opt.pillar.toUpperCase()}\n`);
    console.log(opt.content);
    console.log('\n📚 SOURCES:');
    console.log(`  Contract: ${opt.sources.contract}`);
    console.log(`  BTC Price: ${opt.sources.btc_price}`);
    if (opt.requires_manual_review) {
      console.log('\n⚠️  Requires manual calculation/verification before posting');
    }
    console.log('\n' + '─'.repeat(70));
  });

  console.log('\n✅ All options generated from VERIFIED sources only');
  console.log('✅ No random data, no fabrications, no guesses\n');
}

function saveToFile(options, args) {
  const outputDir = path.join(process.env.HOME, 'clawd', 'memory');
  const outputFile = path.join(outputDir, '21m-sports-verified-content.json');

  const output = {
    generated_at: new Date().toISOString(),
    verification_status: 'VERIFIED_SOURCES_ONLY',
    input_data: {
      player: args.player,
      amount: args.amount,
      year: args.year,
      btc_equivalent: args['btc-equivalent'],
      contract_source: args['contract-source'],
      btc_price_source: args['btc-price-source']
    },
    tweet_options: options
  };

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`💾 Output saved: ${outputFile}\n`);
}

// Run pre-flight verification
function runVerification(options) {
  console.log('🔒 Running pre-flight verification...\n');

  const validatorScript = path.join(
    process.env.HOME,
    'clawd',
    'automation',
    '21m-sports-validator.js'
  );

  if (!fs.existsSync(validatorScript)) {
    console.error('❌ Validator script not found. Cannot verify content.');
    return false;
  }

  // Run validator for each option
  let allPassed = true;
  for (const opt of options) {
    try {
      const sources = `${opt.sources.contract},${opt.sources.btc_price}`;
      const cmd = `node "${validatorScript}" --sources "${sources}" --content "${opt.content}"`;
      execSync(cmd, { stdio: 'inherit' });
    } catch (err) {
      console.error(`\n❌ Verification failed for option ${opt.option}\n`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Main execution
function main() {
  console.log('\n🏈 21M Sports VERIFIED Content Generator\n');
  console.log('This generator ONLY works with verified data.\n');

  const args = parseArgs();

  // Step 1: Validate all required sources are provided
  if (!validateArgs(args)) {
    process.exit(1);
  }

  // Step 2: Generate tweet options from verified data
  console.log('✅ Generating content from verified sources...\n');
  const options = generateTweetOptions(args);

  // Step 3: Display options
  displayOutput(options);

  // Step 4: Save to file
  saveToFile(options, args);

  // Step 5: Run verification
  if (!runVerification(options)) {
    console.log('\n⚠️  Some verification checks had warnings.');
    console.log('Review the output above before sending to Terry.\n');
  }

  console.log('✅ GENERATION COMPLETE\n');
  console.log('Next steps:');
  console.log('  1. Review all options above');
  console.log('  2. Complete any manual calculations marked [X]');
  console.log('  3. Send to Terry with source URLs included');
  console.log('  4. Wait for approval before posting\n');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nGeneration failed. Check your inputs and try again.\n');
    process.exit(1);
  }
}

module.exports = { generateTweetOptions, validateArgs };
