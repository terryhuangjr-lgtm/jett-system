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
const { execSync, exec } = require('child_process');
const db = require('./db-bridge.js');

const MEMORY_DIR = path.join(require('os').homedir(), 'clawd', 'memory');
const RESEARCH_LOG = path.join(MEMORY_DIR, 'daily-research-log.json');
const SCRAPER_SCRIPT = path.join(__dirname, 'jett-scraper.py');

// Read xAI API key from openclaw config (safer than hardcoding)
let XAI_API_KEY = '';
let XAI_MODEL = 'grok-4-1-fast';

try {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'openclaw.json'), 'utf8'));
  const xaiProvider = config?.models?.providers?.xai;
  if (xaiProvider?.apiKey) {
    XAI_API_KEY = xaiProvider.apiKey;
  }
} catch (e) {
  console.error('   ⚠️ Could not read xAI config, research will use Ollama fallback');
}

// Topic rotation by category - comprehensive lists
const BTC_CATEGORIES = [
  { category: 'bitcoin_history', topics: [
    'Bitcoin Pizza Day 10000 BTC value now',
    'Satoshi Nakamoto disappearance mystery',
    'Mt Gox collapse 2014',
    'Bitcoin first blocks genesis block 2009',
    'Bitcoin halving schedule impact',
    'Winklevoss twins Bitcoin purchase 2012',
    'First Bitcoin exchange Mt Gox 2010',
    'Silk Road FBI Bitcoin seizure 2013'
  ]},
  { category: 'bitcoin_quotes', topics: [
    'Michael Saylor Bitcoin treasury strategy',
    'Jack Dorsey Bitcoin tweet "best money"',
    'Elon Musk Bitcoin Tesla purchase 2021',
    'Ray Dalio Bitcoin vs gold comparison',
    'Peter Schiff Bitcoin criticism gold bug',
    'Nassim Taleb Bitcoin debate',
    'Warren Buffett Bitcoin criticism',
    'Bill Gates Bitcoin opinion'
  ]},
  { category: 'sound_money', topics: [
    'US dollar inflation since 1971 Nixon',
    'Federal Reserve money printing QE',
    'Gold standard US ended 1971',
    'Quantitative easing 2008 financial crisis',
    'Hyperinflation Venezuela Zimbabwe history',
    'Fiat currency vs sound money',
    'Dollar losing purchasing power 50 years',
    'Historical gold money vs paper money'
  ]},
  { category: 'bitcoin_adoption', topics: [
    'MicroStrategy Bitcoin treasury 2024',
    'Tesla Bitcoin purchase and sale 2021',
    'El Salvador Bitcoin adoption 2021',
    'BlackRock Bitcoin ETF approval 2024',
    'Major company Bitcoin treasury holdings',
    'PayPal Bitcoin integration 2020',
    'Square Cash App Bitcoin adoption',
    'Bitcoin ATM growth worldwide'
  ]},
  { category: 'bitcoin_scarcity', topics: [
    'Bitcoin 21 million supply cap',
    'Bitcoin halving 2024 block reward',
    'Bitcoin last coin mining year 2140',
    'Bitcoin scarcity digital gold',
    'Bitcoin stock to flow model',
    'Bitcoin controlled supply formula',
    'Bitcoin inflation rate decreasing',
    'Bitcoin issuance schedule'
  ]},
  { category: 'bitcoin_energy', topics: [
    'Bitcoin energy consumption renewable',
    'Bitcoin mining energy usage comparison',
    'Bitcoin proof of work security',
    'Bitcoin energy FUD misinformation',
    'Bitcoin mining grid stability',
    'Bitcoin energy vs banking system',
    'Bitcoin mining geographic distribution',
    'Bitcoin carbon footprint debate'
  ]},
  { category: 'bitcoin_network', topics: [
    'Bitcoin Lightning Network capacity 2024',
    'Bitcoin node distribution worldwide',
    'Bitcoin network hashrate record',
    'Bitcoin block size debate history',
    'Bitcoin SegWit adoption',
    'Bitcoin transaction speed vs Visa',
    'Bitcoin Lightning Network use cases',
    'Bitcoin custody solutions institutional'
  ]},
  { category: 'bitcoin_education', topics: [
    'Bitcoin whitepaper Satoshi 2008',
    'Bitcoin public key cryptography',
    'Bitcoin decentralized trustless',
    'Bitcoin mining proof of work',
    'Bitcoin digital store of value',
    'Bitcoin censorship resistance',
    'Bitcoin divisible smallest unit satoshi',
    'Bitcoin network effects adoption'
  ]}
];

