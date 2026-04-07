const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: require('os').homedir() + '/.env' });

const CLIENT_ID = 'terryhua-JettCard-PRD-b0de3b5c5-841be3e1';
const CLIENT_SECRET = process.env.EBAY_CERT_ID;
const REDIRECT_URI = 'terry_huang-terryhua-JettCa-hfhtgft';

if (!CLIENT_SECRET) {
  console.error('❌ EBAY_CERT_ID missing in ~/.env. Add it first.');
  process.exit(1);
}

const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=https%3A//api.ebay.com/oauth/api_scope%20https%3A//api.ebay.com/oauth/api_scope/sell.inventory%20https%3A//api.ebay.com/oauth/api_scope/sell.account`;

console.log('🔗 Step 1: Visit this URL in browser and authorize:');
console.log(authUrl);
console.log('\\n🔗 Step 2: After redirect, paste the FULL "code=" value here (from URL bar or console):');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Code: ', (code) => {
  if (!code) {
    console.error('❌ No code provided.');
    rl.close();
    return;
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code.trim(),
    redirect_uri: REDIRECT_URI
  });

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenBody
  })
  .then(res => {
    if (!res.ok) throw new Error(`Token Error ${res.status}`);
    return res.json();
  })
  .then(data => {
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    if (!accessToken) throw new Error('No access_token');

    console.log('✅ Tokens received:');
    console.log('Access:', accessToken.substring(0, 20) + '...');
    console.log('Refresh:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'N/A');
    console.log('Expires in:', data.expires_in, 's');

    // Append to .env
    const envLine1 = `EBAY_OAUTH_TOKEN=${accessToken}`;
    const envLine2 = refreshToken ? `EBAY_OAUTH_REFRESH=${refreshToken}` : '';
    fs.appendFileSync(require('os').homedir() + '/.env', `\\n${envLine1}\\n${envLine2}`);

    console.log('✅ Saved to ~/.env. Run node test-sell-api.js to verify!');
    rl.close();
  })
  .catch(err => {
    console.error('❌ Exchange failed:', err.message);
    rl.close();
  });
});