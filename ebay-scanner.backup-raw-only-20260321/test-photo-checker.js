#!/usr/bin/env node
/**
 * Test Photo Quality Checker
 * Shows how listings are evaluated for condition and photo quality
 */

const PhotoQualityChecker = require('./photo-quality-checker');

const checker = new PhotoQualityChecker();

console.log('═══════════════════════════════════════════════════');
console.log('🔍 Photo Quality Checker - Test Examples');
console.log('═══════════════════════════════════════════════════\n');

// Test cases
const testListings = [
  {
    name: 'EXCELLENT LISTING',
    item: {
      title: 'Luka Doncic 2018 Prizm Rookie #280 RAW SHARP CORNERS Well Centered NM-MT',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: [
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg'
      ]
    }
  },
  {
    name: 'GOOD LISTING',
    item: {
      title: 'Michael Jordan 1986 Fleer Rookie #57 RAW Near Mint',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: [
        'https://example.com/2.jpg',
        'https://example.com/3.jpg'
      ]
    }
  },
  {
    name: 'SKIP - OFF CENTER',
    item: {
      title: 'Ken Griffey Jr 1989 Upper Deck Rookie RAW Off-Center',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: [
        'https://example.com/2.jpg'
      ]
    }
  },
  {
    name: 'SKIP - WHITE CORNERS',
    item: {
      title: 'Patrick Mahomes Rookie RAW white corners visible',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: []
    }
  },
  {
    name: 'SKIP - ONLY 1 PHOTO',
    item: {
      title: 'Tom Brady Rookie Card RAW Mint',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: []
    }
  },
  {
    name: 'REJECT - DAMAGED',
    item: {
      title: 'LeBron James Rookie RAW Crease on corner',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: [
        'https://example.com/2.jpg'
      ]
    }
  },
  {
    name: 'UNCERTAIN - NO INFO',
    item: {
      title: 'Cooper Flagg 2025 Prizm Rookie #145 RAW',
      imageUrl: 'https://example.com/1.jpg',
      additionalImages: [
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg'
      ]
    }
  }
];

// Test each listing
testListings.forEach((test, i) => {
  console.log(`${i + 1}. ${test.name}`);
  console.log(`   Title: ${test.item.title}\n`);

  const analysis = checker.analyzeListing(test.item);

  console.log(`   📸 PHOTO QUALITY:`);
  console.log(`   Score: ${analysis.photoQuality.photoQualityScore}/10`);
  console.log(`   Photos: ${analysis.photoQuality.photoCount}`);
  analysis.photoQuality.issues.forEach(issue => console.log(`   ${issue}`));

  console.log(`\n   🎴 CONDITION:`);
  console.log(`   Centering: ${analysis.condition.centering} (score: ${analysis.condition.centeringScore}/10)`);
  console.log(`   Corners: ${analysis.condition.corners} (score: ${analysis.condition.cornerScore}/10)`);
  console.log(`   Confidence: ${analysis.condition.confidence}`);
  analysis.condition.issues.forEach(issue => console.log(`   ${issue}`));

  console.log(`\n   ⭐ OVERALL:`);
  console.log(`   Passed: ${analysis.passed ? '✅ YES' : '❌ NO'}`);
  console.log(`   Quality Score: ${analysis.listingQualityScore}/10`);
  console.log(`   ${analysis.recommendation}`);

  console.log(`\n═══════════════════════════════════════════════════\n`);
});

console.log('\n📋 KEY RULES:\n');
console.log('✅ PASS: Good centering OR sharp corners + 2+ photos');
console.log('⚠️  SKIP: Only 1 photo, insufficient photos');
console.log('❌ REJECT: Off-center, white corners, damaged, creased');
console.log('📸 BONUS: 4+ photos, back shown, condition details\n');

console.log('🎯 PRIORITY: Centering & Corners (most important for grading)');
console.log('⚠️  SURFACE/EDGES: Not checked (too hard to see in photos)\n');
