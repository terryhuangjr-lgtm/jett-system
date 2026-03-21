#!/usr/bin/env node
/**
 * Complete eBay Gem Scan with Notifications
 * Runs searches, analyzes deals, scores opportunities, and sends Slack alerts
 */

const GemFinder = require('./gem-finder');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const SlackNotifier = require('./slack-notifier');
const PhotoQualityChecker = require('./photo-quality-checker');
const fs = require('fs');
const path = require('path');

async function scanAndNotify() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 eBay Gem Finder - Complete Scan & Alert System');
  console.log('═══════════════════════════════════════════════════\n');

  const finder = new GemFinder();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const slackNotifier = new SlackNotifier();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    // Step 1: Search eBay
    console.log('🔍 Phase 1: Searching eBay...\n');
    const searchResults = await finder.runSearches();

    // Count total items
    const totalItems = Object.values(searchResults)
      .reduce((sum, r) => sum + (r.totalFound || 0), 0);
    console.log(`\n✅ Found ${totalItems} total items\n`);

    // Step 2: Analyze top items
    console.log('💎 Phase 2: Analyzing deals...\n');

    const hotDeals = [];
    const goodDeals = [];
    const allAnalyzed = [];
    let itemsAnalyzed = 0;

    for (const [searchKey, result] of Object.entries(searchResults)) {
      if (result.error || !result.items || result.items.length === 0) continue;

      const categoryName = result.searchName;
      console.log(`  Analyzing ${categoryName}...`);

      // Analyze top items (limit to save time)
      const itemsToCheck = result.items.slice(0, 5);

      for (const item of itemsToCheck) {
        itemsAnalyzed++;

        // STEP 1: Check photo quality and condition
        const qualityAnalysis = photoChecker.analyzeListing(item);

        // Skip if failed quality check (bad centering, worn corners, insufficient photos)
        if (!qualityAnalysis.passed) {
          console.log(`    ⚠️  SKIP: ${item.title.substring(0, 50)}...`);
          console.log(`        Reason: ${qualityAnalysis.recommendation}`);
          continue; // Skip this item entirely
        }

        // STEP 2: Get comps (with basic error handling)
        let comps = { foundComps: false };
        try {
          comps = await compAnalyzer.getComps(item.title);
        } catch (error) {
          // Skip if comps fail
        }

        // STEP 3: Calculate profit
        const profitAnalysis = comps.foundComps
          ? compAnalyzer.calculateProfit(item.totalPrice, comps)
          : { insufficientData: true };

        // STEP 4: Score the deal (base score)
        let dealScore = dealScorer.score(item, profitAnalysis);

        // STEP 5: Adjust score based on photo quality and condition
        dealScore.score = photoChecker.adjustDealScore(dealScore.score, qualityAnalysis);
        dealScore.adjustedByPhotoQuality = true;

        // Add quality bonus to breakdown
        if (qualityAnalysis.condition.centering === 'good') {
          dealScore.breakdown.push('✅ Good centering confirmed (+1.5 points)');
        }
        if (qualityAnalysis.condition.corners === 'sharp') {
          dealScore.breakdown.push('✅ Sharp corners confirmed (+1.5 points)');
        }
        if (qualityAnalysis.photoQuality.photoCount >= 4) {
          dealScore.breakdown.push('📸 Multiple photos (+0.5 points)');
        }

        const analyzedDeal = {
          ...item,
          searchCategory: categoryName,
          qualityAnalysis: qualityAnalysis, // Add quality analysis
          comps: comps,
          profitAnalysis: profitAnalysis,
          dealScore: dealScore,
          analyzedAt: new Date().toISOString()
        };

        allAnalyzed.push(analyzedDeal);

        // Categorize
        if (dealScore.score >= 8) {
          hotDeals.push(analyzedDeal);
          console.log(`    🔥 Found hot deal! [${dealScore.score}] ${item.title.substring(0, 50)}...`);
        } else if (dealScore.score >= 6) {
          goodDeals.push(analyzedDeal);
        }
      }

      console.log(`    ✓ ${itemsToCheck.length} items analyzed\n`);
    }

    // Sort by score
    hotDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);
    goodDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);

    console.log(`✅ Analysis complete: ${itemsAnalyzed} items analyzed\n`);

    // Step 3: Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      summary: {
        totalSearches: Object.keys(searchResults).length,
        totalItemsFound: totalItems,
        itemsAnalyzed: itemsAnalyzed,
        hotDeals: hotDeals.length,
        goodDeals: goodDeals.length
      },
      hotDeals: hotDeals,
      goodDeals: goodDeals,
      allDeals: allAnalyzed
    };

    // Save report
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const reportFile = path.join(resultsDir, `complete-scan-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Step 4: Send Slack notifications
    console.log('📱 Phase 3: Sending Slack notifications...\n');

    if (hotDeals.length > 0) {
      await slackNotifier.sendHotDealsAlert(hotDeals);
      console.log(`  ✓ Sent alert for ${hotDeals.length} hot deals\n`);
    } else {
      console.log('  No hot deals to alert (score < 8)\n');
    }

    // Send daily summary
    await slackNotifier.sendDailySummary(report.summary);
    console.log('  ✓ Sent daily summary\n');

    // Step 5: Print summary
    printFinalSummary(report);

    console.log(`💾 Full report saved: ${reportFile}\n`);

    return {
      success: true,
      hotDeals: hotDeals.length,
      goodDeals: goodDeals.length,
      totalAnalyzed: itemsAnalyzed,
      reportFile: reportFile
    };

  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Print final summary
 */
function printFinalSummary(report) {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`⏱️  Scan duration: ${report.scanDuration}`);
  console.log(`🔍 Total items found: ${report.summary.totalItemsFound}`);
  console.log(`💎 Items analyzed: ${report.summary.itemsAnalyzed}`);
  console.log(`🔥 Hot deals (8-10): ${report.summary.hotDeals}`);
  console.log(`⚡ Good deals (6-7.9): ${report.summary.goodDeals}\n`);

  if (report.hotDeals.length > 0) {
    console.log('🔥 TOP HOT DEALS:\n');
    report.hotDeals.slice(0, 5).forEach((deal, i) => {
      console.log(`${i + 1}. [${deal.dealScore.score}] ${deal.dealScore.rating}`);
      console.log(`   ${deal.title.substring(0, 70)}...`);
      console.log(`   💰 $${deal.totalPrice}`);

      if (!deal.profitAnalysis.insufficientData) {
        console.log(`   📈 EV: $${deal.profitAnalysis.expectedValue} | ROI: ${deal.profitAnalysis.roi}%`);
      }

      console.log(`   🔗 ${deal.viewItemURL}\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════\n');
}

// Run if called directly
if (require.main === module) {
  scanAndNotify()
    .then(result => {
      if (result.success) {
        console.log('✅ Scan complete and notifications sent!\n');
        console.log(`Results: ${result.hotDeals} hot deals, ${result.goodDeals} good deals\n`);
        process.exit(0);
      } else {
        console.error('❌ Scan failed\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = scanAndNotify;
