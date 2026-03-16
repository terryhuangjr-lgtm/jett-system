const RawCardFilter = require('./raw-card-filter');

const filter = new RawCardFilter();

const testItems = [
  {
    title: '1997-98 Topps Chrome - Kobe Bryant #171 Refractor',
    condition: 'Ungraded',
    sellerPositivePercent: 99.5,
    imageCount: 1
  },
  {
    title: '2002 Topps Chrome Kobe Bryant Refractor',
    condition: 'Ungraded',
    sellerPositivePercent: 100,
    imageCount: 1
  }
];

console.log('\nTesting raw card filter:\n');
testItems.forEach((item, i) => {
  const isRaw = filter.isRawCard(item);
  const passesQuality = filter.passesQualityRules(item);
  console.log(`${i+1}. "${item.title}"`);
  console.log(`   Condition: ${item.condition}`);
  console.log(`   Is Raw: ${isRaw}`);
  console.log(`   Passes Quality: ${passesQuality}`);
  console.log(`   RESULT: ${isRaw && passesQuality ? 'PASS ✓' : 'FAIL ✗'}\n`);
});

console.log('Exclude keywords:', filter.excludeKeywords);
console.log('Quality rules:', filter.qualityRules);
