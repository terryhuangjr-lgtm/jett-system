#!/usr/bin/env node
/**
 * Scored Search - RAW CARDS ONLY
 * Wrapper around scored-search.js that filters out graded cards
 */

const RawCardsFilter = require('./raw-cards-filter');
const scoredSearch = require('./scored-search');

// Override the main function
const originalSearch = scoredSearch;

async function scoredSearchRawOnly(config) {
  const rawFilter = new RawCardsFilter();
  
  console.log('🎯 RAW CARDS ONLY MODE - Filtering out graded cards...\n');
  
  // Add PSA/BGS/graded to exclude keywords
  const enhancedConfig = {
    ...config,
    excludeKeywords: [
      ...(config?.excludeKeywords || []),
      'PSA', 'BGS', 'SGC', 'CGC', 'graded', 'slabbed'
    ]
  };
  
  // Run the search with enhanced exclusions
  return await originalSearch(enhancedConfig);
}

// If called directly, run with command line args
if (require.main === module) {
  const keywords = process.argv.slice(2).join(' ') || 'dirk nowitzki refractor';
  
  scoredSearchRawOnly({
    keywords,
    minScoreToShow: 5.0,
    topN: 10
  }).catch(console.error);
}

module.exports = scoredSearchRawOnly;
