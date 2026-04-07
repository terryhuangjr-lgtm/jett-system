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
    // Find items
    const supergel10 = await findVariantId('supergel v gloves black 10 oz');
    const supergel16 = await findVariantId('supergel v gloves black 16 oz');
    const legacyL = await findVariantId('legacy tee l');

    const line_items = [
      { variant_id: supergel10, quantity: 1 },
      { variant_id: supergel16, quantity: 1 },
      { variant_id: legacyL, quantity: 2 }
    ];

    const orderRes = await api('POST', '/orders.json', {
      order: {
        line_items,
        financial_status: 'pending',
        customer: {
          company: 'Superare Marketing',
          email: 'marketing@superare.com',
          phone: '+1-555-123-4567'
        },
        billing_address: {
          company: 'Superare Marketing',
          address1: '135 Robby Lane',
          city: 'Franklin Square',
          province: 'NY',
          country: 'US',
          zip: '11010'
        },
        shipping_address: {
          name: 'Bob The Boxer',
          address1: '135 Robby Lane',
          city: 'Franklin Square',
          province: 'NY',
          country: 'US',
          zip: '11010'
        },
        note: 'SEND OUT FOR ZACH - Superare Marketing test order'
      }
    });
    const order = orderRes.order;
    console.log(`✅ Test order created #${order.order_number}`);
    console.log(`Customer: Superare Marketing`);
    console.log(`Ship to: Bob The Boxer, 135 Robby Lane, Franklin Square, NY 11010`);
    console.log(`Items: Supergel V Black 10oz x1, 16oz x1, Legacy Tee L x2`);
    console.log(`Admin: https://${STORE}/admin/orders/${order.id}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();

async function findVariantId(keyword) {
  const products = await api('GET', `/products.json?query=${encodeURIComponent(keyword)}&limit=5`).then(r => r.products);
  const product = products[0];
  if (!product) throw new Error(`Product for "${keyword}" not found`);
  const variant = product.variants.find(v => v.title.toLowerCase().includes(keyword.toLowerCase()));
  if (!variant) throw new Error(`Variant for "${keyword}" not found`);
  return variant.id;
}
