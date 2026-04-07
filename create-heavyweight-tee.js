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

function generateSKU(base, size) {
  return `${base.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${size}`;
}

(async () => {
  try {
    const sizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const variants = sizes.map(size => {
      const cost = ['S','M','L'].includes(size) ? '8.90' : '9.50';
      return {
        option1: `White / ${size}`,
        price: '38.00',
        cost_per_item: cost,
        sku: generateSKU('HAPPIEST-AT-HEAVYWEIGHT-TEE-WHITE', size),
        inventory_quantity: 20,
        inventory_management: 'shopify'
      };
    });

    const res = await api('POST', '/products.json', {
      product: {
        title: 'Happiest At Heavyweight Tee',
        status: 'draft',
        body_html: '<p>Happiest At Heavyweight Tee - White. Sizes S-3XL. Premium heavyweight cotton.</p>',
        vendor: 'Superare',
        product_type: 'Tee',
        tags: 'heavyweight, tee, boxing',
        variants
      }
    });
    const product = res.product;
    console.log('✅ Draft product created!');
    console.log(`Title: ${product.title}`);
    console.log(`ID: ${product.id}`);
    console.log(`Variants: ${product.variants.length}`);
    console.log(`Admin: https://${STORE}/admin/products/${product.id}`);
    console.log('SKUs:', product.variants.map(v => `${v.option1}: ${v.sku}`).join('\\n'));
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
