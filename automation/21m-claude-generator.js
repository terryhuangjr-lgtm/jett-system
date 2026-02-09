#!/usr/bin/env node
/**
 * 21M Claude-Powered Content Generator
 *
 * Uses Claude API to generate intelligent, engaging X posts from verified research.
 * Replaces template-based generation with Claude's creative intelligence.
 *
 * Usage:
 *   node 21m-claude-generator.js --type bitcoin --output /path/to/output.json
 *   node 21m-claude-generator.js --type sports --output /path/to/output.json
 *
 * Exit codes:
 *   0 = Content generated successfully
 *   1 = No research data available
 *   2 = Claude API error
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const db = require('./db-bridge.js');

// Configuration
const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const CLAWDBOT_PATH = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';

// Parse CLI arguments
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
const outputIndex = args.indexOf('--output');

if (typeIndex === -1 || !args[typeIndex + 1]) {
  console.error('❌ Error: --type required (bitcoin or sports)');
  process.exit(1);
}

const CONTENT_TYPE = args[typeIndex + 1]; // 'bitcoin' or 'sports'
const OUTPUT_FILE = outputIndex !== -1 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : path.join(MEMORY_DIR, `21m-${CONTENT_TYPE}-verified-content.json`);

const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || DRY_RUN;

// BTC Price Cache (10 minute TTL)
const BTC_PRICE_CACHE = {
  price: null,
  timestamp: null,
  ttl: 10 * 60 * 1000 // 10 minutes in milliseconds
};

/**
 * Get current BTC price (with caching)
 * OPTIMIZED: Caches price for 10 minutes to reduce API calls
 */
async function getCurrentBTCPrice() {
  // Check if cache is valid
  const now = Date.now();
  if (BTC_PRICE_CACHE.price && BTC_PRICE_CACHE.timestamp) {
    const age = now - BTC_PRICE_CACHE.timestamp;
    if (age < BTC_PRICE_CACHE.ttl) {
      if (VERBOSE) {
        console.log(`  💾 Using cached BTC price: $${BTC_PRICE_CACHE.price.toLocaleString()} (${Math.round(age/1000)}s old)`);
      }
      return BTC_PRICE_CACHE.price;
    }
  }

  // Cache miss or expired - fetch new price
  return new Promise((resolve) => {
    https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const price = parseFloat(json.data.amount);

          // Update cache
          BTC_PRICE_CACHE.price = price;
          BTC_PRICE_CACHE.timestamp = now;

          if (VERBOSE) {
            console.log(`  🌐 Fetched fresh BTC price: $${price.toLocaleString()}`);
          }

          resolve(price);
        } catch (e) {
          resolve(100000); // Fallback
        }
      });
    }).on('error', () => resolve(100000));
  });
}

/**
 * Get best research from database based on content type
 * OPTIMIZED: Filters in SQL rather than loading all records into JavaScript
 */
function getBestResearchFromDatabase(contentType) {
  console.log(`📊 Checking Knowledge Database for ${contentType} content...`);

  try {
    // Use optimized query that filters in SQL
    let results;
    if (contentType === 'bitcoin') {
      // Get Bitcoin quotes, history, principles (already filtered by quality >= 7 in SQL)
      results = db.getContentByCategory('bitcoin', 'draft', 7, 50);
    } else if (contentType === 'sports') {
      // Get sports contracts (already filtered by quality >= 7 in SQL)
      results = db.getContentByCategory('21m-sports', 'draft', 7, 50);
    }

    if (!results || results.length === 0) {
      console.log(`  ℹ️  No high-quality ${contentType} content in database yet\n`);
      return null;
    }

    // For sports, exclude any Bitcoin content (safety check)
    let filtered = results;
    if (contentType === 'sports') {
      filtered = results.filter(d => !d.category.includes('bitcoin'));
    }

    if (filtered.length === 0) {
      console.log(`  ℹ️  No ${contentType} content after filtering\n`);
      return null;
    }

    // Results are already sorted by quality_score DESC from SQL query
    const best = filtered[0];
    console.log(`  ✓ Found ${filtered.length} high-quality entries (quality >= 7)`);
    console.log(`  ✓ Best: "${best.topic.substring(0, 60)}..." (score: ${best.quality_score}/10)\n`);

    return best;
  } catch (err) {
    console.log(`  ⚠️  Database error: ${err.message}\n`);
    return null;
  }
}

