#!/usr/bin/env node
/**
 * Multi-Search - Handles complex queries with multiple card types
 * Runs separate optimized searches and combines results
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const DealScorerV2 = require('./deal-scorer-v2');
const DealScorerGraded = require('./deal-scorer-graded');
const RawCardFilter = require('./raw-card-filter');
const SmartQueryParser = require('./smart-query-parser');
const VisionFilter = require('./vision-filter');
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
    minPrice = 0,
    maxPrice = null,
    excludeKeywords = '',
    rawOnly = true,
    minScoreToShow = 7.0,
    topN = 20,
    useVision = false,
    visionTopN = 200,
    listingType = 'fixed_price',
    cardMode = 'raw'  // 'raw' or 'graded'
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
        listingType,
        cardType: cardMode,
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

    // Filter based on cardMode
    let filteredItems = uniqueItems;
    let softRejectItems = [];
    if (cardMode === 'raw') {
      filteredItems = rawFilter.filterRawOnly(uniqueItems, 'raw');
      softRejectItems = rawFilter.getSoftRejects(uniqueItems);
      console.log(`After raw filter: ${filteredItems.length} raw + ${softRejectItems.length} soft-reject`);
    } else if (cardMode === 'graded') {
      filteredItems = rawFilter.filterRawOnly(uniqueItems, 'graded');
      console.log(`After graded filter: ${filteredItems.length} graded cards`);
    }

    console.log(`\nScoring ${filteredItems.length} listings...`);

    // Choose scorer based on cardMode
    let scorer;
    if (cardMode === 'graded') {
      console.log(`Using Graded Scorer (no vision)`);
      scorer = new DealScorerGraded(keywords);
    } else {
      console.log(`Using Raw Scorer`);
      scorer = new DealScorerV2(keywords);
    }

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

    // === VISION OVERRIDE FOR SOFT REJECTS ===
    // Only run vision for raw cards - graded cards (slabs) can't be visually assessed
    let visionOverrideItems = [];
    if (cardMode === 'raw' && rawOnly && softRejectItems.length > 0 && useVision) {
      console.log(`\n👁️  Vision override: scanning ${softRejectItems.length} soft-reject items...`);
      
      // Score soft rejects first
      const softScored = [];
      for (const item of softRejectItems) {
        try {
          const score = scorer.score(item, { foundComps: false });
          softScored.push({ ...item, dealScore: score });
        } catch (e) {
          // skip
        }
      }
      
      // Run vision on soft rejects
      if (softScored.length > 0) {
        const visionFilter = new VisionFilter();
        const visioned = await visionFilter.filterItems(softScored, softScored.length);
        
        // Keep only if vision score >= 7.5 and confidence not low
        for (const v of visioned) {
          if (v.visionScore >= 7.5 && v.visionConfidence !== 'low') {
            v.visionOverride = true;
            visionOverrideItems.push(v);
            console.log(`   ✅ Vision OVERRIDE KEEP: ${v.title?.substring(0, 40)}... (vision: ${v.visionScore})`);
          } else {
            console.log(`   ❌ Vision OVERRIDE REJECT: ${v.title?.substring(0, 40)}... (vision: ${v.visionScore})`);
          }
        }
      }
      console.log(`   Vision override saved ${visionOverrideItems.length} items`);
    }

    // Vision scanning (optional - costs ~$0.02 per 30 items)
    // Only run vision for raw cards - graded cards (slabs) can't be visually assessed
    let finalItems = displayItems;
    if (cardMode === 'raw' && useVision && displayItems.length > 0) {
      const visionFilter = new VisionFilter();
      finalItems = await visionFilter.filterItems(displayItems, visionTopN);
      console.log(`After vision filter: ${finalItems.length} listings`);
    } else if (cardMode === 'graded') {
      console.log(`Skipping vision (graded mode - slabs cannot be visually assessed)`);
    }
    
    // Add vision override items to final results
    if (visionOverrideItems.length > 0) {
      finalItems = [...finalItems, ...visionOverrideItems];
      console.log(`After vision override: ${finalItems.length} total listings`);
    }

    console.log(`Scored ${scoredItems.length} listings`);
    console.log(`Showing ${finalItems.length} with score >= ${minScoreToShow}\n`);

    // Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const report = generateReport(keywords, finalItems, topN, scanDuration, {
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
        showingResults: finalItems.length,
        visionScanned: useVision
      },
      allResults: scoredItems
    }, null, 2));

    // Print report
    console.log(report);
    console.log(`\nFull results saved: ${jsonFile}\n`);

    return {
      success: true,
      results: finalItems,
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
    const breakdown = score.breakdown || {};
    const cleanRating = (score.rating || '').replace(/[🔥⚡💰✓~⚠️❌]/g, '').trim();

    // Show more title (up to 80 chars), use currentPrice for actual price
    const title = item.title ? item.title.substring(0, 80) + (item.title.length > 80 ? '...' : '') : 'N/A';
    const price = item.currentPrice || item.totalPrice || 'N/A';

    lines.push(`\n${i + 1}. [${score.score}/10 - ${cleanRating}]`);
    lines.push(`   ${title}`);
    lines.push(`   Price: $${price}`);

    lines.push(`\n   SCORE BREAKDOWN:`);

    if (breakdown.sellerQuality) {
      const sq = breakdown.sellerQuality;
      const cleanTrust = (sq.trust || '').replace(/[✅⚠️❌]/g, '').trim();
      lines.push(`   - Seller (20%): ${sq.points}/${sq.maxPoints} pts | ${sq.feedback}% feedback, ${sq.salesCount} sales (${cleanTrust})`);
    }

    if (breakdown.listingQuality) {
      const lq = breakdown.listingQuality;
      lines.push(`   - Listing (20%): ${lq.points}/${lq.maxPoints} pts`);
      if (lq.signals && lq.signals.length > 0) {
        lines.push(`     Positive: ${lq.signals.join(', ')}`);
      }
      if (lq.redFlags && lq.redFlags.length > 0) {
        lines.push(`     Red flags: ${lq.redFlags.join(', ')}`);
      }
    }

    if (breakdown.gradeMatch) {
      const gm = breakdown.gradeMatch;
      lines.push(`   - Grade (25%): ${gm.points}/${gm.maxPoints} pts | ${gm.grade || 'N/A'}`);
    }

    if (breakdown.searchRelevance) {
      const sr = breakdown.searchRelevance;
      lines.push(`   - Relevance (40%): ${sr.points}/${sr.maxPoints} pts`);
      if (sr.matches && sr.matches.length > 0) {
        lines.push(`     Matches: ${sr.matches.join(', ')}`);
      }
      if (sr.mismatches && sr.mismatches.length > 0) {
        lines.push(`     Missing: ${sr.mismatches.join(', ')}`);
      }
    }

    if (breakdown.listingFreshness) {
      const lf = breakdown.listingFreshness;
      lines.push(`   - Freshness (10%): ${lf.points}/${lf.maxPoints} pts | ${lf.ageInDays !== null ? lf.ageInDays + ' days old' : 'Unknown age'}`);
    }
    
    // Add vision score if available
    if (item.visionScore) {
      lines.push(`   - Vision (10%): ${item.visionScore}/10 pts`);
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
    rawOnly: true,
    useVision: false,
    visionTopN: 200
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
      } else if (flagName === 'exclude' && nextArg) {
        config.excludeKeywords = nextArg;
        i++;
      } else if (flagName === 'vision') {
        config.useVision = true;
      } else if (flagName === 'vision-top') {
        config.visionTopN = parseInt(nextArg) || 200;
        i++;
      } else if (flagName === 'listing-type' && nextArg) {
        config.listingType = nextArg;
        i++;
      } else if (flagName === 'card-mode' && nextArg) {
        config.cardMode = nextArg;
        i++;
      } else if (flagName === 'card-type' && nextArg) {
        // Backwards compatibility
        config.cardMode = nextArg;
        i++;
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
