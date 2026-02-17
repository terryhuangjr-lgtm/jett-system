#!/usr/bin/env node
/**
 * 21M Unified Content Generator
 * 
 * Bitcoin: Reads from database (quality verified content)
 * Sports: Uses hardcoded contracts until DB grows
 * 
 * Usage:
 *   node 21m-unified-generator.js --type bitcoin
 *   node 21m-unified-generator.js --type sports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const CLAWDBOT_PATH = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const QUERY_SCRIPT = path.join(__dirname, 'query-db-content.py');

// Parse arguments
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');

if (typeIndex === -1 || !args[typeIndex + 1]) {
  console.error('Usage: node 21m-unified-generator.js --type <sports|bitcoin>');
  process.exit(1);
}

const CONTENT_TYPE = args[typeIndex + 1].toLowerCase();
const OUTPUT_FILE = path.join(MEMORY_DIR, `21m-${CONTENT_TYPE}-verified-content.json`);

console.log(`\n🤖 21M ${CONTENT_TYPE.toUpperCase()} Content Generator\n`);

// Hardcoded sports contracts (until DB grows)
const SPORTS_CONTRACTS = [
  { player: 'Juan Soto', team: 'New York Mets', sport: 'MLB', contract_value: '$765M', contract_value_usd: 765000000, signing_date: '2024-12-09', btc_price: 98000, source: 'https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/' },
  { player: 'Shohei Ohtani', team: 'Los Angeles Dodgers', sport: 'MLB', contract_value: '$700M', contract_value_usd: 700000000, signing_date: '2023-12-11', btc_price: 42000, source: 'https://www.spotrac.com/mlb/los-angeles-dodgers/shohei-ohtani-28250/' },
  { player: 'Aaron Judge', team: 'New York Yankees', sport: 'MLB', contract_value: '$360M', contract_value_usd: 360000000, signing_date: '2024-12-08', btc_price: 98500, source: 'https://www.spotrac.com/mlb/new-york-yankees/aaron-judge-23480/' },
  { player: 'Patrick Mahomes', team: 'Kansas City Chiefs', sport: 'NFL', contract_value: '$450M', contract_value_usd: 450000000, signing_date: '2020-07-06', btc_price: 9200, source: 'https://www.spotrac.com/nfl/kansas-city-chiefs/patrick-mahomes-21751/' },
  { player: 'Kirk Cousins', team: 'Atlanta Falcons', sport: 'NFL', contract_value: '$180M', contract_value_usd: 180000000, signing_date: '2024-03-13', btc_price: 72000, source: 'https://www.spotrac.com/nfl/atlanta-falcons/kirk-cousins-23420/' },
  { player: 'Tua Tagovailoa', team: 'Miami Dolphins', sport: 'NFL', contract_value: '$212.4M', contract_value_usd: 212400000, signing_date: '2024-07-26', btc_price: 68000, source: 'https://www.spotrac.com/nfl/miami-dolphins/tua-tagovailoa-30665/' },
  { player: 'Jordan Love', team: 'Green Bay Packers', sport: 'NFL', contract_value: '$220M', contract_value_usd: 220000000, signing_date: '2024-05-09', btc_price: 63000, source: 'https://www.spotrac.com/nfl/green-bay-packers/jordan-love-28944/' },
  { player: 'Joe Burrow', team: 'Cincinnati Bengals', sport: 'NFL', contract_value: '$275M', contract_value_usd: 275000000, signing_date: '2024-09-09', btc_price: 57000, source: 'https://www.spotrac.com/nfl/cincinnati-bengals/joe-burrow-28920/' },
  { player: 'Jared Goff', team: 'Detroit Lions', sport: 'NFL', contract_value: '$212M', contract_value_usd: 212000000, signing_date: '2024-01-24', btc_price: 50000, source: 'https://www.spotrac.com/nfl/detroit-lions/jared-goff-21710/' },
  { player: 'Justin Herbert', team: 'Los Angeles Chargers', sport: 'NFL', contract_value: '$262.5M', contract_value_usd: 262500000, signing_date: '2024-07-26', btc_price: 68000, source: 'https://www.spotrac.com/nfl/los-angeles-chargers/justin-herbert-28919/' },
  { player: 'Lamar Jackson', team: 'Baltimore Ravens', sport: 'NFL', contract_value: '$260M', contract_value_usd: 260000000, signing_date: '2023-04-27', btc_price: 30000, source: 'https://www.spotrac.com/nfl/baltimore-ravens/lamar-jackson-21754/' },
  { player: 'Jalen Brunson', team: 'New York Knicks', sport: 'NBA', contract_value: '$157.5M', contract_value_usd: 157500000, signing_date: '2024-08-02', btc_price: 61000, source: 'https://www.spotrac.com/nba/new-york-knicks/jalen-brunson-4485/' },
  { player: 'Donovan Mitchell', team: 'Cleveland Cavaliers', sport: 'NBA', contract_value: '$150.6M', contract_value_usd: 150600000, signing_date: '2024-07-06', btc_price: 55000, source: 'https://www.spotrac.com/nba/cleveland-cavaliers/donovan-mitchell-4492/' },
  { player: 'Tyrese Haliburton', team: 'Indiana Pacers', sport: 'NBA', contract_value: '$185M', contract_value_usd: 185000000, signing_date: '2024-07-07', btc_price: 56000, source: 'https://www.spotrac.com/nba/indiana-pacers/tyrese-haliburton-7788/' },
  { player: 'Paul George', team: 'Los Angeles Clippers', sport: 'NBA', contract_value: '$212M', contract_value_usd: 212000000, signing_date: '2024-07-09', btc_price: 57000, source: 'https://www.spotrac.com/nba/los-angeles-clippers/paul-george-4446/' },
  { player: 'OG Anunoby', team: 'New York Knicks', sport: 'NBA', contract_value: '$212.5M', contract_value_usd: 212500000, signing_date: '2024-07-10', btc_price: 58000, source: 'https://www.spotrac.com/nba/new-york-knicks/og-anunoby-7787/' },
];

// Track used sports contracts
const SPORTS_TRACKER = path.join(MEMORY_DIR, 'researched-players.json');

function getSportsContent() {
  let used = [];
  try {
    if (fs.existsSync(SPORTS_TRACKER)) {
      const data = JSON.parse(fs.readFileSync(SPORTS_TRACKER, 'utf8'));
      used = (data.players || []).map(p => p.name.toLowerCase());
    }
  } catch (e) {}
  
  // Filter unused contracts
  const unused = SPORTS_CONTRACTS.filter(c => !used.includes(c.player.toLowerCase()));
  
  if (unused.length === 0) {
    // Reset tracker if all used
    used = [];
    console.log('  🔄 All contracts used - resetting tracker');
  }
  
  return unused.slice(0, 3);
}

function queryDatabase(CONTENT_TYPE) {
  try {
    const result = execSync(`python3 "${QUERY_SCRIPT}" ${CONTENT_TYPE} 10`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return JSON.parse(result.trim());
  } catch (e) {
    return [];
  }
}

function getBTCPrice(callback) {
  https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { callback(parseFloat(JSON.parse(data).data.amount)); } 
      catch (e) { callback(67500); }
    });
  }).on('error', () => callback(67500));
}

function buildResearchSummary(content, type) {
  return content.map((item, i) => {
    if (type === 'sports') {
      return `
OPTION ${i + 1}:
Player: ${item.player}
Team: ${item.team}
Contract: ${item.contract_value}
Signing Date: ${item.signing_date}
BTC at signing: ${(item.contract_value_usd / item.btc_price).toFixed(2)} BTC
Source: Spotrac
`;
    } else {
      return `
OPTION ${i + 1}:
Topic: ${item.topic}
Content: ${item.content.substring(0, 300)}
Source: ${item.source || 'Database'}
`;
    }
  }).join('\n');
}

function buildPrompt(type, summary, btcPrice) {
  const btcFormatted = Math.round(btcPrice).toLocaleString();
  
  if (type === 'bitcoin') {
    return `
Generate 3 Twitter posts (max 280 chars each) about Bitcoin from these verified facts:

${summary}

Current BTC price: $${btcFormatted}

Rules:
- Conversational, no emojis, no hashtags
- Connect to 21 Million fixed supply theme
- Emphasize scarcity vs unlimited fiat

Format:
---TWEET1---
[tweet 1]

---TWEET2---
[tweet 2]

---TWEET3---
[tweet 3]
`;
  } else {
    return `
Generate 3 Twitter posts (max 280 chars each) about sports contracts from these verified findings:

${summary}

Current BTC price: $${btcFormatted}

Rules:
- Conversational, no emojis, no hashtags
- Calculate BTC equivalents
- Emphasize that dollars lose value while Bitcoin stays fixed

Format:
---TWEET1---
[tweet 1]

---TWEET2---
[tweet 2]

---TWEET3---
[tweet 3]
`;
  }
}

function parseTweets(text) {
  const tweets = [];
  const parts = text.split(/---TWEET\d+---/);
  for (let i = 1; i < parts.length && tweets.length < 3; i++) {
    const tweet = parts[i].trim();
    if (tweet && tweet.length > 20 && tweet.length <= 280) tweets.push(tweet);
  }
  return tweets;
}

// Main
getBTCPrice((btcPrice) => {
  let content, selected;
  
  if (CONTENT_TYPE === 'sports') {
    content = getSportsContent();
    if (content.length === 0) {
      // Reset and use all contracts
      const all = SPORTS_CONTRACTS.slice(0, 3);
      fs.writeFileSync(SPORTS_TRACKER, JSON.stringify({ version: "1.0", players: all.map(c => ({name: c.player})), updated: new Date().toISOString() }, null, 2));
      content = all;
    }
  } else {
    content = queryDatabase(CONTENT_TYPE);
  }
  
  if (content.length === 0) {
    console.log('❌ No content found');
    process.exit(1);
  }
  
  selected = content.slice(0, 3);
  console.log(`✓ Found ${content.length} content items, using ${selected.length}`);
  
  const summary = buildResearchSummary(selected, CONTENT_TYPE);
  const prompt = buildPrompt(CONTENT_TYPE, summary, btcPrice);
  
  console.log(`💰 BTC: $${Math.round(btcPrice).toLocaleString()}\n`);
  console.log('✍️ Generating...\n');
  
  try {
    const escaped = prompt.replace(/'/g, "'\\''");
    const sessionId = `21m-${Date.now()}`;
    const cmd = `${CLAWDBOT_PATH} agent --local --session-id "${sessionId}" --message '${escaped}' --json`;
    const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 60000 });
    
    const tweets = parseTweets(JSON.parse(result).payloads[0].text);
    
    if (tweets.length === 0) {
      console.error('❌ Parse failed');
      process.exit(1);
    }
    
    console.log('📏 Validating...');
    tweets.forEach((t, i) => console.log(`  ${i + 1}. ${t.length} chars ${t.length > 280 ? '❌' : '✓'}`));
    
    if (tweets.some(t => t.length > 280)) {
      console.error('❌ Too long');
      process.exit(1);
    }
    
    // Update tracker for sports
    if (CONTENT_TYPE === 'sports') {
      let data = { version: "1.0", players: [], updated: new Date().toISOString() };
      try {
        if (fs.existsSync(SPORTS_TRACKER)) data = JSON.parse(fs.readFileSync(SPORTS_TRACKER, 'utf8'));
      } catch (e) {}
      selected.forEach(c => {
        if (!data.players.find(p => p.name.toLowerCase() === c.player.toLowerCase())) {
          data.players.push({ name: c.player, date: new Date().toISOString() });
        }
      });
      fs.writeFileSync(SPORTS_TRACKER, JSON.stringify(data, null, 2));
    }
    
    // Save output
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
        source: CONTENT_TYPE === 'sports' ? 'hardcoded' : 'database'
      }
    };
    
    // Add contract or knowledge source
    if (CONTENT_TYPE === 'sports' && selected[0] && selected[0].source) {
      output.sources.contract = selected[0].source;
    } else if (selected[0] && selected[0].source) {
      output.sources.knowledge = selected[0].source;
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log(`\n✅ ${tweets.length} tweets saved to ${OUTPUT_FILE}\n`);
    tweets.forEach((t, i) => console.log(`${i + 1}. ${t.substring(0, 80)}...`));
    console.log('\n📌 Deploy: ' + OUTPUT_FILE);
    
  } catch (e) {
    console.error('❌ Claude failed:', e.message);
    process.exit(1);
  }
});
