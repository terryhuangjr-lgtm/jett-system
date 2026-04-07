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
    const res = await api('POST', '/products.json', {
      product: {
        title: 'Finisher Dad Hat',
        status: 'draft',
        body_html: '<p>Finisher Dad Hat - Black OSFM</p>',
        vendor: 'Superare',
        product_type: 'Headgear',
        tags: 'dad-hat, finisher',
        variants: [{
          option1: 'Black / OSFM',
          price: '29.99',
          sku: 'FINISHER-DAD-BLACK-OSFM',
          inventory_quantity: 25,
          inventory_management: 'shopify'
        }]
      }
    });
    const product = res.product;
    console.log('✅ Draft product created!');
    console.log(`Title: ${product.title}`);
    console.log(`ID: ${product.id}`);
    console.log(`Variant ID: ${product.variants[0].id}`);
    console.log(`Status: ${product.status}`);
    console.log(`Admin: https://${STORE}/admin/products/${product.id}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
