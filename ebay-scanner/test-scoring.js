#!/usr/bin/env node
/**
 * Test the new scoring system
 */

const scoredSearch = require('./scored-search');

async function testScoring() {
  console.log('🧪 Testing New Scoring System\n');

  // Test with a simple search
  const result = await scoredSearch({
    keywords: 'michael jordan topps finest',
    minPrice: 50,
    maxPrice: 300,
    minScoreToShow: 4.0,  // Show more results for testing
    topN: 5
  });

  if (result.success) {
    console.log('✅ Scoring system test complete!\n');
    console.log(`Found ${result.results.length} scored deals\n`);

    if (result.results.length > 0) {
      console.log('Sample score breakdown:\n');
      const sample = result.results[0];
      console.log(JSON.stringify(sample.dealScore.breakdown, null, 2));
    }
  } else {
    console.log('❌ Test failed:', result.error);
  }
}

testScoring().catch(console.error);
