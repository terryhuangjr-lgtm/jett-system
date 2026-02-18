#!/usr/bin/env node
/**
 * Example: Using Year Range Searches
 *
 * Demonstrates how the enhanced SmartQueryParser automatically splits
 * year ranges into individual searches for better eBay results.
 */

const SmartQueryParser = require('./smart-query-parser');

const parser = new SmartQueryParser();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  YEAR RANGE SEARCH EXAMPLES');
console.log('═══════════════════════════════════════════════════════════\n');

// Example queries showing the power of year ranges
const examples = [
  {
    title: 'Simple Year Range',
    query: 'jordan 1990-1994',
    note: 'Searches each year individually for better results'
  },
  {
    title: 'Year Range + Single Card Type',
    query: 'kobe 1996-2000 refractors',
    note: 'Combines year expansion with card type filtering'
  },
  {
    title: 'Year Range + Multiple Card Types',
    query: 'wade 2003-2005 autos and numbered',
    note: 'Creates all combinations: 3 years × 2 types = 6 searches'
  },
  {
    title: 'Complex Multi-Search',
    query: 'lebron 2003-2006 rookies, refractors, and autos',
    note: 'Maximum splitting: 4 years × 3 types = 12 searches'
  },
  {
    title: 'Alternative Syntax: "between...and"',
    query: 'jordan between 1991 and 1993 chrome',
    note: 'Supports natural language syntax'
  },
  {
    title: 'Alternative Syntax: "to"',
    query: 'shaq 1992 to 1994 rookies',
    note: 'Another natural way to express ranges'
  }
];

examples.forEach((example, index) => {
  console.log(`${index + 1}. ${example.title}`);
  console.log('─'.repeat(63));
  console.log(`Query: "${example.query}"`);

  const result = parser.explain(example.query);

  console.log(`\n   ${result.explanation}`);

  if (result.yearRange) {
    console.log(`   Years: ${result.yearRange.years.join(', ')}`);
  }

  if (result.detectedTypes.length > 0) {
    console.log(`   Card Types: ${result.detectedTypes.join(', ')}`);
  }

  console.log(`\n   Searches (${result.searchCount}):`);
  result.searches.forEach((search, i) => {
    console.log(`   ${i + 1}. "${search}"`);
  });

  console.log(`\n   💡 ${example.note}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('  HOW TO USE WITH MULTI-SEARCH');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Run any of these queries with multi-search.js:\n');
console.log('  node multi-search.js "jordan 1990-1994"');
console.log('  node multi-search.js "wade 2003-2005 autos and numbered"');
console.log('  node multi-search.js "kobe between 1996 and 2000 refractors"\n');

console.log('The SmartQueryParser automatically:');
console.log('  ✓ Detects year ranges (1990-1994, between X and Y, X to Y)');
console.log('  ✓ Expands into individual years');
console.log('  ✓ Combines with card type splitting');
console.log('  ✓ Deduplicates results across all searches');
console.log('  ✓ Scores and ranks deals\n');

console.log('═══════════════════════════════════════════════════════════\n');
