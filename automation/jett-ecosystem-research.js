#!/usr/bin/env node
/**
 * Jett Ecosystem Research — Weekly AI & Tools Digest
 *
 * Runs Wed/Sat overnight to find new tools, skills, and ideas
 * relevant to Terry's projects. Emails a digest.
 *
 * Usage:
 *   node jett-ecosystem-research.js
 *   node jett-ecosystem-research.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const EMAIL_SCRIPT = path.join(__dirname, '..', 'lib', 'send-email.js');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── API Keys ────────────────────────────────────────────────────────────────

let XAI_API_KEY = '';
const XAI_MODEL = 'grok-4-1-fast';

try {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'openclaw.json'), 'utf8'));
  XAI_API_KEY = config?.models?.providers?.xai?.apiKey || '';
} catch (e) {
  console.error('⚠️ Could not read xAI config');
}

function getSecret(name) {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(new RegExp(`${name}=(.+)`));
    if (match) return match[1].trim();
  } catch {}
  return null;
}

const BRAVE_API_KEY = getSecret('BRAVE_API_KEY') || 'BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi';

// ─── Search Budget ───────────────────────────────────────────────────────────

let braveCallCount = 0;
const MAX_BRAVE_CALLS = 40;

// ─── Research Topics ─────────────────────────────────────────────────────────

const RESEARCH_TOPICS = [
  {
    area: 'OpenClaw & Agent Tools',
    queries: [
      'OpenClaw new skills ClawHub 2026',
      'Hermes agent new features tips',
      'AI agent automation tools new release',
      'MCP tools new integrations 2026'
    ]
  },
  {
    area: 'Content Generation & Social',
    queries: [
      'AI content generation tools new 2026',
      'Twitter X automation tools AI',
      'social media AI scheduling tools'
    ]
  },
  {
    area: 'Sports Cards & Collecting',
    queries: [
      'sports card pricing API tools 2026',
      'card grading AI tools new',
      'eBay sports card scraping tools',
      'PSA grading population data API'
    ]
  },
  {
    area: 'Lead Generation',
    queries: [
      'AI lead generation tools small business 2026',
      'Google Maps scraping leads tools',
      'local business outreach automation'
    ]
  },
  {
    area: 'Web Scraping & Data',
    queries: [
      'web scraping tools new 2026',
      'Scrapling alternatives browser automation',
      'data extraction AI tools'
    ]
  },
  {
    area: 'Local LLM & AI Updates',
    queries: [
      'local LLM new release this week',
      'Ollama new models 2026',
      'AI optimization consumer GPU 2026'
    ]
  }
];

// ─── Brave Search with Retry ─────────────────────────────────────────────────

async function braveSearch(query, count = 3) {
  if (braveCallCount >= MAX_BRAVE_CALLS) {
    console.log(`   ⚠️ API budget reached (${MAX_BRAVE_CALLS}). Skipping.`);
    return [];
  }

  braveCallCount++;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const waitMs = (2 + attempt * 3) * 1000;
        console.log(`   ↻ Retry ${attempt + 1}/${maxRetries}, waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
      }

      const params = new URLSearchParams({
        q: query,
        count: count.toString(),
        freshness: 'pw',
        search_lang: 'en',
        country: 'US'
      });

      const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

      const result = await new Promise((resolve, reject) => {
        const req = https.get(url, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': BRAVE_API_KEY
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 429) {
              const wait = (attempt + 1) * 15 * 1000;
              console.log(`   ⚠️ Rate limited. Waiting ${wait / 1000}s...`);
              setTimeout(() => resolve(null), wait);
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      if (result === null) continue; // 429 handled, retry

      const webResults = result?.web?.results || [];
      return webResults.slice(0, 3).map(r => ({
        title: r.title || '',
        url: r.url || '',
        description: r.description?.substring(0, 200) || ''
      }));

    } catch (e) {
      if (attempt < maxRetries - 1) {
        console.log(`   ⚠️ Search error (attempt ${attempt + 1}): ${e.message}`);
        await sleep(5000);
      } else {
        console.log(`   ❌ Search failed after ${maxRetries} attempts: ${e.message}`);
        return [];
      }
    }
  }

  return [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Grok X Search ──────────────────────────────────────────────────────────

async function xSearchWithGrok(query) {
  if (!XAI_API_KEY) {
    console.log('   ⚠️ No xAI key — skipping X search');
    return null;
  }

  try {
    // Calculate date range: past week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = oneWeekAgo.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];

    const response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast',
        input: [
          {
            role: 'user',
            content: `What are people on X (Twitter) saying about: ${query}? Summarize the key discussions, announcements, and any new tools or projects mentioned. Be specific — include names, links, and reactions.`
          }
        ],
        tools: [
          {
            type: 'x_search',
            from_date: fromDate,
            to_date: toDate
          }
        ]
      })
    });

    const data = await response.json();

    // Extract text content from Responses API format
    let text = '';
    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          if (Array.isArray(item.content)) {
            text += item.content.map(c => c.text || '').join('');
          } else {
            text += item.content;
          }
        }
      }
    }

    return text || null;
  } catch (e) {
    console.log(`   ⚠️ X search error: ${e.message}`);
    return null;
  }
}

// ─── Grok Synthesis ──────────────────────────────────────────────────────────

async function synthesizeFindings(combinedInput) {
  if (!XAI_API_KEY) {
    console.error('   ❌ No xAI API key configured');
    return 'Unable to synthesize — no API key.';
  }

  const webResults = combinedInput.webResults || [];
  const xDiscussion = combinedInput.xDiscussion || 'No X discussion found.';

  const prompt = `You are Terry's AI research assistant.
Terry runs: CardMiner (eBay card scanner), @21MSports
(Bitcoin/sports content), Level Up Digital (web design
agency), and uses OpenClaw/Jett for automation.

Analyze these search results and X discussions to identify the 3-5 most
relevant and actionable findings for Terry's projects.

For each finding include:
- What it is (1 sentence)
- Why it's relevant to Terry's work (1 sentence)
- How to try it or where to find it (1 sentence)

Be specific and practical. Skip generic AI news.
Focus on tools, skills, APIs, or techniques Terry
could actually use.

Do NOT use hashtags. Do NOT use markdown bold (**text**).
Keep formatting plain — just short finding titles followed by
explanatory bullets.

Web search results:
${JSON.stringify(webResults, null, 2)}

X (Twitter) discussions:
${xDiscussion}`;

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
    return data.choices?.[0]?.message?.content || 'No synthesis generated.';
  } catch (e) {
    console.error('   ❌ Grok synthesis failed:', e.message);
    return 'Synthesis failed: ' + e.message;
  }
}

// ─── Email Formatting ────────────────────────────────────────────────────────

function cleanSynthesisText(text) {
  // Remove hashtags (#word)
  text = text.replace(/#\w+/g, '');
  // Remove markdown bold markers
  text = text.replace(/\*\*/g, '');
  // Collapse multiple spaces
  text = text.replace(/[ \t]+/g, ' ');
  return text.trim();
}