/**
 * Build prompt for Claude based on research data
 */
function buildClaudePrompt(researchData, btcPrice, contentType) {
  const btcFormatted = `$${Math.round(btcPrice).toLocaleString()}`;

  if (contentType === 'bitcoin') {
    return `You are creating X (Twitter) posts for 21M Sports, a platform connecting Bitcoin's 21 million fixed supply to athlete contracts and sports finance.

VERIFIED RESEARCH DATA:
${researchData.content}

CURRENT BTC PRICE: ${btcFormatted}

YOUR TASK:
Create 3 tweet variations (max 280 characters each) based on this VERIFIED research.

CRITICAL RULES:
- Only use facts from the research above - NO made-up data
- Connect Bitcoin principles to athlete finances/contracts
- Reference Bitcoin's 21M fixed supply when relevant
- Be engaging, insightful, thought-provoking
- Use strong hooks that make people stop scrolling
- Vary your approach across the 3 tweets

TWEET STRUCTURE (create one of each):
1. QUOTE_FOCUS: Lead with the quote/principle, add sports connection
2. HISTORICAL_CONTEXT: Use historical angle, connect to athlete decisions today
3. SPORTS_CONNECTION: Lead with athlete/sports angle, connect to Bitcoin

STYLE GUIDE:
- Conversational but intelligent
- No emojis, no hashtags
- Short sentences for impact
- Make people think differently about money

OUTPUT FORMAT (exactly):
---TWEET1---
[your first tweet here]

---TWEET2---
[your second tweet here]

---TWEET3---
[your third tweet here]

Generate now:`;
  } else {
    // Sports
    return `You are creating X (Twitter) posts for 21M Sports, a platform connecting Bitcoin's 21 million fixed supply to athlete contracts and sports finance.

VERIFIED RESEARCH DATA:
${researchData.content}

CURRENT BTC PRICE: ${btcFormatted}

YOUR TASK:
Create 3 tweet variations (max 280 characters each) based on this VERIFIED research.

CRITICAL RULES:
- Only use facts from the research above - NO made-up contracts or players
- Connect athlete finances to Bitcoin's 21M fixed supply
- Show how fiat contracts lose value vs Bitcoin's scarcity
- Be engaging, insightful, thought-provoking
- Use strong hooks that make people stop scrolling
- Vary your approach across the 3 tweets

TWEET STRUCTURE (create one of each):
1. CONTRACT_FOCUS: Lead with the contract/deal, add Bitcoin perspective
2. COMPARISON: Compare fiat contract value to BTC terms
3. PRINCIPLE: Extract the money lesson, connect to 21M supply

STYLE GUIDE:
- Conversational but intelligent
- No emojis, no hashtags
- Short sentences for impact
- Make people think about contracts differently

OUTPUT FORMAT (exactly):
---TWEET1---
[your first tweet here]

---TWEET2---
[your second tweet here]

---TWEET3---
[your third tweet here]

Generate now:`;
  }
}

/**
 * Call Claude API via clawdbot agent
 */
async function callClaudeAPI(prompt) {
  try {
    // Escape the prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    // Call clawdbot agent with --local and a session ID
    const sessionId = `21m-generator-${Date.now()}`;
    const command = `${CLAWDBOT_PATH} agent --local --session-id "${sessionId}" --message '${escapedPrompt}' --json`;

    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000 // 60 second timeout
    });

    // Parse JSON response from clawdbot
    const response = JSON.parse(result);

    if (!response.payloads || !response.payloads[0] || !response.payloads[0].text) {
      throw new Error('No response text from clawdbot agent');
    }

    return response.payloads[0].text;
  } catch (err) {
    throw new Error(`Claude API call failed: ${err.message}`);
  }
}

/**
 * Parse Claude's response into 3 tweets
 */
function parseTweetsFromResponse(responseText) {
  const tweets = [];

  // Split by ---TWEET markers
  const parts = responseText.split(/---TWEET\d+---/);

  // Skip first part (before first marker) and extract tweets
  for (let i = 1; i < parts.length && i <= 3; i++) {
    const tweet = parts[i].trim();
    if (tweet) {
      tweets.push(tweet);
    }
  }

  if (tweets.length !== 3) {
    throw new Error(`Expected 3 tweets, got ${tweets.length}`);
  }

  return tweets;
}

