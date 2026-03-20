#!/usr/bin/env node
/**
 * Jett Finance Monitor - Personal Financial News
 *
 * Runs 3x daily (6 AM, 12 PM, 6 PM) to scan for:
 * - Bitcoin/ETFs, Corporate Treasuries
 * - AI/Tech
 * - Energy
 * - Real Estate
 *
 * Output: Formatted Telegram message with organized news
 *
 * Usage:
 *   node jett-finance-monitor.js              # Run now
 *   node jett-finance-monitor.js --dry-run   # Test without sending
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const DRY_RUN = process.argv.includes('--dry-run');
const TIME_OF_DAY = new Date().getHours();
const MEMORY_DIR = path.join(require('os').homedir(), 'clawd', 'clawd', 'memory');
const WATCHLIST_PATH = path.join(MEMORY_DIR, 'jett-finance-watchlist.json');
const LOG_PATH = path.join(MEMORY_DIR, 'jett-finance-log.json');

// Focus areas
const FOCUS_AREAS = [
  {
    name: 'Bitcoin & ETFs',
    keywords: ['Bitcoin ETF', 'IBIT', 'GBTC', 'MicroStrategy', 'corporate Bitcoin treasury', 'Bitcoin institutional'],
    search_terms: ['Bitcoin ETF news', 'MicroStrategy BTC purchase', 'BlackRock IBIT']
  },
  {
    name: 'AI & Tech',
    keywords: ['NVDA', 'AMD', 'AI earnings', 'chip shortage', 'tech stock'],
    search_terms: ['NVDA news', 'AI semiconductor news', 'tech earnings']
  },
  {
    name: 'Energy',
    keywords: ['nuclear energy', 'solar power', 'grid', 'oil gas', 'energy sector'],
    search_terms: ['nuclear energy news', 'energy sector news', 'oil gas news']
  },
  {
    name: 'Real Estate',
    keywords: ['REIT', 'real estate market', 'mortgage rates', 'commercial real estate'],
    search_terms: ['REIT news', 'real estate market', 'mortgage rates']
  }
];

// Get time period label
function getTimeLabel() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 14) return 'Midday';
  if (hour >= 17 && hour < 20) return 'Evening';
  return 'Update';
}

/**
 * Load API keys
 */
function getSecret(name) {
  const secretsPath = path.join(process.env.HOME, '.clawd', 'secrets.json');
  try {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    return secrets[name];
  } catch {}
  return null;
}

/**
 * Load xAI API key and Ollama settings
 */
let XAI_API_KEY = '';
let XAI_MODEL = 'grok-4-1-fast';
let USE_KIMI = true;  // Use Kimi (free via Ollama) by default
let OLLAMA_API_KEY = 'ollama-local';

try {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'openclaw.json'), 'utf8'));
  const xaiProvider = config?.models?.providers?.xai;
  if (xaiProvider?.apiKey) {
    XAI_API_KEY = xaiProvider.apiKey;
  }
} catch (e) {}

/**
 * Brave Search
 */
async function braveSearch(query, count = 8) {
  const BRAVE_API_KEY = getSecret('BRAVE_API_KEY') || 'BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi';
  
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      q: query,
      count: count.toString(),
      freshness: 'pw',  // Past week
      search_lang: 'en',
      country: 'US'
    });

    const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

    const req = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Search each focus area
 */
async function searchAllAreas() {
  const results = [];
  
  for (const area of FOCUS_AREAS) {
    console.log(`\n🔍 Searching: ${area.name}...`);
    
    try {
      // Search multiple terms per area
      const allResults = [];
      
      for (const term of area.search_terms.slice(0, 2)) {
        try {
          const data = await braveSearch(term, 5);
          const webResults = data?.web?.results || [];
          allResults.push(...webResults);
        } catch (e) {
          console.log(`   ⚠️ Search failed: ${e.message}`);
        }
      }
      
      // Deduplicate by URL
      const seen = new Set();
      const uniqueResults = allResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      }).slice(0, 5);
      
      results.push({
        area: area.name,
        news: uniqueResults.map(r => ({
          title: r.title,
          url: r.url,
          description: r.description?.substring(0, 150) || ''
        }))
      });
      
      console.log(`   ✓ Found ${uniqueResults.length} articles`);
      
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
      results.push({ area: area.name, news: [], error: e.message });
    }
  }
  
  return results;
}

/**
 * Use Grok to format the news for Telegram
 */
