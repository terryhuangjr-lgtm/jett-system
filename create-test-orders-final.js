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
    console.log('Fetching products with inventory...');
    const productsRes = await api('GET', '/products.json?limit=250');
    const products = productsRes.products || [];
    const availVariants = [];
    for (const p of products) {
      for (const v of p.variants) {
        if ((v.inventory_quantity || 0) > 0) {
          availVariants.push({
            productTitle: p.title,
            variantTitle: v.title,
            variantId: v.id,
            qty: v.inventory_quantity
          });
        }
      }
    }
    console.log(`Found ${availVariants.length} variants with inventory. Using first 6.`);
    const groups = [
      [availVariants[0].variantId, availVariants[1].variantId],
      [availVariants[2].variantId, availVariants[3].variantId],
      [availVariants[4].variantId, availVariants[5].variantId]
    ];

    const customers = [
      { first: 'Alex', last: 'Rivera', email: 'alex.rivera.test+1@example.com' },
      { first: 'Jordan', last: 'Lee', email: 'jordan.lee.test+2@example.com' },
      { first: 'Taylor', last: 'Kim', email: 'taylor.kim.test+3@example.com' }
    ];

    const createdOrders = [];
    for (let i = 0; i < 3; i++) {
      const line_items = groups[i].map(vid => ({ variant_id: vid, quantity: 1 }));
      const orderRes = await api('POST', '/orders.json', {
        order: {
          line_items,
          financial_status: 'paid',
          fulfillment_status: null,
          customer: customers[i],
          billing_address: {
            first_name: customers[i].first,
            last_name: customers[i].last,
            address1: '123 Test Street',
            city: 'Test City',
            province: 'NY',
            country: 'US',
            zip: '10001'
          },
          shipping_address: {
            first_name: customers[i].first,
            last_name: customers[i].last,
            address1: '123 Test Street',
            city: 'Test City',
            province: 'NY',
            country: 'US',
            zip: '10001'
          },
          note: `Test order ${i+1} - multi item via Jett (${new Date().toISOString()})`
        }
      });
      const order = orderRes.order;
      createdOrders.push(order);
      console.log(`✅ Order #${order.order_number} for ${customers[i].first} ${customers[i].last} (${customers[i].email})`);
      console.log(`  Items: ${groups[i].length}`);
    }

    console.log('🎉 Success!');
    console.log('Order numbers:', createdOrders.map(o => `#${o.order_number}`).join(', '));
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
