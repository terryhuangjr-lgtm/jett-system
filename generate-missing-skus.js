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

function generateSKU(productTitle, variantTitle) {
  const cleanProduct = productTitle.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 15);
  const cleanVariant = variantTitle.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 10);
  return `${cleanProduct}-${cleanVariant}`;
}

(async () => {
  try {
    const products = await api('GET', '/products.json?limit=250').then(r => r.products);
    let totalFixed = 0;
    let totalVariants = 0;
    const results = [];
    for (const p of products) {
      for (const v of p.variants) {
        totalVariants++;
        if (!v.sku || v.sku.trim() === '') {
          const newSKU = generateSKU(p.title, v.title);
          await api('PUT', `/variants/${v.id}.json`, {
            variant: { sku: newSKU }
          });
          totalFixed++;
          results.push({ product: p.title, variant: v.title, oldSKU: v.sku || 'none', newSKU });
          console.log(`✅ Fixed ${p.title} - ${v.title}: ${newSKU}`);
        }
      }
    }
    console.log(`\\n🎉 SUMMARY`);
    console.log(`Variants checked: ${totalVariants}`);
    console.log(`SKUs generated/fixed: ${totalFixed}`);
    console.log('Details:', results.slice(0,10).map(r => `${r.product} - ${r.variant}: ${r.newSKU}`).join('\\n'));
    if (results.length > 10) console.log(`... and ${results.length - 10} more`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
