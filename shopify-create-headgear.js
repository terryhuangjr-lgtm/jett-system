require('dotenv').config({ path: require('os').homedir() + '/.env' });
const fetch = require('node-fetch');

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
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
};

(async () => {
  try {
    const colors = ['Black', 'White'];
    const sizes = ['S', 'M', 'L', 'XL'];

    const variants = [];
    for (const color of colors) {
      for (const size of sizes) {
        variants.push({
          option1: color,
          option2: size,
          price: "99.99",
          cost_per_item: "24.99",
          sku: `ONESERIES-HG-${color[0]}-${size}`
        });
      }
    }

    const productData = {
      product: {
        title: "One Series Leather Headgear",
        status: "draft",
        vendor: "Superare",
        product_type: "Gear",
        tags: "Headgear, Leather, Boxing, One Series, Black, White",
        options: [
          {
            name: "Color",
            position: 1
          },
          {
            name: "Size",
            position: 2
          }
        ],
        variants: variants
      }
    };

    const result = await api('POST', '/products.json', productData);
    console.log("✅ Product created as draft:");
    console.log(`ID: ${result.product.id}`);
    console.log(`Handle: ${result.product.handle}`);
    console.log(`Admin URL: https://${STORE}/admin/products/${result.product.id}`);
    console.log(`Variants: ${variants.length} (all @ $99.99 price / $24.99 cost)`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
