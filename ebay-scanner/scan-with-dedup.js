#!/usr/bin/env node
/**
 * eBay Scanner with Deduplication
 * Wraps scan-and-notify.js with duplicate filtering
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
const DedupTracker = require('./dedup-tracker');

async function scanWithDedup() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 eBay Gem Scanner with Deduplication');
  console.log('═══════════════════════════════════════════════════\n');

  const dedupTracker = new DedupTracker();

  // Clean up old seen items (7+ days)
  console.log('🧹 Cleaning up old tracking data...');
  dedupTracker.cleanup();

  const stats = dedupTracker.getStats();
  console.log(`📊 Currently tracking ${stats.totalTracked} items\n`);

  // Run the scan
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

      // Filter out duplicates from hot deals
      const originalHotCount = results.hotDeals.length;
      results.hotDeals = dedupTracker.filterNewItems(results.hotDeals);
      const newHotCount = results.hotDeals.length;
      const filteredHot = originalHotCount - newHotCount;

      // Filter out duplicates from good deals
      const originalGoodCount = results.goodDeals.length;
      results.goodDeals = dedupTracker.filterNewItems(results.goodDeals);
      const newGoodCount = results.goodDeals.length;
      const filteredGood = originalGoodCount - newGoodCount;

      console.log('\n🔍 Deduplication Results:');
      console.log(`  Hot Deals: ${newHotCount}/${originalHotCount} (${filteredHot} duplicates removed)`);
      console.log(`  Good Deals: ${newGoodCount}/${originalGoodCount} (${filteredGood} duplicates removed)`);

      // Save filtered results
      const filteredFile = path.join(__dirname, 'results', `filtered-scan-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(filteredFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Filtered results saved: ${filteredFile}`);

      // Re-send Slack alerts with only NEW hot deals
      if (newHotCount > 0 && newHotCount < originalHotCount) {
        console.log(`\n📱 Re-sending Slack alerts for ${newHotCount} NEW hot deals...`);
        const SlackNotifier = require('./slack-notifier');
        const slackNotifier = new SlackNotifier();
        await slackNotifier.sendHotDealsAlert(results.hotDeals);
      }
    }

    console.log('\n✅ Scan with deduplication complete!');
  } catch (error) {
    console.error('❌ Error running scan:', error.message);
    process.exit(1);
  }
}

scanWithDedup();
