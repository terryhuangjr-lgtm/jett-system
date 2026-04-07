require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}`;
const headers = { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' };

async function main() {
  const customer = {
    first_name: 'Terry',
    last_name: 'Huang Jr',
    email: 'terry@levelupdigitalny.com',
    // phone omitted (dup error)
    addresses: [{
      address1: '161 Greenway W',
      city: 'New Hyde Park',
      province_code: 'NY',
      zip: '11040',
      country_code: 'US',
      default: true
    }]
  };

  const res = await fetch(`${baseUrl}/customers.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ customer })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  console.log('✅ Customer created!');
  console.log('ID:', data.customer.id);
  console.log('Name:', data.customer.first_name, data.customer.last_name);
  console.log('Email:', data.customer.email);
  console.log('Admin URL:', `https://${storeUrl}/admin/customers/${data.customer.id}`);
}

main().catch(console.error);