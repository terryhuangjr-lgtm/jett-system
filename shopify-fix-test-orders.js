require('dotenv').config({ path: require('os').homedir() + '/.env' });

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
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

async function deleteTestProducts() {
  const products = await api('GET', '/products.json?limit=50');
  const testProds = products.products.filter(p => p.title.startsWith('Test '));
  const deleted = [];
  for (const p of testProds) {
    await api('DELETE', `/products/${p.id}.json`);
    deleted.push(p.title);
    console.log(`🗑️ Deleted product: ${p.title} (ID: ${p.id})`);
  }
  return deleted;
}

async function cancelTestOrders() {
  // From previous logs, adjust if needed
  const testOrderIds = [6571770577061, 6571770609829, 6571770675365, 6571770740901];
  const cancelled = [];
  for (const orderId of testOrderIds) {
    await api('POST', `/orders/${orderId}/cancel.json`, { });
    cancelled.push(orderId);
    console.log(`❌ Cancelled order ID: ${orderId}`);
  }
  return cancelled;
}

async function getProductsWithInventory(minInv = 1) {
  const products = await api('GET', '/products.json?limit=250');
  return products.products.filter(p => 
    p.variants.some(v => (v.inventory_quantity || 0) >= minInv)
  ).map(p => ({
    id: p.id,
    title: p.title,
    variants: p.variants.filter(v => (v.inventory_quantity || 0) >= minInv).map(v => ({id: v.id, title: v.title, qty: v.inventory_quantity}))
  }));
}

async function createOrderWithExistingProduct(prodTitle, customerFirst, customerLast, customerEmail) {
  const products = await api('GET', `/products.json?limit=10&query=title:${encodeURIComponent(prodTitle)}`);
  const product = products.products[0];
  if (!product) throw new Error(`No product "${prodTitle}" with inventory`);
  const variant = product.variants.find(v => (v.inventory_quantity || 0) > 0);
  if (!variant) throw new Error(`No inventory for ${prodTitle}`);
  const res = await api('POST', '/orders.json', {
    order: {
      line_items: [{ variant_id: variant.id, quantity: 1 }],
      financial_status: 'paid',
      fulfillment_status: null,
      customer: {
        first_name: customerFirst,
        last_name: customerLast,
        email: customerEmail
      },
      billing_address: { /* same as before */ first_name: customerFirst, last_name: customerLast, address1: '123 Test St', city: 'NYC', province: 'NY', country: 'US', zip: '10001' },
      shipping_address: { /* same */ first_name: customerFirst, last_name: customerLast, address1: '123 Test St', city: 'NYC', province: 'NY', country: 'US', zip: '10001' }
    }
  });
  return res.order;
}

(async () => {
  try {
    console.log('🔄 Cleaning test data...');
    const deletedProds = await deleteTestProducts();
    const cancelledOrders = await cancelTestOrders();

    console.log('\\n📦 Existing products with inventory:');
    const availProds = await getProductsWithInventory();
    console.log(JSON.stringify(availProds.map(p => p.title), null, 2));
    if (availProds.length === 0) {
      console.log('No existing products with inventory. Stopping.');
      return;
    }

    // Pick 4 unique
    const selectedProds = availProds.slice(0, 4).map(p => p.title);
    console.log(`Selected: ${selectedProds.join(', ')}`);

    const testCustomers = [
      { first: 'John', last: 'Doe', email: 'john.doe2@test2026.com', prod: selectedProds[0] },
      { first: 'Jane', last: 'Smith', email: 'jane.smith2@test2026.com', prod: selectedProds[1] || selectedProds[0] },
      { first: 'Bob', last: 'Johnson', email: 'bob.johnson2@test2026.com', prod: selectedProds[2] || selectedProds[0] },
      { first: 'Alice', last: 'Brown', email: 'alice.brown2@test2026.com', prod: selectedProds[3] || selectedProds[0] }
    ];

    console.log('\\n🧾 Creating new orders with existing products...');
    const newOrders = [];
    for (const cust of testCustomers) {
      const order = await createOrderWithExistingProduct(cust.prod, cust.first, cust.last, cust.email);
      newOrders.push(order);
      console.log(`✅ Order #${order.order_number} for ${cust.first} ${cust.last} (${cust.prod}) ID: ${order.id}`);
    }

    console.log('\\n🎉 FIXED!');
    console.log('Deleted products:', deletedProds.length);
    console.log('Cancelled orders:', cancelledOrders.length);
    console.log('New orders:', newOrders.map(o => `#${o.order_number}`).join(', '));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
})();
