#!/usr/bin/env node

/**
 * Test eBay Finding API - Debug version
 */

const fs = require('fs');
const https = require('https');

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

const endpoint = creds.environment === 'sandbox' 
  ? 'svcs.sandbox.ebay.com'
  : 'svcs.ebay.com';

const params = new URLSearchParams({
  'OPERATION-NAME': 'findItemsAdvanced',
  'SERVICE-VERSION': '1.0.0',
  'SECURITY-APPNAME': creds.appId,
  'RESPONSE-DATA-FORMAT': 'JSON',
  'REST-PAYLOAD': '',
  'keywords': 'Michael Jordan basketball card',
  'itemFilter(0).name': 'ListingType',
  'itemFilter(0).value': 'Auction',
  'paginationInput.entriesPerPage': '10'
});

const url = `/services/search/FindingService/v1?${params.toString()}`;

console.log('Testing eBay API...');
console.log(`Environment: ${creds.environment}`);
console.log(`Endpoint: ${endpoint}`);
console.log('');

const options = {
  hostname: endpoint,
  port: 443,
  path: url,
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('');
    console.log('Response:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
