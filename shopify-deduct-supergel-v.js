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
  // Get product
  const productRes = await api('/products.json?q=supergel v gloves');
  const product = productRes.products.find(p => p.handle === 'supergel-v-gloves');
  if (!product) throw new Error('SuperGel V Gloves not found');

  console.log(`Product: ${product.title} (${product.variants.length} variants)`);

  let adjusted = 0;
  const locationsRes = await api('/locations.json');
  const locationId = locationsRes.locations[0].id;
  console.log(`Using location ID: ${locationId} (${locationsRes.locations[0].name})`);

  for (const variant of product.variants) {
    const itemId = variant.inventory_item_id;
    console.log(`\\nAdjusting ${variant.title} (item ${itemId}, current qty ${variant.inventory_quantity})`);

    // Get current inventory level
    const levelsRes = await api(`/inventory_levels.json?location_ids=${locationId}&inventory_item_ids=${itemId}`);
    const level = levelsRes.inventory_levels.find(l => l.inventory_item_id === itemId);
    if (!level) {
      console.log(`  No inventory level found - skipping`);
      continue;
    }

    // Adjust by -1
    const newQty = level.available - 1;
    if (newQty < 0) {
      console.log(`  Skipping: would go negative`);
      continue;
    }
    const adjustRes = await api(`/inventory_levels/${level.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        inventory_level: {
          available: newQty
        }
      })
    });

    console.log(`  Adjusted: new available ${adjustRes.inventory_level.available}`);
    adjusted++;
    await new Promise(r => setTimeout(r, 1000)); // Rate limit safety
  }

  console.log(`\\n✅ Deducted 1 from ${adjusted}/${product.variants.length} variants.`);
}

main().catch(console.error);