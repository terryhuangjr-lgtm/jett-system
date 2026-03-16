const EbayBrowseAPI = require('./ebay-browse-api');
const RawCardFilter = require('./raw-card-filter');

async function debug() {
  const client = new EbayBrowseAPI();
  const filter = new RawCardFilter();
  
  const items = await client.search({
    keywords: 'Dirk Nowitzki refractor',
    categoryId: '212',
    minPrice: 10,
    maxPrice: 500,
    limit: 50
  });
  
  console.log('DEBUGGING FILTER LOGIC:\n');
  
  // Check items that should be raw but are filtered
  const suspectItems = [
    items[3], // #4
    items[5], // #6
    items[8], // #9
    items[13], // #14
    items[16], // #17
    items[17]  // #18
  ].filter(Boolean);
  
  suspectItems.forEach((item, i) => {
    console.log(`\n${i+1}. ${item.title}`);
    console.log(`   Condition: "${item.condition || 'N/A'}"`);
    
    const title = (item.title || '').toLowerCase();
    const condition = (item.condition || '').toLowerCase();
    
    // Check each keyword
    const gradedKeywords = ['psa', 'bgs', 'cgc', 'sgc', 'graded', 'gem mint', 'gem mt', 'pristine', 'authentic', 'bccg', 'ksa', 'ags'];
    
    for (const keyword of gradedKeywords) {
      if (title.includes(keyword)) {
        console.log(`   ✗ MATCHED: "${keyword}" in title`);
      }
      if (condition.includes(keyword)) {
        console.log(`   ✗ MATCHED: "${keyword}" in condition`);
      }
    }
    
    const isRaw = filter.isRawCard(item);
    console.log(`   Result: ${isRaw ? 'RAW' : 'FILTERED'}`);
  });
}

debug().catch(console.error);
