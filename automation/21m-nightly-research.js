#!/usr/bin/env node
/**
 * 21M Nightly Research Script
 * Uses web search to find fresh sports contracts and BTC content
 * Runs free via cron at midnight
 * 
 * Usage: node 21m-nightly-research.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const SPORTS_FILE = path.join(MEMORY_DIR, '21m-sports-verified-research.json');
const BTC_FILE = path.join(MEMORY_DIR, '21m-bitcoin-verified-research.json');
const LOG_FILE = path.join(MEMORY_DIR, 'research-log.json');

const SPORTS_QUERIES = [
  'site:spotrac.com NFL contract signed 2025 2026',
  'site:spotrac.com NBA contract signed 2025 2026',
  'site:spotrac.com MLB contract signed 2025 2026',
  'college athlete NIL deal signed 2025'
];

const BTC_QUERIES = [
  'Bitcoin news February 2026',
  'Bitcoin ETF adoption 2026',
  'Bitcoin price prediction 2026'
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function webSearch(query) {
  return new Promise((resolve) => {
    try {
      const result = execSync(
        `curl -s -X POST http://localhost:11434/api/generate -d '{"model": "minimax-m2.5:cloud", "prompt": "Search the web for: ${query}. Return the top 3 results with titles and URLs.", "stream": false}'`,
        { timeout: 60000 }
      );
      const data = JSON.parse(result.toString());
      resolve(data.response || '');
    } catch (e) {
      log(`Search failed: ${e.message}`);
      resolve('');
    }
  });
}

function loadResearch(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return { findings: [], timestamp: new Date().toISOString() };
}

function saveResearch(file, data) {
  data.timestamp = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function main() {
  log('Starting nightly research...');
  
  // Research sports contracts
  log('Researching sports contracts...');
  for (const query of SPORTS_QUERIES.slice(0, 2)) {
    log(`  Query: ${query}`);
    const results = await webSearch(query);
    if (results) {
      log(`    Found results (${results.length} chars)`);
    }
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Research BTC topics
  log('Researching BTC topics...');
  for (const query of BTC_QUERIES.slice(0, 1)) {
    log(`  Query: ${query}`);
    const results = await webSearch(query);
    if (results) {
      log(`    Found results (${results.length} chars)`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  log('Research complete!');
  
  // Update log
  const logData = loadResearch(LOG_FILE);
  logData.last_run = new Date().toISOString();
  saveResearch(LOG_FILE, logData);
}

main();
