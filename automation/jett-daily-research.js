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
    .replace(/\*\*/g, '')         // Remove bold markers (**text**)
    .replace(/^-{3,}\s*$/gm, '')  // Remove --- separator lines
    .replace(/Note:.*$/si, '')    // Remove trailing note sections
    .trim();

  // Split by "Fact:" or "Fact N:" labels (Ollama outputs both numbered and unnumbered)
  const segments = cleaned
    .split(/(?:^|\n)Fact\s*\d*\s*:/i)
    .filter(s => {
      const t = s.trim();
      // Must have financial/date data — filters out preamble/intro paragraphs
      return t.length > 20 && /\$\d|\d{4}|million|billion|percent/i.test(t);
    });

  for (const segment of segments.slice(0, 3)) {
    // Extract source URL — Ollama uses [Source: Text - https://url] or bare URLs
    let source = '';
    const urlMatch =
      segment.match(/\[Source:[^\]]*?(https?:\/\/[^\]\s]+)\]/) || // [Source: text - url]
      segment.match(/\]\((https?:\/\/[^\)]+)\)/) ||               // markdown [text](url)
      segment.match(/https?:\/\/[^\s\)\]]+/);                     // bare URL
    if (urlMatch) source = urlMatch[1] || urlMatch[0];

    // Clean up the fact text
    let fact = segment
      .replace(/\[Source:[^\]]*\]/gi, '')    // remove [Source: any text]
      .replace(/\[[^\]]+\]\([^\)]+\)/g, '')  // remove markdown [text](url)
      .replace(/https?:\/\/\S+/g, '')        // remove bare URLs
      .replace(/^[^\w]*/, '')
      .trim();

    if (fact.length > 20 && fact.length < 500) {
      items.push({
        topic,
        category,
        content: fact,
        source,
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

  let added = 0;
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

// ─── Content Bank Wiring ──────────────────────────────────────────────────────

const CONTENT_BANK_PATH = path.join(__dirname, '21m-content-bank.json');

// Approximate BTC prices by year — consistent with existing content bank entries
const BTC_PRICE_BY_YEAR = {
  2026: 95000, 2025: 90000, 2024: 65000, 2023: 27000,
  2022: 20000, 2021: 46000, 2020: 10000, 2019: 3500,
  2018: 8000,  2017: 2500,  2016: 600,   2015: 250,
  2014: 500,   2013: 100,   2012: 13,    2011: 5
};
function getBtcPriceForYear(year) { return BTC_PRICE_BY_YEAR[year] || 0; }

// Maps research category names → content bank category names
const SPORTS_TO_BANK_CATEGORY = {
  historic_contracts: 'historic_contract',
  mega_contracts:     'historic_contract',
  nfl_qb_contracts:  'historic_contract',
  nba_contracts:     'historic_contract',
  nil_contracts:     'nil_contract'
};

/**
 * Second Ollama call: extract structured contract data from raw research text.
 * Returns null if no usable contract found.
 */
async function extractStructuredFact(researchText, category) {
  const bankCategory = SPORTS_TO_BANK_CATEGORY[category];
  if (!bankCategory) return null; // BTC categories don't map to content bank

  const prompt = `Extract structured contract data from this sports research. Return ONLY valid JSON, nothing else.

Research text:
${researchText}

Return this exact JSON shape:
{
  "found": true or false,
  "athlete": "Full athlete name",
  "sport": "NFL, NBA, NHL, MLB, NCAA Football, or NCAA Basketball",
  "year": <4-digit year the contract was signed, as integer>,
  "contract_value_usd": <total contract value in dollars as integer>,
  "contract_years": <number of years, as integer, or null>,
  "source_url": "url string or empty string"
}

Set "found" to false if you cannot identify a specific athlete with a verified contract value and signing year. Do not guess.`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'minimax-m2.5:cloud', prompt, stream: false })
    });
    const data = await res.json();
    const text = (data.response || '').trim();

    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.found || !parsed.athlete || !parsed.year || !parsed.contract_value_usd) return null;

    const btcPrice  = getBtcPriceForYear(parsed.year);
    const isNil     = bankCategory === 'nil_contract';
    const pct       = isNil ? 0.10 : 0.05;
    const pctLabel  = isNil ? '10%' : '5%';
    const dealLabel = isNil ? 'NIL deal' : 'contract';
    const btcAmt    = btcPrice > 0 ? Math.round((parsed.contract_value_usd * pct) / btcPrice) : 0;
    const contractM = (parsed.contract_value_usd / 1000000).toFixed(1);

    const verifiedFact = btcPrice > 0
      ? `${parsed.athlete} signed a $${contractM}M ${dealLabel} in ${parsed.year} when BTC was $${btcPrice.toLocaleString()}. ${pctLabel} allocation = ${btcAmt.toLocaleString()} BTC.`
      : `${parsed.athlete} signed a $${contractM}M ${dealLabel} in ${parsed.year} (before Bitcoin).`;

    const entry = {
      category:        bankCategory,
      athlete:         parsed.athlete,
      sport:           parsed.sport,
      year:            parsed.year,
      contract_value:  parsed.contract_value_usd,
      btc_price_then:  btcPrice,
      btc_allocation:  btcAmt,
      verified_fact:   verifiedFact,
      source:          parsed.source_url || '',
      used_dates:      [],
      cooldown_days:   90
    };
    if (parsed.contract_years) entry.contract_years = parsed.contract_years;

    return entry;
  } catch (e) {
    console.log(`  ⚠ Structured extraction error: ${e.message}`);
    return null;
  }
}

/**
 * Append a structured entry to 21m-content-bank.json.
 * Skips if the same athlete+year already exists.
 */
function addToContentBank(entry, dryRun) {
  try {
    const bank = JSON.parse(fs.readFileSync(CONTENT_BANK_PATH, 'utf8'));

    const duplicate = bank.entries.some(e =>
      e.athlete && e.athlete.toLowerCase() === entry.athlete.toLowerCase() &&
      e.year === entry.year
    );
    if (duplicate) {
      console.log(`  ⚠ Already in content bank: ${entry.athlete} (${entry.year}), skipping`);
      return false;
    }

    const maxId = Math.max(...bank.entries.map(e => e.id || 0));
    entry.id = maxId + 1;

    if (dryRun) {
      console.log(`  [DRY-RUN] Would add to content bank: ${entry.athlete} (${entry.sport}, ${entry.year})`);
      console.log(`    → ${entry.verified_fact}`);
      return true;
    }

    bank.entries.push(entry);
    bank.last_updated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(CONTENT_BANK_PATH, JSON.stringify(bank, null, 2));
    console.log(`  ✓ Added to content bank: ${entry.athlete} → ID ${entry.id}`);
    return true;
  } catch (e) {
    console.log(`  ✗ Content bank write failed: ${e.message}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────

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

    // Wire sports research into content bank
    if (SPORTS_TO_BANK_CATEGORY[category]) {
      console.log('\n   📋 Extracting structured entry for content bank...');
      // Pass cleaned facts only — raw response confuses the extraction model
      const factsText = items.length > 0
        ? items.map(i => i.content).join('\n')
        : response.replace(/\*\*/g, '').replace(/Note:.*$/si, '').trim();
      const structured = await extractStructuredFact(factsText, category);
      if (structured) {
        addToContentBank(structured, dryRun);
      } else {
        console.log('  ⚠ Could not extract structured contract data (no athlete/value/year found)');
      }
    }

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
