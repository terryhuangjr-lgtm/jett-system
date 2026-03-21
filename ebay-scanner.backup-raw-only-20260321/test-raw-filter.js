const EbayBrowseAPI = require('./ebay-browse-api');
const RawCardFilter = require('./raw-card-filter');

async function test() {
  const client = new EbayBrowseAPI();
  const filter = new RawCardFilter();
  
  console.log('Searching for: Dirk Nowitzki refractor\n');
  
  const items = await client.search({
    keywords: 'Dirk Nowitzki refractor',
    categoryId: '212',
    minPrice: 10,
    maxPrice: 500,
    limit: 200
  });
  
  console.log(`Found ${items.length} total listings\n`);
  
  // Show first 20 titles and whether they pass the filter
  console.log('FIRST 20 LISTINGS:\n');
  items.slice(0, 20).forEach((item, i) => {
    const isRaw = filter.isRawCard(item);
    const status = isRaw ? '✓ RAW' : '✗ FILTERED';
    console.log(`${i+1}. [${status}] ${item.title.substring(0, 80)}`);
  });
  
  const stats = filter.getStats(items);
  console.log(`\n\nSTATS:`);
  console.log(`Total: ${stats.total}`);
  console.log(`Raw: ${stats.raw} (${stats.rawPercent}%)`);
  console.log(`Graded: ${stats.graded}`);
}

test().catch(console.error);
