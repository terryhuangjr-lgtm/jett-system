/**
 * Generate OAuth Token for eBay API
 * Run this once to get an access token
 */

const Ebay = require('ebay-node-api');
const fs = require('fs');
const path = require('path');

async function generateToken() {
  console.log('🔐 Generating eBay OAuth Token...\n');

  try {
    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')
    );

    // Create eBay instance
    const ebay = new Ebay({
      clientID: credentials.appId,
      clientSecret: credentials.certId,
      body: {
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      }
    });

    // Get access token
    console.log('Requesting access token from eBay...');
    const token = await ebay.getAccessToken();

    console.log('✅ Token generated successfully!\n');
    console.log('Token type:', typeof token);
    console.log('Token:', JSON.stringify(token).substring(0, 100) + '...\n');

    // Save token to credentials
    credentials.accessToken = token;
    credentials.tokenGeneratedAt = new Date().toISOString();

    fs.writeFileSync(
      path.join(__dirname, 'credentials.json'),
      JSON.stringify(credentials, null, 2)
    );

    console.log('💾 Token saved to credentials.json');
    console.log('\n✅ Setup complete! You can now run searches.\n');

    return token;

  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    console.error('\nFull error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateToken()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = generateToken;
