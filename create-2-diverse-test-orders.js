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
    const productsRes = await api('GET', '/products.json?limit=250');
    const products = productsRes.products || [];
    const availVariants = [];
    for (const p of products) {
      for (const v of p.variants) {
        if ((v.inventory_quantity || 0) > 0) {
          availVariants.push({
            productTitle: p.title,
            variantTitle: v.title,
            variantId: v.id
          });
        }
      }
    }
    if (availVariants.length < 4) throw new Error(`Not enough inventory`);
    
    // Diverse products: pick from different products
    const groups = [
      [availVariants[0].variantId, availVariants[10]?.variantId || availVariants[1].variantId],  // Tee + another
      [availVariants[20]?.variantId || availVariants[2].variantId, availVariants[30]?.variantId || availVariants[3].variantId]  // Later products
    ];

    const customers = [
      { first: 'Chris', last: 'Evans', email: 'chris.evans.test+order1@example.com' },
      { first: 'Morgan', last: 'Freeman', email: 'morgan.freeman.test+order2@example.com' }
    ];

    const createdOrders = [];
    for (let i = 0; i < 2; i++) {
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
            address1: '456 Test Ave',
            city: 'Testville',
            province: 'CA',
            country: 'US',
            zip: '90210'
          },
          shipping_address: {
            first_name: customers[i].first,
            last_name: customers[i].last,
            address1: '456 Test Ave',
            city: 'Testville',
            province: 'CA',
            country: 'US',
            zip: '90210'
          },
          note: `Test order ${i+1} diverse products via Jett`
        }
      });
      const order = orderRes.order;
      createdOrders.push(order);
      console.log(`✅ #${order.order_number} for ${customers[i].first} ${customers[i].last}`);
      console.log(`  Items: 2 (diverse products)`);
    }
    console.log('🎉 2 orders created!');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
