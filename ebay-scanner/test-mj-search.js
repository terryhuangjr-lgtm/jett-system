#!/usr/bin/env node

const EbayBrowseAPI = require('./ebay-browse-api');

async function test() {
  const client = new EbayBrowseAPI();
  
  console.log('Testing MJ search...\n');
  
  const search = {
    name: 'Test MJ',
    keywords: 'michael jordan 1996',
    categoryId: '212',
    minPrice: 25,
    maxPrice: 500,
    excludeKeywords: ['PSA', 'BGS'],
    sortOrder: 'PricePlusShippingLowest'
  };
  
  try {
    const items = await client.search(search);
    console.log(`Found ${items.length} items\n`);
    
    if (items.length > 0) {
      console.log('First 3 items:');
      items.slice(0, 3).forEach((item, i) => {
        console.log(`${i+1}. ${item.title} - $${item.totalPrice}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