const SPORTS_CATEGORIES = [
  { category: 'mega_contracts', topics: [
    'Patrick Mahomes Chiefs contract 2022',
    'Joe Burrow Bengals contract 2023',
    'Justin Fields Bears contract',
    'Jalen Hurts Eagles contract 2023',
    'Lamar Jackson Ravens contract 2023',
    'Dak Prescott Cowboys contract 2024',
    'Josh Allen Bills contract 2024',
    'Travis Kelce contract Chiefs'
  ]},
  { category: 'historic_contracts', topics: [
    'Michael Jordan Bulls 1997 $30M',
    'Wayne Gretzky Oilers 1988',
    'LeBron James career contracts',
    'Tom Brady Patriots contracts history',
    'Derek Jeter Yankees extension',
    'Kevin Durant Thunder contract 2016',
    'Stephen Curry Warriors contract 2017',
    'Mike Trout Angels contract 2019'
  ]},
  { category: 'nba_contracts', topics: [
    'Jaylen Brown Celtics max contract',
    'Donovan Mitchell Cavs contract',
    'Jayson Tatum Celtics extension',
    'Luka Doncic Mavericks contract',
    'Giannis Antetokounmpo Bucks extension',
    'Nikola Jokic Nuggets contract',
    'Joel Embiid 76ers max contract',
    'Devin Booker Suns contract'
  ]},
  { category: 'nfl_contracts', topics: [
    'Christian McCaffrey 49ers contract',
    'Tyreek Hill Dolphins contract',
    'Davante Adams Raiders contract',
    'DeAndre Hopkins contract 2023',
    'Amon-Ra St. Brown Lions extension',
    'Ja\'Marr Chase Bengals contract',
    'Bijan Robinson Falcons draft',
    'Breece Hall Jets contract'
  ]},
  { category: 'nil_contracts', topics: [
    'Travis Hunter NIL deal 2024',
    'Arch Manning NIL value Texas',
    'Caleb Williams NIL USC',
    'Bronny James NIL Lakers',
    'Olivia Miles Notre Dame NIL',
    'Caitlin Clark Iowa NIL',
    'JJ McCarthy Michigan NIL',
    'Drake Maye UNC NIL'
  ]},
  { category: 'signing_bonuses', topics: [
    'NFL rookie signing bonus record',
    'NBA draft pick signing bonus',
    'MLB draft bonus history',
    'NHL draft signing bonus',
    'NFL quarterback signing bonus comparison',
    'NBA rookie contract first round',
    'MLS signing bonus growth',
    'WNBA rookie contract salary'
  ]},
  { category: 'financial_hardship', topics: [
    'Mike Tyson bankruptcy $400M earnings',
    'Allen Iverson financial troubles',
    'Antoine Walker bankruptcy $110M',
    'Terrell Owens bankruptcy story',
    'Scottie Pippen bankruptcy pension',
    'Marcus Camby bankruptcy trustee',
    'Darryl Strawberry tax issues',
    'Vince Young NFL bankruptcy'
  ]},
  { category: 'rookie_contracts', topics: [
    'NFL rookie contract scale 2024',
    'NBA rookie scale contract history',
    'MLB signing bonus draft 2024',
    'NFL first overall pick contract',
    'NBA first overall pick contract',
    'NHL rookie entry level contract',
    'MLS homegrown player contracts',
    'WNBA rookie salary scale'
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

// BTC price lookup by year
const BTC_PRICE_BY_YEAR = {
  2026: 95000, 2025: 90000, 2024: 65000, 2023: 27000,
  2022: 20000, 2021: 46000, 2020: 10000, 2019: 3500,
  2018: 8000,  2017: 2500,  2016: 600,   2015: 250,
  2014: 500,   2013: 100,   2012: 13,    2011: 5,
  2010: 0.004, 2009: 0
};

function getBtcPriceForYear(year) {
  return BTC_PRICE_BY_YEAR[year] || 0;
}

async function scrapeWeb(topic, category) {
  return new Promise((resolve) => {
    let cmd = '';
    let args = [];
    
    // Map topics to scraper calls
    if (category === 'nil_contracts' || category === 'mega_contracts' || 
        category === 'historic_contracts' || category === 'nfl_qb_contracts') {
      // Sports: Extract player name from topic and fetch from Spotrac
      const playerMatch = topic.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      const sport = category.includes('nfl') || category.includes('nil') ? 'nfl' : 'nba';
      if (playerMatch) {
        cmd = 'python3';
        args = [SCRAPER_SCRIPT, '--spotrac-player', playerMatch[1], '--spotrac-sport', sport];
      }
    } else if (category.startsWith('bitcoin_') || category === 'sound_money' || 
               category === 'bitcoin_adoption' || category === 'bitcoin_history' ||
               category === 'bitcoin_quotes') {
      // Bitcoin: Map to Wikipedia topics
      const topicLower = topic.toLowerCase();
      let wikiTopic = 'Bitcoin';
      if (topicLower.includes('pizza')) wikiTopic = 'pizza';
      else if (topicLower.includes('halving')) wikiTopic = 'halving';
      else if (topicLower.includes('saylor')) wikiTopic = 'saylor';
      else if (topicLower.includes('etf')) wikiTopic = 'etf';
      else if (topicLower.includes('adoption')) wikiTopic = 'adoption';
      else if (topicLower.includes('mt gox')) wikiTopic = 'mtgox';
      
      cmd = 'python3';
      args = [SCRAPER_SCRIPT, '--bitcoin', wikiTopic];
    }
    
    if (!cmd) {
      resolve('');
      return;
    }
    
    try {
      const result = execSync(cmd, args, { timeout: 30000, encoding: 'utf8' });
      resolve(result);
    } catch (e) {
      console.log(`  ⚠ Scraper error: ${e.message}`);
      resolve('');
    }
  });
}

async function getJettResponse(topic, category) {
  // Step 1: Scrape real web data
  console.log(`  🌐 Scraping web for: ${topic}`);
  const scrapedData = await scrapeWeb(topic, category);
  
  // Step 2: Build prompt with scraped data for LLM to format
  const isBitcoin = category.startsWith('bitcoin_') || category === 'sound_money' || 
                    category === 'bitcoin_adoption' || category === 'bitcoin_history' ||
                    category === 'bitcoin_quotes';
  
  let prompt;
  if (isBitcoin) {
    prompt = `You are a research assistant for a Bitcoin education Twitter account.

Research TOPIC: ${topic}

Scraped web data:
${scrapedData || 'No scraped data available - use your knowledge but prioritize verifiable facts'}

Output EXACTLY in this format (one fact per line):
Fact: In YEAR, KEY_FACT_HERE [Source: source-name]
Fact: In YEAR, KEY_FACT_HERE [Source: source-name]

Example:
Fact: In 2021, MicroStrategy held 114,000 Bitcoin [Source: Wikipedia]
Fact: In 2020, MicroStrategy purchased 43,318 Bitcoin at ~$34,000 each [Source: MicroStrategy SEC filing]

Requirements:
- Must include specific year and dollar amount or BTC amount
- NO speculation, NO predictions
- Start each line with "Fact:"`;
  } else {
    prompt = `You are a research assistant for a sports contract Twitter account.

Research TOPIC: ${topic}

Scraped web data:
${scrapedData || 'No scraped data available - use your knowledge but prioritize verifiable facts from Spotrac or official sources'}

Output EXACTLY in this format (one fact per line):
Fact: ATHLETE_NAME signed a $XXM CONTRACT_TYPE in YEAR [Source: source-name]
Fact: ATHLETE_NAME signed a $XXM CONTRACT_TYPE in YEAR [Source: source-name]

Example:
Fact: Patrick Mahomes signed a $16.4M rookie contract in 2017 [Source: Spotrac]
Fact: Joe Burrow signed a $27.5M rookie contract in 2023 [Source: Spotrac]

Requirements:
- Must include: athlete name, contract year, total value in USD
- Source must be: Spotrac, Wikipedia, or official announcements
- NO speculation, NO predictions
- Start each line with "Fact:"`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  // Use xAI Grok (5x cheaper than Haiku, better than local llama)
  // Only attempt if API key is available
  if (XAI_API_KEY) {
    try {
      const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: XAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await xaiResponse.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.log('   ⚠️ xAI failed, trying Ollama fallback...');
      
      // Fallback to Ollama if xAI fails
      try {
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.1:8b',
            prompt,
            stream: false
          })
        });
        
        const ollamaData = await ollamaResponse.json();
        return ollamaData.response || '';
      } catch (ollamaError) {
        console.error('   ❌ Both xAI and Ollama failed:', ollamaError.message);
        return '';
      }
    }
  } else {
    // No xAI key - use Ollama directly
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt,
          stream: false
        })
      });
      
      const ollamaData = await ollamaResponse.json();
      return ollamaData.response || '';
    } catch (ollamaError) {
      console.error('   ❌ Ollama request failed:', ollamaError.message);
      return '';
    }
  }
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

