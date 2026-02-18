#!/usr/bin/env node
/**
 * Custom Search: Derik Queen 2025-26 Topps Chrome
 * Rookies and On-Card Autos only
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchDerikQueen() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🏀 Derik Queen - Topps Chrome Search');
  console.log('═══════════════════════════════════════════════════\n');

  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const customSearch = {
    name: 'Derik Queen - Topps Chrome Rookies & Autos',
    keywords: 'derik queen topps chrome rookie auto',
    categoryId: '261328', // Sports trading cards
    minPrice: 10,
    maxPrice: 1000,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'sticker auto', 'reprint'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    // Step 1: Search eBay
    console.log('🔍 Searching for Derik Queen Topps Chrome cards...\n');
    const allItems = await client.search(customSearch);
    console.log(`✓ Found ${allItems.length} total listings\n`);

    // Step 2: Filter for quality and criteria
    console.log('🎯 Filtering for best candidates...\n');
    
    const filtered = allItems.filter(item => {
      // Must have good feedback
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      // Must be in price range
      if (item.totalPrice < customSearch.minPrice || item.totalPrice > customSearch.maxPrice) {
        return false;
      }

      // Title must contain "topps chrome" (case insensitive)
      const titleLower = item.title.toLowerCase();
      if (!titleLower.includes('topps') || !titleLower.includes('chrome')) {
        return false;
      }

      // Filter OUT sticker autos (we want on-card only)
      if (titleLower.includes('sticker') && titleLower.includes('auto')) {
        return false;
      }

      return true;
    });

    console.log(`✓ ${filtered.length} cards passed filters\n`);

    // Step 3: Analyze each card
    console.log('💎 Analyzing deals and grading potential...\n');
    
    const analyzed = [];

    for (const item of filtered) {
      // Photo quality check
      const qualityAnalysis = photoChecker.analyzeListing(item);

      // Get comps
      let comps = { foundComps: false };
      try {
        comps = await compAnalyzer.getComps(item.title);
      } catch (error) {
        // Continue without comps
      }

      // Calculate profit
      const profitAnalysis = comps.foundComps
        ? compAnalyzer.calculateProfit(item.totalPrice, comps)
        : { insufficientData: true };

      // Score the deal
      let dealScore = dealScorer.score(item, profitAnalysis);

      // Adjust for photo quality
      dealScore.score = photoChecker.adjustDealScore(dealScore.score, qualityAnalysis);

      analyzed.push({
        ...item,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore,
        analyzedAt: new Date().toISOString()
      });

      // Brief progress
      const scoreEmoji = dealScore.score >= 8 ? '🔥' : dealScore.score >= 6 ? '⚡' : '·';
      console.log(`  ${scoreEmoji} [${dealScore.score.toFixed(1)}] ${item.title.substring(0, 60)}...`);
      console.log(`     💰 $${item.totalPrice} | ${qualityAnalysis.passed ? '✓ Quality OK' : '⚠ Quality concern'}`);
      
      if (!profitAnalysis.insufficientData && profitAnalysis.roi > 0) {
        console.log(`     📈 EV: $${profitAnalysis.expectedValue.toFixed(0)} | ROI: ${profitAnalysis.roi}%`);
      }
      console.log();
    }

    // Step 4: Sort by score and show top 10
    analyzed.sort((a, b) => b.dealScore.score - a.dealScore.score);
    const top10 = analyzed.slice(0, 10);

    console.log('═══════════════════════════════════════════════════');
    console.log('🏆 TOP 10 DERIK QUEEN DEALS');
    console.log('═══════════════════════════════════════════════════\n');

    top10.forEach((deal, i) => {
      console.log(`${i + 1}. [${deal.dealScore.score.toFixed(1)}/10] ${deal.dealScore.rating}`);
      console.log(`   ${deal.title}`);
      console.log(`   💰 Price: $${deal.totalPrice}`);

      if (!deal.profitAnalysis.insufficientData) {
        console.log(`   📈 Expected Value: $${deal.profitAnalysis.expectedValue.toFixed(0)}`);
        console.log(`   💵 ROI: ${deal.profitAnalysis.roi}%`);
      }

      // Quality indicators
      if (deal.qualityAnalysis.condition.centering === 'good') {
        console.log(`   ✅ Good centering confirmed`);
      }
      if (deal.qualityAnalysis.condition.corners === 'sharp') {
        console.log(`   ✅ Sharp corners confirmed`);
      }
      if (deal.qualityAnalysis.photoQuality.photoCount >= 4) {
        console.log(`   📸 ${deal.qualityAnalysis.photoQuality.photoCount} photos available`);
      }

      console.log(`   🔗 ${deal.viewItemURL}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════════════\n');

    return {
      success: true,
      totalFound: allItems.length,
      analyzed: analyzed.length,
      top10: top10
    };

  } catch (error) {
    console.error('❌ Search failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run
if (require.main === module) {
  searchDerikQueen()
    .then(result => {
      if (result.success) {
        console.log(`✅ Search complete! Found ${result.analyzed} Derik Queen cards.\n`);
        process.exit(0);
      } else {
        console.error('❌ Search failed\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = searchDerikQueen;
