require('dotenv').config({ path: '/home/clawd/.env', override: true });

const fetch = require('node-fetch');

const STORE = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';
const TOKEN = process.env.SHOPIFY_TOKEN || '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';
const BASE = `https://${STORE}/admin/api/2026-01`;
const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json'
};

const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

(async () => {
  try {
    // Get locations
    const locations = await api('GET', '/locations.json').then(r => r.locations);
    console.log('Locations:', locations.map(l => `${l.name} (ID: ${l.id})`));
    const sourceLocation = locations.find(l => !l.name.includes('NYC')) || locations[0]; // Assume first non-NYC source
    const nycLocation = locations.find(l => l.name.includes('NYC'));
    if (!nycLocation) throw new Error('No NYC location found');
    console.log(`Source: ${sourceLocation.name} (${sourceLocation.id}) → NYC (${nycLocation.id})`);

    // Find Supergel V Gloves Black 14 oz variant
    const products = await api('GET', '/products.json?query=supergel+v+gloves&limit=1').then(r => r.products);
    const product = products[0];
    if (!product) throw new Error('Supergel V Gloves not found');
    const variant = product.variants.find(v => v.title.includes('Black / 14 oz'));
    if (!variant) throw new Error('Black 14 oz variant not found');
    const inventoryItemId = variant.inventory_item_id;
    console.log(`Variant: ${variant.title} (Item ID: ${inventoryItemId})`);

    // Create transfer
    const transferRes = await api('POST', '/inventory_transfers.json', {
      inventory_transfer: {
        destination_location_id: nycLocation.id,
        line_items: [{
          inventory_item_id: inventoryItemId,
          quantity: 5
        }],
        name: 'Transfer 5 Supergel V Black 14oz to NYC'
      }
    });
    const transfer = transferRes.inventory_transfer;
    console.log(`✅ Transfer created! ID: ${transfer.id}`);
    console.log(`Status: ${transfer.status}`);
    console.log(`Admin: https://${STORE}/admin/inventory_transfers/${transfer.id}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
