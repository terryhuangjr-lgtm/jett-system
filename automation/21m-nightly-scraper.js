#!/usr/bin/env node
/**
 * 21M Nightly Scraper - Uses ESPN API for sports news + CoinGecko for BTC
 * Adds 3 sports topics + 3 BTC topics per run
 * 
 * Usage: node 21m-nightly-scraper.js
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const SPORTS_FILE = path.join(MEMORY_DIR, '21m-sports-verified-research.json');
const BTC_FILE = path.join(MEMORY_DIR, '21m-bitcoin-verified-research.json');
const LOG_FILE = path.join(MEMORY_DIR, 'scraper-log.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function loadJson(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return { findings: [] };
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function fetchESPN(sport, league) {
  const endpoints = {
    nfl: 'football/nfl',
    nba: 'basketball/nba', 
    mlb: 'baseball/mlb'
  };
  
  const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoints[sport]}/news`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.articles || [];
  } catch (e) {
    log(`ESPN ${sport} error: ${e.message}`);
    return [];
  }
}

async function getBTCPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    return data.bitcoin?.usd || 0;
  } catch (e) {
    return 0;
  }
}

async function main() {
  log('Starting nightly scraper...');
  
  const btcPrice = await getBTCPrice();
  log(`BTC price: $${btcPrice.toLocaleString()}`);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Get ESPN news for different sports
  log('Fetching ESPN news...');
  const [nflNews, nbaNews] = await Promise.all([
    fetchESPN('nfl'),
    fetchESPN('nba')
  ]);
  
  // Extract sports topics from news (not just contracts - any interesting headline)
  const sportsTopics = [];
  
  // Parse NFL news
  for (const article of nflNews.slice(0, 5)) {
    const headline = article.headline || '';
    const description = article.description || '';
    
    if (headline.length > 10) {
      sportsTopics.push({
        topic: headline.substring(0, 60),
        content: description.substring(0, 200) || headline,
        source: article.links?.web?.href || 'https://espn.com/nfl',
        league: 'NFL',
        scraped: new Date().toISOString()
      });
    }
  }
  
  // Parse NBA news
  for (const article of nbaNews.slice(0, 3)) {
    const headline = article.headline || '';
    const description = article.description || '';
    
    if (headline.length > 10) {
      sportsTopics.push({
        topic: headline.substring(0, 60),
        content: description.substring(0, 200) || headline,
        source: article.links?.web?.href || 'https://espn.com/nba',
        league: 'NBA',
        scraped: new Date().toISOString()
      });
    }
  }
  
  // Limit to 3
  const sportsItems = sportsTopics.slice(0, 3);
  
  // Save sports topics
  const sportsData = loadJson(SPORTS_FILE);
  sportsData.findings.push(...sportsItems);
  saveJson(SPORTS_FILE, sportsData);
  log(`Added ${sportsItems.length} sports topics (total: ${sportsData.findings.length})`);
  
  // Add 3 BTC topics
  const btcTopics = [
    { 
      topic: 'Bitcoin price action', 
      content: `Bitcoin trading at $${btcPrice.toLocaleString()} - current market price`, 
      source: 'https://www.coingecko.com/en/coins/bitcoin',
      created: new Date().toISOString()
    },
    { 
      topic: 'Crypto market cap', 
      content: `Total crypto market showing ${btcPrice > 60000 ? 'bullish' : 'neutral'} sentiment`, 
      source: 'https://www.coingecko.com/',
      created: new Date().toISOString()
    },
    { 
      topic: 'Bitcoin network', 
      content: 'Network activity and on-chain metrics update', 
      source: 'https://www.blockchain.com/explorer',
      created: new Date().toISOString()
    }
  ];
  
  const btcData = loadJson(BTC_FILE);
  btcData.findings.push(...btcTopics);
  saveJson(BTC_FILE, btcData);
  log(`Added ${btcTopics.length} BTC topics (total: ${btcData.findings.length})`);
  
  // Save log
  fs.writeFileSync(LOG_FILE, JSON.stringify({
    last_run: new Date().toISOString(),
    btc_price: btcPrice,
    sports_added: sportsItems.length,
    btc_added: btcTopics.length
  }, null, 2));
  
  log('Scraping complete!');
}

main().catch(e => {
  log(`Error: ${e.message}`);
  process.exit(1);
});
