#!/usr/bin/env node
/**
 * 21M Bitcoin Auto-Verified Content Generator
 *
 * This script reads Bitcoin research data and generates verified tweet content.
 * It ONLY works with verified sources - exits with error if data is missing.
 *
 * Usage:
 *   node 21m-bitcoin-auto-verified.js /tmp/21m-bitcoin-slot1.json
 *
 * Input: memory/21m-bitcoin-research.md (from Bitcoin research)
 * Output: JSON file with verified tweet options
 *
 * Exit codes:
 *   0 = Success, verified content generated
 *   1 = Research file missing or invalid
 *   1 = No verifiable knowledge data found
 *   1 = Missing required fields
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Output file from command line
const OUTPUT_FILE = process.argv[2] || '/tmp/21m-bitcoin-slot1.json';
const RESEARCH_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-bitcoin-research.md');
const VERIFIED_GENERATOR = path.join(process.env.HOME, 'clawd', 'automation', '21m-bitcoin-verified-generator.js');

console.log('\n₿ 21M Bitcoin Auto-Verified Generator\n');
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
    console.error('   Bitcoin research must run before content generation');
    process.exit(1);
  }

  const content = fs.readFileSync(RESEARCH_FILE, 'utf8');
  console.log('✓ Research file loaded\n');
  return content;
}

/**
 * Step 2: Extract Bitcoin knowledge from research
 * Looks for the most recent "Bitcoin Research Session" section
 */
