#!/usr/bin/env node
/**
 * Test full scan with Option B comp data
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const AdvancedFilter = require('./advanced-filter');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');

async function testFullScan() {
  const client = new EbayBrowseAPI();
  const advancedFilter = new AdvancedFilter();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();

  console.log('\n🧪 Testing Full Scanner with Option B Comps\n');
  console.log('═'.repeat(60));

  try {
    // Simple search
    const search = {
      keywords: 'Michael Jordan Topps Finest',
      categoryId: '212',
      minPrice: 50,
      maxPrice: 500,
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded'],
      sortOrder: 'PricePlusShippingLowest'
    };

    console.log(`\n🔍 Searching: "${search.keywords}"\n`);

    const items = await client.search(search);
    console.log(`   Found: ${items.length} raw cards\n`);

    // Filter
    const filtered = items.filter(item => {
      if (item.sellerPositivePercent < 98) return false;
      if (!item.imageUrl) return false;
      const filterResult = advancedFilter.filter(item, { maxListingAge: 21 });
      return filterResult.passed;
    });

    console.log(`   After filters: ${filtered.length} cards\n`);

    // Analyze top 5
    console.log(`📊 Analyzing top 5 deals...\n`);
    console.log(`⚠️  NOTE: Using active listings with 85% discount (not real sold data)\n`);

    const top5 = filtered.slice(0, 5);

    for (const item of top5) {
      try {
        console.log(`\n🔍 ${item.title.substring(0, 60)}...`);
        console.log(`   Price: $${item.totalPrice}`);

        // Get comps
        const comps = await compAnalyzer.getComps(item.title);

        if (comps.foundComps) {
          console.log(`   ✅ PSA 10 comps: ${comps.psa10.count} found`);
          console.log(`      Avg estimated sold price: $${comps.psa10.avgPrice}`);

          // Calculate profit
          const profit = compAnalyzer.calculateProfit(item.totalPrice, comps);
          const score = dealScorer.score(item, profit);

          console.log(`   💰 ROI: ${profit.roi}%`);
          console.log(`   📊 Score: ${score.score}/10 - ${score.rating}`);
        } else {
          console.log(`   ❌ No comps found`);
        }

      } catch (error) {
        console.error(`   Error: ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Test complete!');
    console.log('\nNext steps:');
    console.log('  1. Run flexible-search-template.js for full results');
    console.log('  2. Review COMP-DATA-EXPLAINED.md for accuracy info');
    console.log('  3. Adjust discount factor if needed (comp-analyzer.js:84)\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testFullScan().catch(console.error);
