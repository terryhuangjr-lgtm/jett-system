#!/usr/bin/env node
/**
 * Test Smart Filters - Seller Reputation & Price Bands
 * Shows how advanced filtering eliminates sketchy listings
 */

const DealScorer = require('./deal-scorer-v2');

const scorer = new DealScorer();

console.log('═══════════════════════════════════════════════════');
console.log('🧠 Smart Filters - Seller Reputation & Price Bands');
console.log('═══════════════════════════════════════════════════\n');

// Test cases for price band filtering
const testCases = [
  {
    name: '🚫 REJECT: Too cheap (20% of market = damaged/fake)',
    item: {
      title: 'Michael Jordan 1997 Finest Showstoppers #271',
      totalPrice: 100,
      sellerPositivePercent: 99.5,
      sellerFeedbackScore: 1000,
      shippingCost: 0
    },
    profitAnalysis: {
      insufficientData: false,
      psa10Scenario: { avgCompPrice: 500 }, // Listed at $100, market is $500 = 20%
      expectedValue: 300,
      roi: 300
    },
    expected: 'REJECT'
  },
  {
    name: '✅ PERFECT: Sweet spot (55% of market)',
    item: {
      title: 'Luka Doncic 2018 Prizm Rookie #280',
      totalPrice: 275,
      sellerPositivePercent: 99.8,
      sellerFeedbackScore: 2000,
      sellerTopRated: true,
      shippingCost: 0,
      returnsAccepted: true
    },
    profitAnalysis: {
      insufficientData: false,
      psa10Scenario: { avgCompPrice: 500 }, // Listed at $275, market is $500 = 55%
      expectedValue: 150,
      roi: 50
    },
    expected: 'HOT DEAL'
  },
  {
    name: '⚠️  MARGINAL: Too expensive (75% of market)',
    item: {
      title: 'Ken Griffey Jr 1989 Upper Deck Rookie',
      totalPrice: 375,
      sellerPositivePercent: 99.0,
      sellerFeedbackScore: 600
    },
    profitAnalysis: {
      insufficientData: false,
      psa10Scenario: { avgCompPrice: 500 }, // Listed at $375, market is $500 = 75%
      expectedValue: 50,
      roi: 10
    },
    expected: 'LOW SCORE'
  },
  {
    name: '✅ GOOD: Good price band (45% of market)',
    item: {
      title: 'Cooper Flagg 2025 Prizm Rookie',
      totalPrice: 225,
      sellerPositivePercent: 99.5,
      sellerFeedbackScore: 1500,
      shippingCost: 0
    },
    profitAnalysis: {
      insufficientData: false,
      psa10Scenario: { avgCompPrice: 500 }, // Listed at $225, market is $500 = 45%
      expectedValue: 200,
      roi: 80
    },
    expected: 'GOOD DEAL'
  },
  {
    name: '🚫 REJECT: Sketchy seller (98.5%, only 200 transactions)',
    item: {
      title: 'Patrick Mahomes Rookie Auto',
      totalPrice: 250,
      sellerPositivePercent: 98.5, // Below 99% threshold
      sellerFeedbackScore: 200,    // Below 500 threshold
      shippingCost: 15
    },
    profitAnalysis: {
      insufficientData: false,
      psa10Scenario: { avgCompPrice: 500 },
      expectedValue: 150,
      roi: 60
    },
    expected: 'REJECTED BY FILTER'
  }
];

testCases.forEach((test, i) => {
  console.log(`${i + 1}. ${test.name}\n`);
  console.log(`   Item: ${test.item.title}`);
  console.log(`   Price: $${test.item.totalPrice}`);

  if (test.profitAnalysis && !test.profitAnalysis.insufficientData) {
    const marketValue = test.profitAnalysis.psa10Scenario.avgCompPrice;
    const priceRatio = (test.item.totalPrice / marketValue * 100).toFixed(0);
    console.log(`   Market Value: $${marketValue}`);
    console.log(`   Price Ratio: ${priceRatio}% of market`);
  }

  console.log(`\n   Seller:`);
  console.log(`   - Feedback: ${test.item.sellerPositivePercent}%`);
  console.log(`   - Transactions: ${test.item.sellerFeedbackScore}`);
  if (test.item.sellerTopRated) console.log(`   - Top Rated: Yes ⭐`);
  console.log(`   - Shipping: $${test.item.shippingCost || 0}`);
  if (test.item.returnsAccepted) console.log(`   - Returns: Accepted ✓`);

  const dealScore = scorer.score(test.item, test.profitAnalysis);

  console.log(`\n   Result:`);
  console.log(`   Score: ${dealScore.score}/10`);
  console.log(`   Rating: ${dealScore.rating}`);
  console.log(`\n   Breakdown:`);
  dealScore.breakdown.forEach(b => console.log(`   ${b}`));

  console.log(`\n   Expected: ${test.expected}`);
  console.log(`\n═══════════════════════════════════════════════════\n`);
});

console.log('📋 SELLER REPUTATION REQUIREMENTS (PERMANENT):\n');
console.log('✅ 99%+ feedback (not 98%)');
console.log('✅ 500+ transactions minimum');
console.log('✅ Top Rated Seller badge (bonus)');
console.log('✅ Free/Fast shipping (bonus)');
console.log('✅ Returns accepted 30 days+ (bonus)\n');

console.log('📊 PRICE BAND FILTERING (PERMANENT):\n');
console.log('🚫 < 40% of market = REJECT (too cheap = damaged/fake)');
console.log('🎯 40-70% of market = ALERT (real deal potential)');
console.log('⭐ 50-65% of market = SWEET SPOT (perfect!)');
console.log('⚠️  > 70% of market = LOW SCORE (not enough margin)\n');

console.log('💡 WHY THIS MATTERS:\n');
console.log('- $500 card at $100 (20%) = Something is WRONG');
console.log('- $500 card at $275 (55%) = Legitimate opportunity ✓');
console.log('- $500 card at $375 (75%) = Not enough profit margin\n');

console.log('🎯 ELIMINATES:');
console.log('- Damaged cards hiding behind low prices');
console.log('- Fake/counterfeit cards');
console.log('- Scam sellers with poor reputation');
console.log('- Overpriced cards with low margins\n');
