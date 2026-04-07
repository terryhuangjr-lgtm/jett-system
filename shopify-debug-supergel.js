require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}`;
const headers = { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' };

async function api(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  const locations = await api('/locations.json');
  console.log('Locations:', locations.locations.map(l => `${l.id}: ${l.name}`));

  const product = (await api('/products.json?q=supergel v gloves')).products.find(p => p.handle === 'supergel-v-gloves');
  const variant = product.variants[0];
  console.log('\\nFirst variant:', variant.title);
  console.log('Variant ID:', variant.id);
  console.log('Inventory item ID:', variant.inventory_item_id);
  console.log('Inventory mgmt:', variant.inventory_management);
  console.log('Inventory policy:', variant.inventory_policy);
  console.log('Current qty:', variant.inventory_quantity);
  console.log('Requires shipping:', variant.requires_shipping);

  const levels = await api(`/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`);
  console.log('\\nInventory levels for item:', levels.inventory_levels);

  const locLevels = await api(`/inventory_levels.json?location_ids=1&inventory_item_ids=${variant.inventory_item_id}`);
  console.log('\\nLevels loc1:', locLevels.inventory_levels);
}

main().catch(console.error);