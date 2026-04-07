require('dotenv').config({ path: require('os').homedir() + '/.env' });
const fetch = require('node-fetch');

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;
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
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
};

async function getAllProducts() {
  const data = await api('GET', '/products.json?limit=250');
  return data.products || [];
}

(async () => {
  try {
    const products = await getAllProducts();
    const teeProducts = products.filter(p => 
      p.title.toLowerCase().includes('tee') || 
      p.title.toLowerCase().includes('t-shirt')
    );
    let totalUpdated = 0;
    let errors = [];

    console.log(`Found ${teeProducts.length} tee products:`);
    teeProducts.forEach(p => console.log(`  - ${p.title}`));

    for (const product of teeProducts) {
      for (const variant of product.variants) {
        try {
          const updates = {
            variant: {
              id: variant.id,
              weight: 0.3,
              weight_unit: 'lb'
            }
          };
          await api('PUT', `/variants/${variant.id}.json`, updates);
          totalUpdated++;
        } catch (err) {
          errors.push(`${product.title} - ${variant.title}: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Updated ${totalUpdated} tee variants to 0.3 lbs (136g).`);
    if (errors.length) {
      console.log('\n❌ Errors:', errors.join('\n'));
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
