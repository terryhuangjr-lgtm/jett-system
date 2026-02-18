#!/usr/bin/env node
/**
 * Jett Daily Research - Lightweight Content Growth
 *
 * Runs periodically to add fresh, verified content to the database.
 * Designed for small batches - 1-2 topics per run.
 * No scraping, just quality research.
 *
 * Usage:
 *   node jett-daily-research.js                    # 1 random topic
 *   node jett-daily-research.js --topics=3        # 3 random topics
 *   node jett-daily-research.js --balanced        # 1 BTC + 1 sports (default for 2)
 *   node jett-daily-research.js --btc             # 1 BTC topic
 *   node jett-daily-research.js --sports          # 1 sports topic
 *   node jett-daily-research.js --dry-run         # Test without adding
 */

const fs = require('fs');
const path = require('path');
const db = require('./db-bridge.js');

const MEMORY_DIR = path.join(require('os').homedir(), 'clawd', 'memory');
const RESEARCH_LOG = path.join(MEMORY_DIR, 'daily-research-log.json');

// Topic rotation by category
const BTC_CATEGORIES = [
  { category: 'bitcoin_history', topics: [
    'Bitcoin halving impact on price history',
    'Satoshi Nakamoto disappearence mystery',
    'Bitcoin Pizza Day 10000 BTC value now',
    'Bitcoin first blocks genesis',
    'Mt Gox collapse',
    'Bitcoin ETF approval 2024'
  ]},
  { category: 'bitcoin_quotes', topics: [
    'Michael Saylor Bitcoin treasury strategy quote',
    'Ray Dalio Bitcoin vs gold quote',
    'Nassim Taleb Bitcoin criticism',
    'Peter Schiff Bitcoin prediction',
    'Elon Musk Bitcoin Tesla tweet',
    'Jack Dorsey Bitcoin tweet'
  ]},
  { category: 'sound_money', topics: [
    'US dollar inflation since 1971',
    'Federal Reserve money printing history',
    'Gold standard US ended 1971',
    'Quantitative easing examples',
    'Hyperinflation examples Venezuela Zimbabwe'
  ]},
  { category: 'bitcoin_adoption', topics: [
    'MicroStrategy Bitcoin holdings 2024',
    'Tesla Bitcoin purchase history',
    'Country Bitcoin adoption El Salvador',
    'BlackRock Bitcoin ETF holdings',
    'Major company Bitcoin treasury'
  ]}
];

const SPORTS_CATEGORIES = [
  { category: 'mega_contracts', topics: [
    'Largest NFL contract 2024 2025',
    'Largest NBA contract history',
    'MLB largest contract ever',
    'NHL largest contract 2024',
    'Highest paid athlete 2024 2025'
  ]},
  { category: 'historic_contracts', topics: [
    'Wayne Gretzky Edmonton Oilers 1988',
    'Michael Jordan Bulls 1997',
    'Derek Jeter Yankees extension',
    'Tom Brady Patriots contracts',
    'LeBron James career contracts'
  ]},
  { category: 'nfl_qb_contracts', topics: [
    'Joe Burrow contract Bengals',
    'Jordan Love contract Packers',
    'Justin Herbert contract Chargers',
    'Jared Goff contract Lions',
    'Kirk Cousins contract Vikings'
  ]},
  { category: 'nba_contracts', topics: [
    'Jaylen Brown max contract Celtics',
    'Donovan Mitchell contract Cavs',
    'Jayson Tatum contract Celtics',
    'Bam Adebayo contract Heat',
    'Tyrese Haliburton contract Pacers'
  ]},
  { category: 'nil_contracts', topics: [
    'NIL deal record 2024',
    'highest paid college athlete NIL',
    'NIL athlete Bitcoin investment',
    'college athlete financial planning',
    'NIL money management tips'
  ]}
];

const ALL_CATEGORIES = [...BTC_CATEGORIES, ...SPORTS_CATEGORIES];

// Metrics logging helper
const METRICS_FILE = '/tmp/llm-usage.jsonl';

async function logLLMUsage(provider, success, timeMs, savingsUsd = 0) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      provider,
      success,
      time_ms: timeMs,
      savings_usd: savingsUsd
    };
    fs.appendFileSync(METRICS_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('Error logging metrics:', e.message);
  }
}

async function getLastResearchedTopic() {
  if (!fs.existsSync(RESEARCH_LOG)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(RESEARCH_LOG, 'utf8'));
    return data.last_topic || null;
  } catch (e) { return null; }
}

async function saveResearchLog(topic, category, count) {
  const log = {
    last_run: new Date().toISOString(),
    last_topic: topic,
    last_category: category,
    items_added: count
  };
  fs.writeFileSync(RESEARCH_LOG, JSON.stringify(log, null, 2));
}

async function getJettResponse(query) {
  const prompt = `You are a research assistant for a Twitter account that posts about Bitcoin and sports contracts.

Research TOPIC: ${query}

Requirements:
- Find 2-3 VERIFIED facts with actual sources
- Sources must be: Wikipedia, Spotrac, official announcements, major news (WSJ, Bloomberg, ESPN, etc.)
- NO speculation, NO predictions, NO unverified claims
- Include specific numbers, dates, dollar amounts when available
- Format each fact as: Fact: [the fact] [Source: URL]`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'minimax-m2.5:cloud',
      prompt,
      stream: false
    })
  });

  const data = await response.json();
  const startTime = Date.now();
  await logLLMUsage('ollama', true, Date.now() - startTime);
  return data.response || '';
}

