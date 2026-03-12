#!/usr/bin/env node
/**
 * Jett Trending Research - Current Topics & Trends
 *
 * Runs Monday/Thursday to find trending topics in Bitcoin and Sports
 * that relate to the 21M angle (finance, contracts, money management)
 *
 * Flow:
 * 1. Call Grok to find trending topics (filtered by relevance)
 * 2. If relevant topics found → Brave Search → Research
 * 3. If no relevant topics → Exit gracefully (not an error)
 * 4. Add results to content bank
 *
 * Usage:
 *   node jett-trending-research.js                    # Run research
 *   node jett-trending-research.js --dry-run         # Test without adding
 *   node jett-trending-research.js --topics=3        # Max 3 topics (default 2)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const db = require('./db-bridge.js');

const EMAIL_SCRIPT = path.join(__dirname, '..', 'lib', 'send-email.js');

const MEMORY_DIR = path.join(require('os').homedir(), 'clawd', 'memory');
const RESEARCH_LOG = path.join(MEMORY_DIR, 'daily-research-log.json');

// Config
const MAX_TOPICS = parseInt(process.argv.find(a => a.startsWith('--topics='))?.split('=')[1]) || 2;
const DRY_RUN = process.argv.includes('--dry-run');

// Load xAI API key
let XAI_API_KEY = '';
let XAI_MODEL = 'grok-4-1-fast';

try {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'openclaw.json'), 'utf8'));
  const xaiProvider = config?.models?.providers?.xai;
  if (xaiProvider?.apiKey) {
    XAI_API_KEY = xaiProvider.apiKey;
  }
} catch (e) {
  console.error('⚠️ Could not read xAI config');
}

// Relevance criteria for filtering
const BTC_RELEVANT_KEYWORDS = [
  'adoption', 'treasury', 'institutional', 'etf', 'halving', 'scarce',
  'inflation', 'sound money', 'store of value', 'reserve', 'corporate',
  'payment', 'remittance', 'country', 'nation', 'legal tender', 'mining',
  'protocol', 'upgrade', 'network', 'ordinal', 'runes', 'layer 2', 'lightning',
  'holdings', 'acquire', 'purchase', 'buys', 'corp', 'semler', 'marathon',
  'riot', 'cleanspark', 'bitfarms'
];

const SPORTS_RELEVANT_KEYWORDS = [
  'contract', 'extension', 'signing', 'signs', 'salary', 'rookie', 'deal',
  'million', 'billion', 'bankrupt', 'mismanage', 'financial', 'pay',
  'guaranteed', 'cap', 'trade', 'free agent', 'nil', 'sponsorship', 'supermax',
  'signs', 'finalize', '$'
];

const EXCLUDE_KEYWORDS = [
  'prediction', 'forecast', 'will hit', 'will reach', 'price target',
  'injury', 'trade rumor', 'halftime', 'show', 'drama', 'scandal'
];

/**
 * Get secrets - handles both .env and secrets.json
 */
function getSecret(name) {
  // Try .env first
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(new RegExp(`${name}=(.+)`));
    if (match) return match[1].trim();
  } catch {}

  // Try secrets.json
  const secretsPath = path.join(process.env.HOME, '.clawd', 'secrets.json');
  try {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    return secrets[name];
  } catch {}

  return null;
}

/**
 * Call Brave Search API
 */
async function braveSearch(query, count = 5) {
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Call Grok to find trending topics
 */
async function getTrendingTopics() {
  const prompt = `You are a research assistant for a content platform about Bitcoin and Sports Finance.

Find 5 trending or newsworthy topics from the PAST WEEK in these categories:

**BITCOIN:** Focus on adoption, institutional moves, treasury, corporate holdings, country adoption, regulatory news, protocol upgrades. 
- INCLUDE: ETF approvals, corporate buys, country adoptions, halving impacts, mining news
- EXCLUDE: Pure price predictions, "will hit $X" type articles

**SPORTS:** Focus on big contracts, extensions, signing bonuses, financial issues with athletes.
- INCLUDE: Mega contracts, rookie deals, NIL deals, financial mismanagement stories, franchise tags
- EXCLUDE: Injuries, trades without contract details, drama, predictions

Respond with ONLY a JSON array of topics, each as a string. No other text.

Format:
["Bitcoin: [topic]", "Sports: [topic]", ...]

Example:
["Bitcoin: BlackRock Bitcoin ETF daily volume hits record", "Sports: Jaylen Brown $300M extension", "Bitcoin: El Salvador Bitcoin holdings now worth $1B", "Sports: NCAA NIL deals top $1M for football players"]`;

  console.log('🔍 Asking Grok for trending topics...');

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
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const topics = JSON.parse(match[0]);
      console.log(`   Found ${topics.length} raw topics from Grok`);
      return topics;
    }

    return [];
  } catch (error) {
    console.error('   ❌ Grok request failed:', error.message);
    return [];
  }
}

