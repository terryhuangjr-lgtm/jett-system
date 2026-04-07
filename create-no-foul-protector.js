require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}`;
const headers = { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' };

const colors = ['Black', 'White', 'Red'];
const sizes = ['S', 'M', 'L', 'XL'];

const variants = [];
colors.forEach(color => {
  sizes.forEach(size => {
    variants.push({
      option1: color,
      option2: size,
      price: '119.99',
      cost_per_item: '29.99',
      sku: `NOFOUL-${color[0]}-${size.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      inventory_quantity: 3,
      taxable: true,
      requires_shipping: true
    });
  });
});

async function main() {
  const product = {
    title: 'One Series No Foul Protector',
    body_html: '<p>Premium no-foul protector for ultimate protection.</p>',
    vendor: 'Superare',
    product_type: 'Protector',
    status: 'draft',
    options: [
      { name: 'Color', position: 1 },
      { name: 'Size', position: 2 }
    ],
    variants,
    tags: 'no-foul, protector, one series'
  };

  const res = await fetch(`${baseUrl}/products.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  const p = data.product;
  console.log('✅ Product created (draft)!');
  console.log('Title:', p.title);
  console.log('ID:', p.id);
  console.log('Handle:', p.handle);
  console.log('Admin:', `https://${storeUrl}/admin/products/${p.id}`);
  console.log('Variants:', p.variants.length, 'with 3 qty each (tracked)');
}

main().catch(console.error);