/**
 * Validate character counts
 */
function validateTweets(tweets) {
  console.log('\n📏 Validating character counts...');

  let allValid = true;
  tweets.forEach((tweet, index) => {
    const length = tweet.length;
    console.log(`  Tweet ${index + 1}: ${length} chars`);

    if (length > 280) {
      console.error(`    ✗ Exceeds 280 character limit!`);
      allValid = false;
    } else {
      console.log(`    ✓ Within limit`);
    }
  });

  if (!allValid) {
    throw new Error('Some tweets exceed character limit');
  }

  console.log('  ✓ All tweets valid\n');
  return true;
}

/**
 * Save output
 */
function saveOutput(tweets, researchData, btcPrice) {
  const output = {
    type: `21m_${CONTENT_TYPE}_tweets`,
    timestamp: new Date().toISOString(),
    tweets: tweets,
    sources: {
      knowledge: researchData.source || 'Database',
      btc_price: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
      database_id: researchData.id,
      generated_by: 'claude-api'
    },
    metadata: {
      topic: researchData.topic,
      category: researchData.category,
      btc_price_now: `$${Math.round(btcPrice).toLocaleString()}`,
      verified: true,
      char_counts: tweets.map(t => t.length),
      generation_method: 'claude-sonnet-4-5'
    }
  };

  if (!DRY_RUN) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✓ Saved to: ${OUTPUT_FILE}\n`);
  }

  return output;
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n🤖 21M Claude-Powered Generator (${CONTENT_TYPE.toUpperCase()})\n`);
  console.log('═'.repeat(70));

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE\n');
  }

  try {
    // Step 1: Get research from database
    const researchData = getBestResearchFromDatabase(CONTENT_TYPE);
    if (!researchData) {
      console.error(`❌ No ${CONTENT_TYPE} research data available`);
      console.error('   Research automation must run first');
      return 1;
    }

    // Step 2: Get current BTC price
    console.log('📊 Fetching current BTC price...');
    const btcPrice = await getCurrentBTCPrice();
    console.log(`  ✓ BTC Price: $${btcPrice.toLocaleString()}\n`);

    // Step 3: Build prompt for Claude
    console.log('✍️  Building prompt for Claude...');
    const prompt = buildClaudePrompt(researchData, btcPrice, CONTENT_TYPE);
    if (VERBOSE) {
      console.log('\n--- PROMPT ---');
      console.log(prompt);
      console.log('--- END PROMPT ---\n');
    }

    // Step 4: Call Claude API
    console.log('🤖 Calling Claude API to generate content...');
    const responseText = await callClaudeAPI(prompt);

    if (VERBOSE) {
      console.log('\n--- CLAUDE RESPONSE ---');
      console.log(responseText);
      console.log('--- END RESPONSE ---\n');
    }

    // Step 5: Parse tweets
    console.log('📝 Parsing tweet variations...');
    const tweets = parseTweetsFromResponse(responseText);
    console.log(`  ✓ Generated ${tweets.length} tweets\n`);

    // Step 6: Validate
    validateTweets(tweets);

    // Step 7: Save output
    console.log('💾 Saving output...');
    const output = saveOutput(tweets, researchData, btcPrice);

    // Step 8: Mark as published in database
    if (!DRY_RUN) {
      try {
        db.markContentPublished(researchData.id);
        console.log('✓ Marked content as published in database\n');
      } catch (err) {
        console.log(`⚠️  Could not mark as published: ${err.message}\n`);
      }
    }

    // Summary
    console.log('═'.repeat(70));
    console.log('✅ Content generation complete!\n');
    console.log(`📁 Output: ${OUTPUT_FILE}\n`);
    console.log('Tweet previews:\n');
    tweets.forEach((tweet, i) => {
      console.log(`${i + 1}. (${tweet.length} chars)`);
      console.log(`   ${tweet.substring(0, 70)}...`);
      console.log('');
    });

    return 0;

  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    if (VERBOSE) {
      console.error(err.stack);
    }
    return 2;
  }
}

if (require.main === module) {
  main().then(code => process.exit(code));
}

module.exports = { buildClaudePrompt, callClaudeAPI, parseTweetsFromResponse };
