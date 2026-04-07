require('dotenv').config({ path: require('os').homedir() + '/.env' });

const helper = require('./lib/shopify-helper.js');

(async () => {
  try {
    const products = await helper.searchProducts('Legacy Tee');
    if (!products.length) {
      console.log('No Legacy Tee found');
      return;
    }
    const product = products[0];
    console.log(`Updating ${product.title} variants...`);

    const updates = [];
    for (const variant of product.variants) {
      const sizeMatch = variant.title.match(/([SMLXLXXL3XL]+)/i);
      const size = sizeMatch ? sizeMatch[1].toUpperCase() : '';
      const cost = ['XL', 'XXL', '3XL'].includes(size) ? '10.50' : '9.80';
      const result = await helper.updateVariant(variant.id, { cost_per_item: cost });
      updates.push(`${variant.title}: $${cost}`);
      console.log(`✅ ${variant.title}: cost $${cost}`);
    }
    console.log('\\nUpdated:', updates.join('\\n'));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
