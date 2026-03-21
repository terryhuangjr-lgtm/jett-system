/**
 * Simple test of eBay Finding API
 * Minimal test to isolate the issue
 */

const axios = require('axios');
const fs = require('fs');

async function testSimpleSearch() {
  console.log('Testing simple eBay Finding API call...\n');

  const credentials = JSON.parse(
    fs.readFileSync('./credentials.json', 'utf8')
  );

  const baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';

  const params = {
    'OPERATION-NAME': 'findItemsAdvanced',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': credentials.appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': true,
    'keywords': 'michael jordan basketball card',
    'paginationInput.entriesPerPage': 10
  };

  console.log('Request URL:', baseUrl);
  console.log('App ID:', credentials.appId.substring(0, 20) + '...');
  console.log('');

  try {
    const response = await axios.get(baseUrl, {
      params: params,
      timeout: 15000
    });

    console.log('✅ API call successful!\n');
    console.log('Response keys:', Object.keys(response.data));

    const searchResult = response.data.findItemsAdvancedResponse?.[0]?.searchResult?.[0];
    const itemCount = searchResult?.['@count'] || 0;

    console.log(`Found ${itemCount} items\n`);

    if (itemCount > 0 && searchResult.item) {
      console.log('First item:');
      const firstItem = searchResult.item[0];
      console.log('Title:', firstItem.title?.[0]);
      console.log('Price:', firstItem.sellingStatus?.[0]?.currentPrice?.[0]?.__value__);
      console.log('URL:', firstItem.viewItemURL?.[0].substring(0, 60) + '...');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.response) {
      console.error('\nStatus:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSimpleSearch();
