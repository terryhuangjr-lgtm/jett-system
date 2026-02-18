#!/usr/bin/env node

/**
 * Generate eBay Application OAuth Token
 */

const fs = require('fs');
const https = require('https');

const creds = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

// Base64 encode credentials
const credentials = Buffer.from(`${creds.appId}:${creds.certId}`).toString('base64');

const endpoint = creds.environment === 'sandbox'
  ? 'api.sandbox.ebay.com'
  : 'api.ebay.com';

const postData = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';

const options = {
  hostname: endpoint,
  port: 443,
  path: '/identity/v1/oauth2/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${credentials}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Generating OAuth Application Token...');
console.log(`Environment: ${creds.environment}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('');
    
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('✅ Success! Generated application token:');
      console.log('');
      console.log(result.access_token);
      console.log('');
      console.log(`Expires in: ${result.expires_in} seconds (${Math.floor(result.expires_in/3600)} hours)`);
      
      // Update credentials file
      creds.oauthToken = result.access_token;
      fs.writeFileSync('./credentials.json', JSON.stringify(creds, null, 2));
      console.log('');
      console.log('✅ Updated credentials.json with new token!');
    } else {
      console.log('❌ Error:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
