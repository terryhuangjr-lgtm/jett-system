#!/usr/bin/env node
/**
 * eBay Scanner with Enhanced Filters + Deduplication
 * Integrates title analysis, outlier detection, and duplicate filtering
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
const DedupTracker = require('./dedup-tracker');
const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');

async function scanWithEnhancedFilters() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 eBay Gem Scanner - Enhanced Filters + Dedup');
  console.log('═══════════════════════════════════════════════════\n');

  const dedupTracker = new DedupTracker();
  const titleAnalyzer = new TitleAnalyzer();
  const outlierDetector = new OutlierDetector();

  // Clean up old seen items (7+ days)
  console.log('🧹 Cleaning up old tracking data...');
  dedupTracker.cleanup();

  const stats = dedupTracker.getStats();
  console.log(`📊 Currently tracking ${stats.totalTracked} items\n`);

  // Run the base scan
  console.log('🔍 Running eBay scan...\n');
  try {
    const { stdout, stderr } = await execPromise('node scan-and-notify.js', {
      cwd: __dirname
    });

    // Output scan results
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Load the scan results
    const resultsFile = path.join(__dirname, 'results', `complete-scan-${new Date().toISOString().split('T')[0]}.json`);
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

      console.log('\n🔍 APPLYING ENHANCED FILTERS...\n');

      // Stage 1: Title Analysis
      console.log('📝 Stage 1: Title Analysis');
      const originalCount = results.allDeals ? results.allDeals.length : 0;
      
      let titleFiltered = [];
      let titleRejected = [];
      
      if (results.allDeals) {
        results.allDeals.forEach(deal => {
          const analysis = titleAnalyzer.analyze(
            deal.title || '', 
            deal.subtitle || deal.condition || ''
          );
          
          if (analysis.passed) {
            titleFiltered.push({...deal, titleAnalysis: analysis});
          } else {
            titleRejected.push({
              title: deal.title,
              reason: analysis.verdict.reason,
              score: analysis.score
            });
          }
        });
      }
      
      console.log(`  ✓ Passed: ${titleFiltered.length}/${originalCount}`);
      console.log(`  ✗ Rejected: ${titleRejected.length} (${titleRejected.length > 0 ? titleRejected[0].reason : 'N/A'})`);

      // Stage 2: Outlier Detection
      console.log('\n📊 Stage 2: Outlier Detection');
      
      let outlierFiltered = [];
      let outlierRejected = [];
      
      titleFiltered.forEach(deal => {
        const analysis = outlierDetector.analyzeItem(deal, deal.comps);
        
        if (analysis.passed) {
          outlierFiltered.push({...deal, outlierAnalysis: analysis});
        } else {
          outlierRejected.push({
            title: deal.title,
            reason: analysis.reason,
            percentOfMarket: analysis.percentOfMean
          });
        }
      });
      
      console.log(`  ✓ Passed: ${outlierFiltered.length}/${titleFiltered.length}`);
      console.log(`  ✗ Rejected: ${outlierRejected.length} (${outlierRejected.length > 0 ? outlierRejected[0].reason : 'N/A'})`);

      // Stage 3: Deduplication
      console.log('\n🔄 Stage 3: Deduplication');
      const preDedup = outlierFiltered.length;
      const dedupFiltered = dedupTracker.filterNewItems(outlierFiltered);
      const duplicatesRemoved = preDedup - dedupFiltered.length;
      
      console.log(`  ✓ New items: ${dedupFiltered.length}/${preDedup}`);
      console.log(`  ✗ Duplicates: ${duplicatesRemoved}`);

      // Separate by score
      const finalHotDeals = dedupFiltered.filter(deal => deal.dealScore.score >= 8);
      const finalGoodDeals = dedupFiltered.filter(deal => deal.dealScore.score >= 6 && deal.dealScore.score < 8);

      // Summary
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 FILTERING SUMMARY');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Original deals: ${originalCount}`);
      console.log(`After title filter: ${titleFiltered.length} (-${originalCount - titleFiltered.length})`);
      console.log(`After outlier filter: ${outlierFiltered.length} (-${titleFiltered.length - outlierFiltered.length})`);
      console.log(`After deduplication: ${dedupFiltered.length} (-${duplicatesRemoved})`);
      console.log(`\n🔥 Hot deals (8+): ${finalHotDeals.length}`);
      console.log(`⚡ Good deals (6-7.9): ${finalGoodDeals.length}`);
      console.log(`\nTotal filtered out: ${originalCount - dedupFiltered.length} (${Math.round((originalCount - dedupFiltered.length) / originalCount * 100)}%)`);

      // Update results
      results.hotDeals = finalHotDeals;
      results.goodDeals = finalGoodDeals;
      results.filteringStats = {
        original: originalCount,
        titleFiltered: titleFiltered.length,
        outlierFiltered: outlierFiltered.length,
        deduplicated: dedupFiltered.length,
        titleRejections: titleRejected.length,
        outlierRejections: outlierRejected.length,
        duplicates: duplicatesRemoved
      };

      // Save enhanced results
      const enhancedFile = path.join(__dirname, 'results', `enhanced-scan-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(enhancedFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Enhanced results saved: ${enhancedFile}`);

      // Send Slack alerts for new hot deals
      if (finalHotDeals.length > 0) {
        console.log(`\n📱 Sending Slack alerts for ${finalHotDeals.length} hot deals...`);
        const SlackNotifier = require('./slack-notifier');
        const slackNotifier = new SlackNotifier();
        await slackNotifier.sendHotDealsAlert(finalHotDeals);
      }

      console.log('\n✅ Enhanced scan complete!');
      
      return {
        hotDeals: finalHotDeals,
        goodDeals: finalGoodDeals,
        stats: results.filteringStats
      };
    }
  } catch (error) {
    console.error('❌ Error running scan:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  scanWithEnhancedFilters()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = scanWithEnhancedFilters;
