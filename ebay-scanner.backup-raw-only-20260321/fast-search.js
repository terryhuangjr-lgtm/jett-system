#!/usr/bin/env node
/**
 * Fast Search - No comp lookups, instant results
 * Scores based on seller + listing quality only
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const SimpleScorer = require('./simple-scorer');
const RawCardFilter = require('./raw-card-filter');
const fs = require('fs');
const path = require('path');

async function fastSearch(searchConfig) {
  const client = new EbayBrowseAPI();
  const scorer = new SimpleScorer();
  const rawFilter = new RawCardFilter();
  const startTime = Date.now();

  const {
    keywords = '',
    categoryId = '212',
    minPrice = 10,
    maxPrice = 500,
    rawOnly = true,
    minScoreToShow = 6.0,
    topN = 30
  } = searchConfig || {};

  try {
    console.log(`\nSearching eBay for: ${keywords}`);

    // Search
    const items = await client.search({
      keywords,
      categoryId,
      minPrice,
      maxPrice,
      sortOrder: 'PricePlusShippingLowest',
      limit: 200
    });

    console.log(`Found: ${items.length} listings`);
    
    // Filter to raw cards
    let filteredItems = items;
    if (rawOnly) {
      console.log('Filtering to raw cards only...');
      filteredItems = rawFilter.filterRawOnly(items);
      console.log(`${items.length} total → ${filteredItems.length} raw (${Math.round(filteredItems.length/items.length*100)}%)`);
    }

    // Score all items (FAST - no API calls)
    console.log(`Scoring ${filteredItems.length} listings...`);
    const scoredItems = filteredItems.map(item => {
      const score = scorer.score(item);
      return {
        ...item,
        score: score.totalScore,
        scoreBreakdown: score.breakdown,
        rating: score.rating
      };
    });

    // Sort by score
    scoredItems.sort((a, b) => b.score - a.score);

    // Filter by min score
    const topResults = scoredItems.filter(item => item.score >= minScoreToShow);
    const displayResults = topResults.slice(0, topN);

    console.log(`Scored ${scoredItems.length} listings`);
    console.log(`Showing ${displayResults.length} with score >= ${minScoreToShow}\n`);

    // Display results
    displayResults.forEach((item, i) => {
      console.log(`\n${i + 1}. [${item.score}/10 - ${item.rating.replace(/[🔥✓~❌]/g, '').trim()}]`);
      console.log(`   ${item.title}`);
      console.log(`   Price: $${item.totalPrice}`);
      console.log('\n   SCORE BREAKDOWN:');
      
      // Seller
      console.log(`   - Seller: ${item.scoreBreakdown.seller.score}/10 pts`);
      item.scoreBreakdown.seller.notes.forEach(note => {
        console.log(`     ${note}`);
      });

      // Listing
      console.log(`   - Listing: ${item.scoreBreakdown.listing.score}/10 pts`);
      item.scoreBreakdown.listing.signals.forEach(signal => {
        console.log(`     ${signal}`);
      });

      // Price
      console.log(`   - Price: ${item.scoreBreakdown.price.score}/10 pts`);
      console.log(`     ${item.scoreBreakdown.price.note}`);

      console.log(`\n   URL: ${item.viewItemURL}`);
      console.log('   ' + '-'.repeat(75));
    });

    console.log('\n' + '='.repeat(80));

    // Save results
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    const outputFile = path.join(__dirname, 'results', 
      `${keywords.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`
    );

    const output = {
      timestamp: new Date().toISOString(),
      searchQuery: keywords,
      config: searchConfig,
      scanDuration,
      summary: {
        totalFound: items.length,
        rawCardsOnly: rawOnly,
        afterRawFilter: filteredItems.length,
        totalScored: scoredItems.length,
        showingResults: displayResults.length
      },
      allResults: scoredItems
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\nFull results saved: ${outputFile}`);

    return {
      success: true,
      results: displayResults,
      all: scoredItems
    };

  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// CLI usage
if (require.main === module) {
  const keywords = process.argv.slice(2).join(' ') || 'test search';
  
  fastSearch({
    keywords,
    categoryId: '212',
    minPrice: 10,
    maxPrice: 500,
    rawOnly: true,
    minScoreToShow: 6.0,
    topN: 30
  })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = fastSearch;
