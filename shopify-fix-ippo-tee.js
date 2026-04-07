require('dotenv').config({ path: require('os').homedir() + '/.env' });
const s = require('./lib/shopify-helper');
const LOCATION_ID = parseInt(process.env.SHOPIFY_LOCATION_ID);

(async () => {
  try {
    const keyword = 'hajime';
    const products = await s.searchProducts(keyword);
    if (!products.length) {
      console.log(`❌ No products: "${keyword}"`);
      return;
    }
    const product = products[0];
    console.log(`📦 "${product.title}" (ID: ${product.id})`);

    // Step 1: Enable tracking
    console.log('\n🔧 Enabling tracking...');
    for (const variant of product.variants) {
      await s.updateVariant(variant.id, {
        inventory_policy: 'deny',
        inventory_management: 'shopify'
      });
    }
    console.log('✅ Tracking enabled.');

    // Step 2: Add 10 units
    console.log('\n➕ Adding 10 stock...');
    let added = 0;
    for (const variant of product.variants) {
      await s.adjustInventory(variant.inventory_item_id, LOCATION_ID, 10);
      added++;
      console.log(`  +10 ${variant.option1}`);
    }
    console.log(`\n✅ Added +10 to ${added} variants. All tracked!`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
