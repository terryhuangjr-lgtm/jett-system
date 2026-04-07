require('dotenv').config({ path: require('os').homedir() + '/.env' });

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;

if (!STORE || !TOKEN) {
  console.error('❌ SHOPIFY_STORE or SHOPIFY_TOKEN missing');
  process.exit(1);
}

async function updateCosts() {
  // List products
  const productsRes = await fetch(`https://${STORE}/admin/api/2024-04/products.json?limit=50&title=Finisher`, {
    headers: {
      'X-Shopify-Access-Token': TOKEN
    }
  });
  const productsData = await productsRes.json();
  const product = productsData.products.find(p => p.title.includes('Finisher Hoodie'));
  if (!product) {
    console.error('❌ No Superare Finisher Hoodie');
    return;
  }

  console.log(`Product ID: ${product.id} (${product.title})`);

  let updated = 0;
  for (const variant of product.variants) {
    const patchRes = await fetch(`https://${STORE}/admin/api/2024-04/products/${product.id}/variants/${variant.id}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN
      },
      body: JSON.stringify({
        variant: {
          id: variant.id,
          cost: '18.50'
        }
      })
    });

    if (patchRes.ok) {
      const patchData = await patchRes.json();
      console.log(`✅ ${patchData.variant.option1} / ${patchData.variant.option2 || patchData.variant.option3}: $${patchData.variant.cost}`);
      updated++;
    } else {
      console.error(`❌ Variant ${variant.id}: ${patchRes.status}`);
    }
  }

  console.log(`✅ Total updated: ${updated}/${product.variants.length}`);
}

updateCosts().catch(console.error);