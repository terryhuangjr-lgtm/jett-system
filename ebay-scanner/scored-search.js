#!/usr/bin/env node
/**
 * Scored Search - No filtering, score everything
 * Show ALL results sorted by score
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const DealScorerV2 = require('./deal-scorer-v2');
const RawCardFilter = require('./raw-card-filter');
const fs = require('fs');
const path = require('path');

async function scoredSearch(searchConfig) {
  const client = new EbayBrowseAPI();
  const rawFilter = new RawCardFilter();
  const startTime = Date.now();

  const {
    keywords = 'dirk nowitzki refractor',
    categoryId = '212',
    minPrice = 0,  // Catch early auctions starting at $0.99
    maxPrice = null,  // No cap on raw cards
    excludeKeywords = '',
    rawOnly = true,
    minScoreToShow = 7.0,  // Only show solid deals and above
    topN = 20  // Top 20 max
  } = searchConfig || {};

  try {
    console.log(`\nSearching eBay for: ${keywords}`);

    // Search (no filtering!)
    const items = await client.search({
      keywords,
      categoryId,
      minPrice,
      maxPrice,
      excludeKeywords,
      sortOrder: 'PricePlusShippingLowest',
      limit: 200
    });

    console.log(`Found: ${items.length} listings`);
    
    // Filter to raw cards only (unless rawOnly=false)
    let filteredItems = items;
    if (rawOnly) {
      const stats = rawFilter.getStats(items);
      filteredItems = rawFilter.filterRawOnly(items);
      console.log(`Filtered to raw cards: ${items.length} total → ${filteredItems.length} raw (${stats.rawPercent}%)`);
    }
    
    console.log(`Scoring ${filteredItems.length} listings...`);

    // Create scorer with search keywords for relevance scoring
    const scorer = new DealScorerV2(keywords);

    // Score ALL listings (no filtering!)
    const scoredItems = [];

    for (const item of filteredItems) {
      try {
        // Score without comps (faster, no API calls)
        const score = scorer.score(item, { foundComps: false });

        scoredItems.push({
          ...item,
          dealScore: score
        });

      } catch (error) {
        console.error(`   Error scoring ${item.title.substring(0, 40)}: ${error.message}`);
        // Skip items that fail to score
      }
    }

    // Sort by score (highest first)
    scoredItems.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Filter by minimum score
    const displayItems = scoredItems.filter(item => item.dealScore.score >= minScoreToShow);

    console.log(`Scored ${scoredItems.length} listings`);
    console.log(`Showing ${displayItems.length} with score >= ${minScoreToShow}\n`);

    // Generate report
    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const report = generateReport(keywords, displayItems, topN, scanDuration, {
      totalFound: items.length,
      totalScored: scoredItems.length,
      minScoreFilter: minScoreToShow
    });

    // Save full results to JSON
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = keywords.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const jsonFile = path.join(__dirname, 'results', `${safeName}_${timestamp}.json`);

    fs.writeFileSync(jsonFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      searchQuery: keywords,
      config: searchConfig,
      scanDuration: `${scanDuration}s`,
      summary: {
        totalFound: items.length,
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
      jsonFile
    };

  } catch (error) {
    console.error('\nSearch failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate clean, simple report
 */
function generateReport(keywords, items, topN, duration, stats) {
  const lines = [];

  lines.push('\n' + '='.repeat(80));
  lines.push(`SEARCH: ${keywords}`);
  lines.push('='.repeat(80));
  lines.push(`Found: ${stats.totalFound} listings | Scored: ${stats.totalScored} | Duration: ${duration}s`);
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
    
    // Strip emojis from rating
    const cleanRating = score.rating.replace(/[🔥⚡💰✓~⚠️❌]/g, '').trim();

    lines.push(`\n${i + 1}. [${score.score}/10 - ${cleanRating}]`);
    lines.push(`   ${item.title}`);
    lines.push(`   Price: $${item.totalPrice}`);

    // Score breakdown
    lines.push(`\n   SCORE BREAKDOWN:`);

    // Seller quality (40%)
    if (breakdown.sellerQuality) {
      const sq = breakdown.sellerQuality;
      const cleanTrust = sq.trust.replace(/[✅⚠️❌]/g, '').trim();
      lines.push(`   - Seller (40%): ${sq.points}/${sq.maxPoints} pts | ${sq.feedback}% feedback, ${sq.salesCount} sales (${cleanTrust})`);
    }

    // Listing quality (30%)
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

    // Search relevance (25%)
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

    // Freshness (15%)
    if (breakdown.listingFreshness) {
      const lf = breakdown.listingFreshness;
      lines.push(`   - Freshness (15%): ${lf.points}/${lf.maxPoints} pts | ${lf.ageInDays !== null ? lf.ageInDays + ' days old' : 'Unknown age'}`);
    }

    // Overall flags
    if (score.flags && score.flags.length > 0) {
      lines.push(`\n   FLAGS: ${score.flags.join(' | ')}`);
    }

    // Link
    lines.push(`\n   URL: ${item.viewItemURL}`);
    lines.push('   ' + '-'.repeat(75));
  });

  lines.push('\n' + '='.repeat(80));

  return lines.join('\n');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const keywords = args.join(' ') || 'dirk nowitzki refractor';

  scoredSearch({
    keywords,
    minScoreToShow: 7.0,
    topN: 20
  })
    .then(result => {
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

module.exports = scoredSearch;
