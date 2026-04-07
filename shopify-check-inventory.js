require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
if (!apiKey) throw new Error('SHOPIFY_TOKEN missing');

const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}`;
const headers = {
  'X-Shopify-Access-Token': apiKey,
  'Content-Type': 'application/json',
};

async function api(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }
  return response.json();
}

async function main() {
  const res = await api('/products.json?limit=50&q=supergel');
  const products = res.products.filter(p => p.title.toLowerCase().includes('glove') || p.title.toLowerCase().includes('supergel'));
  
  if (products.length === 0) {
    console.log('No "SuperGel V Gloves" found.');
    return;
  }
  
  for (const product of products) {
    console.log(`\nProduct: ${product.title} (ID: ${product.id})`);
    console.log(`Handle: ${product.handle}`);
    console.log('Variants:');
    for (const v of product.variants) {
      console.log(`  - ${v.title}: Qty ${v.inventory_quantity} (ID: ${v.id})`);
    }
    console.log(`Total available: ${product.variants.reduce((sum, v) => sum + v.inventory_quantity, 0)}`);
  }
}

main().catch(console.error);