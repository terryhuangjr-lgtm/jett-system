require('dotenv').config({ path: require('os').homedir() + '/.env' });

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
    console.log(`Found ${availVariants.length} variants with inventory.`);
    if (availVariants.length < 6) {
      throw new Error(`Need at least 6 variants with inventory, found ${availVariants.length}`);
    }

    // Group into 3 orders with 2 items each
    const groups = [
      [availVariants[0], availVariants[1]],
      [availVariants[2], availVariants[3]],
      [availVariants[4], availVariants[5]]
    ];

    const customers = [
      { first: 'Alex', last: 'Rivera', email: `alex.rivera.test.${Date.now()}.com` },
      { first: 'Jordan', last: 'Lee', email: `jordan.lee.test.${Date.now()}.com` },
      { first: 'Taylor', last: 'Kim', email: `taylor.kim.test.${Date.now()}.com` }
    ];

    const createdOrders = [];
    for (let i = 0; i < 3; i++) {
      const line_items = groups[i].map(v => ({ variant_id: v.variantId, quantity: 1 }));
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
          note: `Test order ${i+1} with multiple items via Jett`
        }
      });
      const order = orderRes.order;
      createdOrders.push(order);
      console.log(`✅ Created Order #${order.order_number}: ${customers[i].first} ${customers[i].last} (${customers[i].email})`);
      console.log(`   Items: ${groups[i].map(v => `${v.productTitle} - ${v.variantTitle}`).join(', ')}`);
      console.log(`   Order ID: ${order.id}, Total: $${order.total_price}`);
      console.log('');
    }

    console.log('🎉 All 3 test orders created successfully!');
    console.log('Orders:');
    createdOrders.forEach(o => console.log(`  - #${o.order_number} (${o.customer.email})`));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
})();
