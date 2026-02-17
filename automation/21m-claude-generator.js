#!/usr/bin/env node
/**
 * 21M Content Generator
 * 
 * Simple, robust content generation for 21M Sports and Bitcoin.
 * Uses athlete-tracker to prevent duplicates.
 * 
 * Usage:
 *   node 21m-claude-generator.js --type bitcoin
 *   node 21m-claude-generator.js --type sports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const CLAWDBOT_PATH = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const LOG_DIR = path.join(MEMORY_DIR, 'task-logs');

// Load athlete tracker for sports content
let athleteTracker = null;
if (fs.existsSync(path.join(__dirname, 'lib', 'athlete-tracker.js'))) {
  try {
    athleteTracker = require('./lib/athlete-tracker.js');
    athleteTracker = new athleteTracker();
    console.log(`✓ Athlete tracker loaded: ${athleteTracker.getStats().recently_used} recently used`);
  } catch (e) {
    console.log('⚠️  Could not load athlete tracker:', e.message);
  }
}

/**
 * Log selection for debugging
 */
function logSelection(playerName, lastUsed = null) {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const logFile = path.join(LOG_DIR, `21m-sports-selections-${dateStr}.log`);
  
  const entry = `[${new Date().toISOString()}] Selected: ${playerName} (last_used: ${lastUsed || 'never'})\n`;
  
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(logFile, entry);
  } catch (err) {
    // Ignore
  }
}

// Parse arguments
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
if (typeIndex === -1 || !args[typeIndex + 1]) {
  console.error('Usage: node 21m-claude-generator.js --type <bitcoin|sports>');
  process.exit(1);
}

const CONTENT_TYPE = args[typeIndex + 1].toLowerCase();
const OUTPUT_FILE = path.join(MEMORY_DIR, `21m-${CONTENT_TYPE}-verified-content.json`);
const RESEARCH_FILE = path.join(MEMORY_DIR, `21m-${CONTENT_TYPE}-verified-research.json`);

console.log(`\n🤖 21M ${CONTENT_TYPE.toUpperCase()} Content Generator\n`);

// Load research data
let research;
try {
  research = JSON.parse(fs.readFileSync(RESEARCH_FILE, 'utf8'));
  
  // Filter out recently used athletes for sports content
  if (CONTENT_TYPE === 'sports' && athleteTracker && research.findings) {
    const originalCount = research.findings.length;
    
    // Filter: must be signed AFTER Bitcoin existed (2009+) AND have a valid player name
    const BTC_LAUNCH = new Date('2009-01-03');
    let validEra = research.findings.filter(f => {
      if (!f.player || f.player.startsWith('#')) return false; // Skip non-player entries
      if (!f.signing_date) return true;
      return new Date(f.signing_date) >= BTC_LAUNCH;
    });
    console.log(`✓ ${validEra.length} athletes with post-2009 contracts (Bitcoin era)`);
    
    // From valid era, filter out recently used (14 days)
    let available = validEra.filter(f => {
      if (!f.player) return true;
      return !athleteTracker.wasRecentlyUsed(f.player, 14);
    });
    
    // Second try: extend to 30 days
    if (available.length === 0) {
      console.log('⚠️ All athletes used in 14 days, checking 30-day filter...');
      available = validEra.filter(f => {
        if (!f.player) return true;
        return !athleteTracker.wasRecentlyUsed(f.player, 30);
      });
    }
    
    // Last resort: use all from valid era
    if (available.length === 0) {
      console.log('⚠️ All athletes recently used - using full valid era list');
      available = validEra;
    }
    
    // RANDOMLY shuffle and pick 1 athlete only (then generate 3 variations)
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    
    // Filter out most recently used (last 6 picks = 2 days worth)
    const recentlyUsedNames = Object.keys(athleteTracker.data.athletes).slice(-6);
    available = available.filter(f => !recentlyUsedNames.includes(f.player.toLowerCase()));
    
    if (available.length < 1) {
      console.log('⚠️ Not enough fresh athletes, using full valid pool');
      available = validEra;
    }
    
    available = shuffleArray(available).slice(0, 1); // Only 1 athlete
    console.log(`✓ Selected 1 athlete from pool of ${validEra.length}`);
    
    research.findings = available;
    console.log(`✓ Loaded research with ${research.findings.length} findings`);
  }
} catch (e) {
  console.error(`❌ Research file not found: ${RESEARCH_FILE}`);
  console.error('   Run research first!');
  process.exit(1);
}

// Get BTC price
function getBTCPrice(callback) {
  https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const price = parseFloat(JSON.parse(data).data.amount);
        callback(price);
      } catch (e) { callback(67500); }
    });
  }).on('error', () => callback(67500));
}

// Build research summary
function buildResearchSummary(findings) {
  return findings.map((f, i) => {
    // Check if it's sports format (has player) or bitcoin format (has topic)
    if (f.player) {
      return `
OPTION ${i + 1}:
Player: ${f.player}
Team: ${f.team}
Contract: ${f.contract_value}
BTC at signing: ${f.btc_equivalent} BTC
Date: ${f.signing_date}
Source: ${f.source_name}
`;
    } else {
      return `
OPTION ${i + 1}:
Topic: ${f.topic}
Fact: ${(f.content || '').substring(0, 300)}
Source: ${f.source_name}
`;
    }
  }).join('\n');
}