function buildEmailHtml(topicResults, dateStr) {
  let html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333;line-height:1.6">
  <h2 style="margin:0 0 4px 0;font-size:22px;color:#1a1a1a">Ecosystem Research Digest</h2>
  <p style="margin:0 0 24px 0;color:#888;font-size:14px">${dateStr}</p>
`;

  for (const topic of topicResults) {
    if (!topic.synthesis || topic.synthesis === 'Unable to synthesize — no API key.') continue;

    html += `
  <div style="margin-bottom:28px">
    <h3 style="margin:0 0 12px 0;font-size:16px;color:#1a1a1a;border-bottom:1px solid #eee;padding-bottom:6px">${topic.area}</h3>
    <div style="margin:0;padding:0">`;

    // Parse synthesis into readable paragraphs
    const lines = topic.synthesis.split('\n').filter(l => l.trim());
    let inList = false;

    for (const line of lines) {
      const cleaned = cleanSynthesisText(line.replace(/^[-*•]\s*/, '').trim());
      if (cleaned.length < 20) continue;

      // Check if this looks like a finding title (short, ends with colon or is bold-ish)
      if (cleaned.length < 100 && !cleaned.endsWith('.')) {
        if (inList) html += `</ul>`;
        html += `<p style="margin:8px 0 4px 0;font-weight:600;font-size:14px">${cleaned}</p>`;
        inList = false;
      } else {
        if (!inList) html += `<ul style="margin:4px 0 0 0;padding-left:20px">`;
        html += `<li style="margin-bottom:6px;font-size:14px;color:#444">${cleaned}</li>`;
        inList = true;
      }
    }
    if (inList) html += `</ul>`;

    html += `</div>`;

    // Source links
    if (topic.sources && topic.sources.length > 0) {
      html += `<p style="font-size:11px;color:#aaa;margin:10px 0 0 0">Sources: `;
      html += topic.sources.map(s => `<a href="${s.url}" style="color:#888">${s.title.substring(0, 40)}</a>`).join(' &middot; ');
      html += `</p>`;
    }

    html += `</div>`;
  }

  html += `
  <p style="color:#bbb;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">Searched ${topicResults.length} topics &middot; ${braveCallCount}/${MAX_BRAVE_CALLS} Brave API calls used</p>
</div>`;

  return html;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  console.log('\n🔍 JETT ECOSYSTEM RESEARCH');
  console.log('==========================');
  console.log(`   Date: ${dateStr}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`   Topics: ${RESEARCH_TOPICS.length}`);
  console.log(`   Max Brave calls: ${MAX_BRAVE_CALLS}`);
  console.log('');

  const topicResults = [];

  for (const topic of RESEARCH_TOPICS) {
    console.log(`\n📂 ${topic.area}`);

    // Pick best 2 queries from the topic
    const queriesToRun = topic.queries.slice(0, 2);
    const allSearchResults = [];

    for (const query of queriesToRun) {
      console.log(`   🔎 "${query}"`);

      const results = await braveSearch(query, 3);
      allSearchResults.push(...results);

      if (results.length > 0) {
        console.log(`      Found ${results.length} results`);
      } else {
        console.log(`      No results`);
      }

      // Rate limit: 2s between calls
      await sleep(2000);
    }

    // Deduplicate by URL
    const seen = new Set();
    const unique = allSearchResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // X Search via Grok
    const xQuery = topic.queries[0]; // Use primary query for X
    console.log(`   🐦 X search: "${xQuery}"`);
    const xResults = await xSearchWithGrok(xQuery);
    if (xResults) {
      console.log(`      Got X discussion summary`);
    } else {
      console.log(`      No X results`);
    }
    await sleep(1000);

    if (unique.length === 0 && !xResults) {
      console.log(`   ⚠️ No results for ${topic.area}`);
      topicResults.push({
        area: topic.area,
        synthesis: '',
        sources: []
      });
      continue;
    }

    // Combine Brave results with X search summary for synthesis
    const combinedInput = {
      webResults: unique,
      xDiscussion: xResults || 'No X discussion found.'
    };

    console.log(`   🧠 Synthesizing ${unique.length} web + X results...`);
    const synthesis = await synthesizeFindings(combinedInput);

    topicResults.push({
      area: topic.area,
      synthesis,
      sources: unique.slice(0, 5)
    });

    // Brief pause between topic areas
    await sleep(1000);
  }

  // Build and send email
  const emailHtml = buildEmailHtml(topicResults, dateStr);

  if (DRY_RUN) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  DRY RUN — Email content:');
    console.log('═══════════════════════════════════════════\n');

    for (const topic of topicResults) {
      console.log(`📂 ${topic.area}`);
      console.log(`${topic.synthesis}\n`);
      if (topic.sources.length > 0) {
        console.log(`   Sources:`);
        for (const s of topic.sources) {
          console.log(`   - ${s.title}: ${s.url}`);
        }
      }
      console.log('');
    }

    console.log(`📊 Brave API calls used: ${braveCallCount}/${MAX_BRAVE_CALLS}`);
    console.log('   (Email NOT sent — dry run mode)');
  } else {
    const subject = `Ecosystem Research -- ${dayName} ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    try {
      execFileSync('node', [
        EMAIL_SCRIPT,
        '--to', 'terryhuangjr@gmail.com',
        '--subject', subject,
        '--body', emailHtml,
        '--html'
      ], { timeout: 30000, stdio: 'pipe' });
      console.log(`\n📧 Email sent: ${subject}`);
      console.log(`📊 Brave API calls used: ${braveCallCount}/${MAX_BRAVE_CALLS}`);
    } catch (e) {
      console.error('\n❌ Email send failed:', e.message);
    }
  }
}

// ─── Error Handler ───────────────────────────────────────────────────────────

main().catch(error => {
  console.error('❌ Fatal error:', error.message);

  if (!DRY_RUN) {
    try {
      execFileSync('node', [
        EMAIL_SCRIPT,
        '--to', 'terryhuangjr@gmail.com',
        '--subject', 'Ecosystem Research -- ERROR',
        '--body', `Ecosystem research failed:\n\n${error.message}\n\nPlease check the system.`
      ], { timeout: 30000, stdio: 'pipe' });
    } catch {}
  }

  process.exit(1);
});