// Load content bank to check for duplicates
let contentBankCache = null;
function loadContentBank() {
  if (contentBankCache) return contentBankCache;
  try {
    const bank = JSON.parse(fs.readFileSync(CONTENT_BANK_PATH, 'utf8'));
    contentBankCache = bank;
    return bank;
  } catch (e) {
    return { entries: [] };
  }
}

// Get recently researched topics from log
function getRecentlyResearchedTopics() {
  try {
    if (fs.existsSync(RESEARCH_LOG)) {
      const log = JSON.parse(fs.readFileSync(RESEARCH_LOG, 'utf8'));
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recent = [];
      
      // Check last_run vs current time
      if (log.last_run) {
        const runTime = new Date(log.last_run).getTime();
        if (runTime > weekAgo) {
          recent.push(log.last_topic);
        }
      }
      
      // Also check history array if exists
      if (log.history) {
        for (const entry of log.history) {
          const runTime = new Date(entry.timestamp || entry.last_run).getTime();
          if (runTime > weekAgo) {
            recent.push(entry.topic);
          }
        }
      }
      
      return recent;
    }
  } catch (e) {}
  return [];
}

// Extract athlete/deal name from topic for duplicate check
function extractKeyFromTopic(topic) {
  // For sports: extract player name (first capitalized words)
  const playerMatch = topic.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (playerMatch) return { type: 'athlete', key: playerMatch[1].toLowerCase() };
  
  // For BTC: extract key terms
  const btcKeywords = ['bitcoin', 'satoshi', 'mt gox', 'halving', 'pizza', 'lightning', 
    'microstrategy', 'tesla', 'saylor', 'dorsey', 'musk', 'el salvador', 'etf'];
  for (const kw of btcKeywords) {
    if (topic.toLowerCase().includes(kw)) {
      return { type: 'deal', key: kw };
    }
  }
  
  return { type: 'topic', key: topic.toLowerCase() };
}

