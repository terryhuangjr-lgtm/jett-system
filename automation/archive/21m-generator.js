#!/usr/bin/env node
/**
 * 21M Content Generator - Uses Smart Content Pool
 * 
 * Reads from content_pool_manager.py for smart selection
 * Supports both SPORTS and BTC content
 * 
 * Usage:
 *   node 21m-generator.js --type bitcoin
 *   node 21m-generator.js --type sports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const CLAWDBOT_PATH = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const POOL_MANAGER = '/home/clawd/clawd/automation/content_pool_manager.py';

// Parse arguments
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');

if (typeIndex === -1 || !args[typeIndex + 1]) {
  console.error('Usage: node 21m-generator.js --type <sports|bitcoin>');
  process.exit(1);
}

const CONTENT_TYPE = args[typeIndex + 1].toLowerCase();
const OUTPUT_FILE = path.join(MEMORY_DIR, `21m-${CONTENT_TYPE}-verified-content.json`);

console.log(`\n🤖 21M ${CONTENT_TYPE.toUpperCase()} Content Generator\n`);

// Get BTC price
function getBTCPrice(callback) {
  https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        callback(parseFloat(JSON.parse(data).data.amount));
      } catch (e) { callback(67000); }
    });
  }).on('error', () => callback(67000));
}

// Select content from pool
function selectContent(type, btcPrice) {
  try {
    const result = execSync(`python3 "${POOL_MANAGER}" --select ${type} --btc-price ${btcPrice} --btc-trend neutral`, {
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024
    });
    return JSON.parse(result);
  } catch (e) {
    console.error('Pool error:', e.message);
    return null;
  }
}

// Build prompt
function buildPrompt(type, content, btcPrice) {
  const items = content.content || [];
  const btcFormatted = Math.round(btcPrice).toLocaleString();
  
  const researchStr = items.map((item, i) => `
OPTION ${i + 1}:
Topic: ${item.topic}
Content: ${item.content.substring(0, 400)}
Category: ${item.category}
Quality: ${item.quality_score}/10
`).join('\n');
  
  if (type === 'bitcoin') {
    return `
Generate 3 Twitter posts (max 280 chars each) about Bitcoin from these verified facts:

${researchStr}

Current BTC price: $${btcFormatted}

Rules:
- Conversational, no emojis, no hashtags
- Connect to 21 Million fixed supply theme
- Emphasize scarcity vs unlimited fiat

Format:
---TWEET1---
[tweet]

---TWEET2---
[tweet]

---TWEET3---
[tweet]
`;
  } else {
    return `
Generate 3 Twitter posts (max 280 chars each) about sports contracts from these verified facts:

${researchStr}

Current BTC price: $${btcFormatted}

Rules:
- Conversational, no emojis, no hashtags
- Convert contracts to BTC
- Emphasize dollars lose value, Bitcoin stays fixed

Format:
---TWEET1---
[tweet]

---TWEET2---
[tweet]

---TWEET3---
[tweet]
`;
  }
}

// Parse tweets
function parseTweets(text) {
  const tweets = [];
  const parts = text.split(/---TWEET\d+---/);
  for (let i = 1; i < parts.length && tweets.length < 3; i++) {
    const tweet = parts[i].trim();
    if (tweet && tweet.length > 20 && tweet.length <= 280) {
      tweets.push(tweet);
    }
  }
  return tweets;
}

// Get current date for topics
function getTopics(content) {
  const items = content.content || [];
  return items.map(i => i.topic);
}

// Main
getBTCPrice((btcPrice) => {
  console.log(`💰 BTC Price: $${Math.round(btcPrice).toLocaleString()}\n`);
  
  console.log('📊 Selecting content from pool...');
  const content = selectContent(CONTENT_TYPE, btcPrice);
  
  if (!content || !content.content || content.content.length === 0) {
    console.log('❌ No content available from pool');
    process.exit(1);
  }
  
  const items = content.content.slice(0, 3);
  console.log(`✓ Selected ${items.length} items\n`);
  
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.topic} (${item.category})`);
  });
  console.log();
  
  const prompt = buildPrompt(CONTENT_TYPE, { content: items }, btcPrice);
  
  console.log('✍️ Generating tweets...\n');
  
  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    const sessionId = `21m-${Date.now()}`;
    const cmd = `${CLAWDBOT_PATH} agent --local --session-id "${sessionId}" --message '${escaped}' --json`;
    
    const result = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000
    });

    const response = JSON.parse(result);
    const text = response.payloads[0].text;
    const tweets = parseTweets(text);
    
    if (tweets.length === 0) {
      console.error('❌ Parse failed');
      process.exit(1);
    }
    
    console.log('📏 Validating...');
    tweets.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.length} chars ${t.length > 280 ? '❌' : '✓'}`);
    });
    
    if (tweets.some(t => t.length > 280)) {
      console.error('❌ Too long');
      process.exit(1);
    }
    
    // Save output
    // Extract unique sources from content items
    const sources = {
      btc_price: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
      content_count: tweets.length
    };
    
    // Extract sources from content items (look for URLs in content or source field)
    const urlPattern = /https?:\/\/[^\s\)]+/;
    const sourceUrls = [];
    
    for (const item of items) {
      // Check explicit source field first
      if (item.source && item.source.startsWith('http')) {
        sourceUrls.push(item.source);
      } else {
        // Extract from content text
        const match = (item.content || '').match(urlPattern);
        if (match) {
          sourceUrls.push(match[0]);
        }
      }
    }
    
    // For Bitcoin content without URLs, use Wikipedia as default
    const defaultBtcSource = 'https://en.wikipedia.org/wiki/Bitcoin';
    
    // Add sources to output
    if (CONTENT_TYPE === 'sports' && sourceUrls.length > 0) {
      sources.contract = sourceUrls[0];
      if (sourceUrls.length > 1) {
        sources.additional = [...new Set(sourceUrls.slice(0, 5))];
      }
    } else if (sourceUrls.length > 0) {
      sources.knowledge = sourceUrls[0];
      if (sourceUrls.length > 1) {
        sources.additional = [...new Set(sourceUrls.slice(0, 5))];
      }
    } else if (CONTENT_TYPE === 'bitcoin') {
      // Default to Bitcoin Wikipedia for historical/educational content
      sources.knowledge = defaultBtcSource;
    }
    
    const output = {
      type: `21m_${CONTENT_TYPE}_tweets`,
      timestamp: new Date().toISOString(),
      tweets,
      sources,
      metadata: {
        btc_price_now: `$${Math.round(btcPrice).toLocaleString()}`,
        verified: true,
        char_counts: tweets.map(t => t.length),
        topics: getTopics({ content: items }),
        categories: items.map(i => i.category),
        source: 'content_pool',
        content_ids: items.map(i => i.id)
      }
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    // Mark content as used in the pool (starts 7-day cooldown)
    try {
      const contentIds = items.map(i => i.id).join(',');
      execSync(`python3 "${POOL_MANAGER}" --mark-used "${OUTPUT_FILE}"`, { encoding: 'utf8' });
    } catch (e) {
      console.warn('⚠ Could not mark content as used:', e.message);
    }
    
    console.log(`\n✅ Generated ${tweets.length} tweets`);
    console.log(`📁 Saved: ${OUTPUT_FILE}\n`);
    
    tweets.forEach((t, i) => {
      console.log(`${i + 1}. ${t.substring(0, 80)}...`);
    });
    console.log();
    
    console.log('📌 Next: Deploy with:');
    console.log(`   node deploy-21m-tweet.js ${OUTPUT_FILE}\n`);
    
  } catch (e) {
    console.error('❌ Claude error:', e.message);
    process.exit(1);
  }
});
