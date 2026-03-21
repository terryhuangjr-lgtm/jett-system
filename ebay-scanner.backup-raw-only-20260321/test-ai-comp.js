#!/usr/bin/env node
/**
 * Test sold comps for Allen Iverson refractor
 */

const CompAnalyzer = require('./comp-analyzer');

async function testComp() {
  const analyzer = new CompAnalyzer();

  // Test with 1997 Topps Chrome Allen Iverson Refractor
  const testCard = "1997-98 Topps Chrome Refractor #54 Allen Iverson";

  console.log(`\n🔍 Testing comp search for: ${testCard}\n`);
  console.log('=' .repeat(60));

  const comps = await analyzer.getComps(testCard);

  console.log('\n📊 PSA 10 Comps:');
  console.log(`   Count: ${comps.psa10.count}`);
  console.log(`   Avg Price: $${comps.psa10.avgPrice}`);
  if (comps.psa10.recentSales.length > 0) {
    console.log('   Recent sales:');
    comps.psa10.recentSales.forEach((sale, i) => {
      console.log(`   ${i + 1}. $${sale.price} - ${sale.title.substring(0, 60)}`);
    });
  }

  console.log('\n📊 PSA 9 Comps:');
  console.log(`   Count: ${comps.psa9.count}`);
  console.log(`   Avg Price: $${comps.psa9.avgPrice}`);
  if (comps.psa9.recentSales.length > 0) {
    console.log('   Recent sales:');
    comps.psa9.recentSales.forEach((sale, i) => {
      console.log(`   ${i + 1}. $${sale.price} - ${sale.title.substring(0, 60)}`);
    });
  }

  // Calculate profit at $1,000 raw price
  if (comps.foundComps) {
    console.log('\n💰 Profit Analysis (at $1,000 raw price):');
    const profit = analyzer.calculateProfit(1000, comps);
    console.log(`   Total Cost: $${profit.totalCost}`);
    console.log(`   PSA 10 Profit: $${profit.psa10Scenario.profit}`);
    console.log(`   PSA 9 Profit: $${profit.psa9Scenario.profit}`);
    console.log(`   Expected Value: $${profit.expectedValue}`);
    console.log(`   ROI: ${profit.roi}%`);
    console.log(`   Recommendation: ${profit.recommendation}`);
  } else {
    console.log('\n❌ No comps found - cannot calculate profit');
  }

  console.log('\n' + '='.repeat(60));
}

testComp().catch(console.error);
