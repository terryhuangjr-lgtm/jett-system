#!/usr/bin/env node
/**
 * Smart eBay Gem Scan
 * Includes comp analysis, deal scoring, and Slack notifications
 */

const GemFinder = require('./gem-finder');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const fs = require('fs');
const path = require('path');

async function runSmartScan() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 eBay Smart Gem Finder - Full Analysis');
  console.log('═══════════════════════════════════════════════════\n');

  const finder = new GemFinder();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const startTime = Date.now();

  try {
    // Step 1: Run all searches
    console.log('📡 Running eBay searches...\n');
    const searchResults = await finder.runSearches();

    // Step 2: Analyze top items from each category
    console.log('\n💎 Analyzing deals and calculating profit potential...\n');

    const hotDeals = []; // Score >= 8
    const goodDeals = []; // Score >= 6
    const allAnalyzedDeals = [];

    for (const [searchKey, result] of Object.entries(searchResults)) {
      if (result.error || result.items.length === 0) continue;

      console.log(`Analyzing ${result.searchName}...`);

      // Analyze top 10 items from each search
      const itemsToAnalyze = result.items.slice(0, 10);

      for (const item of itemsToAnalyze) {
        try {
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
            searchCategory: result.searchName,
            comps: comps,
            profitAnalysis: profitAnalysis,
            dealScore: dealScore
          };

          allAnalyzedDeals.push(analyzedDeal);

          // Categorize by score
          if (dealScore.score >= 8) {
            hotDeals.push(analyzedDeal);
          } else if (dealScore.score >= 6) {
            goodDeals.push(analyzedDeal);
          }

        } catch (error) {
          console.error(`  Error analyzing item: ${error.message}`);
        }
      }

      console.log(`  ✓ Analyzed ${itemsToAnalyze.length} items\n`);
    }

    // Sort deals by score
    hotDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);
    goodDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);
    allAnalyzedDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Step 3: Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      summary: {
        totalSearches: Object.keys(searchResults).length,
        totalItemsFound: Object.values(searchResults).reduce((sum, r) => sum + (r.totalFound || 0), 0),
        itemsAnalyzed: allAnalyzedDeals.length,
        hotDeals: hotDeals.length,
        goodDeals: goodDeals.length
      },
      hotDeals: hotDeals,
      goodDeals: goodDeals,
      allDeals: allAnalyzedDeals,
      searchResults: searchResults
    };

    // Save full report
    const reportFile = path.join(__dirname, 'results', `smart-scan-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Step 4: Print summary
    printSummary(report, scanDuration);

    // Step 5: Save Slack-ready messages
    const slackMessages = generateSlackMessages(hotDeals, goodDeals);
    const slackFile = path.join(__dirname, 'results', `slack-alerts-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(slackFile, JSON.stringify(slackMessages, null, 2));

    console.log(`\n💾 Full report: ${reportFile}`);
    console.log(`📱 Slack alerts: ${slackFile}\n`);

    return {
      success: true,
      report: report,
      hotDeals: hotDeals.length,
      goodDeals: goodDeals.length
    };

  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Print summary to console
 */
function printSummary(report, duration) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 SMART SCAN SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🔍 Items analyzed: ${report.summary.itemsAnalyzed}`);
  console.log(`🔥 Hot deals (8-10): ${report.summary.hotDeals}`);
  console.log(`⚡ Good deals (6-7.9): ${report.summary.goodDeals}\n`);

  // Show hot deals
  if (report.hotDeals.length > 0) {
    console.log('🔥 HOT DEALS (Score 8+):\n');
    report.hotDeals.forEach((deal, i) => {
      console.log(`${i + 1}. ${deal.dealScore.rating} [${deal.dealScore.score}]`);
      console.log(`   ${deal.title.substring(0, 70)}...`);
      console.log(`   Price: $${deal.totalPrice}`);

      if (!deal.profitAnalysis.insufficientData) {
        console.log(`   Expected Value: $${deal.profitAnalysis.expectedValue} (${deal.profitAnalysis.roi}% ROI)`);
        console.log(`   PSA 10 Profit: $${deal.profitAnalysis.psa10Scenario.profit}`);
      }

      console.log(`   ${deal.viewItemURL}\n`);
    });
  } else {
    console.log('No hot deals found in this scan.\n');
  }

  // Show good deals summary
  if (report.goodDeals.length > 0) {
    console.log(`⚡ GOOD DEALS (${report.goodDeals.length} found):`);
    console.log(`   See full report for details\n`);
  }
}

/**
 * Generate Slack-ready messages
 */
function generateSlackMessages(hotDeals, goodDeals) {
  const messages = [];

  // Hot deals alert (immediate)
  if (hotDeals.length > 0) {
    let hotMessage = '🔥 *HOT eBay DEALS ALERT!*\n\n';
    hotMessage += `Found ${hotDeals.length} exceptional opportunities:\n\n`;

    hotDeals.forEach((deal, i) => {
      hotMessage += `*${i + 1}. ${deal.dealScore.rating}* [Score: ${deal.dealScore.score}]\n`;
      hotMessage += `${deal.title.substring(0, 80)}...\n`;
      hotMessage += `💰 Price: $${deal.totalPrice}`;

      if (!deal.profitAnalysis.insufficientData) {
        hotMessage += ` | EV: $${deal.profitAnalysis.expectedValue} | ROI: ${deal.profitAnalysis.roi}%`;
      }

      hotMessage += `\n🔗 <${deal.viewItemURL}|View on eBay>\n\n`;
    });

    messages.push({
      channel: 'sports-cards', // Your Slack channel
      text: hotMessage,
      priority: 'high'
    });
  }

  // Good deals summary (daily digest)
  if (goodDeals.length > 0) {
    let goodMessage = '⚡ *Daily eBay Opportunities*\n\n';
    goodMessage += `${goodDeals.length} good deals found:\n\n`;

    goodDeals.slice(0, 10).forEach((deal, i) => {
      goodMessage += `${i + 1}. [${deal.dealScore.score}] ${deal.title.substring(0, 60)}...\n`;
      goodMessage += `   $${deal.totalPrice} | <${deal.viewItemURL}|View>\n`;
    });

    messages.push({
      channel: 'sports-cards',
      text: goodMessage,
      priority: 'normal'
    });
  }

  return messages;
}

// Run if called directly
if (require.main === module) {
  runSmartScan()
    .then(result => {
      if (result.success) {
        console.log(`✅ Scan complete! ${result.hotDeals} hot deals, ${result.goodDeals} good deals.\n`);
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runSmartScan;