/**
 * Check if topic is relevant to 21M criteria
 */
function isRelevantTopic(topic) {
  const lower = topic.toLowerCase();

  // Check exclusions first
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (lower.includes(exclude)) {
      return { relevant: false, reason: `contains excluded: ${exclude}` };
    }
  }

  // Check if it's Bitcoin or Sports
  const isBitcoin = topic.toLowerCase().includes('bitcoin') || 
                    topic.toLowerCase().includes('btc') ||
                    topic.toLowerCase().includes('crypto') ||
                    topic.toLowerCase().includes('satoshi');

  const isSports = !isBitcoin && (
    /[A-Z][a-z]+/.test(topic) && 
    /(?:contract|extension|signing|signs|deal|million|billion|supermax|rookie|guaranteed)/i.test(topic)
  );

  if (!isBitcoin && !isSports) {
    return { relevant: false, reason: 'not Bitcoin or Sports' };
  }

  // Check keywords
  const keywords = isBitcoin ? BTC_RELEVANT_KEYWORDS : SPORTS_RELEVANT_KEYWORDS;
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  if (!hasKeyword) {
    return { relevant: false, reason: `no relevant keywords (Bitcoin=${isBitcoin})` };
  }

  return { relevant: true, category: isBitcoin ? 'bitcoin_trending' : 'sports_trending' };
}

/**
 * Research a topic using Brave Search
 */
async function researchTopic(topic) {
  console.log(`   🔎 Researching: ${topic}`);

  try {
    // Extract the actual topic part (remove "Bitcoin: " or "Sports: " prefix)
    const searchQuery = topic.replace(/^(Bitcoin|Sports):\s*/i, '').trim();
    
    const results = await braveSearch(searchQuery, 5);
    const webResults = results?.web?.results || [];

    if (webResults.length === 0) {
      console.log(`   ⚠️ No search results found`);
      return null;
    }

    // Get top 3 sources
    const sources = webResults.slice(0, 3).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description?.substring(0, 200) || ''
    }));

    // Use Grok to format the research
    const prompt = `Research topic: ${topic}

Based on these search results:
${sources.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}\n   Source: ${s.url}`).join('\n\n')}

