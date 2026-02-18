/**
 * Test eBay Browse API filters
 * Documentation: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function getToken() {
  const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
  const auth = Buffer.from(`${creds.appId}:${creds.certId}`).toString('base64');
  const postData = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ebay.com',
      port: 443,
      path: '/identity/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result.access_token);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testSearch(token, filters) {
  const keywords = 'Dirk Nowitzki refractor';
  const categoryId = '212'; // Sports cards
  
  // Build filter string
  const filterParts = [
    `categoryIds:{${categoryId}}`,
    'price:[10..500]',
    'priceCurrency:USD'
  ];
  
  if (filters) {
    filterParts.push(filters);
  }
  
  const filterStr = filterParts.join(',');
  const path = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keywords)}&filter=${encodeURIComponent(filterStr)}&limit=50`;

  console.log(`\nTesting filter: ${filters || 'NONE'}`);
  console.log(`Full filter string: ${filterStr}\n`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ebay.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log(`Results: ${result.total || 0} total`);
          if (result.itemSummaries) {
            console.log(`Returned: ${result.itemSummaries.length} items`);
            console.log('\nFirst 3 conditions:');
            result.itemSummaries.slice(0, 3).forEach((item, i) => {
              console.log(`  ${i+1}. ${item.condition} - ${item.title.substring(0, 60)}`);
            });
          }
          resolve(result);
        } else {
          console.log(`ERROR ${res.statusCode}: ${data}`);
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Getting OAuth token...');
  const token = await getToken();
  console.log('Token received!\n');
  
  console.log('='.repeat(80));
  console.log('TESTING EBAY BROWSE API FILTERS');
  console.log('='.repeat(80));
  
  // Test 1: No condition filter
  await testSearch(token, null);
  
  // Test 2: Try condition:{UNGRADED}
  await testSearch(token, 'conditions:{UNGRADED}');
  
  // Test 3: Try itemFilter
  await testSearch(token, 'itemFilter:Ungraded');
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
