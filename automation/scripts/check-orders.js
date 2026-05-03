require('dotenv').config();

const headers = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
  'Content-Type': 'application/json'
};
const shopDomain = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';

async function main() {
  const countRes = await fetch('https://' + shopDomain + '/admin/api/2024-01/orders/count.json?status=any', { headers });
  const countData = await countRes.json();
  console.log('Total orders:', countData.count);

  const lastRes = await fetch('https://' + shopDomain + '/admin/api/2024-01/orders.json?status=any&limit=1&order=created_at+desc', { headers });
  const lastOrders = (await lastRes.json()).orders || [];
  console.log('Newest:', lastOrders[0]?.created_at?.split('T')[0]);

  const firstRes = await fetch('https://' + shopDomain + '/admin/api/2024-01/orders.json?status=any&limit=1&order=created_at+asc', { headers });
  const firstOrders = (await firstRes.json()).orders || [];
  console.log('Oldest:', firstOrders[0]?.created_at?.split('T')[0]);
}
main().catch(e => console.error('Error:', e.message));
