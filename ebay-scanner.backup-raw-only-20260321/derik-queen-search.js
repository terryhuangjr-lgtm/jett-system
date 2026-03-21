#!/usr/bin/env node
/**
 * Custom Search: Derik Queen 2025-26 Topps Chrome
 * Finds top 10 best deals for rookies and on-card autos
 * Uses ALL tools: PhotoQuality, CompAnalyzer, DealScorer, ScamDetector
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const fs = require('fs');
const path = require('path');

async function searchDerikQueen() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🏀 DERIK QUEEN - 2025-26 TOPPS CHROME SEARCH');
  console.log('═══════════════════════════════════════════════════\n');

  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const scamDetector = new ScamDetector();

  const startTime = Date.now();

  try {
    // Search 1: Derik Queen Topps Chrome Rookies
    console.log('🔍 Search 1: Derik Queen Topps Chrome Rookies...\n');
    
    const rookieSearch = {
      name: 'Derik Queen Topps Chrome Rookie',
      keywords: 'derik queen topps chrome rookie',
      categoryId: '261328', // Sports trading cards
      minPrice: 5,
      maxPrice: 500,
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'reprint'],
      sortOrder: 'EndTimeSoonest',
      condition: 'New'
    };

    const rookieItems = await client.search(rookieSearch);
    console.log(`   Found ${rookieItems.length} rookie cards\n`);

    // Search 2: Derik Queen Topps Chrome Autos (on-card only)
    console.log('🔍 Search 2: Derik Queen Topps Chrome On-Card Autos...\n');
    
    const autoSearch = {
      name: 'Derik Queen Topps Chrome On-Card Auto',
      keywords: 'derik queen topps chrome auto autograph on card',
      categoryId: '261328',
      minPrice: 10,
      maxPrice: 500,
      excludeKeywords: ['PSA', 'BGS', 'graded', 'sticker auto', 'sticker autograph'],
      sortOrder: 'EndTimeSoonest',
      condition: 'New'
    };

    const autoItems = await client.search(autoSearch);
    console.log(`   Found ${autoItems.length} on-card autos\n`);

    // Combine all items
    const allItems = [...rookieItems, ...autoItems];
    console.log(`📊 Total items found: ${allItems.length}\n`);

    if (allItems.length === 0) {
      console.log('❌ No items found matching criteria.\n');
      return { success: false, message: 'No items found' };
    }

    // Step 1: Initial filtering (feedback, images, price)
    console.log('🔎 Step 1: Initial Quality Filtering...\n');
    
    const filtered = allItems.filter(item => {
      // Must have 98%+ feedback
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      // Must be in price range
      if (item.totalPrice < 5 || item.totalPrice > 500) return false;
      
      return true;
    });

    console.log(`   ✓ ${filtered.length} items passed initial filters\n`);

    // Step 2: Scam Detection
    console.log('🚨 Step 2: Scam Detection...\n');
    
    const nonScamItems = filtered.filter(item => {
      const scamCheck = ScamDetector.analyze(item);
      
      if (!scamCheck.passed) {
        console.log(`   ⚠️  Flagged: ${item.title.substring(0, 60)}...`);
        console.log(`       Reason: ${scamCheck.reason}\n`);
        return false;
      }
      
      return true;
    });

    console.log(`   ✓ ${nonScamItems.length} items passed scam detection\n`);

    // Step 3: Photo Quality Analysis
    console.log('📸 Step 3: Photo Quality Analysis...\n');
    
    const gradingCandidates = nonScamItems.filter(item => {
      const photoAnalysis = photoChecker.analyzeListing(item);
      
      // Must pass photo quality check
      if (!photoAnalysis.passed) {
        console.log(`   ⚠️  Rejected: ${item.title.substring(0, 60)}...`);
        console.log(`       Reason: ${photoAnalysis.recommendation}\n`);
        return false;
      }
      
      // Store photo analysis with item
      item.photoAnalysis = photoAnalysis;
      
      return true;
    });

    console.log(`   ✓ ${gradingCandidates.length} items passed photo quality check\n`);

    // Step 4: Comp Analysis & Deal Scoring
    console.log('💰 Step 4: Comp Analysis & Deal Scoring...\n');
    
    const analyzedDeals = [];

    for (const item of gradingCandidates) {
      try {
        console.log(`   Analyzing: ${item.title.substring(0, 50)}...`);

        // Get comps
        const comps = await compAnalyzer.getComps(item.title);

        // Calculate profit
        const profitAnalysis = comps.foundComps
          ? compAnalyzer.calculateProfit(item.totalPrice, comps)
          : { insufficientData: true };

        // Score the deal
        const dealScore = dealScorer.score(item, profitAnalysis);

        // Create analyzed deal object
        const analyzedDeal = {
          ...item,
          comps: comps,
          profitAnalysis: profitAnalysis,
          dealScore: dealScore
        };

        analyzedDeals.push(analyzedDeal);

        console.log(`       Score: ${dealScore.score}/10 - ${dealScore.rating}`);
        
        if (!profitAnalysis.insufficientData) {
          console.log(`       Price: $${item.totalPrice} → EV: $${profitAnalysis.expectedValue} (${profitAnalysis.roi}% ROI)`);
        }
        
        console.log('');

      } catch (error) {
        console.error(`       Error: ${error.message}\n`);
      }
    }

    // Sort by score (highest first)
    analyzedDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Get top 10
    const top10 = analyzedDeals.slice(0, 10);

    // Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      summary: {
        totalFound: allItems.length,
        afterFiltering: filtered.length,
        afterScamCheck: nonScamItems.length,
        afterPhotoCheck: gradingCandidates.length,
        analyzed: analyzedDeals.length,
        top10: top10.length
      },
      top10Deals: top10,
      allDeals: analyzedDeals
    };

    // Save full report
    const reportFile = path.join(__dirname, 'results', `derik-queen-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Print summary
    printResults(top10, scanDuration, reportFile);

    return {
      success: true,
      top10: top10,
      reportFile: reportFile
    };

  } catch (error) {
    console.error('\n❌ Search failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Print top 10 results
 */
