#!/usr/bin/env node
/**
 * Multi-Search - Handles complex queries with multiple card types
 * Runs separate optimized searches and combines results
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const DealScorerV2 = require('./deal-scorer-v2');
const RawCardFilter = require('./raw-card-filter');
const SmartQueryParser = require('./smart-query-parser');
const fs = require('fs');
const path = require('path');

async function multiSearch(searchConfig) {
  const client = new EbayBrowseAPI();
  const rawFilter = new RawCardFilter();
  const queryParser = new SmartQueryParser();
  const startTime = Date.now();

  const {
    keywords = '',
    categoryId = '212',
    minPrice = 0,  // Catch early auctions starting at $0.99
    maxPrice = null,  // No cap on raw cards
    excludeKeywords = '',
    rawOnly = true,
    minScoreToShow = 7.0,
    topN = 20
  } = searchConfig || {};

  try {
    console.log(`\n🔍 Parsing query: "${keywords}"\n`);

    // Parse query into multiple searches
    const parsed = queryParser.explain(keywords);

    console.log(`Strategy: ${parsed.explanation}`);
    if (parsed.isComplex) {
      console.log(`Base: ${parsed.baseQuery}`);
      console.log(`Types: ${parsed.detectedTypes.join(', ')}`);
      console.log(`Will run ${parsed.searchCount} separate searches\n`);
    } else {
      console.log('Single search - no splitting needed\n');
    }

    // Run all searches
    const allItems = [];
    const searchResults = [];

    for (let i = 0; i < parsed.searches.length; i++) {
      const searchQuery = parsed.searches[i];
      console.log(`Search ${i + 1}/${parsed.searches.length}: "${searchQuery}"`);

      const items = await client.search({
        keywords: searchQuery,
        categoryId,
        minPrice,
        maxPrice,
        excludeKeywords,
        sortOrder: 'PricePlusShippingLowest',
        limit: 200
      });

      console.log(`  Found: ${items.length} listings`);

      searchResults.push({
        query: searchQuery,
        count: items.length
      });

      allItems.push(...items);
    }

    console.log(`\nTotal listings: ${allItems.length}`);

    // Deduplicate by item ID
    const uniqueItems = deduplicateItems(allItems);
    console.log(`After deduplication: ${uniqueItems.length} unique listings`);

    // Filter to raw cards only
    let filteredItems = uniqueItems;
    if (rawOnly) {
      filteredItems = rawFilter.filterRawOnly(uniqueItems);
      console.log(`After raw filter: ${filteredItems.length} raw cards`);
    }

    console.log(`\nScoring ${filteredItems.length} listings...`);

    // Create scorer with ORIGINAL query for relevance matching
    const scorer = new DealScorerV2(keywords);

    // Score all items
    const scoredItems = [];
    for (const item of filteredItems) {
      try {
        const score = scorer.score(item, { foundComps: false });
        scoredItems.push({
          ...item,
          dealScore: score
        });
      } catch (error) {
        console.error(`Error scoring: ${error.message}`);
      }
    }

    // Sort by score
    scoredItems.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Filter by minimum score
    const displayItems = scoredItems.filter(item => item.dealScore.score >= minScoreToShow);

    console.log(`Scored ${scoredItems.length} listings`);
    console.log(`Showing ${displayItems.length} with score >= ${minScoreToShow}\n`);

    // Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const report = generateReport(keywords, displayItems, topN, scanDuration, {
      parsed,
      searchResults,
      totalFound: allItems.length,
      afterDedup: uniqueItems.length,
      totalScored: scoredItems.length
    });

    // Save results
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = keywords.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
    const jsonFile = path.join(__dirname, 'results', `multi_${safeName}_${timestamp}.json`);

    fs.writeFileSync(jsonFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      searchQuery: keywords,
      parsed,
      searchResults,
      config: searchConfig,
      scanDuration: `${scanDuration}s`,
      summary: {
        totalFound: allItems.length,
        uniqueItems: uniqueItems.length,
        rawCardsOnly: rawOnly,
        afterRawFilter: filteredItems.length,
        totalScored: scoredItems.length,
        showingResults: displayItems.length
      },
      allResults: scoredItems
    }, null, 2));

    // Print report
    console.log(report);
    console.log(`\nFull results saved: ${jsonFile}\n`);

    return {
      success: true,
      results: displayItems,
      jsonFile,
      parsed
    };

  } catch (error) {
    console.error('\nSearch failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Deduplicate items by item ID
 */
function deduplicateItems(items) {
  const seen = new Set();
  const unique = [];

  items.forEach(item => {
    if (!seen.has(item.itemId)) {
      seen.add(item.itemId);
      unique.push(item);
    }
  });

  return unique;
}

/**
 * Generate report
 */
