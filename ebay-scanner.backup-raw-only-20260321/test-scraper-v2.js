#!/usr/bin/env node
/**
 * Test the Puppeteer-based scraper
 */

const EbaySoldScraperV2 = require('./ebay-sold-scraper-v2');

async function testScraperV2() {
  const scraper = new EbaySoldScraperV2();

  console.log('\n🧪 Testing eBay Sold Scraper V2 (Puppeteer)\n');
  console.log('═'.repeat(60));

  try {
    // Test 1: Michael Jordan
    console.log('\n📍 Test 1: Michael Jordan Finest PSA 10\n');
    const mj = await scraper.searchSold('Michael Jordan Finest PSA 10', {
      maxResults: 10
    });

    if (mj.length > 0) {
      console.log(`   ✅ Found ${mj.length} sold listings`);
      console.log('\n   Recent sales:');
      mj.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. $${item.totalPrice} - ${item.dateSold || 'Date unknown'}`);
        console.log(`      ${item.title.substring(0, 70)}`);
      });

      const avg = mj.reduce((sum, item) => sum + item.totalPrice, 0) / mj.length;
      console.log(`\n   💰 Average: $${avg.toFixed(2)}`);
    } else {
      console.log('   ⚠️  No results - scraper might need adjustment');
    }

    // Test 2: Full comp analysis
    console.log('\n' + '═'.repeat(60));
    console.log('\n📍 Test 2: Full Comp Analysis (PSA 10 + PSA 9)\n');

    const comps = await scraper.getSoldComps('1996 Topps Chrome Kobe Bryant');

    console.log(`   PSA 10: ${comps.psa10.length} sold listings`);
    if (comps.psa10.length > 0) {
      const avg10 = comps.psa10.reduce((sum, item) => sum + item.totalPrice, 0) / comps.psa10.length;
      console.log(`   Average PSA 10: $${avg10.toFixed(2)}`);
    }

    console.log(`\n   PSA 9: ${comps.psa9.length} sold listings`);
    if (comps.psa9.length > 0) {
      const avg9 = comps.psa9.reduce((sum, item) => sum + item.totalPrice, 0) / comps.psa9.length;
      console.log(`   Average PSA 9: $${avg9.toFixed(2)}`);
    }

    await scraper.close();

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await scraper.close();
  }
}

testScraperV2().catch(console.error);
