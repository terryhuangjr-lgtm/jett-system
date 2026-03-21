const EbayBrowseAPI = require('./ebay-browse-api');

async function test() {
  const client = new EbayBrowseAPI();
  
  const items = await client.search({
    keywords: 'kobe bryant topps refractor',
    limit: 10
  });
  
  console.log('\nChecking image fields:\n');
  items.forEach((item, i) => {
    console.log(`${i+1}. ${item.title.substring(0, 50)}`);
    console.log(`   imageUrl: ${item.imageUrl ? 'YES' : 'NO'}`);
    console.log(`   imageCount: ${item.imageCount}`);
    console.log(`   pictureCount: ${item.pictureCount}`);
    console.log(`   sellerPositivePercent: ${item.sellerPositivePercent}%\n`);
  });
}

test().catch(console.error);
