#!/usr/bin/env node
/**
 * Broader Derik Queen Search - Try multiple variations
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchDerikQueenBroad() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🏀 Derik Queen - Broad Search (Multiple Variations)');
  console.log('═══════════════════════════════════════════════════\n');

  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  // Try multiple search variations
  const searchVariations = [
    {
      name: 'Derik Queen (any card)',
      keywords: 'derik queen',
      categoryId: '261328',
      minPrice: 1,
      maxPrice: 1000,
      excludeKeywords: ['reprint'],
      sortOrder: 'PricePlusShippingLowest',
      condition: 'New'
    },
    {
      name: 'Queen Maryland (alternative)',
      keywords: 'queen maryland basketball',
      categoryId: '261328',
      minPrice: 1,
      maxPrice: 1000,
      excludeKeywords: ['reprint', 'PSA', 'BGS', 'graded'],
      sortOrder: 'PricePlusShippingLowest',
      condition: 'New'
    }
  ];

  const allResults = [];

  for (const search of searchVariations) {
    try {
      console.log(`\n🔍 Searching: ${search.name}...`);
      const items = await client.search(search);
      console.log(`   Found ${items.length} listings`);

      if (items.length > 0) {
        allResults.push(...items);
      }

    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
    }
  }

  // Deduplicate by itemId
  const uniqueItems = Array.from(
    new Map(allResults.map(item => [item.itemId, item])).values()
  );

  console.log(`\n✓ Total unique listings found: ${uniqueItems.length}\n`);

  if (uniqueItems.length === 0) {
    console.log('❌ No Derik Queen cards found on eBay.');
    console.log('\nPossible reasons:');
    console.log('  • Card hasn\'t been released yet (2025-26 Topps Chrome)');
    console.log('  • Different spelling on eBay (Dereck, Derek, etc.)');
    console.log('  • Listed under different name (Maryland, #23, etc.)');
    console.log('\nTry searching manually on eBay to see what\'s available.\n');
    return { success: true, totalFound: 0, analyzed: 0 };
  }

  // Show all results we found
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 ALL DERIK QUEEN LISTINGS FOUND');
  console.log('═══════════════════════════════════════════════════\n');

  const analyzed = [];

  for (const item of uniqueItems.slice(0, 20)) {
    // Basic quality check
    const qualityAnalysis = photoChecker.analyzeListing(item);

    // Get comps if possible
    let comps = { foundComps: false };
    try {
      comps = await compAnalyzer.getComps(item.title);
    } catch (error) {
      // Skip comps
    }

    // Calculate profit
    const profitAnalysis = comps.foundComps
      ? compAnalyzer.calculateProfit(item.totalPrice, comps)
      : { insufficientData: true };

    // Score
    let dealScore = dealScorer.score(item, profitAnalysis);
    dealScore.score = photoChecker.adjustDealScore(dealScore.score, qualityAnalysis);

    analyzed.push({
      ...item,
      qualityAnalysis,
      comps,
      profitAnalysis,
      dealScore
    });

    // Display
    const scoreEmoji = dealScore.score >= 8 ? '🔥' : dealScore.score >= 6 ? '⚡' : '·';
    console.log(`${scoreEmoji} [${dealScore.score.toFixed(1)}/10] ${item.title}`);
    console.log(`   💰 $${item.totalPrice} | Seller: ${item.sellerPositivePercent}%`);
    
    if (!profitAnalysis.insufficientData && profitAnalysis.roi > 0) {
      console.log(`   📈 EV: $${profitAnalysis.expectedValue.toFixed(0)} | ROI: ${profitAnalysis.roi}%`);
    }
    
    if (qualityAnalysis.condition.centering === 'good') {
      console.log(`   ✅ Good centering`);
    }
    if (qualityAnalysis.condition.corners === 'sharp') {
      console.log(`   ✅ Sharp corners`);
    }

    console.log(`   🔗 ${item.viewItemURL}`);
    console.log();
  }

  // Sort by score
  analyzed.sort((a, b) => b.dealScore.score - a.dealScore.score);

  console.log('═══════════════════════════════════════════════════');
  console.log(`\n✅ Search complete! Found ${uniqueItems.length} Derik Queen cards.\n`);

  return {
    success: true,
    totalFound: uniqueItems.length,
    analyzed: analyzed.length,
    topDeals: analyzed.slice(0, 10)
  };
}

// Run
if (require.main === module) {
  searchDerikQueenBroad()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = searchDerikQueenBroad;