// Generate prompt
function buildPrompt(CONTENT_TYPE, researchSummary, btcPrice) {
  const btcFormatted = Math.round(btcPrice).toLocaleString();
  
  if (CONTENT_TYPE === 'bitcoin') {
    return `
You are a master Twitter writer crafting viral tweets about Bitcoin and money.

CONTENT: Generate 3 HIGH-IMPACT tweets (max 280 chars) about Bitcoin appreciation and fiat debasement.

${researchSummary}

Current BTC price: $${btcFormatted}

TONE: Provocative, insightful, conversational. 
CRITICAL ANGLES TO CHOOSE FROM (pick the BEST one for each tweet):
1. **Fiat Debasement**: Show how dollars lose purchasing power over time
   - "The dollar lost 97% since 1913. Your savings are melting."
   - "Every year your cash sits there, it's worth less. Bitcoin doesn't have this problem."

2. **Bitcoin Appreciation**: Show how Bitcoin gains value
   - "Bitcoin went from $0.001 to $68,000. That's not volatility. That's appreciation."
   - "1 BTC = 1 BTC. But $1 in 2010 = $68,000 today in Bitcoin terms."

3. **For Young Athletes/NIL Kids**: 
   - "College athletes getting $1M+ NIL deals. Put 10% in Bitcoin and don't touch it for 10 years."
   - "NIL money is life-changing. But so is not losing half to taxes and inflation. Here's the play."

4. **Small Investment, Big Returns**:
   - "Started with $50/month in 2015? That's $1.2M now."
   - "You don't need millions. You need consistency. Bitcoin doesn't care about the amount."

Rules:
- NO emojis, NO hashtags
- Hook readers in first 5 words
- Make people think "I need to act on this"
- Each tweet should focus on ONE clear angle

Format each tweet as:
---TWEET1---
[Your tweet - focus on fiat debasement]

---TWEET2---
[Your tweet - focus on Bitcoin appreciation]

---TWEET3---
[Your tweet - for young athletes/NIL or small investments]
`;
  } else {
    return `Write 3 tweets about this athlete contract compared to Bitcoin:

${researchSummary}

BTC now: $${btcFormatted}

---TWEET1---
[tweet]

---TWEET2---
[tweet]

---TWEET3---
[tweet]`;
  }
}

// Parse tweets from Claude response
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

// Save output
function saveOutput(tweets, research, btcPrice) {
  const output = {
    type: `21m_${CONTENT_TYPE}_tweets`,
    timestamp: new Date().toISOString(),
    tweets,
    sources: {
      btc_price: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
      content_count: tweets.length
    },
    metadata: {
      btc_price_now: `$${Math.round(btcPrice).toLocaleString()}`,
      verified: true,
      char_counts: tweets.map(t => t.length),
      topics: research.findings.map(f => f.topic)
    }
  };
  
  // Add sources based on content type
  if (CONTENT_TYPE === 'bitcoin' && research.findings[0]) {
    output.sources.knowledge = research.findings[0].sources[0];
  }
  
  // Add contract sources for sports content
  if (CONTENT_TYPE === 'sports' && research.findings[0] && research.findings[0].sources) {
    output.sources.contract = research.findings[0].sources[0];
  }
  
  // Add BTC price sources from research
  if (research.btc_prices) {
    const priceKeys = Object.keys(research.btc_prices);
    if (priceKeys.length > 0 && research.btc_prices[priceKeys[0]].source) {
      output.sources.btc_price_source = research.btc_prices[priceKeys[0]].source;
    }
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  return output;
}

// Main execution
getBTCPrice((btcPrice) => {
  console.log(`💰 BTC Price: $${Math.round(btcPrice).toLocaleString()}\n`);
  
  const researchSummary = buildResearchSummary(research.findings);
  const prompt = buildPrompt(CONTENT_TYPE, researchSummary, btcPrice);
  
  console.log('✍️ Generating content...\n');
  
  try {
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const sessionId = `21m-gen-${Date.now()}`;
    const command = `CLAUDE_MODEL=anthropic/claude-sonnet-4-5 ${CLAWDBOT_PATH} agent --local --session-id "${sessionId}" --message '${escapedPrompt}' --json`;
    
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000
    });

    const response = JSON.parse(result);
    const text = response.payloads[0].text;
    const tweets = parseTweets(text);
    
    if (tweets.length === 0) {
      console.error('❌ Failed to parse tweets from Claude response');
      console.log('\nRaw response:\n' + text.substring(0, 800));
      process.exit(1);
    }
    
    console.log('📏 Validating...');
    tweets.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.length} chars ${t.length > 280 ? '❌' : '✓'}`);
    });
    
    if (tweets.some(t => t.length > 280)) {
      console.error('❌ Some tweets exceed 280 chars');
      process.exit(1);
    }
    
    const output = saveOutput(tweets, research, btcPrice);
    
    // Mark athletes as used for sports content
    if (CONTENT_TYPE === 'sports' && athleteTracker && research.findings) {
      for (const finding of research.findings) {
        if (finding.player) {
          const lastUsed = athleteTracker.wasRecentlyUsed(finding.player, 14)
            ? athleteTracker.data.athletes[finding.player.toLowerCase()]
            : null;
          athleteTracker.markUsed(finding.player);
          logSelection(finding.player, lastUsed);
          console.log(`✓ Marked ${finding.player} as used`);
        }
      }
    }
    
    console.log(`\n✅ Generated ${tweets.length} tweets`);
    console.log(`📁 Saved: ${OUTPUT_FILE}\n`);
    
    tweets.forEach((t, i) => {
      console.log(`${i + 1}. ${t.substring(0, 80)}...`);
    });
    console.log();
    
  } catch (e) {
    console.error('❌ Claude API failed:', e.message);
    process.exit(1);
  }
});