Create 2-3 factual statements (not predictions) that could be used for a tweet.
Each must include specific numbers, dates, or dollar amounts.
Keep it under 280 characters per statement.
Include the source URL for each fact.`;

    const researchResponse = await fetch('https://api.x.ai/v1/chat/completions', {
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

    const researchData = await researchResponse.json();
    const researchContent = researchData.choices?.[0]?.message?.content || '';

    return {
      topic,
      content: researchContent,
      sources: sources.map(s => s.url).join(', '),
      category: topic.toLowerCase().includes('bitcoin') ? 'bitcoin_trending' : 'sports_trending'
    };

  } catch (error) {
    console.error(`   ❌ Research failed: ${error.message}`);
    return null;
  }
}

/**
 * Add research to database
 */
async function addToDatabase(items, dryRun = false) {
  if (items.length === 0) {
    console.log('  No items to add.');
    return 0;
  }

  let added = 0;
  for (const item of items) {
    if (dryRun) {
      console.log(`  [DRY-RUN] Would add: ${item.topic}`);
      continue;
    }

    try {
      const contentId = db.addContent(
        item.topic,
        item.content.substring(0, 500),
        item.category,
        item.sources || '',
        '',
        7
      );

      if (contentId) {
        console.log(`  ✓ Added: ${item.topic}`);
        added++;
      } else {
        console.log(`  ⊘ Skipped (duplicate): ${item.topic}`);
      }
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
    }
  }

  return added;
}

/**
 * Log research run
 */
function logResearch(topics, added, status) {
  try {
    let log = { last_run: new Date().toISOString(), type: 'trending' };
    
    if (fs.existsSync(RESEARCH_LOG)) {
      try {
        log = { ...JSON.parse(fs.readFileSync(RESEARCH_LOG, 'utf8')), ...log };
      } catch {}
    }

    log.history = log.history || [];
    log.history.unshift({
      timestamp: new Date().toISOString(),
      type: 'trending',
      topics,
      added,
      status
    });

    // Keep only last 50 entries
    if (log.history.length > 50) {
      log.history = log.history.slice(0, 50);
    }

    fs.writeFileSync(RESEARCH_LOG, JSON.stringify(log, null, 2));
  } catch (e) {
    console.error('   ⚠️ Could not write research log');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📈 JETT TRENDING RESEARCH');
  console.log('=========================');
  console.log(`   Date: ${new Date().toLocaleDateString()}`);
  console.log(`   Max topics: ${MAX_TOPICS}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log('');

  // Step 1: Get trending topics from Grok
  const rawTopics = await getTrendingTopics();

  if (rawTopics.length === 0) {
    console.log('❌ No topics found from Grok');
    logResearch([], 0, 'no_topics');
    process.exit(0);
  }

  // Step 2: Filter for relevance
  console.log('\n📋 Filtering for relevance...');
  const relevantTopics = [];
  
  for (const topic of rawTopics) {
    const { relevant, reason, category } = isRelevantTopic(topic);
    
    if (relevant) {
      console.log(`   ✓ ${topic}`);
      relevantTopics.push({ topic, category });
    } else {
      console.log(`   ✗ ${topic}`);
      console.log(`     (${reason})`);
    }
  }

  if (relevantTopics.length === 0) {
    console.log('\n✅ No relevant trending topics today.');
    console.log('   (Topics found but none fit 21M criteria)');
    logResearch(rawTopics, 0, 'no_relevant');
    process.exit(0);
  }

  // Limit to MAX_TOPICS
  const topicsToResearch = relevantTopics.slice(0, MAX_TOPICS);
  console.log(`\n🎯 Researching ${topicsToResearch.length} topic(s)...`);

  // Step 3: Research each topic
  const researchResults = [];
  for (const { topic, category } of topicsToResearch) {
    const result = await researchTopic(topic);
    if (result) {
      result.category = category;
      researchResults.push(result);
    }
  }

  // Step 4: Add to database
  console.log('\n💾 Adding to content bank...');
  const added = await addToDatabase(researchResults, DRY_RUN);

  // Step 5: Log results
  logResearch(
    topicsToResearch.map(t => t.topic),
    added,
    added > 0 ? 'success' : 'no_content'
  );

  console.log('\n✅ TRENDING RESEARCH COMPLETE');
  console.log(`   Topics found: ${rawTopics.length}`);
  console.log(`   Relevant: ${relevantTopics.length}`);
  console.log(`   Added to DB: ${added}`);
  console.log('');

  // Send email with results
  const researchDetails = researchResults.map(r => 
    `• ${r.topic}\n  Content: ${r.content.substring(0, 200)}...\n  Sources: ${r.sources}`
  ).join('\n\n');

  const emailBody = `JETT Trending Research Complete
================================

Date: ${new Date().toLocaleDateString()}
Topics found: ${rawTopics.length}
Relevant topics: ${relevantTopics.length}
Added to content bank: ${added}

${researchDetails || 'No new content added this run.'}

---
This research finds trending topics in Bitcoin & Sports and adds them to the content bank for tweet generation.`;

  try {
    execSync(`node ${EMAIL_SCRIPT} --to "terryhuangjr@gmail.com" --subject "JETT Trending Research: ${added} entries added" --body "${emailBody.replace(/"/g, '\\"')}"`, { timeout: 30000 });
    console.log('   📧 Email sent with results');
  } catch (e) {
    console.log('   ⚠ Email send failed:', e.message);
  }
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  logResearch([], 0, 'error');
  process.exit(1);
});
