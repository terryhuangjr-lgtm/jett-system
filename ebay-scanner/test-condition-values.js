/**
 * Test different condition filter values
 * eBay Browse API supports: NEW, LIKE_NEW, USED_EXCELLENT, USED_VERY_GOOD, 
 * USED_GOOD, USED_ACCEPTABLE, FOR_PARTS_OR_NOT_WORKING, CERTIFIED_REFURBISHED
 */

const https = require('https');
const fs = require('fs');

async function getToken() {
  const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
  const auth = Buffer.from(`${creds.appId}:${creds.certId}`).toString('base64');
  const postData = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.ebay.com',
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
      res.on('end', () => resolve(JSON.parse(data).access_token));
    });
    req.write(postData);
    req.end();
  });
}

async function testConditionFilter(token, conditionValue) {
  const keywords = 'Dirk Nowitzki refractor';
  const filterStr = `categoryIds:{212},price:[10..500],priceCurrency:USD,conditions:{${conditionValue}}`;
  const path = `/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keywords)}&filter=${encodeURIComponent(filterStr)}&limit=20`;

  console.log(`\nTesting: conditions:{${conditionValue}}`);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.ebay.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          const items = result.itemSummaries || [];
          console.log(`  Found: ${items.length} items`);
          
          // Count conditions
          const condCounts = {};
          items.forEach(item => {
            const cond = item.condition || 'Unknown';
            condCounts[cond] = (condCounts[cond] || 0) + 1;
          });
          console.log(`  Conditions:`, condCounts);
          
          resolve(result);
        } else {
          console.log(`  ERROR: ${res.statusCode}`);
          resolve(null);
        }
      });
    });
    req.end();
  });
}

async function main() {
  const token = await getToken();
  
  console.log('Testing different condition filter values...\n');
  
  // Test various condition values
  await testConditionFilter(token, 'UNGRADED');
  await testConditionFilter(token, 'NEW');
  await testConditionFilter(token, 'USED_EXCELLENT');
  await testConditionFilter(token, 'NEW|USED_EXCELLENT|USED_VERY_GOOD');
  
  // Also test without condition filter
  console.log('\n\nNo condition filter (baseline):');
  const filterStr = `categoryIds:{212},price:[10..500],priceCurrency:USD`;
  const path = `/buy/browse/v1/item_summary/search?q=Dirk%20Nowitzki%20refractor&filter=${encodeURIComponent(filterStr)}&limit=50`;
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.ebay.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const result = JSON.parse(data);
        const items = result.itemSummaries || [];
        
        const condCounts = {};
        items.forEach(item => {
          const cond = item.condition || 'Unknown';
          condCounts[cond] = (condCounts[cond] || 0) + 1;
        });
        console.log(`  Found: ${items.length} items`);
        console.log(`  Conditions:`, condCounts);
        
        resolve();
      });
    });
    req.end();
  });
}

main().catch(console.error);