async function formatWithGrok(results) {
  const timeLabel = getTimeLabel();
  
  // Build the news summary for Grok
  const newsText = results.map(r => {
    const items = r.news.slice(0, 3).map((n, i) => 
      `${i + 1}. ${n.title}\n   ${n.description}`
    ).join('\n\n');
    return `**${r.area}**\n${items || 'No news found'}`;
  }).join('\n\n');

  const prompt = `You are a financial news assistant. Format this news for a Telegram message.

Time: ${timeLabel} - ${new Date().toLocaleDateString()}

${newsText}

Create a well-organized Telegram message with:
- A brief header with the time period
- Each area as a section with 2-3 bullet points
- Keep headlines short and impactful
- Include a 📈 or 💰 emoji for each area
- If there are earnings, mergers, or major moves - highlight with 🔥
- End with a one-line summary of the most important thing to watch

Keep the total message under 1500 characters.`;

  // Try Kimi via Ollama first (free)
  if (USE_KIMI) {
    try {
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OLLAMA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'kimi-k2.5:cloud',
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          console.log('   ✓ Used Kimi K2.5 (free)');
          return data.choices[0].message.content;
        }
      }
    } catch (e) {
      console.log(`   ⚠️ Kimi failed: ${e.message}`);
    }
  }

  // Fallback to Grok if Kimi fails
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });

    const data = await response.json();
    console.log('   ✓ Used Grok (fallback)');
    return data.choices?.[0]?.message?.content || formatFallback(results);
    
  } catch (e) {
    console.log(`   ⚠️ Grok failed, using fallback: ${e.message}`);
    return formatFallback(results);
  }
}

/**
 * Simple fallback formatting if Grok fails
 */
function formatFallback(results) {
  const timeLabel = getTimeLabel();
  let message = `📊 *Finance Update - ${timeLabel}*\n\n`;
  
  for (const r of results) {
    if (r.news.length === 0) continue;
    
    message += `*${r.area}*\n`;
    for (const n of r.news.slice(0, 2)) {
      message += `• ${n.title.substring(0, 80)}\n`;
    }
    message += '\n';
  }
  
  return message;
}

/**
 * Send to Telegram
 */
async function sendToTelegram(message) {
  if (DRY_RUN) {
    console.log('\n📱 [DRY RUN] Message would be sent:\n');
    console.log(message);
    return true;
  }

  try {
    const TelegramChatID = '5867308866';
    const BOT_TOKEN = getSecret('TELEGRAM_BOT_TOKEN');
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TelegramChatID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log('✅ Message sent to Telegram');
      return true;
    } else {
      console.log('❌ Telegram error:', result.description);
      return false;
    }
  } catch (e) {
    console.log('❌ Failed to send:', e.message);
    return false;
  }
}

/**
 * Initialize watchlist file if it doesn't exist
 */
function initWatchlist() {
  if (!fs.existsSync(WATCHLIST_PATH)) {
    const defaultWatchlist = {
      tickers: [],
      keywords: [],
      areas: ['Bitcoin & ETFs', 'AI & Tech', 'Energy', 'Real Estate'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      note: 'Edit this file to add tickers or keywords to track. Run jett-finance-monitor.js --add-ticker=TICKER to add via CLI.'
    };
    
    fs.mkdirSync(path.dirname(WATCHLIST_PATH), { recursive: true });
    fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(defaultWatchlist, null, 2));
    console.log(`📝 Created watchlist: ${WATCHLIST_PATH}`);
  }
  
  return JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
}

/**
 * Log the run
 */
function logRun(results, success) {
  try {
    let log = { runs: [] };
    if (fs.existsSync(LOG_PATH)) {
      try { log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch {}
    }
    
    log.runs.unshift({
      time: new Date().toISOString(),
      success,
      areas: results.map(r => ({ area: r.area, count: r.news.length }))
    });
    
    log.runs = log.runs.slice(0, 50); // Keep last 50
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  } catch (e) {}
}

/**
 * Main
 */
async function main() {
  console.log('\n📊 JETT FINANCE MONITOR');
  console.log('=======================');
  console.log(`   Time: ${new Date().toLocaleTimeString()}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log('');
  
  // Initialize watchlist
  const watchlist = initWatchlist();
  console.log(`📋 Watching: ${watchlist.areas.join(', ')}`);
  if (watchlist.tickers.length > 0) {
    console.log(`   Tickers: ${watchlist.tickers.join(', ')}`);
  }
  
  // Search all areas
  console.log('\n🔎 Searching financial news...\n');
  const results = await searchAllAreas();
  
  // Format with Grok
  console.log('\n📝 Formatting with Grok...');
  const message = await formatWithGrok(results);
  
  // Send to Telegram
  const sent = await sendToTelegram(message);
  
  // Log
  logRun(results, sent);
  
  console.log('\n✅ Finance Monitor Complete\n');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  logRun([], false);
  process.exit(1);
});
