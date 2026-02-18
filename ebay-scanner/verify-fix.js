const EbayBrowseAPI = require('./ebay-browse-api');
const RawCardFilter = require('./raw-card-filter');

async function verify() {
  const client = new EbayBrowseAPI();
  const filter = new RawCardFilter();
  
  console.log('Verifying fix: Dirk Nowitzki refractor\n');
  
  const items = await client.search({
    keywords: 'Dirk Nowitzki refractor',
    categoryId: '212',
    minPrice: 10,
    maxPrice: 500,
    limit: 200
  });
  
  const stats = filter.getStats(items);
  const rawItems = filter.filterRawOnly(items);
  
  console.log(`RESULTS:`);
  console.log(`  Total listings: ${stats.total}`);
  console.log(`  Raw cards: ${stats.raw} (${stats.rawPercent}%)`);
  console.log(`  Graded cards filtered: ${stats.graded}\n`);
  
  console.log('VERIFICATION - First 10 raw cards:');
  rawItems.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i+1}. [${item.condition}] ${item.title.substring(0, 65)}`);
  });
  
  console.log('\n\nVERIFICATION - First 10 filtered (graded) cards:');
  const gradedItems = items.filter(item => !filter.isRawCard(item));
  gradedItems.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i+1}. [${item.condition}] ${item.title.substring(0, 65)}`);
  });
}

verify().catch(console.error);