function printResults(top10, duration, reportFile) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🏆 TOP 10 DERIK QUEEN DEALS');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`⏱️  Scan Duration: ${duration}s\n`);

  if (top10.length === 0) {
    console.log('No deals found that passed all filters.\n');
    return;
  }

  top10.forEach((deal, i) => {
    console.log(`${i + 1}. ${deal.dealScore.rating} [Score: ${deal.dealScore.score}]`);
    console.log(`   ${deal.title}`);
    console.log(`   💰 Price: $${deal.totalPrice}`);

    if (!deal.profitAnalysis.insufficientData) {
      console.log(`   📈 Expected Value: $${deal.profitAnalysis.expectedValue}`);
      console.log(`   💵 ROI: ${deal.profitAnalysis.roi}%`);
      console.log(`   🎯 PSA 10 Profit: $${deal.profitAnalysis.psa10Scenario.profit}`);
    } else {
      console.log(`   ⚠️  Insufficient comp data`);
    }

    // Photo quality highlights
    if (deal.photoAnalysis && deal.photoAnalysis.condition) {
      const bonus = [];
      if (deal.photoAnalysis.condition.corners === 'sharp') bonus.push('✅ Sharp corners');
      if (deal.photoAnalysis.condition.centering === 'good') bonus.push('✅ Good centering');
      if (bonus.length > 0) {
        console.log(`   ${bonus.join(' | ')}`);
      }
    }

    console.log(`   🔗 ${deal.viewItemURL}\n`);
  });

  console.log(`💾 Full report saved: ${reportFile}\n`);
}

// Run if called directly
if (require.main === module) {
  searchDerikQueen()
    .then(result => {
      if (result.success) {
        console.log('✅ Search complete!\n');
        process.exit(0);
      } else {
        console.log('❌ Search failed.\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = searchDerikQueen;
