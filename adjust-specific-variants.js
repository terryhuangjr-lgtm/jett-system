require('dotenv').config({ path: '/home/clawd/.env', override: true });

const s = require('./lib/shopify-helper.js');
const LOCATION_ID = parseInt(process.env.SHOPIFY_LOCATION_ID || '85513961637');

(async () => {
  try {
    // Find Finisher Hoodie Black XL
    const hoodieProducts = await s.searchProducts('finisher hoodie');
    const hoodieProduct = hoodieProducts.find(p => p.title.includes('Finisher Hoodie'));
    if (!hoodieProduct) throw new Error('Finisher Hoodie not found');
    const blackXLVariant = hoodieProduct.variants.find(v => v.title.toLowerCase().includes('black') && v.title.toLowerCase().includes('xl'));
    if (!blackXLVariant) throw new Error('Black XL variant not found');
    await s.adjustInventory(blackXLVariant.inventory_item_id, LOCATION_ID, -1);
    console.log(`✅ Finisher Hoodie Black XL: -1 (now ${blackXLVariant.inventory_quantity - 1})`);

    // Find Supergel Pro Gloves White 16 oz
    const supergelProducts = await s.searchProducts('supergel pro');
    const supergelProduct = supergelProducts.find(p => p.title.includes('Supergel Pro Gloves'));
    if (!supergelProduct) throw new Error('Supergel Pro Gloves not found');
    const white16Variant = supergelProduct.variants.find(v => v.title.toLowerCase().includes('white') && v.title.includes('16 oz'));
    if (!white16Variant) throw new Error('White 16 oz variant not found');
    await s.adjustInventory(white16Variant.inventory_item_id, LOCATION_ID, -1);
    console.log(`✅ Supergel Pro Gloves White 16 oz: -1 (now ${white16Variant.inventory_quantity - 1})`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
