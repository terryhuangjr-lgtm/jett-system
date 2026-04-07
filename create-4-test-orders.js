require('dotenv').config({ path: '/home/clawd/.env', override: true });

const fetch = require('node-fetch');

const STORE = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';
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
    throw new Error(JSON.stringify(data));
  }
  return data;
};

const customerId = 8960850264229;
const common = {
  customer_id: customerId,
  financial_status: 'pending',
  billing_address: {
    company: 'Superare Marketing',
    address1: '135 Robby Lane',
    city: 'Franklin Square',
    province: 'NY',
    country: 'US',
    zip: '11010'
  },
  shipping_address: {
    name: 'Test Customer',
    address1: '123 Test St',
    city: 'Test City',
    province: 'NY',
    country: 'US',
    zip: '11010'
  },
  note: 'Test order - mixed products'
};

const orders = [
  // 1: Enorme + Legacy Tee
  { line_items: [{variant_id: 47676713795749, quantity: 1}, {variant_id: 47661706838181, quantity: 1}], note: 'Test #1: Bag + Tee' },
  // 2: Carico Grey + Supergel 10oz
  { line_items: [{variant_id: 47676713894053, quantity: 1}, {variant_id: 47656593391781, quantity: 1}], note: 'Test #2: Bag + Gloves' },
  // 3: Carico Black + Supergel 16oz
  { line_items: [{variant_id: 47676713861285, quantity: 1}, {variant_id: 47656593490085, quantity: 1}], note: 'Test #3: Bag + Gloves' },
  // 4: Enorme + Carico Grey
  { line_items: [{variant_id: 47676713795749, quantity: 1}, {variant_id: 47676713894053, quantity: 1}], note: 'Test #4: Bags mix' }
];

(async () => {
  for (let i = 0; i < orders.length; i++) {
    const orderData = { ...common, ...orders[i] };
    const res = await api('POST', '/orders.json', { order: orderData });
    const order = res.order;
    console.log(`✅ Test Order #${i+1} #${order.order_number} (ID ${order.id}):`);
    console.log(`Admin: https://${STORE}/admin/orders/${order.id}`);
    console.log('');
  }
})();
