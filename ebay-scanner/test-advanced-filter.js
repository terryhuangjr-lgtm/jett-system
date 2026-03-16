#!/usr/bin/env node
/**
 * Test Advanced Filter
 * Shows what gets filtered and why
 */

const AdvancedFilter = require('./advanced-filter');

const filter = new AdvancedFilter();

console.log('═══════════════════════════════════════════════════');
console.log('🔍 Advanced Filter - Test Cases');
console.log('═══════════════════════════════════════════════════\n');

const testCases = [
  // SHOULD PASS ✅
  {
    name: 'VALID: Single rookie card',
    item: { title: 'Luka Doncic 2018 Prizm Rookie #280 RAW' },
    shouldPass: true
  },
  {
    name: 'VALID: Single insert card',
    item: { title: 'Michael Jordan 1997 Finest Showstoppers #271 RAW' },
    shouldPass: true
  },
  {
    name: 'VALID: On-card auto (not sticker)',
    item: { title: 'Paul Skenes 2023 Bowman 1st Draft On-Card Auto' },
    shouldPass: true
  },

  // SHOULD REJECT ❌
  {
    name: 'REJECT: Lot of cards',
    item: { title: 'Michael Jordan Lot of 5 Cards RAW' },
    shouldPass: false
  },
  {
    name: 'REJECT: Near set',
    item: { title: '1993 Topps Basketball Near Set 29/30 Cards' },
    shouldPass: false
  },
  {
    name: 'REJECT: Sealed box',
    item: { title: '2023 Prizm Basketball Hobby Box Sealed' },
    shouldPass: false
  },
  {
    name: 'REJECT: Pack',
    item: { title: '1997 Topps Chrome Basketball Pack Sealed' },
    shouldPass: false
  },
  {
    name: 'REJECT: Reprint',
    item: { title: 'Michael Jordan 1986 Fleer Rookie Reprint' },
    shouldPass: false
  },
  {
    name: 'REJECT: Custom card',
    item: { title: 'LeBron James Custom Art Card ACEO' },
    shouldPass: false
  },
  {
    name: 'REJECT: Sticker',
    item: { title: 'Kobe Bryant Vintage Sticker' },
    shouldPass: false
  },
  {
    name: 'REJECT: Multiple cards (number)',
    item: { title: 'Michael Jordan 3 Card Lot RAW' },
    shouldPass: false
  },
  {
    name: 'REJECT: Collection',
    item: { title: 'LeBron James Collection 10+ Cards' },
    shouldPass: false
  },
  {
    name: 'REJECT: Bulk',
    item: { title: 'Bulk Basketball Cards 100+ Commons' },
    shouldPass: false
  },
  {
    name: 'REJECT: Poster',
    item: { title: 'Michael Jordan Poster 24x36' },
    shouldPass: false
  },
  {
    name: 'REJECT: Magazine',
    item: { title: 'Kobe Bryant Sports Illustrated Magazine' },
    shouldPass: false
  },

  // LISTING AGE TESTS
  {
    name: 'VALID: Fresh listing (2 days old)',
    item: {
      title: 'Luka Doncic 2018 Prizm Rookie RAW',
      itemCreationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    shouldPass: true
  },
  {
    name: 'REJECT: Old listing (45 days)',
    item: {
      title: 'Michael Jordan 1997 Finest Showstoppers RAW',
      itemCreationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    shouldPass: false
  },
  {
    name: 'VALID: Old listing but price reduced',
    item: {
      title: 'Ken Griffey Jr 1989 Upper Deck Rookie RAW',
      itemCreationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      priceReduced: true
    },
    shouldPass: true
  }
];

let passedCount = 0;
let failedCount = 0;

testCases.forEach((test, i) => {
  const result = filter.filter(test.item);
  const correct = result.passed === test.shouldPass;

  console.log(`${i + 1}. ${test.name}`);
  console.log(`   Title: "${test.item.title}"`);
  console.log(`   Result: ${result.passed ? '✅ PASSED' : '❌ REJECTED'}`);
  if (!result.passed) {
    console.log(`   Reason: ${result.reason}`);
  }
  console.log(`   Test: ${correct ? '✓ CORRECT' : '✗ WRONG'}\n`);

  if (correct) passedCount++;
  else failedCount++;
});

console.log('═══════════════════════════════════════════════════');
console.log('📊 TEST RESULTS');
console.log('═══════════════════════════════════════════════════\n');
console.log(`✅ Correct: ${passedCount}/${testCases.length}`);
console.log(`❌ Wrong: ${failedCount}/${testCases.length}\n`);

console.log('📋 PERMANENT FILTER RULES:\n');
console.log('1. ✅ SINGLES ONLY - No lots, boxes, packs');
console.log('2. ❌ NO REPRINTS - Only original cards');
console.log('3. ❌ NO CUSTOMS - No fan-made cards');
console.log('4. ❌ NO STICKERS - No sticker cards (sticker autos OK)');
console.log('5. ❌ NO SEALED - No boxes, packs, or sealed products');
console.log('6. ❌ NO NON-CARDS - No posters, magazines, photos');
console.log('7. ⏰ FRESH ONLY - Listed within last 7 days (or price reduced)\n');

console.log('🎯 These rules are PERMANENT and applied to ALL searches.\n');
console.log('💡 LISTING AGE LOGIC:');
console.log('   ❌ Listed 30+ days ago = Red flag (why still available?)');
console.log('   ✅ Listed within 7 days = Fresh opportunity');
console.log('   ✅ Price reduced = Renewed interest, OK even if old\n');
