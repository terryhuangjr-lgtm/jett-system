#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

const endpoint = 'api.ebay.com';
const params = 'q=Michael+Jordan+basketball+card+(auto+OR+autograph+OR+numbered+OR+parallel)&filter=buyingOptions:{AUCTION},price:[100..2000],priceCurrency:USD&limit=3&sort=endingSoonest';
const path = `/buy/browse/v1/item_summary/search?${params}`;

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
    console.log('Full response:\n');
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', console.error);
req.end();