function generateReport(keywords, items, topN, duration, stats) {
  const lines = [];

  lines.push('\n' + '='.repeat(80));
  lines.push(`MULTI-SEARCH: ${keywords}`);
  lines.push('='.repeat(80));

  if (stats.parsed.isComplex) {
    lines.push(`Strategy: ${stats.parsed.searchCount} separate searches`);
    stats.searchResults.forEach((sr, i) => {
      lines.push(`  ${i + 1}. "${sr.query}" → ${sr.count} results`);
    });
    lines.push(`Combined: ${stats.totalFound} total → ${stats.afterDedup} unique`);
  } else {
    lines.push(`Found: ${stats.totalFound} listings`);
  }

  lines.push(`Scored: ${stats.totalScored} | Duration: ${duration}s`);
  lines.push(`Showing: ${items.length} results (score >= 7.0)\n`);

  if (items.length === 0) {
    lines.push('No deals found matching criteria (score >= 7.0)\n');
    return lines.join('\n');
  }

  // Show top N
  const topDeals = items.slice(0, topN);

  topDeals.forEach((item, i) => {
    const score = item.dealScore;
    const breakdown = score.breakdown;
    const cleanRating = score.rating.replace(/[🔥⚡💰✓~⚠️❌]/g, '').trim();

    lines.push(`\n${i + 1}. [${score.score}/10 - ${cleanRating}]`);
    lines.push(`   ${item.title}`);
    lines.push(`   Price: $${item.totalPrice}`);

    lines.push(`\n   SCORE BREAKDOWN:`);

    if (breakdown.sellerQuality) {
      const sq = breakdown.sellerQuality;
      const cleanTrust = sq.trust.replace(/[✅⚠️❌]/g, '').trim();
      lines.push(`   - Seller (30%): ${sq.points}/${sq.maxPoints} pts | ${sq.feedback}% feedback, ${sq.salesCount} sales (${cleanTrust})`);
    }

    if (breakdown.listingQuality) {
      const lq = breakdown.listingQuality;
      lines.push(`   - Listing (30%): ${lq.points}/${lq.maxPoints} pts`);
      if (lq.signals.length > 0) {
        lines.push(`     Positive: ${lq.signals.join(', ')}`);
      }
      if (lq.redFlags.length > 0) {
        lines.push(`     Red flags: ${lq.redFlags.join(', ')}`);
      }
    }

    if (breakdown.searchRelevance) {
      const sr = breakdown.searchRelevance;
      lines.push(`   - Relevance (25%): ${sr.points}/${sr.maxPoints} pts`);
      if (sr.matches && sr.matches.length > 0) {
        lines.push(`     Matches: ${sr.matches.join(', ')}`);
      }
      if (sr.mismatches && sr.mismatches.length > 0) {
        lines.push(`     Missing: ${sr.mismatches.join(', ')}`);
      }
    }

    if (breakdown.listingFreshness) {
      const lf = breakdown.listingFreshness;
      lines.push(`   - Freshness (15%): ${lf.points}/${lf.maxPoints} pts | ${lf.ageInDays !== null ? lf.ageInDays + ' days old' : 'Unknown age'}`);
    }

    if (score.flags && score.flags.length > 0) {
      lines.push(`\n   FLAGS: ${score.flags.join(' | ')}`);
    }

    lines.push(`\n   URL: ${item.viewItemURL}`);
    lines.push('   ' + '-'.repeat(75));
  });

  lines.push('\n' + '='.repeat(80));

  return lines.join('\n');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse CLI arguments - separate flags from search query
  const config = {
    keywords: '',
    minScoreToShow: 7.0,
    topN: 20,
    minPrice: 0,
    maxPrice: null,
    rawOnly: true
  };

  const queryParts = [];
  let outputFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Parse flag
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];

      if (flagName === 'output' && nextArg) {
        outputFile = nextArg;
        i++; // Skip next arg
      } else if (flagName === 'topN' && nextArg) {
        config.topN = parseInt(nextArg);
        i++;
      } else if (flagName === 'minPrice' && nextArg) {
        config.minPrice = parseFloat(nextArg);
        i++;
      } else if (flagName === 'maxPrice' && nextArg) {
        config.maxPrice = parseFloat(nextArg);
        i++;
      } else if (flagName === 'minScore' && nextArg) {
        config.minScoreToShow = parseFloat(nextArg);
        i++;
      } else if (flagName === 'no-raw-filter') {
        config.rawOnly = false;
      }
    } else {
      // Part of search query
      queryParts.push(arg);
    }
  }

  config.keywords = queryParts.join(' ') || '2003 dwyane wade refractors, numbered cards, and autos';

  multiSearch(config)
    .then(result => {
      // Save to custom output file if specified
      if (outputFile && result.success) {
        const outputData = {
          timestamp: new Date().toISOString(),
          searchQuery: config.keywords,
          results: result.results,
          parsed: result.parsed
        };
        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
        console.log(`Results also saved to: ${outputFile}`);
      }

      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = multiSearch;
