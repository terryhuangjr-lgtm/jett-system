const EbayBrowseAPI = require('./ebay-browse-api');
const RawCardFilter = require('./raw-card-filter');

async function test() {
  const client = new EbayBrowseAPI();
  const filter = new RawCardFilter();
  
  console.log('\nFetching Kobe refractors...\n');
  
  const items = await client.search({
    keywords: 'kobe bryant topps refractor',
    limit: 50
  });
  
  console.log(`Found ${items.length} total items\n`);
  
  const rawItems = items.filter(item => filter.isRawCard(item));
  const gradedItems = items.filter(item => !filter.isRawCard(item));
  
  console.log(`Raw (ungraded): ${rawItems.length}`);
  console.log(`Graded: ${gradedItems.length}\n`);
  
  console.log('Sample raw items:');
  rawItems.slice(0, 5).forEach((item, i) => {
    console.log(`${i+1}. ${item.title.substring(0, 60)}`);
    console.log(`   Condition: "${item.condition}" | Price: $${item.totalPrice}\n`);
  });
  
  console.log('\nSample graded items:');
  gradedItems.slice(0, 5).forEach((item, i) => {
    console.log(`${i+1}. ${item.title.substring(0, 60)}`);
    console.log(`   Condition: "${item.condition}" | Has PSA/BGS: ${/psa|bgs|cgc/i.test(item.title)}\n`);
  });
}

test().catch(console.error);
