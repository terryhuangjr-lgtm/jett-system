const EbayBrowseAPI = require('./ebay-browse-api');
const RawCardFilter = require('./raw-card-filter');

async function test() {
  const client = new EbayBrowseAPI();
  const filter = new RawCardFilter();
  
  console.log('Testing: Dirk Nowitzki refractor\n');
  
  const items = await client.search({
    keywords: 'Dirk Nowitzki refractor',
    categoryId: '212',
    minPrice: 10,
    maxPrice: 500,
    limit: 200
  });
  
  const stats = filter.getStats(items);
  const rawItems = filter.filterRawOnly(items);
  
  console.log(`Total found: ${stats.total}`);
  console.log(`Raw cards: ${stats.raw} (${stats.rawPercent}%)`);
  console.log(`Graded cards filtered: ${stats.graded}\n`);
  
  console.log('Sample raw refractors found:\n');
  rawItems.slice(0, 10).forEach((item, i) => {
    console.log(`${i+1}. ${item.title}`);
    console.log(`   Price: $${item.totalPrice}`);
    console.log('');
  });
}

test().catch(console.error);
