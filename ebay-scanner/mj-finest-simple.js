#!/usr/bin/env node
/**
 * Simple MJ Finest Search
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchMJFinestSimple() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const finestSearch = {
    name: 'MJ Topps Finest',
    keywords: 'michael jordan finest',
    categoryId: '212',
    minPrice: 1,
    maxPrice: 10000,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'reprint'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    console.log('Searching for MJ Finest cards...');
    const items = await client.search(finestSearch);
    console.log(`Found ${items.length} total items`);

    // Filter for singles from 1993-1999
    const filtered = items.filter(item => {
      const titleLower = item.title.toLowerCase();
      
      // STRICT LOT FILTERING
      if (titleLower.includes(' lot') || 
          titleLower.includes('lot of') ||
          titleLower.includes('qty') ||
          titleLower.includes('quantity') ||
          /\d+\s*(card|pc|pcs)/.test(titleLower) ||
          titleLower.includes('multi') ||
          titleLower.includes('bundle') ||
          titleLower.includes('set of')) {
        return false;
      }
      
      // Check category
      if (item.categoryPath && item.categoryPath.toLowerCase().includes('lot')) {
        return false;
      }
      
      // Must have "finest" in title
      if (!titleLower.includes('finest')) return false;
      
      // Year filter 1993-1999 (optional - show all if none match)
      const yearMatch = item.title.match(/\b(199[3-9])\b/);
      
      // Must have good seller
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      return true;
    });

    console.log(`${filtered.length} cards passed filters`);

    // Analyze top 20
    const analyzed = [];

    for (const item of filtered.slice(0, 20)) {
      const qualityAnalysis = photoChecker.analyzeListing(item);

      let comps = { foundComps: false };
      try {
        comps = await compAnalyzer.getComps(item.title);
      } catch (e) {}

      const profitAnalysis = comps.foundComps
        ? compAnalyzer.calculateProfit(item.totalPrice, comps)
        : { insufficientData: true };

      let dealScore = dealScorer.score(item, profitAnalysis);
      dealScore.score = photoChecker.adjustDealScore(dealScore.score, qualityAnalysis);

      // Extract year
      const yearMatch = item.title.match(/\b(199[0-9]|200[0-9])\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';
      
      // Check for refractor/parallel
      const isRefractor = item.title.toLowerCase().includes('refractor') ||
                          item.title.toLowerCase().includes('atomic') ||
                          /\/\d+/.test(item.title);

      analyzed.push({
        ...item,
        year,
        isRefractor,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort by year (prefer 1993-1999), then score
    analyzed.sort((a, b) => {
      const aYear = parseInt(a.year);
      const bYear = parseInt(b.year);
      
      const aIn90s = aYear >= 1993 && aYear <= 1999;
      const bIn90s = bYear >= 1993 && bYear <= 1999;
      
      if (aIn90s && !bIn90s) return -1;
      if (!aIn90s && bIn90s) return 1;
      
      if (b.dealScore.score !== a.dealScore.score) {
        return b.dealScore.score - a.dealScore.score;
      }
      
      return a.totalPrice - b.totalPrice;
    });

    return {
      success: true,
      totalFound: items.length,
      filtered: filtered.length,
      analyzed: analyzed.length,
      top10: analyzed.slice(0, 10),
      all: analyzed
    };

  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  searchMJFinestSimple()
    .then(result => {
      if (result.success) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      } else {
        console.error('Search failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = searchMJFinestSimple;
