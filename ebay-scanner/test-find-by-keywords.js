/**
 * Test simpler findItemsByKeywords operation
 * This might have different permissions than findItemsAdvanced
 */

const axios = require('axios');
const fs = require('fs');

async function testFindByKeywords() {
  console.log('Testing findItemsByKeywords (simpler operation)...\n');

  const credentials = JSON.parse(
    fs.readFileSync('./credentials.json', 'utf8')
  );

  const baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';

  const params = {
    'OPERATION-NAME': 'findItemsByKeywords',  // Simpler operation
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': credentials.appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': true,
    'keywords': 'michael jordan card',
    'paginationInput.entriesPerPage': 5
  };

  console.log('Trying simpler operation: findItemsByKeywords');
  console.log('App ID:', credentials.appId.substring(0, 20) + '...\n');

  try {
    const response = await axios.get(baseUrl, {
      params: params,
      timeout: 15000
    });

    console.log('✅ API call successful!\n');

    const searchResult = response.data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0];
    const itemCount = searchResult?.['@count'] || 0;

    console.log(`Found ${itemCount} items\n`);

    if (itemCount > 0 && searchResult.item) {
      console.log('Sample results:\n');
      searchResult.item.slice(0, 3).forEach((item, i) => {
        console.log(`${i + 1}. ${item.title?.[0]}`);
        console.log(`   Price: $${item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__}`);
        console.log(`   URL: ${item.viewItemURL?.[0]}\n`);
      });

      console.log('✅ Finding API is working!\n');
      console.log('Next step: Update gem-finder.js to use findItemsByKeywords instead of findItemsAdvanced\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.response) {
      console.error('\nStatus:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
      console.error('\n⚠️  Your app might not have Finding API access yet.');
      console.error('Check your eBay Developer account settings.');
    }
  }
}

testFindByKeywords();
