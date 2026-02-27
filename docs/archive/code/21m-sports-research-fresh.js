#!/usr/bin/env node
/**
 * 21M Sports Fresh Research Script
 *
 * Looks for CURRENT/RECENT sports contracts (last 30-60 days)
 * Falls back to notable historical contracts if nothing recent
 *
 * Priority:
 * 1. Breaking news (last 7 days)
 * 2. Recent contracts (last 30 days)
 * 3. Notable contracts (last 60 days)
 * 4. Historic mega-deals (if nothing recent)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const OUTPUT_FILE = path.join(MEMORY_DIR, '21m-sports-verified-research.json');

// Date ranges for research priority
const TODAY = new Date();
const DAYS_AGO_7 = new Date(TODAY - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const DAYS_AGO_30 = new Date(TODAY - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const DAYS_AGO_60 = new Date(TODAY - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

console.log('\n🏈 21M Sports Fresh Research');
console.log('═'.repeat(70));
console.log(`\n📅 Date Ranges:`);
console.log(`   Breaking:  Last 7 days  (since ${DAYS_AGO_7})`);
console.log(`   Recent:    Last 30 days (since ${DAYS_AGO_30})`);
console.log(`   Notable:   Last 60 days (since ${DAYS_AGO_60})`);
console.log(`   Today:     ${TODAY.toISOString().split('T')[0]}`);
console.log('');

/**
 * Search queries prioritized by recency
 */
const SEARCH_QUERIES = [
  // Breaking news (last 7 days)
  {
    query: `sports contract signed ${DAYS_AGO_7} to ${TODAY.toISOString().split('T')[0]} MLB NBA NFL`,
    priority: 'breaking',
    description: 'Breaking news contracts (last 7 days)'
  },
  // Recent contracts (last 30 days)
  {
    query: `major sports contract 2026 MLB NBA NFL recent`,
    priority: 'recent',
    description: 'Recent major contracts (2026)'
  },
  {
    query: `athlete signs contract ${DAYS_AGO_30} Spotrac`,
    priority: 'recent',
    description: 'Recent signings (last 30 days)'
  },
  // Notable recent contracts
  {
    query: `biggest sports contracts 2026 MLB NBA NFL`,
    priority: 'notable',
    description: 'Biggest contracts of 2026'
  },
  // Fallback to major recent deals
  {
    query: `NFL contract extension 2026 Spotrac`,
    priority: 'fallback',
    description: 'NFL extensions 2026'
  },
  {
    query: `NBA max contract 2026 Spotrac`,
    priority: 'fallback',
    description: 'NBA max contracts 2026'
  },
  {
    query: `MLB free agent signing 2026`,
    priority: 'fallback',
    description: 'MLB free agent signings 2026'
  }
];

/**
 * Exclusion list - players/contracts to SKIP
 * (Prevents reusing old research)
 */
const EXCLUDE_PLAYERS = [
  'Juan Soto',
  'Shedeur Sanders',
  'Shohei Ohtani' // Only if pre-2026
];

/**
 * Check if player should be excluded
 */
function shouldExclude(playerName) {
  return EXCLUDE_PLAYERS.some(excluded =>
    playerName.toLowerCase().includes(excluded.toLowerCase())
  );
}

/**
 * Manual research instructions
 */
