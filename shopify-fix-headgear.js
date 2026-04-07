require('dotenv').config({ path: require('os').homedir() + '/.env' });
const s = require('./lib/shopify-helper');
const LOCATION_ID = parseInt(process.env.SHOPIFY_LOCATION_ID);

(async () => {
  try {
    const keyword = 'one series leather headgear';
    const products = await s.searchProducts(keyword);
    if (!products.length) {
      console.log(`❌ No products: "${keyword}"`);
      return;
    }
    const product = products[0];
    console.log(`📦 "${product.title}" (ID: ${product.id})`);

    // Step 1: Enable tracking on variants
    console.log('\n🔧 Enabling inventory tracking...');
    for (const variant of product.variants) {
      await s.updateVariant(variant.id, {
        inventory_policy: 'deny',
        inventory_management: 'shopify'
      });
    }
    console.log('✅ Tracking enabled on all variants.');

    // Step 2: Add 5 units
    console.log('\n➕ Adding 5 stock...');
    let added = 0;
    for (const variant of product.variants) {
      await s.adjustInventory(variant.inventory_item_id, LOCATION_ID, 5);
      added++;
      console.log(`  +5 ${variant.option1} / ${variant.option2}`);
    }
    console.log(`\n✅ Added +5 to ${added} variants. All tracked!`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
