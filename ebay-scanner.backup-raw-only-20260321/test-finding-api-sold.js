#!/usr/bin/env node
/**
 * Test if Finding API can fetch sold comps
 */

const EbayFindingAPI = require('./ebay-finding-api');

async function testFindingAPI() {
  const findingAPI = new EbayFindingAPI();

  console.log('\n🧪 Testing Finding API - Sold Comps\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Simple sold comp search
    console.log('\n📍 Test 1: Allen Iverson Topps Chrome PSA 10');
    const aiResults = await findingAPI.getSoldComps('Allen Iverson Topps Chrome PSA 10');

    console.log(`   Found: ${aiResults.length} sold items`);
    if (aiResults.length > 0) {
      console.log('   ✅ Finding API works!');
      console.log('\n   Sample results:');
      aiResults.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. $${item.totalPrice} - ${item.title.substring(0, 50)}`);
      });
    } else {
      console.log('   ⚠️  No results found');
    }

    // Test 2: Michael Jordan Finest
    console.log('\n📍 Test 2: Michael Jordan Finest PSA 10');
    const mjResults = await findingAPI.getSoldComps('Michael Jordan Finest PSA 10');

    console.log(`   Found: ${mjResults.length} sold items`);
    if (mjResults.length > 0) {
      console.log('   ✅ Finding API works!');
      console.log('\n   Sample results:');
      mjResults.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. $${item.totalPrice} - ${item.title.substring(0, 50)}`);
      });
    } else {
      console.log('   ⚠️  No results found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Finding API test complete\n');

  } catch (error) {
    console.error('\n❌ Finding API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n' + '='.repeat(60));
  }
}

testFindingAPI().catch(console.error);
