#!/usr/bin/env node
/**
 * Add verified entry to 21M content bank
 * Usage: node add-to-content-bank.js
 * Created: 2026-02-27
 */
const fs = require('fs');
const readline = require('readline');
const BANK_PATH = '/home/clawd/clawd/automation/21m-content-bank.json';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
  const maxId = Math.max(...bank.entries.map(e => e.id));
  
  console.log('\n📝 Add new entry to 21M content bank\n');
  
  const category = await ask('Category (rookie_contract/nil_contract/broke_athlete/historic_contract/sports_business/bitcoin_education): ');
  const athlete = await ask('Athlete/Deal name: ');
  const sport = await ask('Sport/Context: ');
  const year = parseInt(await ask('Year: '));
  const btc_price_then = parseFloat(await ask('BTC price at that time ($): '));
  const verified_fact = await ask('Verified fact (the core data point): ');
  const source = await ask('Source: ');
  
  const entry = {
    id: maxId + 1,
    category,
    athlete,
    sport,
    year,
    contract_value: null,
    btc_price_then,
    btc_allocation: null,
    verified_fact,
    source,
    used_dates: [],
    cooldown_days: 90
  };
  
  console.log('\nNew entry preview:');
  console.log(JSON.stringify(entry, null, 2));
  
  const confirm = await ask('\nAdd this entry? (yes/no): ');
  if (confirm.toLowerCase() === 'yes') {
    bank.entries.push(entry);
    bank.last_updated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2));
    console.log(`✅ Entry #${entry.id} added. Bank now has ${bank.entries.length} entries.`);
  } else {
    console.log('Cancelled.');
  }
  rl.close();
}

main().catch(console.error);