async function parseResearchResults(jettResponse, topic, category) {
  const items = [];

  // Clean up the response
  let cleaned = jettResponse
    .replace(/\*\*/g, '')  // Remove bold markers
    .replace(/Note:.*$/si, '')  // Remove notes at end
    .trim();

  // Split by numbered facts
  const segments = cleaned.split(/\d+\.\s+/).filter(s => s.trim().length > 20);

  for (const segment of segments.slice(0, 3)) {
    // Extract source URL
    let source = '';
    const urlMatch = segment.match(/\[Source:\s*(https?:\/\/[^\]]+)\]/i) ||
                     segment.match(/https?:\/\/[^\s\)]+/);
    if (urlMatch) {
      source = urlMatch[0];
    }

    // Clean up the fact text
    let fact = segment
      .replace(/\[Source:\s*[^\]]+\]/gi, '')
      .replace(/\[Source: [^\]]+\]/gi, '')
      .replace(/\([^\)]+\)/g, '')
      .replace(/^[^\w]*/, '')
      .trim();

    if (fact.length > 20 && fact.length < 500) {
      items.push({
        topic,
        category,
        content: fact,
        source: source,
        quality_score: 7,
        created_at: new Date().toISOString()
      });
    }
  }

  return items;
}

async function addToDatabase(items, dryRun = false) {
  if (items.length === 0) {
    console.log('  No verified items found to add.');
    return 0;
  }

  const added = 0;
  for (const item of items) {
    if (dryRun) {
      console.log(`  [DRY-RUN] Would add: ${item.content.substring(0, 50)}...`);
    } else {
      try {
        db.addContent(
          item.topic,
          item.content,
          item.category,
          item.source || '',
          '',  // btcAngle
          item.quality_score
        );
        console.log(`  ✓ Added: ${item.content.substring(0, 60)}...`);
      } catch (e) {
        console.log(`  ✗ Skipped (possibly duplicate): ${item.content.substring(0, 40)}...`);
      }
    }
  }

  return items.length;
}

async function selectNextTopic() {
  const lastTopic = await getLastResearchedTopic();
  let rotationIndex = 0;

  for (let i = 0; i < TOPIC_ROTATION.length; i++) {
    const cat = TOPIC_ROTATION[i];
    if (cat.topics.includes(lastTopic)) {
      rotationIndex = (i + 1) % TOPIC_ROTATION.length;
      break;
    }
  }

  const selected = TOPIC_ROTATION[rotationIndex];
  const topic = selected.topics[Math.floor(Math.random() * selected.topics.length)];

  return { topic, category: selected.category };
}

async function selectTopic(categoryPool) {
  const cat = categoryPool[Math.floor(Math.random() * categoryPool.length)];
  const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
  return { topic, category: cat.category };
}

async function buildTopicList(args) {
  const dryRun = args.includes('--dry-run');
  const topicsArg = args.find(a => a.startsWith('--topics='));
  const topicsCount = topicsArg ? parseInt(topicsArg.split('=')[1]) : 1;

  const hasBalanced = args.includes('--balanced');
  const hasBtc = args.includes('--btc');
  const hasSports = args.includes('--sports');

  let topics = [];

  if (hasBalanced || hasBtc && hasSports) {
    // 1 BTC + 1 Sports
    topics.push(await selectTopic(BTC_CATEGORIES));
    topics.push(await selectTopic(SPORTS_CATEGORIES));
  } else if (hasBtc) {
    topics.push(await selectTopic(BTC_CATEGORIES));
  } else if (hasSports) {
    topics.push(await selectTopic(SPORTS_CATEGORIES));
  } else if (hasBalanced) {
    // Fallback to 2 topics balanced
    topics.push(await selectTopic(BTC_CATEGORIES));
    topics.push(await selectTopic(SPORTS_CATEGORIES));
  } else if (topicsCount > 1) {
    // Multiple topics - mix of BTC and Sports
    for (let i = 0; i < topicsCount; i++) {
      if (i % 2 === 0) {
        topics.push(await selectTopic(BTC_CATEGORIES));
      } else {
        topics.push(await selectTopic(SPORTS_CATEGORIES));
      }
    }
  } else {
    // Single random topic
    topics.push(await selectTopic(ALL_CATEGORIES));
  }

  return { topics, dryRun };
}

async function main() {
  const args = process.argv.slice(2);
  const { topics, dryRun } = await buildTopicList(args);

  console.log('\n🔍 JETT DAILY RESEARCH');
  console.log('========================\n');

  if (dryRun) {
    console.log('  [DRY-RUN MODE - No changes will be made]\n');
  }

  let totalAdded = 0;

  for (let i = 0; i < topics.length; i++) {
    const { topic, category } = topics[i];

    console.log(`📚 Research ${i + 1}/${topics.length}: ${topic}`);
    console.log(`   Category: ${category}\n`);

    const response = await getJettResponse(topic);
    const items = await parseResearchResults(response, topic, category);

    console.log(`   Found ${items.length} verified items:\n`);
    const added = await addToDatabase(items, dryRun);
    totalAdded += added;

    await saveResearchLog(topic, category, added);

    if (i < topics.length - 1) {
      console.log('');
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n========================');
  console.log(`✅ Research complete!`);
  console.log(`   Topics: ${topics.length}`);
  console.log(`   Items added: ${totalAdded}`);
  console.log(`   Log: ${RESEARCH_LOG}\n`);

  // Consolidate research files for content generation
  console.log('📂 Running consolidators...');
  const { execSync } = require('child_process');
  try {
    execSync('node consolidate-research.js', { cwd: __dirname });
    console.log('   ✓ Sports consolidated');
  } catch (e) {
    console.log('   ⚠ Sports consolidation failed:', e.message);
  }
  try {
    execSync('node consolidate-bitcoin-research.js', { cwd: __dirname });
    console.log('   ✓ Bitcoin consolidated');
  } catch (e) {
    console.log('   ⚠ Bitcoin consolidation failed:', e.message);
  }
}

main().catch(console.error);
