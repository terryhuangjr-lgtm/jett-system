/**
 * Test Enhanced Filters
 * Tests new Title Analyzer and Outlier Detector
 */

const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');

// Mock card listings for testing
const mockListings = [
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23 - Pack Fresh Investment Grade',
    description: 'Straight to sleeve. Perfect centering. PSA ready.',
    totalPrice: 150,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  },
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23 - AS-IS',
    description: 'See photos. Sold as shown. No returns.',
    totalPrice: 80,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  },
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23 - Raw',
    description: 'Ungraded. OBO. Make an offer!',
    totalPrice: 75,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  },
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23',
    description: 'Edge wear. Corner damage. Slight crease.',
    totalPrice: 50,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  },
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23',
    description: 'Great condition. Well centered.',
    totalPrice: 180,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  },
  {
    title: '1997 Skybox Metal Universe Michael Jordan #23 - Gem Mint',
    description: 'Pristine. Climate controlled storage. Smoke free home.',
    totalPrice: 200,
    comps: {
      psa10: {
        recentSales: [
          { price: 300 },
          { price: 320 },
          { price: 310 },
          { price: 295 },
          { price: 305 }
        ]
      }
    }
  }
];

console.log('═══════════════════════════════════════════════════════');
console.log('TESTING ENHANCED FILTERS');
console.log('═══════════════════════════════════════════════════════\n');

// Initialize analyzers
const titleAnalyzer = new TitleAnalyzer();
const outlierDetector = new OutlierDetector();

mockListings.forEach((listing, index) => {
  console.log(`\n─────── Listing ${index + 1} ───────`);
  console.log(`Title: ${listing.title}`);
  console.log(`Description: ${listing.description}`);
  console.log(`Price: $${listing.totalPrice}`);

  // Run title analysis
  const titleAnalysis = titleAnalyzer.analyze(listing.title, listing.description);
  console.log('\n📝 TITLE ANALYSIS:');
  console.log(`   Score: ${titleAnalysis.score}`);
  console.log(`   Verdict: ${titleAnalysis.verdict.reason}`);
  console.log(`   Passed: ${titleAnalysis.passed ? '✅' : '❌'}`);

  if (titleAnalysis.flags.length > 0) {
    console.log(`   🚩 Red Flags: ${titleAnalysis.flags.map(f => f.keyword).join(', ')}`);
  }

  if (titleAnalysis.signals.length > 0) {
    console.log(`   ✨ Good Signals: ${titleAnalysis.signals.map(s => s.keyword).join(', ')}`);
  }

  // Run outlier detection
  const outlierAnalysis = outlierDetector.analyzeItem(listing, listing.comps);
  console.log('\n📊 OUTLIER ANALYSIS:');
  console.log(`   Reason: ${outlierAnalysis.reason}`);
  console.log(`   Passed: ${outlierAnalysis.passed ? '✅' : '❌'}`);

  if (outlierAnalysis.stats) {
    const stats = outlierAnalysis.stats;
    console.log(`   Market Mean: $${stats.marketMean}`);
    console.log(`   Market Median: $${stats.marketMedian}`);
    console.log(`   Std Dev: $${stats.stdDev}`);
    console.log(`   Z-Score: ${stats.zScore}`);
    console.log(`   % of Market: ${stats.percentOfMean}%`);
  }

  // Final verdict
  const finalVerdict = titleAnalysis.passed && outlierAnalysis.passed;
  console.log('\n🎯 FINAL VERDICT:', finalVerdict ? '✅ PASS' : '❌ REJECT');

  if (!finalVerdict) {
    const reasons = [];
    if (!titleAnalysis.passed) reasons.push(titleAnalysis.verdict.reason);
    if (!outlierAnalysis.passed) reasons.push(outlierAnalysis.reason);
    console.log(`   Rejection Reasons: ${reasons.join(' | ')}`);
  }
});

// Summary statistics
console.log('\n\n═══════════════════════════════════════════════════════');
console.log('SUMMARY STATISTICS');
console.log('═══════════════════════════════════════════════════════\n');

const titleStats = titleAnalyzer.getStats(mockListings);
console.log('📝 Title Analysis:');
console.log(`   Total Analyzed: ${titleStats.total}`);
console.log(`   Passed: ${titleStats.passed}`);
console.log(`   Rejected: ${titleStats.rejected}`);
console.log(`   Average Score: ${titleStats.averageScore.toFixed(2)}`);
console.log(`   Total Red Flags: ${titleStats.redFlags.total}`);
console.log(`   Total Good Signals: ${titleStats.goodSignals.total}`);

if (Object.keys(titleStats.redFlags.byCategory).length > 0) {
  console.log('\n   Red Flags by Category:');
  for (const [category, count] of Object.entries(titleStats.redFlags.byCategory)) {
    console.log(`      ${category}: ${count}`);
  }
}

if (Object.keys(titleStats.goodSignals.byCategory).length > 0) {
  console.log('\n   Good Signals by Category:');
  for (const [category, count] of Object.entries(titleStats.goodSignals.byCategory)) {
    console.log(`      ${category}: ${count}`);
  }
}

const outlierStats = outlierDetector.getStats(mockListings);
console.log('\n📊 Outlier Detection:');
console.log(`   Total Analyzed: ${outlierStats.total}`);
console.log(`   Normal Pricing: ${outlierStats.normal}`);
console.log(`   Moderate Outliers: ${outlierStats.moderateOutliers}`);
console.log(`   Extreme Outliers (too cheap): ${outlierStats.extremeOutliers}`);
console.log(`   Too Expensive: ${outlierStats.tooExpensive}`);
console.log(`   Insufficient Data: ${outlierStats.insufficientData}`);

// Combined filtering
console.log('\n\n═══════════════════════════════════════════════════════');
console.log('COMBINED FILTERING RESULTS');
console.log('═══════════════════════════════════════════════════════\n');

const finalResults = mockListings.map(listing => {
  const titleAnalysis = titleAnalyzer.analyze(listing.title, listing.description);
  const outlierAnalysis = outlierDetector.analyzeItem(listing, listing.comps);

  return {
    title: listing.title.substring(0, 60) + '...',
    price: listing.totalPrice,
    titlePassed: titleAnalysis.passed,
    outlierPassed: outlierAnalysis.passed,
    finalPassed: titleAnalysis.passed && outlierAnalysis.passed
  };
});

finalResults.forEach(result => {
  const icon = result.finalPassed ? '✅' : '❌';
  console.log(`${icon} $${result.price.toString().padStart(3)} | ${result.title}`);
  if (!result.titlePassed) console.log('      ⚠️  Failed title analysis');
  if (!result.outlierPassed) console.log('      ⚠️  Failed outlier detection');
});

const passedCount = finalResults.filter(r => r.finalPassed).length;
const rejectedCount = finalResults.length - passedCount;

console.log(`\nFinal Results: ${passedCount} passed, ${rejectedCount} rejected`);
console.log(`Pass Rate: ${Math.round((passedCount / finalResults.length) * 100)}%`);