// Check if topic would create duplicate in content bank
function isDuplicate(topic, category) {
  const bank = loadContentBank();
  const { key } = extractKeyFromTopic(topic);
  const isBtc = category.startsWith('bitcoin_') || 
    ['sound_money', 'bitcoin_adoption', 'bitcoin_history', 'bitcoin_quotes',
     'bitcoin_scarcity', 'bitcoin_energy', 'bitcoin_network', 'bitcoin_education'].includes(category);
  
  for (const entry of bank.entries) {
    if (isBtc) {
      // Check deal or source
      if (entry.deal && entry.deal.toLowerCase().includes(key)) return true;
      if (entry.source && entry.source.toLowerCase().includes(key)) return true;
    } else {
      // Check athlete name
      if (entry.athlete && entry.athlete.toLowerCase().includes(key)) return true;
    }
  }
  return false;
}

async function selectTopic(categoryPool) {
  const recentTopics = getRecentlyResearchedTopics();
  const bank = loadContentBank();
  
  // Try up to 10 times to find non-duplicate topic
  for (let attempt = 0; attempt < 10; attempt++) {
    const cat = categoryPool[Math.floor(Math.random() * categoryPool.length)];
    const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
    
    // Skip if recently researched
    if (recentTopics.includes(topic)) {
      console.log(`  ⏭ Skipping recently researched: ${topic}`);
      continue;
    }
    
    // Skip if duplicate in content bank
    if (isDuplicate(topic, cat.category)) {
      console.log(`  ⏭ Skipping duplicate: ${topic}`);
      continue;
    }
    
    return { topic, category: cat.category };
  }
  
  // Fallback: just pick random
  const cat = categoryPool[Math.floor(Math.random() * categoryPool.length)];
  const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
  console.log(`  ⚠ Could not find unique topic, using: ${topic}`);
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

// Maps research category names → content bank category names
const SPORTS_TO_BANK_CATEGORY = {
  historic_contracts: 'historic_contract',
  mega_contracts:     'historic_contract',
  nfl_qb_contracts:  'historic_contract',
  nba_contracts:     'historic_contract',
  nil_contracts:     'nil_contract'
};

const BTC_TO_BANK_CATEGORY = {
  bitcoin_history:   'bitcoin_education',
  bitcoin_quotes:    'bitcoin_education',
  sound_money:       'bitcoin_education',
  bitcoin_adoption:  'bitcoin_education'
};

/**
 * Fallback: Create entry from raw text when JSON parsing fails
 */
function createFallbackEntry(rawText, category, isBitcoin) {
  const yearMatch = rawText.match(/(20\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  
  if (isBitcoin) {
    // Try to extract Bitcoin info
    const dollarMatch = rawText.match(/\$[\d,]+(\.\d+)?\s*(billion|million|B|M)?/i);
    const btcMatch = rawText.match(/([\d,]+)\s*BTC/i);
    
    return {
      category: 'bitcoin_education',
      athlete: null,
      deal: 'Bitcoin Education Fact',
      sport: 'Bitcoin',
      year: year,
      contract_value: null,
      btc_price_then: btcMatch ? parseFloat(btcMatch[1].replace(/,/g, '')) : 0,
      verified_fact: rawText.replace(/\*\*/g, '').substring(0, 280),
      source: 'Research',
      used_dates: [],
      cooldown_days: 60
    };
  } else {
    // Try to extract sports info
    const athleteMatch = rawText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
    const valueMatch = rawText.match(/\$?([\d,]+(\.\d+)?)\s*(million|M|billion|B)/i);
    
    let contractValue = 0;
    if (valueMatch) {
      const num = parseFloat(valueMatch[1].replace(/,/g, ''));
      const unit = valueMatch[3].toUpperCase();
      contractValue = unit === 'B' || unit === 'BILLION' ? num * 1e9 : num * 1e6;
    }
    
    const btcPrice = getBtcPriceForYear(year);
    const btcAmt = btcPrice > 0 ? Math.round((contractValue * 0.05) / btcPrice) : 0;
    
    return {
      category: SPORTS_TO_BANK_CATEGORY[category] || 'historic_contract',
      athlete: athleteMatch ? athleteMatch[1] : 'Unknown Athlete',
      sport: 'NFL',
      year: year,
      contract_value: contractValue,
      btc_price_then: btcPrice,
      btc_allocation: btcAmt,
      verified_fact: rawText.replace(/\*\*/g, '').substring(0, 280),
      source: 'Research',
      used_dates: [],
      cooldown_days: 90
    };
  }
}

/**
 * Second Ollama call: extract structured data from research text.
 * Returns null if no usable data found.
 */
async function extractStructuredFact(researchText, category) {
  const isBitcoin = BTC_TO_BANK_CATEGORY[category];
  const bankCategory = SPORTS_TO_BANK_CATEGORY[category] || BTC_TO_BANK_CATEGORY[category];
  if (!bankCategory) return null;

  let prompt;
  if (isBitcoin) {
    // Bitcoin education format
    prompt = `Extract Bitcoin education facts from this research. Return ONLY valid JSON, nothing else.

Research text:
${researchText}

Return this exact JSON shape:
{
  "found": true or false,
  "deal": "Short descriptive title for this Bitcoin fact (e.g., 'Bitcoin Pizza Day', '21 Million Supply')",
  "year": <4-digit year as integer>,
  "btc_price_then": <BTC price in USD at that time (e.g., 0.004 for pizza, 0 for supply cap)>,
  "verified_fact": "The educational fact in tweet-ready format",
  "source_url": "Source URL or name"
}

Set "found" to false if you cannot identify a verifiable Bitcoin fact with a year. Do not guess.`;
  } else {
    // Sports contract format
    prompt = `Extract structured contract data from this sports research. Return ONLY valid JSON, nothing else.

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
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: false }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await res.json();
    const text = (data.response || '').trim();

    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) {
      console.log('  ⚠ No JSON found in response, trying fallback...');
      return createFallbackEntry(text, category, isBitcoin);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log(`  ⚠ JSON parse error: ${e.message}, trying fallback...`);
      return createFallbackEntry(text, category, isBitcoin);
    }
    
    if (isBitcoin) {
      // Handle Bitcoin education entry
      if (!parsed.found || !parsed.deal || !parsed.year) return null;
      
      const entry = {
        category:        'bitcoin_education',
        athlete:         null,
        deal:            parsed.deal,
        sport:           'Bitcoin',
        year:            parsed.year,
        contract_value:  null,
        btc_price_then:  parsed.btc_price_then || 0,
        verified_fact:   parsed.verified_fact || '',
        source:          parsed.source_url || '',
        used_dates:      [],
        cooldown_days:   60
      };
      return entry;
    } else {
      // Handle sports contract entry
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
    }
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

    // Check for duplicates - sports use athlete+year, Bitcoin uses deal+year
    let duplicate = false;
    if (entry.athlete) {
      duplicate = bank.entries.some(e =>
        e.athlete && e.athlete.toLowerCase() === entry.athlete.toLowerCase() &&
        e.year === entry.year
      );
    } else if (entry.deal) {
      duplicate = bank.entries.some(e =>
        e.deal && e.deal.toLowerCase() === entry.deal.toLowerCase() &&
        e.year === entry.year
      );
    }
    
    if (duplicate) {
      const key = entry.athlete || entry.deal;
      console.log(`  ⚠ Already in content bank: ${key} (${entry.year}), skipping`);
      return false;
    }

    const maxId = Math.max(...bank.entries.map(e => e.id || 0));
    entry.id = maxId + 1;

    if (dryRun) {
      const key = entry.athlete || entry.deal;
      console.log(`  [DRY-RUN] Would add to content bank: ${key} (${entry.sport}, ${entry.year})`);
      console.log(`    → ${entry.verified_fact}`);
      return true;
    }

    bank.entries.push(entry);
    bank.last_updated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(CONTENT_BANK_PATH, JSON.stringify(bank, null, 2));
    
    const key = entry.athlete || entry.deal;
    console.log(`  ✓ Added to content bank: ${key} → ID ${entry.id}`);
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

    const response = await getJettResponse(topic, category);
    const items = await parseResearchResults(response, topic, category);

    console.log(`   Found ${items.length} verified items:\n`);
    const added = await addToDatabase(items, dryRun);
    totalAdded += added;

    // Wire sports research into content bank
    if (SPORTS_TO_BANK_CATEGORY[category] && items.length > 0) {
      console.log('\n   📋 Adding sports entry to content bank...');
      const item = items[0];
      const yearMatch = item.content.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      const valueMatch = item.content.match(/\$?([\d,]+(\.\d+)?)\s*(million|M|billion|B)/i);
      
      let contractValue = 0;
      if (valueMatch) {
        const num = parseFloat(valueMatch[1].replace(/,/g, ''));
        const unit = valueMatch[3].toUpperCase();
        contractValue = (unit === 'B' || unit === 'BILLION') ? num * 1e9 : num * 1e6;
      }
      
      const athleteMatch = item.content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      const sport = item.content.includes('NBA') ? 'NBA' : 
                   item.content.includes('NHL') ? 'NHL' : 
                   item.content.includes('MLB') ? 'MLB' : 'NFL';
      
      const btcPrice = getBtcPriceForYear(year);
      const btcAmt = btcPrice > 0 ? Math.round((contractValue * 0.05) / btcPrice) : 0;
      const contractM = (contractValue / 1000000).toFixed(1);
      
      // Clean up the fact text
      const cleanFact = item.content
        .replace(/\[Source:[^\]]*\]/gi, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 280);
      
      const entry = {
        category: SPORTS_TO_BANK_CATEGORY[category],
        athlete: athleteMatch ? athleteMatch[1] : 'Unknown',
        sport: sport,
        year: year,
        contract_value: contractValue,
        btc_price_then: btcPrice,
        btc_allocation: btcAmt,
        verified_fact: cleanFact || `${athleteMatch ? athleteMatch[1] : 'Athlete'} signed a $${contractM}M contract in ${year}`,
        source: item.source || 'Research',
        used_dates: [],
        cooldown_days: 90
      };
      
      addToContentBank(entry, dryRun);
    }

    // Wire BTC research into content bank
    if (BTC_TO_BANK_CATEGORY[category] && items.length > 0) {
      console.log('\n   📋 Adding Bitcoin entry to content bank...');
      const item = items[0];
      const yearMatch = item.content.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      
      // Clean up the fact text - remove Source: parts and URLs
      const cleanFact = item.content
        .replace(/\[Source:[^\]]*\]/gi, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 280);
      
      const entry = {
        category: 'bitcoin_education',
        athlete: null,
        deal: topic,
        sport: 'Bitcoin',
        year: year,
        contract_value: null,
        btc_price_then: 0,
        verified_fact: cleanFact,
        source: item.source || 'Research',
        used_dates: [],
        cooldown_days: 60
      };
      
      addToContentBank(entry, dryRun);
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
