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

async function api(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }
  return response.json();
}

async function main() {
  const productRes = await api('/products.json?q=supergel v gloves');
  const product = productRes.products.find(p => p.handle === 'supergel-v-gloves');
  if (!product) throw new Error('SuperGel V Gloves not found');

  console.log(`Updating ${product.title} (${product.variants.length} variants) - deduct 1 each.`);

  let updated = 0;
  for (const variant of product.variants) {
    const currentQty = variant.inventory_quantity;
    if (currentQty <= 0) {
      console.log(`Skipping ${variant.title}: qty ${currentQty}`);
      continue;
    }

    const updateRes = await api(`/products/${product.id}/variants/${variant.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        variant: {
          inventory_quantity: currentQty - 1
        }
      })
    });

    console.log(`  ${variant.title}: ${currentQty} → ${updateRes.variant.inventory_quantity}`);
    updated++;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Updated ${updated} variants.`);
}

main().catch(console.error);