const EbayBrowseAPI = require('./ebay-browse-api');

async function test() {
  const client = new EbayBrowseAPI();
  
  const items = await client.search({
    keywords: 'kobe bryant topps refractor',
    condition: 'UNGRADED',
    limit: 10
  });
  
  console.log(`\nFound ${items.length} items`);
  items.slice(0, 5).forEach((item, i) => {
    console.log(`\n${i+1}. ${item.title.substring(0, 60)}`);
    console.log(`   Condition: "${item.condition}"`);
    console.log(`   Price: $${item.totalPrice}`);
  });
}

test().catch(console.error);
