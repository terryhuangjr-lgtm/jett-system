#!/usr/bin/env node
/**
 * Full eBay Gem Scan
 * Runs all configured searches and analyzes results
 */

const GemFinder = require('./gem-finder');
const fs = require('fs');
const path = require('path');

async function runFullScan() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎴 eBay Gem Finder - Full Scan');
  console.log('═══════════════════════════════════════════════════\n');

  const finder = new GemFinder();
  const startTime = Date.now();

  try {
    // Run all searches
    const results = await finder.runSearches();

    // Calculate summary stats
    const summary = {
      timestamp: new Date().toISOString(),
      scanDuration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      searches: {},
      totals: {
        totalItemsFound: 0,
        totalItemsFiltered: 0,
        searchesRun: 0,
        searchesFailed: 0
      }
    };

    // Process each search result
    for (const [key, result] of Object.entries(results)) {
      if (result.error) {
        summary.searches[key] = {
          name: result.searchName,
          status: 'failed',
          error: result.error
        };
        summary.totals.searchesFailed++;
      } else {
        summary.searches[key] = {
          name: result.searchName,
          status: 'success',
          totalFound: result.totalFound,
          filtered: result.filtered,
          topItems: result.items.slice(0, 5).map(item => ({
            title: item.title,
            price: `$${item.totalPrice}`,
            endTime: item.endTime,
            url: item.viewItemURL
          }))
        };
        summary.totals.totalItemsFound += result.totalFound;
        summary.totals.totalItemsFiltered += result.filtered;
        summary.totals.searchesRun++;
      }
    }

    // Save full results
    const resultsFile = finder.saveResults(results);

    // Save summary
    const summaryFile = path.join(
      path.dirname(resultsFile),
      `summary-${new Date().toISOString().split('T')[0]}.json`
    );
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    // Print summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SCAN SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`⏱️  Duration: ${summary.scanDuration}`);
    console.log(`✅ Searches completed: ${summary.totals.searchesRun}`);
    console.log(`❌ Searches failed: ${summary.totals.searchesFailed}`);
    console.log(`🔍 Total items found: ${summary.totals.totalItemsFound}`);
    console.log(`⭐ Quality items: ${summary.totals.totalItemsFiltered}\n`);

    // Show top items from each search
    console.log('TOP FINDS BY CATEGORY:\n');
    for (const [key, search] of Object.entries(summary.searches)) {
      if (search.status === 'success' && search.topItems.length > 0) {
        console.log(`${search.name} (${search.filtered} items):`);
        search.topItems.forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.title.substring(0, 60)}...`);
          console.log(`     ${item.price} | ${item.endTime}`);
        });
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log(`💾 Full results: ${resultsFile}`);
    console.log(`📄 Summary: ${summaryFile}`);
    console.log('═══════════════════════════════════════════════════\n');

    return { success: true, summary, resultsFile };

  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  runFullScan()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runFullScan;
