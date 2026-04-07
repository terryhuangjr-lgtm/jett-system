require('dotenv').config({ path: require('os').homedir() + '/.env' });
const s = require('./lib/shopify-helper');
const LOCATION_ID = parseInt(process.env.SHOPIFY_LOCATION_ID || '1');  // Fallback

(async () => {
  try {
    const keyword = 'one series leather headgear';
    const products = await s.searchProducts(keyword);
    if (!products.length) {
      console.log(`❌ No products found: "${keyword}"`);
      return;
    }
    const product = products[0];
    console.log(`📦 Updating "${product.title}" (ID: ${product.id})`);

    let updated = 0;
    let errors = [];

    // Ensure tracking (inventory_policy: 'deny')
    for (const variant of product.variants) {
      try {
        await s.api('PUT', `/variants/${variant.id}.json`, {
          variant: {
            id: variant.id,
            inventory_policy: 'deny',  // Track stock
            inventory_management: 'shopify'
          }
        });
      } catch (err) {
        errors.push(`Track ${variant.title}: ${err.message}`);
      }
    }

    // Add 5 units each
    for (const variant of product.variants) {
      try {
        await s.adjustInventory(variant.inventory_item_id, LOCATION_ID, 5);
        updated++;
      } catch (err) {
        errors.push(`+5 ${variant.title}: ${err.message}`);
      }
    }

    console.log(`\n✅ Set tracking on all variants. Added +5 stock to ${updated}/${product.variants.length} variants.`);
    if (errors.length) console.log('Errors:', errors.join('\n'));
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
