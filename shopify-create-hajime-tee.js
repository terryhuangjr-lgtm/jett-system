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
    const productData = {
      product: {
        title: "Hajime No Ippo - Rounds Tee Black",
        status: "draft",
        vendor: "Superare",
        product_type: "Apparel",
        tags: "Hajime No Ippo, Anime, Boxing, Tee, Black",
        options: [
          {
            name: "Size",
            position: 1
          }
        ],
        variants: [
          {
            option1: "S",
            cost_per_item: "8.50",
            sku: "IPPO-TEE-BLK-S"
          },
          {
            option1: "M",
            cost_per_item: "8.50",
            sku: "IPPO-TEE-BLK-M"
          },
          {
            option1: "L",
            cost_per_item: "8.50",
            sku: "IPPO-TEE-BLK-L"
          },
          {
            option1: "XL",
            cost_per_item: "9.50",
            sku: "IPPO-TEE-BLK-XL"
          },
          {
            option1: "XXL",
            cost_per_item: "9.50",
            sku: "IPPO-TEE-BLK-XXL"
          },
          {
            option1: "3XL",
            cost_per_item: "9.50",
            sku: "IPPO-TEE-BLK-3XL"
          }
        ]
      }
    };

    const result = await api('POST', '/products.json', productData);
    console.log("✅ Product created as draft:");
    console.log(`ID: ${result.product.id}`);
    console.log(`Handle: ${result.product.handle}`);
    console.log(`Admin URL: https://${STORE}/admin/products/${result.product.id}`);
    console.log("Variants created with cost_prices and SKUs set.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
