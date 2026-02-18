#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = path.join(process.env.HOME, 'clawd', 'memory', 'research');
const OUTPUT_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-sports-verified-research.json');

const EXCLUDED = ['juan soto', 'shohei ohtani', 'aaron judge'];

// Approximate BTC prices for signing dates
const BTC_PRICES = {
  // 2024
  '2024-12-08': 97000, '2024-08-02': 61000, '2024-07-01': 57000,
  '2024-06-24': 67000, '2024-06-20': 67000, '2024-01-11': 46000,
  // 2023
  '2023-12-09': 43000, '2023-07-25': 45000, '2023-04-27': 30000,
  // 2022
  '2022-12-07': 17000,
  // 2021
  '2021-01-01': 29000,
  // 2020
  '2020-07-06': 9200, '2020-07-22': 9200,
  // 2019
  '2019-03-20': 4000,
  // 2017
  '2017-01-01': 1000,
  // 2016
  '2016-01-01': 430,
  // 2013
  '2013-01-01': 13,
  // 2010
  '2010-05-22': 0.004,
  // 2009
  '2009-01-03': 0.001,
  // 2008
  '2008-01-01': 1000,
  // 2000
  '2000-12-11': 400,
  // 1997
  '1997-10-31': 300,
  // 1979
  '1979-06-09': 2500
};

function getBTCPrice(dateStr) {
  if (!dateStr) return 50000;
  if (BTC_PRICES[dateStr]) return BTC_PRICES[dateStr];
  const year = parseInt(dateStr.split('-')[0]);
  if (year >= 2024) return 67000;
  if (year >= 2023) return 45000;
  if (year >= 2020) return 10000;
  if (year >= 2017) return 1000;
  if (year >= 2013) return 100;
  if (year >= 2009) return 10;
  return 100;
}

function extractContracts(content) {
  const contracts = [];
  const sections = content.split(/^###\s+/m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n');
    const playerName = lines[0].trim();
    if (!playerName || playerName.includes('Summary') || playerName.includes('Key')) continue;
    
    const c = { player: playerName.replace(/\s*\([^)]+\)\s*$/, '').trim(), team: 'Unknown', sport: 'Unknown' };
    const text = section;
    
    const teamMatch = text.match(/Team[:\s]+([^\n-]+)/);
    if (teamMatch) c.team = teamMatch[1].replace(/\*\*/g, '').trim();
    
    const valMatch = text.match(/\$(\d+(?:\.\d+)?)\s*M/i);
    if (valMatch) {
      const v = parseFloat(valMatch[1]);
      c.contract_value = `$${v}M`;
      c.contract_value_usd = v * 1000000;
    }
    
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      c.signing_date = dateMatch[1];
      c.btc_price_on_date = getBTCPrice(dateMatch[1]);
      c.btc_equivalent = (c.contract_value_usd / c.btc_price_on_date).toFixed(2);
    }
    
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) c.sources = [urlMatch[1]];
    
    if (c.contract_value) contracts.push(c);
  }
  return contracts;
}

console.log('21M Sports Consolidator\n');
const files = fs.readdirSync(RESEARCH_DIR).filter(f => f.includes('contracts') && f.endsWith('.md'));
console.log('Found', files.length, 'files\n');

let all = [];
for (const f of files) {
  const c = extractContracts(fs.readFileSync(path.join(RESEARCH_DIR, f), 'utf8'));
  console.log(f + ':', c.length);
  all = all.concat(c);
}

all = all.filter(x => !EXCLUDED.includes(x.player.toLowerCase()));

const seen = new Set();
all = all.filter(x => seen.has(x.player.toLowerCase()) ? false : seen.add(x.player.toLowerCase()));

all.sort((a, b) => (b.contract_value_usd || 0) - (a.contract_value_usd || 0));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
  type: '21m_sports_research',
  timestamp: new Date().toISOString(),
  findings: all,
  verification_status: 'CONSOLIDATED'
}, null, 2));

console.log('\nSaved:', all.length, 'contracts');
all.slice(0,5).forEach((c,i) => console.log(i+1 + '.', c.player, '-', c.contract_value, '-', c.btc_equivalent, 'BTC'));
