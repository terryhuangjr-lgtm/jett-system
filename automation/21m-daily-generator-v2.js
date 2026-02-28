#!/usr/bin/env node
/**
 * 21M Daily Tweet Generator v2
 * Uses verified content bank + live BTC price + Claude Haiku for formatting
 * Supports --type sports | --type bitcoin | --dry-run
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Load env from .env file manually
const ENV_PATH = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_PATH)) {
  const envLines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const CONTENT_BANK_PATH = path.join(__dirname, '21m-content-bank.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Parse --type flag
const typeIdx = process.argv.indexOf('--type');
const CONTENT_TYPE = typeIdx !== -1 ? process.argv[typeIdx + 1] : 'sports';

// Category mappings
const SPORTS_CATEGORIES = ['rookie_contract', 'nil_contract', 'broke_athlete', 'historic_contract', 'sports_business'];
const BITCOIN_CATEGORIES = ['bitcoin_education'];

function loadContentBank() {
  const raw = fs.readFileSync(CONTENT_BANK_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveContentBank(bank) {
  fs.writeFileSync(CONTENT_BANK_PATH, JSON.stringify(bank, null, 2));
}

function getCooldownDate(entry) {
  if (!entry.used_dates || entry.used_dates.length === 0) return null;
  const lastUsed = entry.used_dates[entry.used_dates.length - 1];
  const lastDate = new Date(lastUsed);
  const cooldown = entry.cooldown_days || 90;
  const nextAvailable = new Date(lastDate);
  nextAvailable.setDate(nextAvailable.getDate() + cooldown);
  return nextAvailable;
}

function isAvailable(entry) {
  const nextAvailable = getCooldownDate(entry);
  if (!nextAvailable) return true;
  return new Date() >= nextAvailable;
}

function selectEntry(bank, contentType) {
  const categories = contentType === 'bitcoin' ? BITCOIN_CATEGORIES : SPORTS_CATEGORIES;

  // Filter entries by relevant categories + availability
  const available = bank.entries.filter(e =>
    categories.includes(e.category) && isAvailable(e)
  );

  if (available.length === 0) {
    throw new Error(`No available entries for type "${contentType}". All on cooldown.`);
  }

  // Find least-used category to rotate evenly
  const categoryUsage = {};
  categories.forEach(c => { categoryUsage[c] = 0; });
  bank.entries.forEach(e => {
    if (categories.includes(e.category)) {
      categoryUsage[e.category] = (categoryUsage[e.category] || 0) + (e.used_dates ? e.used_dates.length : 0);
    }
  });

  // Sort categories by usage (ascending)
  const sortedCategories = Object.entries(categoryUsage)
    .sort((a, b) => a[1] - b[1])
    .map(([cat]) => cat);

  // Pick from least-used category that has available entries
  for (const cat of sortedCategories) {
    const catAvailable = available.filter(e => e.category === cat);
    if (catAvailable.length > 0) {
      // Pick random from this category
      return catAvailable[Math.floor(Math.random() * catAvailable.length)];
    }
  }

  // Fallback: any available
  return available[Math.floor(Math.random() * available.length)];
}

function fetchBtcPrice() {
  return new Promise((resolve, reject) => {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
    https.get(url, { headers: { 'User-Agent': '21m-content-generator/2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.bitcoin.usd);
        } catch (e) {
          reject(new Error('Failed to parse BTC price: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

function buildPrompt(entry, btcPrice, contentType) {
  const formattedPrice = btcPrice ? `$${btcPrice.toLocaleString()}` : 'current price unavailable';

  let context = '';

  if (entry.category === 'rookie_contract') {
    const then = `$${(entry.contract_value / 1000000).toFixed(1)}M`;
    const btcThen = `$${entry.btc_price_then.toLocaleString()}`;
    const btcNow = formattedPrice;
    const btcAmount = entry.btc_allocation;
    const currentValue = btcPrice ? Math.round(btcAmount * btcPrice) : null;
    const currentValueStr = currentValue ? `$${(currentValue / 1000000).toFixed(1)}M` : 'current value';

    context = `Athlete: ${entry.athlete} (${entry.sport})
Rookie contract: ${then} in ${entry.year}
BTC price in ${entry.year}: ${btcThen}
10% of contract in BTC: ${btcAmount} BTC
BTC price today: ${btcNow}
That ${btcAmount} BTC would be worth: ${currentValueStr} today`;
  } else if (entry.category === 'nil_contract') {
    const then = `$${(entry.contract_value / 1000000).toFixed(1)}M`;
    const btcThen = `$${entry.btc_price_then.toLocaleString()}`;
    const btcNow = formattedPrice;
    const btcAmount = entry.btc_allocation;
    const currentValue = btcPrice ? Math.round(btcAmount * btcPrice) : null;
    const currentValueStr = currentValue ? `$${(currentValue / 1000000).toFixed(1)}M` : 'current value';

    context = `Athlete: ${entry.athlete} (${entry.sport})
NIL deal: ${then} in ${entry.year}
BTC price in ${entry.year}: ${btcThen}
10% of NIL in BTC: ${btcAmount} BTC
BTC price today: ${btcNow}
That ${btcAmount} BTC would be worth: ${currentValueStr} today`;
  } else if (entry.category === 'broke_athlete') {
    const earnings = `$${(entry.career_earnings / 1000000).toFixed(0)}M`;
    const btcThen = entry.btc_price_then > 0 ? `$${entry.btc_price_then.toLocaleString()}` : 'not yet existed';
    const btcNow = formattedPrice;
    // Hypothetical: if they'd put 10% in BTC when they went broke
    const hypotheticalBtc = entry.btc_price_then > 0 ? Math.round((entry.career_earnings * 0.10) / entry.btc_price_then) : 0;
    const currentValue = (btcPrice && hypotheticalBtc > 0) ? Math.round(hypotheticalBtc * btcPrice) : null;
    const currentValueStr = currentValue ? `$${(currentValue / 1000000).toFixed(0)}M` : null;

    context = `Athlete: ${entry.athlete} (${entry.sport})
Career earnings: ${earnings}
Went broke: ${entry.broke_year}
BTC price then: ${btcThen}
${hypotheticalBtc > 0 ? `10% of career earnings in BTC at that time: ${hypotheticalBtc.toLocaleString()} BTC` : ''}
${currentValueStr ? `That BTC would be worth: ${currentValueStr} today` : ''}
BTC price today: ${btcNow}`;
  } else if (entry.category === 'historic_contract') {
    const total = `$${(entry.contract_value / 1000000).toFixed(1)}M`;
    const btcThen = `$${entry.btc_price_then.toLocaleString()}`;
    const btcNow = formattedPrice;
    const btcAmount = entry.btc_allocation;
    const currentValue = btcPrice ? Math.round(btcAmount * btcPrice) : null;
    const currentValueStr = currentValue ? `$${(currentValue / 1000000).toFixed(1)}M` : 'current value';

    context = `Athlete: ${entry.athlete} (${entry.sport})
Contract: ${total}${entry.contract_years ? ` over ${entry.contract_years} years` : ''} in ${entry.year}
BTC price in ${entry.year}: ${btcThen}
5% of contract in BTC: ${btcAmount} BTC
BTC price today: ${btcNow}
That ${btcAmount} BTC would be worth: ${currentValueStr} today`;
  } else if (entry.category === 'sports_business') {
    const total = `$${(entry.deal_value / 1000000000).toFixed(1)}B`;
    const btcThen = `$${entry.btc_price_then.toLocaleString()}`;
    const btcNow = formattedPrice;

    context = `Deal: ${entry.deal || entry.athlete} (${entry.sport})
Value: ${total}${entry.deal_years ? ` over ${entry.deal_years} years` : ''} in ${entry.year}
BTC price when signed: ${btcThen}
BTC price today: ${btcNow}`;
  } else if (entry.category === 'bitcoin_education') {
    context = `Fact: ${entry.fact || entry.verified_fact}
${entry.additional_context ? 'Context: ' + entry.additional_context : ''}`;
  }

  return `You write sharp, math-forward tweets about ${entry.category === 'bitcoin_education' ? 'Bitcoin facts and education' : 'sports contracts vs Bitcoin'}. No hype, no emojis, no BS.

Voice: Direct, factual, slight edge. Like a guy who ran the numbers and can't believe what he found.
Rules:
- Max 240 characters
- Max 2 hashtags total: only #Bitcoin or #21MSports — use sparingly (1 or 0 is fine)
- No moon/WAGMI/LFG/to the moon language
- No "imagine if" framing — state the math as fact
- Lead with the most shocking number
- End with a gut-punch observation or the math result

Context:
${context}

Write exactly 3 tweet variations. Number them 1., 2., 3. Each on its own line. No other text.`;
}

async function callClaudeHaiku(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in environment');

  const body = JSON.stringify({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error.message);
          resolve(parsed.content[0].text);
        } catch (e) {
          reject(new Error('Claude API error: ' + e.message + '\nResponse: ' + data.substring(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseTweets(rawText) {
  const lines = rawText.split('\n').filter(l => l.trim());
  const tweets = [];
  for (const line of lines) {
    const match = line.match(/^[123]\.\s+(.+)$/);
    if (match) tweets.push(match[1].trim());
  }
  return tweets;
}

function postToSlack(message) {
  const clawdbotPath = process.env.CLAWDBOT_PATH || 'clawdbot';
  const userId = '#21msports';

  const tmpFile = `/tmp/tweet-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, message);
  const cmd = `${clawdbotPath} message send --channel slack --target '${userId}' --message "$(cat ${tmpFile})" && rm ${tmpFile}`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error('Slack post failed:', e.message);
    return false;
  }
}

async function main() {
  console.log(`\n21M Daily Generator v2 | type: ${CONTENT_TYPE} | dry-run: ${DRY_RUN}\n`);

  // Load content bank
  const bank = loadContentBank();
  console.log(`Loaded ${bank.entries.length} entries from content bank`);

  // Select entry
  const entry = selectEntry(bank, CONTENT_TYPE);
  console.log(`Selected: [${entry.category}] ${entry.athlete || entry.deal} (${entry.sport})`);
  console.log(`Fact: ${entry.verified_fact}`);

  // Fetch live BTC price
  let btcPrice = null;
  try {
    btcPrice = await fetchBtcPrice();
    console.log(`Live BTC price: $${btcPrice.toLocaleString()}`);
  } catch (e) {
    console.warn(`Warning: Could not fetch BTC price: ${e.message}`);
  }

  // Build prompt and call Claude Haiku
  const prompt = buildPrompt(entry, btcPrice, CONTENT_TYPE);
  console.log('\nCalling Claude Haiku to generate tweets...');
  const rawTweets = await callClaudeHaiku(prompt);
  const tweets = parseTweets(rawTweets);

  if (tweets.length === 0) {
    console.error('No tweets parsed from Claude response:');
    console.error(rawTweets);
    process.exit(1);
  }

  console.log(`\n--- Generated Tweets (${tweets.length}) ---`);
  tweets.forEach((t, i) => {
    console.log(`\n[${i + 1}] (${t.length} chars)\n${t}`);
  });

  // Pick first tweet for posting
  const selectedTweet = tweets[0];
  console.log(`\nSelected tweet [1] for posting (${selectedTweet.length} chars)`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would post to Slack:');
    console.log(selectedTweet);
    console.log('\n[DRY RUN] Would mark entry as used in content bank');
    console.log('\nDry run complete. No changes made.');
    return;
  }

  // Post to Slack
  console.log('\nPosting to Slack...');
  const posted = postToSlack(selectedTweet);
  if (posted) {
    console.log('Posted successfully');
  } else {
    console.error('Failed to post to Slack');
    process.exit(1);
  }

  // Mark entry as used
  const today = new Date().toISOString().split('T')[0];
  const entryInBank = bank.entries.find(e => e.id === entry.id);
  if (entryInBank) {
    if (!entryInBank.used_dates) entryInBank.used_dates = [];
    entryInBank.used_dates.push(today);
  }
  bank.last_updated = today;
  saveContentBank(bank);
  console.log(`Marked entry #${entry.id} as used on ${today}`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
