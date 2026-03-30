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

// ─── Grok Synthesis ──────────────────────────────────────────────────────────

async function synthesizeFindings(allResults) {
  if (!XAI_API_KEY) {
    console.error('   ❌ No xAI API key configured');
    return 'Unable to synthesize — no API key.';
  }

  const prompt = `You are Terry's AI research assistant.
Terry runs: CardMiner (eBay card scanner), @21MSports
(Bitcoin/sports content), Level Up Digital (web design
agency), and uses OpenClaw/Jett for automation.

Analyze these search results and identify the 3-5 most
relevant and actionable findings for Terry's projects.

For each finding include:
- What it is (1 sentence)
- Why it's relevant to Terry's work (1 sentence)
- How to try it or where to find it (1 sentence)

Be specific and practical. Skip generic AI news.
Focus on tools, skills, APIs, or techniques Terry
could actually use.

Search results:
${JSON.stringify(allResults, null, 2)}`;

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

function buildEmailHtml(topicResults, dateStr) {
  let html = `<h2>AI &amp; Tools Digest — ${dateStr}</h2>`;
  html += `<p>Here's what's new and relevant this week:</p>`;

  for (const topic of topicResults) {
    if (!topic.synthesis || topic.synthesis === 'Unable to synthesize — no API key.') continue;

    html += `<h3>${topic.area}</h3>`;
    html += `<ul>`;

    // Parse synthesis into bullet points
    const lines = topic.synthesis.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•]\s*/, '').trim();
      if (cleaned.length > 20) {
        html += `<li>${cleaned}</li>`;
      }
    }

    html += `</ul>`;

    // Source links
    if (topic.sources && topic.sources.length > 0) {
      html += `<p style="font-size:12px;color:#888">Sources: `;
      html += topic.sources.map(s => `<a href="${s.url}" style="color:#666">${s.title.substring(0, 40)}</a>`).join(' · ');
      html += `</p>`;
    }
  }

  html += `<p style="color:#666;font-size:11px">Searched ${topicResults.length} topics · ${braveCallCount}/${MAX_BRAVE_CALLS} Brave API calls used</p>`;

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

    if (unique.length === 0) {
      console.log(`   ⚠️ No results for ${topic.area}`);
      topicResults.push({
        area: topic.area,
        synthesis: '',
        sources: []
      });
      continue;
    }

    console.log(`   🧠 Synthesizing ${unique.length} results...`);
    const synthesis = await synthesizeFindings(unique);

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
    const subject = `🔍 Ecosystem Research — ${dayName} ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

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
        '--subject', '🔍 Ecosystem Research — ERROR',
        '--body', `Ecosystem research failed:\n\n${error.message}\n\nPlease check the system.`
      ], { timeout: 30000, stdio: 'pipe' });
    } catch {}
  }

  process.exit(1);
});
