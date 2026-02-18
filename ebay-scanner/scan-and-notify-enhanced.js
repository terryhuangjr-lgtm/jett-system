#!/usr/bin/env node
/**
 * ENHANCED eBay Gem Scan with ALL Filters
 * Includes: Title Analysis, Outlier Detection, Scam Detection, Player Filter, Duplicate Tracking
 */

const GemFinder = require('./gem-finder');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const SlackNotifier = require('./slack-notifier');
const PhotoQualityChecker = require('./photo-quality-checker');
const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');
const ScamDetector = require('./scam-detector');
const PlayerFilter = require('./player-filter');
const DuplicateTracker = require('./duplicate-tracker');
const fs = require('fs');
const path = require('path');

async function scanAndNotify() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 ENHANCED eBay Gem Finder - All Filters Active');
  console.log('═══════════════════════════════════════════════════\n');

  const finder = new GemFinder();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const slackNotifier = new SlackNotifier();
  const photoChecker = new PhotoQualityChecker();
  
  // NEW FILTERS
  const titleAnalyzer = new TitleAnalyzer();
  const outlierDetector = new OutlierDetector();
  const playerFilter = new PlayerFilter();
  const duplicateTracker = new DuplicateTracker();
  
  const startTime = Date.now();

  // Filter stats
  const filterStats = {
    titleAnalysisRejects: 0,
    scamDetectionRejects: 0,
    playerFilterRejects: 0,
    photoQualityRejects: 0,
    outlierRejects: 0,
    duplicateRejects: 0,
    totalPassed: 0
  };

  try {
    // Step 1: Search eBay
    console.log('🔍 Phase 1: Searching eBay...\n');
    const searchResults = await finder.runSearches();

    const totalItems = Object.values(searchResults)
      .reduce((sum, r) => sum + (r.totalFound || 0), 0);
    console.log(`\n✅ Found ${totalItems} total items\n`);

    // Step 2: ENHANCED ANALYSIS with all filters
    console.log('💎 Phase 2: Enhanced Analysis (6-stage filter)...\n');

    const hotDeals = [];
    const goodDeals = [];
    const allAnalyzed = [];
    let itemsAnalyzed = 0;

    for (const [searchKey, result] of Object.entries(searchResults)) {
      if (result.error || !result.items || result.items.length === 0) continue;

      const categoryName = result.searchName;
      console.log(`  Analyzing ${categoryName}...`);

      const itemsToCheck = result.items.slice(0, 5);

      for (const item of itemsToCheck) {
        itemsAnalyzed++;

        // FILTER 1: Title Analysis (damage, red flags)
        const titleAnalysis = titleAnalyzer.analyze(item.title, item.shortDescription || '');
        if (!titleAnalysis.passed) {
          filterStats.titleAnalysisRejects++;
          console.log(`    ❌ TITLE: ${item.title.substring(0, 40)}... (${titleAnalysis.verdict.reason})`);
          continue;
        }

        // FILTER 2: Scam Detection (checklist, reprint)
        const scamCheck = ScamDetector.analyze(item);
        if (!scamCheck.passed) {
          filterStats.scamDetectionRejects++;
          console.log(`    ❌ SCAM: ${item.title.substring(0, 40)}... (${scamCheck.reason})`);
          continue;
        }

        // FILTER 3: Player Quality (stars only)
        const playerCheck = playerFilter.shouldPass(item);
        if (!playerCheck.passed) {
          filterStats.playerFilterRejects++;
          console.log(`    ❌ PLAYER: ${item.title.substring(0, 40)}... (${playerCheck.reason})`);
          continue;
        }

        // FILTER 4: Photo Quality (centering, corners)
        const qualityAnalysis = photoChecker.analyzeListing(item);
        if (!qualityAnalysis.passed) {
          filterStats.photoQualityRejects++;
          console.log(`    ❌ PHOTO: ${item.title.substring(0, 40)}... (${qualityAnalysis.recommendation})`);
          continue;
        }

        // Get comps
        let comps = { foundComps: false };
        try {
          comps = await compAnalyzer.getComps(item.title);
        } catch (error) {
          // Skip if comps fail
        }

        // FILTER 5: Outlier Detection (price validation)
        if (comps.foundComps) {
          const outlierCheck = outlierDetector.analyzeItem(item, comps);
          if (!outlierCheck.passed) {
            filterStats.outlierRejects++;
            console.log(`    ❌ PRICE: ${item.title.substring(0, 40)}... (${outlierCheck.reason})`);
            continue;
          }
        }

        // Calculate profit
        const profitAnalysis = comps.foundComps
          ? compAnalyzer.calculateProfit(item.totalPrice, comps)
          : { insufficientData: true };

        // Score the deal
        let dealScore = dealScorer.score(item, profitAnalysis);
        dealScore.score = photoChecker.adjustDealScore(dealScore.score, qualityAnalysis);
        dealScore.adjustedByPhotoQuality = true;

        const analyzedDeal = {
          ...item,
          searchCategory: categoryName,
          qualityAnalysis: qualityAnalysis,
          titleAnalysis: titleAnalysis,
          playerCheck: playerCheck,
          comps: comps,
          profitAnalysis: profitAnalysis,
          dealScore: dealScore,
          analyzedAt: new Date().toISOString()
        };

        allAnalyzed.push(analyzedDeal);
        filterStats.totalPassed++;

        // Categorize
        if (dealScore.score >= 8) {
          hotDeals.push(analyzedDeal);
          console.log(`    ✅ HOT [${dealScore.score}] ${item.title.substring(0, 40)}...`);
        } else if (dealScore.score >= 6) {
          goodDeals.push(analyzedDeal);
          console.log(`    ⚡ GOOD [${dealScore.score}] ${item.title.substring(0, 40)}...`);
        }
      }

      console.log(`    ✓ ${itemsToCheck.length} items checked\n`);
    }

    // FILTER 6: Duplicate Tracking
    console.log('\n🔄 Phase 3: Removing duplicates...\n');
    const uniqueHotDeals = duplicateTracker.filterDuplicates(hotDeals);
    filterStats.duplicateRejects = hotDeals.length - uniqueHotDeals.length;
    
    if (filterStats.duplicateRejects > 0) {
      console.log(`  Removed ${filterStats.duplicateRejects} duplicate(s)\n`);
    }

    // Sort by score
    uniqueHotDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);
    goodDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Step 4: Display filter statistics
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 FILTER STATISTICS');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`  Items checked: ${itemsAnalyzed}`);
    console.log(`  ❌ Title analysis: ${filterStats.titleAnalysisRejects}`);
    console.log(`  ❌ Scam detection: ${filterStats.scamDetectionRejects}`);
    console.log(`  ❌ Player filter: ${filterStats.playerFilterRejects}`);
    console.log(`  ❌ Photo quality: ${filterStats.photoQualityRejects}`);
    console.log(`  ❌ Outlier price: ${filterStats.outlierRejects}`);
    console.log(`  ❌ Duplicates: ${filterStats.duplicateRejects}`);
    console.log(`  ✅ Passed all filters: ${filterStats.totalPassed}`);
    console.log(`  🔥 Hot deals (unique): ${uniqueHotDeals.length}`);
    console.log(`  ⚡ Good deals: ${goodDeals.length}\n`);

    // Step 5: Generate report
    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      filterStats: filterStats,
      summary: {
        totalSearches: Object.keys(searchResults).length,
        totalItemsFound: totalItems,
        itemsAnalyzed: itemsAnalyzed,
        hotDeals: uniqueHotDeals.length,
        goodDeals: goodDeals.length
      },
      hotDeals: uniqueHotDeals,
      goodDeals: goodDeals,
      allDeals: allAnalyzed
    };

    // Save report
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(resultsDir, `enhanced-scan-${dateStr}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Step 6: Send Slack notifications
    console.log('📱 Phase 4: Sending Slack notifications...\n');
    await slackNotifier.sendHotDealsAlert(uniqueHotDeals);
    await slackNotifier.sendDailySummary(report.summary);

    // Final summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`  ⏱️  Scan duration: ${scanDuration}s`);
    console.log(`  🔍 Total items found: ${totalItems}`);
    console.log(`  💎 Items analyzed: ${itemsAnalyzed}`);
    console.log(`  🔥 Hot deals (8-10): ${uniqueHotDeals.length}`);
    console.log(`  ⚡ Good deals (6-7.9): ${goodDeals.length}\n`);

    if (uniqueHotDeals.length > 0) {
      console.log('🔥 TOP HOT DEALS:\n');
      uniqueHotDeals.slice(0, 5).forEach((deal, i) => {
        console.log(`${i + 1}. [${deal.dealScore.score}] ${deal.dealScore.rating}`);
        console.log(`   ${deal.title.substring(0, 60)}...`);
        console.log(`   💰 $${deal.totalPrice}`);
        if (deal.profitAnalysis && !deal.profitAnalysis.insufficientData) {
          console.log(`   📈 EV: $${deal.profitAnalysis.expectedValue.toFixed(2)} | ROI: ${deal.profitAnalysis.roi.toFixed(1)}%`);
        }
        console.log(`   🔗 ${deal.viewItemURL}\n`);
      });
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log(`💾 Full report saved: ${reportPath}\n`);
    console.log('✅ Scan complete and notifications sent!\n');
    console.log(`Results: ${uniqueHotDeals.length} hot deals, ${goodDeals.length} good deals\n`);

  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  scanAndNotify()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = scanAndNotify;
