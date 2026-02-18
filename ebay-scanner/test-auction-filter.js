#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

const endpoint = 'api.ebay.com';

// Test different filter combinations
const tests = [
  {
    name: 'No filter',
    params: 'q=Michael+Jordan+basketball+card&limit=5'
  },
  {
    name: 'Auction filter only',
    params: 'q=Michael+Jordan+basketball+card&filter=buyingOptions:{AUCTION}&limit=5'
  },
  {
    name: 'Auction + price filter',
    params: 'q=Michael+Jordan+basketball+card&filter=buyingOptions:{AUCTION},price:[100..2000],priceCurrency:USD&limit=5'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const path = `/buy/browse/v1/item_summary/search?${test.params}`;
    
    const options = {
      hostname: endpoint,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.oauthToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`\n${test.name}:`);
          console.log(`Status: ${res.statusCode}`);
          if (result.total !== undefined) {
            console.log(`Total found: ${result.total}`);
            console.log(`Returned: ${result.itemSummaries?.length || 0}`);
          } else if (result.errors) {
            console.log(`Error: ${result.errors[0].message}`);
          }
          resolve();
        } catch (e) {
          console.error(e);
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(e);
      resolve();
    });
    
    req.end();
  });
}

async function main() {
  console.log('Testing eBay Browse API filters...\n');
  
  for (const test of tests) {
    await runTest(test);
    await new Promise(r => setTimeout(r, 1000)); // Wait 1s between tests
  }
}

main();
