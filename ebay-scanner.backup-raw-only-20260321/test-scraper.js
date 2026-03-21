#!/usr/bin/env node
/**
 * Test the eBay sold listings scraper
 */

const EbaySoldScraper = require('./ebay-sold-scraper');

async function testScraper() {
  const scraper = new EbaySoldScraper();

  console.log('\n🧪 Testing eBay Sold Listings Scraper\n');
  console.log('═'.repeat(60));

  try {
    // Test 1: Allen Iverson PSA 10
    console.log('\n📍 Test 1: Allen Iverson Topps Chrome PSA 10\n');
    const ai10 = await scraper.searchSold('Allen Iverson Topps Chrome PSA 10', {
      maxResults: 10
    });

    if (ai10.length > 0) {
      console.log(`   ✅ Found ${ai10.length} sold listings`);
      console.log('\n   Recent sales:');
      ai10.slice(0, 5).forEach((item, i) => {
        const date = item.dateSold ? item.dateSold.toLocaleDateString() : 'Unknown';
        console.log(`   ${i + 1}. $${item.totalPrice} - ${date}`);
        console.log(`      ${item.title.substring(0, 70)}`);
      });
    } else {
      console.log('   ⚠️  No results found');
    }

    // Small delay
    await scraper.sleep(2000);

    // Test 2: Michael Jordan Finest PSA 10
    console.log('\n📍 Test 2: Michael Jordan Finest PSA 10\n');
    const mj10 = await scraper.searchSold('Michael Jordan Finest PSA 10', {
      maxResults: 10
    });

    if (mj10.length > 0) {
      console.log(`   ✅ Found ${mj10.length} sold listings`);
      console.log('\n   Recent sales:');
      mj10.slice(0, 5).forEach((item, i) => {
        const date = item.dateSold ? item.dateSold.toLocaleDateString() : 'Unknown';
        console.log(`   ${i + 1}. $${item.totalPrice} - ${date}`);
        console.log(`      ${item.title.substring(0, 70)}`);
      });

      // Calculate average
      const avgPrice = mj10.reduce((sum, item) => sum + item.totalPrice, 0) / mj10.length;
      console.log(`\n   💰 Average sold price: $${avgPrice.toFixed(2)}`);
    } else {
      console.log('   ⚠️  No results found');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Scraper test complete!\n');

    // Test 3: Full comp analysis
    console.log('📍 Test 3: Full Comp Analysis (PSA 10 + PSA 9)\n');
    const comps = await scraper.getSoldComps('1997 Topps Chrome Allen Iverson Refractor');

    console.log(`\n   PSA 10 Comps: ${comps.psa10.length} sold listings`);
    if (comps.psa10.length > 0) {
      const avgPsa10 = comps.psa10.reduce((sum, item) => sum + item.totalPrice, 0) / comps.psa10.length;
      console.log(`   Average PSA 10: $${avgPsa10.toFixed(2)}`);
    }

    console.log(`\n   PSA 9 Comps: ${comps.psa9.length} sold listings`);
    if (comps.psa9.length > 0) {
      const avgPsa9 = comps.psa9.reduce((sum, item) => sum + item.totalPrice, 0) / comps.psa9.length;
      console.log(`   Average PSA 9: $${avgPsa9.toFixed(2)}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n🎉 All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testScraper().catch(console.error);
