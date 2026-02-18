#!/usr/bin/env node

/**
 * Test eBay Browse API with OAuth - Modern API
 */

const fs = require('fs');
const https = require('https');

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

const endpoint = creds.environment === 'PRODUCTION' || creds.environment === 'production'
  ? 'api.ebay.com'
  : 'api.sandbox.ebay.com';

console.log('🧪 Testing eBay Browse API (Modern RESTful API)\n');

// Step 1: Get OAuth token
function getOAuthToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${creds.appId}:${creds.certId}`).toString('base64');
    const postData = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';

    const options = {
      hostname: endpoint,
      port: 443,
      path: '/identity/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': postData.length
      }
    };

    console.log('🔐 Getting OAuth token...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ OAuth token obtained\n');
          resolve(result.access_token);
        } else {
          console.error('❌ OAuth failed:', res.statusCode);
          console.error(data);
          reject(new Error(`OAuth failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Step 2: Search using Browse API
async function testSearch(token) {
  return new Promise((resolve, reject) => {
    console.log('🔍 Searching for Michael Jordan cards...');

    const options = {
      hostname: endpoint,
      port: 443,
      path: '/buy/browse/v1/item_summary/search?q=michael+jordan+basketball+card&limit=5',
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
        console.log(`Status: ${res.statusCode}\n`);

        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ Browse API works!\n');
          console.log(`Found ${result.total || 0} total items`);
          console.log(`Returned ${result.itemSummaries?.length || 0} items\n`);

          if (result.itemSummaries && result.itemSummaries.length > 0) {
            console.log('Sample results:\n');
            result.itemSummaries.slice(0, 3).forEach((item, i) => {
              console.log(`${i + 1}. ${item.title}`);
              console.log(`   Price: $${item.price?.value} ${item.price?.currency}`);
              console.log(`   Condition: ${item.condition}`);
              console.log(`   URL: ${item.itemWebUrl.substring(0, 60)}...\n`);
            });

            console.log('🎉 SUCCESS! Browse API is working.');
            console.log('This is BETTER than Finding API (more features, faster).\n');
          }
          resolve(true);
        } else {
          console.error('❌ Search failed:', res.statusCode);
          console.error(data);
          reject(new Error(`Search failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run test
(async () => {
  try {
    const token = await getOAuthToken();
    await testSearch(token);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
})();