function printManualInstructions() {
  console.log('\n⚠️  MANUAL RESEARCH REQUIRED');
  console.log('');
  console.log('Web search integration not yet complete.');
  console.log('');
  console.log('🔍 Use these searches to find CURRENT contracts:');
  console.log('');

  SEARCH_QUERIES.forEach((search, i) => {
    console.log(`${i + 1}. [${search.priority.toUpperCase()}] ${search.description}`);
    console.log(`   Query: "${search.query}"`);
    console.log('');
  });

  console.log('📋 What to look for:');
  console.log('   ✅ Contracts signed in last 30-60 days');
  console.log('   ✅ Breaking news signings');
  console.log('   ✅ Major extensions announced recently');
  console.log('   ✅ Free agent signings (current season)');
  console.log('');
  console.log('   ❌ Old contracts (Juan Soto, etc.)');
  console.log('   ❌ Contracts from 2024 or earlier');
  console.log('   ❌ Rumored/unconfirmed deals');
  console.log('');
  console.log('🔗 Sources to check:');
  console.log('   - Spotrac.com (contract database)');
  console.log('   - ESPN.com/contracts');
  console.log('   - TheAthletic.com');
  console.log('   - Team official announcements');
  console.log('');
  console.log('💡 Example valid contracts:');
  console.log('   - "Patrick Mahomes extension 2026"');
  console.log('   - "Anthony Davis max contract 2026"');
  console.log('   - "Aaron Judge extension February 2026"');
  console.log('');
  console.log('📝 Once you find a current contract:');
  console.log('');
  console.log('   node ~/clawd/automation/21m-sports-real-research.js \\');
  console.log('     --dry-run \\');
  console.log('     --test-date YYYY-MM-DD \\');
  console.log('     --player "Player Name" \\');
  console.log('     --amount 500000000 \\');
  console.log('     --source "https://spotrac.com/..."');
  console.log('');
}

/**
 * Create research template for manual entry
 */
function createResearchTemplate() {
  const template = {
    type: '21m_sports_research',
    timestamp: new Date().toISOString(),
    status: 'TEMPLATE',
    instructions: 'Fill in with CURRENT contract data from research',
    search_queries_used: SEARCH_QUERIES.map(q => q.query),
    date_range: {
      breaking_news_cutoff: DAYS_AGO_7,
      recent_cutoff: DAYS_AGO_30,
      notable_cutoff: DAYS_AGO_60
    },
    excluded_players: EXCLUDE_PLAYERS,
    findings: [
      {
        player: '[PLAYER NAME]',
        team: '[TEAM NAME]',
        sport: '[MLB/NBA/NFL]',
        contract_value: '$[XXX]M',
        contract_value_usd: 0,  // Fill with actual number
        signing_date: 'YYYY-MM-DD',
        source_type: '[Official/Spotrac/ESPN]',
        sources: [
          'https://spotrac.com/...',
          'https://[official-source]'
        ],
        btc_equivalent: '[TO BE CALCULATED]',
        notes: 'Add any relevant context here'
      }
    ],
    btc_prices: {
      '[SIGNING_DATE]': {
        price: 0,  // Will be fetched from CoinGecko
        source: 'https://api.coingecko.com/...'
      }
    },
    verification_status: 'PENDING',
    next_steps: [
      '1. Research current contracts using queries above',
      '2. Verify contract details on Spotrac',
      '3. Get BTC price for signing date',
      '4. Run verification: node ~/clawd/automation/21m-sports-validator.js',
      '5. Generate content: node ~/clawd/automation/21m-sports-verified-generator-v2.js'
    ]
  };

  const templateFile = path.join(MEMORY_DIR, '21m-sports-research-template.json');
  fs.writeFileSync(templateFile, JSON.stringify(template, null, 2));

  console.log(`📄 Research template created: ${templateFile}`);
  console.log('');
  console.log('Fill in the template with current contract data, then run verification.');
  console.log('');

  return templateFile;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Ensure memory directory exists
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    // Print instructions for manual research
    printManualInstructions();

    // Create template for manual data entry
    const templateFile = createResearchTemplate();

    console.log('═'.repeat(70));
    console.log('');
    console.log('🎯 RESEARCH FOCUS:');
    console.log('   - Find contracts from LAST 30-60 DAYS');
    console.log('   - Breaking news takes priority');
    console.log('   - Exclude: Juan Soto, Shedeur Sanders');
    console.log('   - Verify on Spotrac or official sources');
    console.log('');
    console.log('✅ When research is complete:');
    console.log('   1. Update template with real data');
    console.log('   2. Run validator to verify');
    console.log('   3. Generate content');
    console.log('');

    return 0;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { main };
