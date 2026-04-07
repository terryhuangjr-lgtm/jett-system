require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
if (!apiKey) throw new Error('SHOPIFY_TOKEN missing in /home/clawd/.env');
const version = '2024-04';

const baseUrl = `https://${storeUrl}/admin/api/${version}`;
const headers = {
  'X-Shopify-Access-token': apiKey,
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }
  return response.json();
}

async function createCustomer(customerData) {
  const res = await api('/customers.json', {
    method: 'POST',
    body: JSON.stringify({ customer: customerData })
  });
  return res.customer;
}

async function getProducts() {
  const res = await api('/products.json?limit=10');
  return res.products;
}

async function createOrder(customerId, variantId, quantity = 1, shippingAddress) {
  const lineItem = [{
    variant_id: variantId,
    quantity
  }];
  const shippingLine = [{
    title: 'Test Shipping',
    price: '10.00',
    code: 'test'
  }];
  const orderData = {
    order: {
      customer_id: customerId,
      line_items: lineItem,
      shipping_address: shippingAddress,
      shipping_lines: shippingLine,
      financial_status: 'pending',
      test: true,
      send_receipt: false,
      send_fulfillment_receipt: false
    }
  };
  const res = await api('/orders.json', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
  return res.order;
}

async function main() {
  console.log('Fetching Superare products (gloves/tees/hoodies)...');
  const allProducts = await getProducts();
  const products = allProducts.filter(p => 
    p.title.toLowerCase().includes('glove') || 
    p.title.toLowerCase().includes('tee') || 
    p.title.toLowerCase().includes('hoodie')
  );
  if (products.length === 0) throw new Error('No glove/tee/hoodie products found');
  console.log(`Found ${products.length} matching products.`);

  const testData = [
    {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith' + Date.now() + '@testmail.com',
      addresses: [{ address1: '456 Oak Ave', city: 'Brooklyn', province_code: 'NY', zip: '11201', country_code: 'US' }]
    },
    {
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike.j' + Date.now() + '@testmail.com',
      addresses: [{ address1: '789 Pine St', city: 'Manhattan', province_code: 'NY', zip: '10003', country_code: 'US' }]
    },
    {
      first_name: 'Sarah',
      last_name: 'Lee',
      email: 'sarah.lee' + Date.now() + '@testmail.com',
      addresses: [{ address1: '321 Elm Blvd', city: 'Queens', province_code: 'NY', zip: '11354', country_code: 'US' }]
    },
    {
      first_name: 'David',
      last_name: 'Kim',
      email: 'david.kim' + Date.now() + '@testmail.com',
      addresses: [{ address1: '147 Maple Dr', city: 'Bronx', province_code: 'NY', zip: '10462', country_code: 'US' }]
    },
    {
      first_name: 'Emily',
      last_name: 'Chen',
      email: 'emily.chen' + Date.now() + '@testmail.com',
      addresses: [{ address1: '258 Cedar Ln', city: 'Staten Island', province_code: 'NY', zip: '10314', country_code: 'US' }]
    }
  ];

  const createdOrders = [];
  for (let i = 0; i < 5; i++) {
    const data = testData[i];
    console.log(`Creating customer ${i+1}: ${data.first_name} ${data.last_name}`);
    const customer = await createCustomer(data);
    
    const product = products[i % products.length];
    console.log(`  Order ${i+1}: ${product.title}`);
    const variantId = product.variants[0].id;
    console.log(`  Using product: ${product.title} (variant ${variantId})`);
    
    const order = await createOrder(customer.id, variantId, 1, data.addresses[0]);
    createdOrders.push(order);
    console.log(`  Order created: #${order.order_number} (${order.id})`);
  }

  console.log('\n✅ All 5 test orders created!');
  console.log('Orders:', createdOrders.map(o => `#${o.order_number} (${o.customer.email})`).join('\n'));
}

main().catch(console.error);
