#!/usr/bin/env node
/**
 * Import Verified Sports Contracts to Content Pool
 * Moves contracts from generate-test-research.js into the database
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');

const DB_PATH = '/home/clawd/clawd/data/jett_knowledge.db';

const REAL_CONTRACTS = [
  { player: 'Kirk Cousins', team: 'Atlanta Falcons', sport: 'NFL', contract_value_usd: 180000000, signing_date: '2024-03-13', source_url: 'https://www.spotrac.com/nfl/atlanta-falcons/kirk-cousins-23420/', btc_price_on_date: 72000 },
  { player: 'Tua Tagovailoa', team: 'Miami Dolphins', sport: 'NFL', contract_value_usd: 212400000, signing_date: '2024-07-26', source_url: 'https://www.spotrac.com/nfl/miami-dolphins/tua-tagovailoa-30665/', btc_price_on_date: 68000 },
  { player: 'Jordan Love', team: 'Green Bay Packers', sport: 'NFL', contract_value_usd: 220000000, signing_date: '2024-05-09', source_url: 'https://www.spotrac.com/nfl/green-bay-packers/jordan-love-28944/', btc_price_on_date: 63000 },
  { player: 'Joe Burrow', team: 'Cincinnati Bengals', sport: 'NFL', contract_value_usd: 275000000, signing_date: '2024-09-09', source_url: 'https://www.spotrac.com/nfl/cincinnati-bengals/joe-burrow-28920/', btc_price_on_date: 57000 },
  { player: 'Jared Goff', team: 'Detroit Lions', sport: 'NFL', contract_value_usd: 212000000, signing_date: '2024-01-24', source_url: 'https://www.spotrac.com/nfl/detroit-lions/jared-goff-21710/', btc_price_on_date: 50000 },
  { player: 'Justin Herbert', team: 'Los Angeles Chargers', sport: 'NFL', contract_value_usd: 262500000, signing_date: '2024-07-26', source_url: 'https://www.spotrac.com/nfl/los-angeles-chargers/justin-herbert-28919/', btc_price_on_date: 68000 },
  { player: 'Lamar Jackson', team: 'Baltimore Ravens', sport: 'NFL', contract_value_usd: 260000000, signing_date: '2023-04-27', source_url: 'https://www.spotrac.com/nfl/baltimore-ravens/lamar-jackson-21754/', btc_price_on_date: 30000 },
  { player: 'Patrick Mahomes', team: 'Kansas City Chiefs', sport: 'NFL', contract_value_usd: 450000000, signing_date: '2020-07-06', source_url: 'https://www.spotrac.com/nfl/kansas-city-chiefs/patrick-mahomes-21751/', btc_price_on_date: 9200 },
  { player: 'Jalen Brunson', team: 'New York Knicks', sport: 'NBA', contract_value_usd: 157500000, signing_date: '2024-08-02', source_url: 'https://www.spotrac.com/nba/new-york-knicks/jalen-brunson-4485/', btc_price_on_date: 61000 },
  { player: 'Donovan Mitchell', team: 'Cleveland Cavaliers', sport: 'NBA', contract_value_usd: 150600000, signing_date: '2024-07-06', source_url: 'https://www.spotrac.com/nba/cleveland-cavaliers/donovan-mitchell-4492/', btc_price_on_date: 55000 },
  { player: 'Tyrese Haliburton', team: 'Indiana Pacers', sport: 'NBA', contract_value_usd: 185000000, signing_date: '2024-07-07', source_url: 'https://www.spotrac.com/nba/indiana-pacers/tyrese-haliburton-7788/', btc_price_on_date: 56000 },
  { player: 'Paul George', team: 'Los Angeles Clippers', sport: 'NBA', contract_value_usd: 212000000, signing_date: '2024-07-09', source_url: 'https://www.spotrac.com/nba/los-angeles-clippers/paul-george-4446/', btc_price_on_date: 57000 },
  { player: 'OG Anunoby', team: 'New York Knicks', sport: 'NBA', contract_value_usd: 212500000, signing_date: '2024-07-10', source_url: 'https://www.spotrac.com/nba/new-york-knicks/og-anunoby-7787/', btc_price_on_date: 58000 },
  { player: 'LeBron James', team: 'Los Angeles Lakers', sport: 'NBA', contract_value_usd: 157500000, signing_date: '2024-07-03', source_url: 'https://www.spotrac.com/nba/los-angeles-lakers/lebron-james-3966/', btc_price_on_date: 58000 },
  { player: 'Juan Soto', team: 'New York Mets', sport: 'MLB', contract_value_usd: 765000000, signing_date: '2024-12-09', source_url: 'https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/', btc_price_on_date: 98000 },
  { player: 'Shohei Ohtani', team: 'Los Angeles Dodgers', sport: 'MLB', contract_value_usd: 700000000, signing_date: '2023-12-11', source_url: 'https://www.spotrac.com/mlb/los-angeles-dodgers/shohei-ohtani-28250/', btc_price_on_date: 42000 },
  { player: 'Aaron Judge', team: 'New York Yankees', sport: 'MLB', contract_value_usd: 360000000, signing_date: '2024-12-08', source_url: 'https://www.spotrac.com/mlb/new-york-yankees/aaron-judge-23480/', btc_price_on_date: 98500 }
];

function btcEquivalent(usd, btcPrice) {
  return Math.round(usd / btcPrice).toLocaleString();
}

function formatContent(contract) {
  const btcValue = btcEquivalent(contract.contract_value_usd, contract.btc_price_on_date);
  return `${contract.player} signed with ${contract.team} (${contract.sport}) for $${(contract.contract_value_usd / 1000000).toFixed(1)}M on ${contract.signing_date}. At the time, BTC was $${contract.btc_price_on_date.toLocaleString()}, so this contract was worth approximately ${btcValue} BTC. Contract source: ${contract.source_url}`;
}

const db = new sqlite3.Database(DB_PATH);

console.log('🏈 Importing Verified Sports Contracts to Content Pool\n');

let imported = 0;
let skipped = 0;

db.serialize(() => {
  for (const contract of REAL_CONTRACTS) {
    const topic = `${contract.player} ${contract.team} Contract`;
    const content = formatContent(contract);
    const category = '21m-sports';
    
    // Check if exists
    db.get(`SELECT id FROM content_ideas WHERE topic = ?`, [topic], (err, row) => {
      if (err) {
        console.error('DB error:', err.message);
        return;
      }
      
      if (row) {
        console.log(`  ⏭️  Skipped: ${topic} (already exists)`);
        skipped++;
      } else {
        const stmt = db.prepare(`
          INSERT INTO content_ideas (topic, category, content, quality_score, source, created_date)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        
        stmt.run(topic, category, content, 10, contract.source_url, function(err) {
          if (err) {
            console.error('Insert error:', err.message);
          } else {
            console.log(`  ✅ Added: ${topic} (${btcEquivalent(contract.contract_value_usd, contract.btc_price_on_date)} BTC)`);
            imported++;
          }
        });
        stmt.finalize();
      }
    });
  }
  
  // Wait a bit then report
  setTimeout(() => {
    db.close();
    console.log(`\n📊 Summary:`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n   Run: python3 /home/clawd/clawd/automation/content_pool_manager.py --stats`);
  }, 500);
});
