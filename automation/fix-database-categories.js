#!/usr/bin/env node
/**
 * Fix Database Categories
 *
 * Updates incorrectly categorized Bitcoin content from '21m-sports' to proper categories
 */

const db = require('./db-bridge.js');

console.log('\n🔧 Fixing database categories...\n');

try {
  const allContent = db.getDraftContent(100);

  let fixed = 0;

  allContent.forEach(item => {
    // If it's in 21m-sports category but topic contains "Bitcoin"
    if (item.category === '21m-sports' && item.topic.includes('Bitcoin')) {
      let newCategory;

      if (item.topic.includes('Bitcoin Quote')) {
        newCategory = 'bitcoin_quotes';
      } else if (item.topic.includes('Bitcoin History')) {
        newCategory = 'bitcoin_history';
      } else {
        newCategory = 'bitcoin';
      }

      console.log(`Fixing: "${item.topic.substring(0, 60)}..."`);
      console.log(`  ${item.category} → ${newCategory}`);

      // Update category in database
      db.updateContentCategory(item.id, newCategory);
      fixed++;
    }
  });

  console.log(`\n✅ Fixed ${fixed} entries\n`);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
