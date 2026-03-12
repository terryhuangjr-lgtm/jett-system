#!/usr/bin/env node
/**
 * jett-community-pulse.js
 * 
 * On-demand community intelligence tool.
 * Searches Reddit + X via Brave Search, synthesizes with Grok.
 * 
 * Usage:
 *   node jett-community-pulse.js "NIL deals college football"
 *   node jett-community-pulse.js "AI automation real estate agents"
 *   node jett-community-pulse.js "PSA 10 sports card market"
 * 
 * Output: Telegram DM to Terry + saves .md briefing to ~/pulse-reports/
 */

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BRAVE_API_KEY = 'BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const CLAWDBOT = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const TERRY_TELEGRAM = '5867308866';
const REPORTS_DIR = path.join(process.env.HOME, 'pulse-reports');

// Load xAI API key from openclaw.json (same pattern as jett-daily-research.js)
let XAI_API_KEY = '';
let XAI_MODEL = 'grok-4-1-fast';
function loadXaiKey() {
  try {
    const configPath = path.join(process.env.HOME, '.openclaw/openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const xaiProvider = config?.models?.providers?.xai;
    if (xaiProvider?.apiKey) {
      XAI_API_KEY = xaiProvider.apiKey;
    } else {
      throw new Error('xAI apiKey not found in openclaw.json');
    }
  } catch (e) {
    throw new Error(`Failed to load xAI key: ${e.message}`);
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function decompress(data, encoding) {
  if (encoding === 'gzip') {
    return zlib.gunzipSync(data);
  } else if (encoding === 'deflate') {
    return zlib.inflateSync(data);
  } else if (encoding === 'br') {
    return zlib.brotliDecompressSync(data);
  }
  return data;
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const encoding = res.headers['content-encoding'];
      let data = Buffer.alloc(0);
      
      res.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });
      
      res.on('end', () => {
        try {
          // Decompress if needed
          if (encoding && ['gzip', 'deflate', 'br'].includes(encoding)) {
            data = decompress(data, encoding);
          }
          const text = data.toString('utf8');
          resolve(JSON.parse(text));
        } catch (e) {
          const text = data.toString('utf8').slice(0, 500);
          console.error('JSON parse failed, raw response:', text);
          reject(new Error(`JSON parse failed: ${text}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = https.request(options, (res) => {
      const encoding = res.headers['content-encoding'];
      let data = Buffer.alloc(0);
      
      res.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });
      
      res.on('end', () => {
        try {
          // Decompress if needed
          if (encoding && ['gzip', 'deflate', 'br'].includes(encoding)) {
            data = decompress(data, encoding);
          }
          const text = data.toString('utf8');
          resolve(JSON.parse(text));
        } catch (e) {
          const text = data.toString('utf8').slice(0, 500);
          console.error('JSON parse failed, raw response:', text);
          reject(new Error(`JSON parse failed: ${text}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

function sendTelegram(message) {
  try {
    execFileSync(CLAWDBOT, [
      'message', 'send',
      '--channel', 'telegram',
      '--target', TERRY_TELEGRAM,
      '--message', message
    ], { timeout: 15000, stdio: 'pipe' });
  } catch (e) {
    console.error('Telegram send failed:', e.message);
  }
}

function saveReport(topic, content) {
  try {
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const date = new Date().toISOString().split('T')[0];
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const filename = path.join(REPORTS_DIR, `${date}-${slug}.md`);
    fs.writeFileSync(filename, content);
    console.log(`Report saved: ${filename}`);
  } catch (e) {
    console.error('Report save failed:', e.message);
  }
}

function optimizeQuery(query) {
  // Split long queries, take first 4-5 meaningful words
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 5) {
    return words.slice(0, 5).join(' ');
  }
  return query;
}

// ─── BRAVE SEARCH ──────────────────────────────────────────────────────────
async function braveSearch(query, freshness = 'pm') {
  // Optimize long queries
  const optimizedQuery = optimizeQuery(query);
  if (optimizedQuery !== query) {
    console.log(`  Query optimized: "${query}" → "${optimizedQuery}"`);
  }
  
  // freshness: pd=past day, pw=past week, pm=past month
  const params = new URLSearchParams({
    q: optimizedQuery,
    count: '8',
    freshness,
    text_decorations: '0',
    search_lang: 'en'
  });
  const url = `${BRAVE_SEARCH_URL}?${params}`;
  
  try {
    const result = await httpsGet(url, {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    });
    
    if (!result.web || !result.web.results) return [];
    
    return result.web.results.slice(0, 8).map(r => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
      age: r.age || ''
    }));
  } catch (e) {
    console.error(`  Brave search failed for "${optimizedQuery}":`, e.message);
    return [];
  }
}

// ─── GROK SYNTHESIS ────────────────────────────────────────────────────────
async function synthesize(topic, redditResults, xResults) {
  if (!XAI_API_KEY) throw new Error('XAI_API_KEY not set in environment');

  const formatResults = (results, source) => {
    if (!results.length) return `No ${source} results found.`;
    return results.map((r, i) =>
      `${i + 1}. ${r.title}\n   ${r.description}\n   ${r.url}${r.age ? ` (${r.age})` : ''}`
    ).join('\n\n');
  };

  const prompt = `You are Jett, Terry Huang's AI assistant. Research task: community pulse on "${topic}".

REDDIT RESULTS (last 30 days):
${formatResults(redditResults, 'Reddit')}

X/TWITTER RESULTS (last 30 days):
${formatResults(xResults, 'X')}

Write a tight community pulse report. Format exactly like this:

🔍 PULSE: ${topic.toUpperCase()}
${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

📊 WHAT THE COMMUNITY IS SAYING:
• [key theme 1 — specific, grounded in the results]
• [key theme 2]
• [key theme 3]
• [key theme 4 if warranted]

🔥 STRONGEST SIGNAL:
[1-2 sentences on the most upvoted/discussed angle]

💡 TERRY'S ANGLE:
[1-2 sentences on how this is relevant to @21MSports, Level Up Digital, Level Up Cards, or Level Up family — whichever applies. Be specific.]

📎 TOP SOURCE: [most relevant URL from results]

---
Sources: ${redditResults.length} Reddit + ${xResults.length} X results

Rules:
- Be specific, not generic. Quote actual titles/discussions if useful.
- If results are thin, say so honestly. Don't pad.
- Keep total response under 300 words.
- No filler. Terry hates fluff.`;

  const response = await httpsPost(
    XAI_API_URL,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    {
      model: 'grok-4-1-fast',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    }
  );

  if (!response.choices || !response.choices[0]) {
    throw new Error(`Grok API error: ${JSON.stringify(response)}`);
  }

  return response.choices[0].message.content;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const topic = process.argv.slice(2).join(' ').trim();

  if (!topic) {
    console.error('Usage: node jett-community-pulse.js "your topic here"');
    console.error('Example: node jett-community-pulse.js "NIL deals college football"');
    process.exit(1);
  }

  // Load xAI key from openclaw.json (same pattern as jett-daily-research.js)
  loadXaiKey();

  console.log(`\n🔍 Pulse: "${topic}"`);
  console.log('Searching Reddit...');

  // Two Brave searches: Reddit + X (graceful fail per source)
  const [redditResults, xResults] = await Promise.all([
    braveSearch(`site:reddit.com ${topic}`, 'pm'),
    braveSearch(`site:x.com OR site:twitter.com ${topic}`, 'pm')
  ]);

  console.log(`Found: ${redditResults.length} Reddit + ${xResults.length} X results`);
  
  // Check if we got any results
  if (redditResults.length === 0 && xResults.length === 0) {
    const noResultsMsg = `🔍 PULSE: ${topic.toUpperCase()}
${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

⚠️ No recent Reddit or X results found for this topic.

💡 TERRY'S ANGLE:
Try a different query or check back later. Common issues:
- Topic too niche for Reddit/X discussion
- Try fewer words (e.g., "NIL football" instead of "NIL deals college football")
- Broader terms tend to yield more results`;

    console.log('\n' + noResultsMsg);
    saveReport(topic, `# Community Pulse: ${topic}\n\n${noResultsMsg}`);
    sendTelegram(noResultsMsg);
    console.log('\n✅ Sent to Telegram');
    return;
  }

  console.log('Synthesizing with Grok...');

  const summary = await synthesize(topic, redditResults, xResults);

  console.log('\n' + summary);

  // Save report
  const reportContent = `# Community Pulse: ${topic}\n\n${summary}\n\n## Raw Reddit Results\n\n${
    redditResults.map(r => `- [${r.title}](${r.url})\n  ${r.description}`).join('\n')
  }\n\n## Raw X Results\n\n${
    xResults.map(r => `- [${r.title}](${r.url})\n  ${r.description}`).join('\n')
  }`;
  
  saveReport(topic, reportContent);

  // Send to Telegram
  sendTelegram(summary);
  console.log('\n✅ Sent to Telegram');
}

main().catch(err => {
  console.error('Pulse failed:', err.message);
  sendTelegram(`🚨 Pulse script failed for topic. Error: ${err.message}`);
  process.exit(1);
});
