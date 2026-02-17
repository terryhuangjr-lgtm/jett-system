#!/usr/bin/env node
/**
 * Brave Search API Wrapper
 *
 * Performs web searches using Brave Search API
 * Used for automated 21M Sports research
 */

const https = require('https');
const zlib = require('zlib');
const { getSecret } = require('../lib/secrets-manager');

const BRAVE_API_KEY = getSecret('BRAVE_API_KEY');
const BRAVE_SEARCH_API = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Perform Brave Search
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} - Search results
 */
async function braveSearch(query, options = {}) {
  const {
    count = 10,
    freshness = null,  // 'pd' = past day, 'pw' = past week, 'pm' = past month
    search_lang = 'en',
    country = 'US'
  } = options;

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      q: query,
      count: count.toString(),
      search_lang,
      country
    });

    if (freshness) {
      params.append('freshness', freshness);
    }

    const url = `${BRAVE_SEARCH_API}?${params.toString()}`;

    const reqOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    };

    https.get(url, reqOptions, (res) => {
      const chunks = [];

      // Handle gzip encoding
      const output = res.headers['content-encoding'] === 'gzip'
        ? res.pipe(zlib.createGunzip())
        : res;

      output.on('data', (chunk) => {
        chunks.push(chunk);
      });

      output.on('end', () => {
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const result = JSON.parse(data);

          if (res.statusCode !== 200) {
            reject(new Error(`Brave API error: ${res.statusCode} - ${result.message || 'Unknown error'}`));
            return;
          }

          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse Brave API response: ${err.message}`));
        }
      });

      output.on('error', (err) => {
        reject(new Error(`Failed to decompress response: ${err.message}`));
      });
    }).on('error', (err) => {
      reject(new Error(`Brave API request failed: ${err.message}`));
    });
  });
}

/**
 * Extract relevant sports contract information from search results
 */
function extractSportsContracts(searchResults) {
  if (!searchResults.web || !searchResults.web.results) {
    return [];
  }

  const contracts = [];

  for (const result of searchResults.web.results) {
    const { title, url, description } = result;

    // Filter out prediction/projection/speculation articles (not actual contracts)
    const speculationIndicators = [
      /predict/i, /projection/i, /could sign/i, /might sign/i, /may sign/i,
      /potential/i, /expected to/i, /likely to/i, /should sign/i, /will sign/i,
      /offseason outlook/i, /extension predictions/i, /contract predictions/i,
      /situations to monitor/i, /to watch/i, /rumors/i, /speculation/i,
      /candidates for/i, /in line for/i, /next up for/i, /due for/i,
      /contract year/i, /free agent/i, /upcoming/i, /preview/i
    ];

    const isSpeculation = speculationIndicators.some(pattern =>
      pattern.test(title) || pattern.test(description)
    );

    if (isSpeculation) {
      continue; // Skip speculation - we ONLY want confirmed signed contracts
    }

    // MUST contain confirmation keywords
    const confirmationRequired = /signed|agrees to|finalizes|lands|inks|officially|announced/i;
    const hasConfirmation = confirmationRequired.test(title) || confirmationRequired.test(description);

    if (!hasConfirmation) {
      continue; // Skip - no confirmation language
    }

    // Look for contract indicators
    const contractIndicators = [
      /\$\d+[MB]/i,  // Dollar amounts like $500M, $1B
      /\d+[\s-]year/i,  // Multi-year deals
      /signs?|signed|extension|contract|deal/i
    ];

    const hasContractInfo = contractIndicators.some(pattern =>
      pattern.test(title) || pattern.test(description)
    );

    if (hasContractInfo) {
      // Extract dollar amounts
      const dollarMatch = (title + ' ' + description).match(/\$(\d+(?:\.\d+)?)\s*([MB])/i);
      let contractValue = null;
      if (dollarMatch) {
        const amount = parseFloat(dollarMatch[1]);
        const unit = dollarMatch[2].toUpperCase();
        contractValue = unit === 'B' ? amount * 1e9 : amount * 1e6;
      }

      // Extract player name using multiple patterns
      let playerName = null;
      const fullText = title + ' ' + description;

      // Pattern 1: "Player Name's" (possessive)
      const nameMatch1 = fullText.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?:contract|deal)/i);
      if (nameMatch1) {
        playerName = nameMatch1[1].trim();
      }

      // Pattern 2: "sign/signs/land/lands/acquire Player Name"
      if (!playerName) {
        const nameMatch2 = fullText.match(/\b(?:sign|signs|land|lands|acquire|acquires|trade for|traded for)\s+(?:OF|RHP|LHP|SS|3B|C|P|DH)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
        if (nameMatch2) {
          const name = nameMatch2[1].trim();
          // Filter out common false positives
          if (!['Agent Signing', 'Free Agent', 'agent signing', 'rookie contract'].includes(name)) {
            playerName = name;
          }
        }
      }

      // Pattern 3: Look in description for "Player Name" near dollar amount
      if (!playerName && dollarMatch) {
        // Find capitalized names within 20 words of the dollar amount
        const dollarIndex = fullText.indexOf(dollarMatch[0]);
        const context = fullText.substring(Math.max(0, dollarIndex - 100), dollarIndex + 100);
        const nameMatch3 = context.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
        if (nameMatch3) {
          playerName = nameMatch3[1].trim();
        }
      }

      // Extract team
      const teamMatch = description.match(/(?:to|with)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      const team = teamMatch ? teamMatch[1] : null;

      // Validate player name - reject common false positives
      const invalidNames = [
        'Yahoo Sports', 'Fox Sports', 'ESPN', 'The Athletic',
        'NBC Sports', 'CBS Sports', 'Sports Illustrated',
        'Free Agent', 'Trade Deadline', 'Full list', 'agent signing',
        'rookie contract', 'new offers', 'Silver Slugger'
      ];

      const isValidPlayer = playerName &&
        !invalidNames.some(invalid => playerName.includes(invalid)) &&
        playerName.split(' ').length >= 2 &&  // Must be at least 2 words
        playerName.split(' ').length <= 4;     // But not more than 4

      // Only add if we have valid player name AND contract value
      if (isValidPlayer && contractValue) {
        contracts.push({
          title,
          url,
          description,
          playerName,
          team,
          contractValue,
          source: new URL(url).hostname
        });
      }
    }
  }

  return contracts;
}

/**
 * Search for recent sports contracts
 */
async function searchRecentContracts(options = {}) {
  const {
    sport = null,  // 'MLB', 'NBA', 'NFL', or null for all
    days = 30,
    excludePlayers = []
  } = options;

  console.log(`\n🔍 Searching for contracts in last ${days} days...`);
  if (sport) console.log(`   Sport: ${sport}`);
  if (excludePlayers.length > 0) console.log(`   Excluding: ${excludePlayers.join(', ')}`);

  // Determine freshness parameter
  let freshness = null;
  if (days <= 1) freshness = 'pd';
  else if (days <= 7) freshness = 'pw';
  else if (days <= 30) freshness = 'pm';

  // Build queries for different content types
  // Focus on ACTUAL SIGNINGS not predictions - use Spotrac and official sources
  const sportFilter = sport ? sport : 'MLB NBA NFL';
  const queries = [
    `site:spotrac.com ${sportFilter} contract extension signed 2025 2026`,  // Spotrac only
    `site:espn.com ${sportFilter} "has signed" OR "agrees to" contract 2025 2026`,  // ESPN official
    `${sportFilter} "officially signed" OR "contract finalized" 2025 2026`,  // Official confirmations
  ];

  console.log(`   Searching ${queries.length} query types...`);
  console.log('');

  try {
    // Search all query types and combine results
    const allContracts = [];

    for (const query of queries) {
      if (queries.length > 1) {
        console.log(`   Searching: "${query}"`);
      }

      try {
        const results = await braveSearch(query, {
          count: 10,
          freshness
        });

        const contracts = extractSportsContracts(results);
        allContracts.push(...contracts);

        if (queries.length > 1) {
          console.log(`     ✓ ${contracts.length} results`);
        }
      } catch (err) {
        console.error(`     ✗ Query failed: ${err.message}`);
      }
    }

    // Deduplicate by URL
    const uniqueContracts = [];
    const seenUrls = new Set();

    for (const contract of allContracts) {
      if (!seenUrls.has(contract.url)) {
        seenUrls.add(contract.url);
        uniqueContracts.push(contract);
      }
    }

    // Filter out excluded players
    const filtered = uniqueContracts.filter(c => {
      if (!c.playerName) return true;
      return !excludePlayers.some(excluded =>
        c.playerName.toLowerCase().includes(excluded.toLowerCase())
      );
    });

    console.log(`\n✓ Found ${filtered.length} unique contracts (${uniqueContracts.length} before filtering)`);

    return filtered;

  } catch (err) {
    console.error(`✗ Search failed: ${err.message}`);
    return [];
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Brave Search CLI for Sports Contracts

Usage:
  node brave-search.js <query>              Simple search
  node brave-search.js --contracts [opts]   Search for recent contracts

Contract Search Options:
  --sport <MLB|NBA|NFL>   Filter by sport
  --days <N>              Look back N days (default: 30)
  --exclude "Name1,Name2" Exclude players

Examples:
  node brave-search.js "NBA max contract 2026"
  node brave-search.js --contracts --sport NBA --days 7
  node brave-search.js --contracts --exclude "Juan Soto,Shohei Ohtani"
`);
    return;
  }

  // Contract search mode
  if (args.includes('--contracts')) {
    const sport = args.includes('--sport') ? args[args.indexOf('--sport') + 1] : null;
    const days = args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1]) : 30;
    const excludeArg = args.includes('--exclude') ? args[args.indexOf('--exclude') + 1] : '';
    const excludePlayers = excludeArg ? excludeArg.split(',').map(s => s.trim()).filter(Boolean) : [];
    const jsonOutput = args.includes('--json');

    const contracts = await searchRecentContracts({ sport, days, excludePlayers });

    // JSON output mode for programmatic use
    if (jsonOutput) {
      console.log(JSON.stringify(contracts, null, 2));
      return;
    }

    // Human-readable output
    console.log('\n📋 Results:\n');
    contracts.forEach((c, i) => {
      console.log(`${i + 1}. ${c.title}`);
      if (c.playerName) console.log(`   Player: ${c.playerName}`);
      if (c.team) console.log(`   Team: ${c.team}`);
      if (c.contractValue) console.log(`   Value: $${(c.contractValue / 1e6).toFixed(1)}M`);
      console.log(`   Source: ${c.source}`);
      console.log(`   URL: ${c.url}`);
      console.log('');
    });

  } else {
    // Simple search mode
    const query = args.join(' ');
    console.log(`\n🔍 Searching: "${query}"\n`);

    const results = await braveSearch(query);

    if (results.web && results.web.results) {
      results.web.results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   ${result.url}`);
        console.log(`   ${result.description}`);
        console.log('');
      });
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { braveSearch, extractSportsContracts, searchRecentContracts };
