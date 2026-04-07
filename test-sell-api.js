require('dotenv').config({ path: require('os').homedir() + '/.env' });

const token = process.env.EBAY_OAUTH_TOKEN || process.env.EBAY_SELL_TOKEN;
if (!token) {
  console.error('❌ No token (EBAY_OAUTH_TOKEN or EBAY_SELL_TOKEN)');
  process.exit(1);
}

async function testSellAPI() {
  const inventoryItemId = 'TEST123';

  const response = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${inventoryItemId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Language': 'en-US',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    },
    body: JSON.stringify({
      availability: {
        shipToLocationAvailability: {
          quantity: 1
        }
      },
      condition: 'NEW',
      product: {
        title: '1996 Topps Finest Michael Jordan Card - Test Draft Listing',
        description: 'Test listing via OpenClaw to verify eBay Sell Inventory API connection. Draft only.',
        aspects: {
          'Card Manufacturer': ['Topps'],
          'League': ['NBA'],
          'Player': ['Michael Jordan'],
          'Season': ['1996'],
          'Set': ['Topps Finest']
        },
        brand: 'Topps',
        mpn: 'MJ-TF96-TEST'
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Status:', response.status);
    console.error('eBay Error:', JSON.stringify(errData, null, 2));
    throw new Error(errData.errorDescription || errData.error || `API Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Success:', JSON.stringify(data, null, 2));
}

testSellAPI().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});