#!/usr/bin/env node
const EbayFindingAPI = require('./ebay-finding-api');

async function test() {
  const api = new EbayFindingAPI();
  
  console.log('\n1. Testing basic findItems (active listings)...');
  try {
    const items = await api.findItems({
      keywords: 'jordan card',
      maxResults: 5
    });
    console.log(`✓ Found ${items.length} items`);
  } catch (e) {
    console.log(`✗ Error: ${e.message}`);
  }

  console.log('\n2. Testing getSoldComps (sold listings)...');
  try {
    const sold = await api.getSoldComps('jordan card psa 10');
    console.log(`✓ Found ${sold.length} sold items`);
    if (sold.length > 0) {
      console.log(`   First sold item: $${sold[0].totalPrice} - ${sold[0].title.substring(0, 50)}`);
    }
  } catch (e) {
    console.log(`✗ Error: ${e.message}`);
  }
}

test();
