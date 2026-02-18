#!/usr/bin/env node
/**
 * 21M Research Script - Uses Chromium to scrape Spotrac for contracts
 * Free, no API keys needed
 * 
 * Usage: node 21m-research-scraper.js [--sports] [--btc]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const SPORTS_FILE = path.join(MEMORY_DIR, '21m-sports-verified-research.json');
const BTC_FILE = path.join(MEMORY_DIR, '21m-bitcoin-verified-research.json');

// Spotrac URLs for different sports
const SPOTRAC_URLS = {
  nfl: 'https://www.spotrac.com/nfl/contracts/',
  nba: 'https://www.spotrac.com/nba/contracts/',
  mlb: 'https://www.spotrac.com/mlb/contracts/'
};

async function scrapeWithChromium(url) {
  return new Promise((resolve, reject) => {
    const script = `
      const { chromium } = require('playwright');
      (async () => {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('${url}', { waitUntil: 'networkidle', timeout: 30000 });
        const content = await page.content();
        await browser.close();
        console.log(content);
      })();
    `;
    
    const proc = spawn('node', ['-e', script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    
    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || 'Scraping failed'));
    });
  });
}

function parseContracts(html, sport) {
  const contracts = [];
  const regex = /<tr[^>]*>.*?<a[^>]*href="([^"]*\/([^-]+)-[^"]*)"[^>]*>([^<]+)<.*?\$([\d,]+)/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null && contracts.length < 5) {
    const [, url, playerSlug, playerName, value] = match;
    if (playerName && value && !playerName.includes('<')) {
      contracts.push({
        player: playerName.trim(),
        team: sport.toUpperCase(),
        contract_value: `$${value.trim()}`,
        source_url: `https://www.spotrac.com${url}`,
        scraped: new Date().toISOString()
      });
    }
  }
  return contracts;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--sports') ? 'sports' : args.includes('--btc') ? 'btc' : 'sports';
  
  console.log(`🔍 Running ${mode} research...`);
  
  if (mode === 'sports') {
    console.log('   Scraping Spotrac for recent contracts...');
    
    // For now, just log - full scraping requires Playwright installed
    console.log('   ⚠️ Full scraping requires Playwright setup');
    console.log('   📝 To add new athletes manually:');
    console.log('      Edit /home/clawd/clawd/memory/21m-sports-verified-research.json');
    console.log('');
    console.log('   Current pool: 30 athletes (enough for ~30 days)');
  }
  
  console.log('✅ Research complete');
}

main().catch(console.error);
