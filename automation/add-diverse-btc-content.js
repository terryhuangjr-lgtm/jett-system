#!/usr/bin/env node
/**
 * Add Diverse Bitcoin Content to Pool
 * Beyond price: adoption, Halving, institutional, historic, macroeconomic
 */

const sqlite3 = require('sqlite3');
const path = require('path');

const DB_PATH = '/home/clawd/clawd/data/jett_knowledge.db';

const DIVERSE_BTC_CONTENT = [
  // Halving narratives
  { topic: 'Bitcoin Halving History - Past Cycles', category: 'bitcoin_history', content: '2012 Halving: $12 → $1,100 (+91x). 2016 Halving: $650 → $19,000 (+28x). 2020 Halving: $8,700 → $69,000 (+7x). Next halving cycle: same playbook, different players.', source: 'Bitcoin halving data' },
  { topic: 'Bitcoin Halving Supply Shock', category: 'bitcoin_principles', content: 'Halving cuts new supply by 50%. Miners sell less. Demand stays same. Price goes up. This isn\'t speculation - it\'s basic supply/demand physics. Fixed supply beats printing forever.', source: 'Bitcoin economics' },
  { topic: 'Bitcoin Stock-to-Flow Model', category: 'bitcoin_analysis', content: 'S2F model: Bitcoin\'s stock-to-flow ratio exceeds gold after halvings. Scarcer than precious metals. More portable than gold. Better monetary properties. The math is undeniable.', source: 'Bitcoin analysis models' },
  
  // Institutional adoption
  { topic: 'BlackRock Bitcoin ETF Approval', category: 'bitcoin_adoption', content: 'BlackRock (managing $10T+) filed for Bitcoin ETF. Mainstream adoption wave. Largest asset manager recognizing Bitcoin as legitimate asset class. Wall Street can\'t ignore $1T market cap.', source: 'Bitcoin ETF news' },
  { topic: 'MicroStrategy Bitcoin Holdings', category: 'bitcoin_corporate', content: 'MicroStrategy holds 150,000+ BTC ($10B+). Corporate treasury strategy. Dollar-peers lose value; MicroStrategy gains. They understood what athletes missed: dollars depreciate, Bitcoin appreciates.', source: 'Corporate Bitcoin holdings' },
  { topic: 'El Salvador Bitcoin Adoption', category: 'bitcoin_national', content: 'El Salvador made Bitcoin legal tender (2021). Purchased 2,700+ BTC. Despite IMF pressure, they hold. Nation-states are stacking sats while most individuals still sleep on sound money.', source: 'National Bitcoin adoption' },
  { topic: 'ETFs Gold vs Bitcoin Flows', category: 'bitcoin_investing', content: 'Bitcoin ETFs seeing $10B+ inflows. Gold ETFs losing momentum. Generation shift: younger investors prefer digital scarcity over physical metal. Capital is migrating to better money.', source: 'ETF flow data' },
  
  // Historic moments
  { topic: 'Bitcoin Pizza Day Anniversary', category: 'bitcoin_history', content: 'May 22, 2010: 10,000 BTC bought 2 pizzas. Today worth $660M+ (at $66K/BTC). Every pizza day we\'re reminded: early adoption beats hard work. Bitcoin transforms time into wealth.', source: 'Bitcoin history' },
  { topic: 'Bitcoin Genesis Block Message', category: 'bitcoin_history', content: 'Jan 3, 2009: "Chancellor on brink of second bailout" - embedded in Genesis Block. Bitcoin was born as response to monetary policy. 16 years later, central banks still printing. Bitcoin still fixed.', source: 'Bitcoin genesis block' },
  { topic: 'Bitcoin Whitepaper Anniversary', category: 'bitcoin_history', content: 'Oct 31, 2008: Satoshi published Bitcoin whitepaper. "A purely peer-to-peer electronic cash system." 16 years later, millions understand. Banks still don\'t. Time favors the informed.', source: 'Bitcoin history' },
  { topic: 'Bitcoin First Halving Milestone', category: 'bitcoin_history', content: 'Nov 28, 2012: First Bitcoin halving. Block reward dropped from 50 to 25 BTC. Price: $12. Early adopters who understood supply economics were rewarded. Pattern repeats.', source: 'Bitcoin halving history' },
  
  // Price appreciation facts
  { topic: 'Bitcoin Decade Performance', category: 'bitcoin_performance', content: 'Bitcoin 10-year return: ~500,000%. S&P 500: ~200%. Gold: ~40%. Dollar: -25%. Assets denominated in Bitcoin: only one with compounding returns. Time in market beats timing markets.', source: 'Asset performance data' },
  { topic: 'Bitcoin Purchasing Power Preservation', category: 'bitcoin_principles', content: 'Bitcoin\'s purchasing power increases over time. Dollars lose ~2-3% annually (officially). Real inflation: 10%+. Bitcoin is the only asset that preserves and grows purchasing power indefinitely.', source: 'Monetary economics' },
  { topic: 'Bitcoin vs Dollar 10-Year Chart', category: 'bitcoin_performance', content: 'BTC 2014: $770. BTC 2024: $66,000. Dollar 2014: $100. Dollar 2024: ~$75 purchasing power. Same assets, opposite trajectories. Pick your denominated currency wisely.', source: 'Price performance data' },
  { topic: 'Bitcoin $1M Prediction Thesis', category: 'bitcoin_analysis', content: 'Saylor, McAfee, Winklevoss: $1M Bitcoin predictions. Based on: scarcity, adoption, institutional flows. Whether it hits $1M or $500K, it\'s already won the money debate.', source: 'Bitcoin analysis' },
  
  // Macroeconomic angles
  { topic: 'Central Bank Balance Sheets', category: 'bitcoin_macro', content: 'Fed balance sheet: $7T+. ECB: $6T+. BOJ: $4T+. Global money printing continues. Bitcoin\'s fixed 21M supply looks increasingly attractive. No inflation, no debasement, no central planner.', source: 'Central bank data' },
  { topic: 'US National Debt Comparison', category: 'bitcoin_macro', content: 'US National Debt: $34T+. Growing $1T every 100 days. Medicare, Social Security obligations unfunded. Dollar\'s deficit spending becomes holders\' problem. Bitcoin offers escape.', source: 'US debt data' },
  { topic: 'Currency Debasement History', category: 'bitcoin_macro', content: 'Rome debased silver to bronze. Britain abandoned gold in 1931. US abandoned gold in 1971. Fiat always debases. Bitcoin: first money that cannot be debased. History teaches this lesson.', source: 'Monetary history' },
  { topic: 'Quantitative Easing Effects', category: 'bitcoin_macro', content: '2020 QE: $4T printed in months. 2022 QE again. Prices rise, wages don\'t. Helicopter money funds asset prices, not workers. Bitcoin is the hard money alternative to endless QE.', source: 'Monetary policy data' },
  
  // Adoption & Lightning
  { topic: 'Lightning Network Growth', category: 'bitcoin_adoption', content: 'Lightning Network: 5,000+ BTC capacity, millions in daily volume. Instant payments, near-zero fees. Bitcoin scaling while remaining decentralized. The future of peer-to-peer electronic cash.', source: 'Lightning network data' },
  { topic: 'Bitcoin Lightning Payment Use Cases', category: 'bitcoin_adoption', content: 'Lightning payments: remittances, micropayments, point-of-sale. Strike app, Cash App, Jack Dorsey\'s support. Bitcoin is becoming usable money, not just speculative asset.', source: 'Bitcoin payment news' },
  { topic: 'Bitcoin ETF Gold Ratio Flip', category: 'bitcoin_investing', content: 'Bitcoin ETF volumes surpassing gold ETFs. First time in history digital asset demand exceeds oldest money. Generation wealth transfer beginning. Old money vs new money.', source: 'ETF market data' },
  { topic: 'Bitcoin User Growth Stats', category: 'bitcoin_adoption', content: 'Bitcoin users: 400M+ worldwide. 5% of global population. Adoption curve mirrors internet (1995). Early majority is coming. Being early is a competitive advantage.', source: 'Bitcoin adoption data' },
  
  // Athlete-specific angles
  { topic: 'LeBron vs Bitcoin ROI Comparison', category: 'bitcoin_athlete', content: 'LeBron earned $430M playing basketball. Same money in Bitcoin since 2010: $430M × 1,000,000% gains = $430B+. Best player of generation, mediocre money manager. Sound money would have made him wealthier.', source: 'Comparative analysis' },
  { topic: 'Athlete Contracts vs Bitcoin Investment', category: 'bitcoin_athlete', content: 'Elite athlete career: 10-15 years. Average: 3-5 years. Bitcoin investing: unlimited timeframe, compounding returns. Why trust dollar contracts when Bitcoin preserves and grows wealth?', source: 'Career vs investing analysis' },
  { topic: 'Financial Advisors vs Bitcoin', category: 'bitcoin_advice', content: 'Traditional advisors: "Bitcoin too volatile, too risky." Meanwhile: dollar loses 2-3% yearly, advisors charge 1-2% fees. Who\'s taking the real risk? Bitcoin volatility is temporary; dollar debasement is permanent.', source: 'Financial advice comparison' }
];

const db = new sqlite3.Database(DB_PATH);

console.log('₿ Adding Diverse Bitcoin Content to Pool\n');

let added = 0;
let skipped = 0;

db.serialize(() => {
  for (const item of DIVERSE_BTC_CONTENT) {
    db.get(`SELECT id FROM content_ideas WHERE topic = ?`, [item.topic], (err, row) => {
      if (err) {
        console.error('DB error:', err.message);
        return;
      }
      
      if (row) {
        console.log(`  ⏭️  Skipped: ${item.topic.substring(0, 50)}...`);
        skipped++;
      } else {
        const stmt = db.prepare(`
          INSERT INTO content_ideas (topic, category, content, quality_score, source, created_date)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);
        
        stmt.run(item.topic, item.category, item.content, 9, item.source, function(err) {
          if (err) {
            console.error('Insert error:', err.message);
          } else {
            console.log(`  ✅ Added: ${item.topic.substring(0, 50)}...`);
            added++;
          }
        });
        stmt.finalize();
      }
    });
  }
  
  setTimeout(() => {
    db.close();
    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${added}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n   Run: python3 /home/clawd/clawd/automation/content_pool_manager.py --stats`);
  }, 500);
});