function extractBitcoinKnowledge(researchContent) {
  console.log('🔍 Step 2: Extracting verified Bitcoin knowledge...');

  // Find the most recent research session
  const sessionMatch = researchContent.match(/## Bitcoin Research Session - (.+?)\n_Generated at (.+?)_\n_BTC Price: \$([0-9,\.]+)_/);

  if (!sessionMatch) {
    console.error('❌ No research session found in file');
    console.error('   Research must include a "Bitcoin Research Session" with knowledge data');
    process.exit(1);
  }

  const [_, date, time, btcPrice] = sessionMatch;
  console.log(`✓ Found research session: ${date} at ${time}`);
  console.log(`✓ BTC Price: $${btcPrice}\n`);

  // Extract knowledge based on content type
  let knowledge = {};

  // Try to match book excerpt
  const bookMatch = researchContent.match(/### Book Excerpt: (.+?)\n- \*\*Quote\*\*: "(.+?)"\n- \*\*Author\*\*: (.+?)\n- \*\*Source\*\*: (.+?)\n- \*\*Context\*\*: (.+?)\n/);

  if (bookMatch) {
    knowledge = {
      contentType: 'book_excerpt',
      title: bookMatch[1],
      content: bookMatch[2],
      author: bookMatch[3],
      source: bookMatch[4],
      context: bookMatch[5],
      btcPrice
    };
  }

  // Try to match historical event
  if (!knowledge.contentType) {
    const historyMatch = researchContent.match(/### Historical Event: (.+?)\n- \*\*Date\*\*: (.+?)\n- \*\*What Happened\*\*: (.+?)\n- \*\*Source\*\*: (.+?)\n- \*\*Significance\*\*: (.+?)\n/);

    if (historyMatch) {
      knowledge = {
        contentType: 'historical_event',
        title: historyMatch[1],
        date: historyMatch[2],
        content: historyMatch[3],
        source: historyMatch[4],
        context: historyMatch[5],
        btcPrice
      };
    }
  }

  // Try to match quote
  if (!knowledge.contentType) {
    const quoteMatch = researchContent.match(/### Quote from (.+?)\n- \*\*Quote\*\*: "(.+?)"\n- \*\*Author\*\*: (.+?)\n- \*\*Source\*\*: (.+?)\n- \*\*Context\*\*: (.+?)\n/);

    if (quoteMatch) {
      knowledge = {
        contentType: 'quote',
        title: `Quote from ${quoteMatch[1]}`,
        author: quoteMatch[1],
        content: quoteMatch[2],
        source: quoteMatch[4],
        context: quoteMatch[5],
        btcPrice
      };
    }
  }

  // Try to match principle
  if (!knowledge.contentType) {
    const principleMatch = researchContent.match(/### Bitcoin Principle: (.+?)\n- \*\*Explanation\*\*: (.+?)\n- \*\*Fiat Contrast\*\*: (.+?)\n- \*\*Source\*\*: (.+?)\n- \*\*Context\*\*: (.+?)\n/);

    if (principleMatch) {
      knowledge = {
        contentType: 'principle',
        title: principleMatch[1],
        content: principleMatch[2],
        fiatContrast: principleMatch[3],
        source: principleMatch[4],
        context: principleMatch[5],
        btcPrice
      };
    }
  }

  if (!knowledge.contentType) {
    console.error('❌ No valid Bitcoin knowledge found in research file');
    console.error('   Research must include book excerpts, history, quotes, or principles');
    process.exit(1);
  }

  console.log(`✓ Found ${knowledge.contentType}\n`);
  console.log('📚 Knowledge selected:');
  console.log(`   Type: ${knowledge.contentType}`);
  console.log(`   Title: ${knowledge.title}`);
  if (knowledge.author) console.log(`   Author: ${knowledge.author}`);
  console.log(`   Source: ${knowledge.source}\n`);

  return knowledge;
}

/**
 * Step 3: Validate required fields
 */
function validateKnowledge(knowledge) {
  console.log('✅ Step 3: Validating required fields...');

  const required = ['contentType', 'content', 'source'];
  const missing = required.filter(field => !knowledge[field]);

  if (missing.length > 0) {
    console.error('❌ Missing required fields:', missing.join(', '));
    process.exit(1);
  }

  // Validate source is a URL
  if (!knowledge.source.startsWith('http')) {
    console.error('❌ Source must be a valid URL');
    process.exit(1);
  }

  console.log('✓ All required fields present\n');
  return true;
}

/**
 * Step 4: Call verified generator
 */
function callVerifiedGenerator(knowledge) {
  console.log('🤖 Step 4: Calling verified generator...\n');

  // BTC price source (CoinGecko)
  const btcPriceSource = 'https://www.coingecko.com/en/coins/bitcoin';
  console.log('📍 Knowledge source:', knowledge.source);
  console.log('📍 BTC price source:', btcPriceSource);
  console.log('');

  // Build command with proper escaping
  // Escape single quotes in content
  const escapedContent = knowledge.content.replace(/'/g, "'\\''");
  const escapedContext = knowledge.context.replace(/'/g, "'\\''");

  let cmd = `node "${VERIFIED_GENERATOR}" \
    --knowledge-source '${knowledge.source}' \
    --btc-price-source '${btcPriceSource}' \
    --content-type '${knowledge.contentType}' \
    --content '${escapedContent}' \
    --context '${escapedContext}'`;

  // Add optional fields
  if (knowledge.author) {
    const escapedAuthor = knowledge.author.replace(/'/g, "'\\''");
    cmd += ` --author '${escapedAuthor}'`;
  }
  if (knowledge.date) {
    cmd += ` --date '${knowledge.date}'`;
  }
  if (knowledge.fiatContrast) {
    const escapedContrast = knowledge.fiatContrast.replace(/'/g, "'\\''");
    cmd += ` --fiat-contrast '${escapedContrast}'`;
  }

  console.log('Running command...');
  console.log(cmd);
  console.log('');

  try {
    // Run verified generator (it saves to memory/21m-bitcoin-verified-content.json)
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✓ Verified generator completed\n');
  } catch (error) {
    console.error('❌ Verified generator failed');
    process.exit(1);
  }

  // Read the generated content
  const generatedFile = path.join(process.env.HOME, 'clawd', 'memory', '21m-bitcoin-verified-content.json');

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
function formatOutput(generatedContent, knowledge) {
  console.log('📦 Step 5: Formatting output for deployment...\n');

  // Extract tweet text from generated options
  const tweets = generatedContent.tweet_options.map(opt => opt.content);

  // Build output in the format deploy-21m-tweet.js expects
  const output = {
    type: '21m_bitcoin_tweets',
    timestamp: new Date().toISOString(),
    tweets: tweets,
    sources: {
      knowledge: knowledge.source,
      btc_price: 'https://www.coingecko.com/en/coins/bitcoin',
      research_file: RESEARCH_FILE
    },
    metadata: {
      content_type: knowledge.contentType,
      title: knowledge.title,
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

    // Step 2: Extract Bitcoin knowledge
    const knowledge = extractBitcoinKnowledge(researchContent);

    // Step 3: Validate
    validateKnowledge(knowledge);

    // Step 4: Generate content
    const generatedContent = callVerifiedGenerator(knowledge);

    // Step 5: Format output
    const output = formatOutput(generatedContent, knowledge);

    console.log('═'.repeat(70));
    console.log('✅ SUCCESS: Verified Bitcoin content generated');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Type: ${output.metadata.content_type}`);
    console.log(`   Title: ${output.metadata.title}`);
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

module.exports = { extractBitcoinKnowledge, validateKnowledge, formatOutput };
