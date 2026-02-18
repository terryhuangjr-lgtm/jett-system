/**
 * Test Year Range Support in Smart Query Parser
 */

const SmartQueryParser = require('./smart-query-parser');

const parser = new SmartQueryParser();

console.log('========================================');
console.log('YEAR RANGE TESTS');
console.log('========================================\n');

// Test cases
const testQueries = [
  // Year ranges only
  'jordan 1990-1994',
  'kobe between 2000 and 2003',
  'lebron 2003 to 2006',

  // Year ranges with card types
  'jordan 1990-1992 refractors',
  'wade 2003-2005 autos and numbered',
  'kobe 1996-1998 rookies, refractors, and autos',

  // No year ranges (existing functionality)
  '2003 wade refractors and autos',
  'jordan chrome',

  // Edge cases
  'jordan 1990-1990',  // Single year range
  'jordan 1995-1990',  // Invalid (backwards)
  'jordan 1890-1900',  // Out of valid range
];

testQueries.forEach(query => {
  console.log(`Query: "${query}"`);
  console.log('─'.repeat(60));

  const result = parser.explain(query);

  console.log(`Base: "${result.baseQuery}"`);

  if (result.yearRange) {
    console.log(`Year Range: ${result.yearRange.start}-${result.yearRange.end}`);
    console.log(`Years: ${result.yearRange.years.join(', ')}`);
  }

  if (result.detectedTypes.length > 0) {
    console.log(`Card Types: ${result.detectedTypes.join(', ')}`);
  }

  console.log(`\nResult: ${result.searchCount} searches`);
  console.log(`Explanation: ${result.explanation}\n`);

  if (result.searches.length <= 10) {
    result.searches.forEach((search, i) => {
      console.log(`  ${i + 1}. "${search}"`);
    });
  } else {
    result.searches.slice(0, 5).forEach((search, i) => {
      console.log(`  ${i + 1}. "${search}"`);
    });
    console.log(`  ... (${result.searches.length - 10} more)`);
    result.searches.slice(-5).forEach((search, i) => {
      console.log(`  ${result.searches.length - 5 + i + 1}. "${search}"`);
    });
  }

  console.log('\n========================================\n');
});

// Performance test
console.log('PERFORMANCE TEST');
console.log('─'.repeat(60));

const bigRangeQuery = 'jordan 1984-2003 refractors, autos, and numbered';
console.log(`Query: "${bigRangeQuery}"`);

const bigResult = parser.explain(bigRangeQuery);
console.log(`\nResult: ${bigResult.searchCount} searches`);
console.log(`Explanation: ${bigResult.explanation}`);
console.log(`\nFirst 5 searches:`);
bigResult.searches.slice(0, 5).forEach((search, i) => {
  console.log(`  ${i + 1}. "${search}"`);
});
console.log(`\nLast 5 searches:`);
bigResult.searches.slice(-5).forEach((search, i) => {
  console.log(`  ${bigResult.searches.length - 5 + i + 1}. "${search}"`);
});

console.log('\n========================================');
console.log('TESTS COMPLETE');
console.log('========================================');
