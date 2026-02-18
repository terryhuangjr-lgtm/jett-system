#!/usr/bin/env node
/**
 * Simple Michael Jordan Search - broader approach
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchMJSimple() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const mjSearch = {
    name: 'Michael Jordan Raw Cards',
    keywords: 'michael jordan',
    categoryId: '212', // Basketball cards
    minPrice: 25,
    maxPrice: 500,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'reprint', 'fake'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    console.log('Searching for Michael Jordan cards...');
    const items = await client.search(mjSearch);
    console.log(`Found ${items.length} total items`);

    // Filter for singles from 1990-2005
    const filtered = items.filter(item => {
      const titleLower = item.title.toLowerCase();
      
      // Exclude lots
      if (titleLower.includes(' lot') || 
          titleLower.includes('lot of') ||
          titleLower.includes('qty') ||
          titleLower.includes('quantity') ||
          /\d+\s*(card|pc)/.test(titleLower) && titleLower.includes('lot') ||
          titleLower.includes('multi') ||
          titleLower.includes('bundle')) {
        return false;
      }
      
      // Must have good seller
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      // Check for year 1990-2005 in title
      const yearMatch = item.title.match(/\b(199[0-9]|200[0-5])\b/);
      if (!yearMatch) return false; // Must have year
      
      // Price check
      if (item.totalPrice < mjSearch.minPrice || item.totalPrice > mjSearch.maxPrice) {
        return false;
      }
      
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
      const yearMatch = item.title.match(/\b(199[0-9]|200[0-5])\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';

      analyzed.push({
        ...item,
        year,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort by score
    analyzed.sort((a, b) => b.dealScore.score - a.dealScore.score);

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
  searchMJSimple()
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

module.exports = searchMJSimple;
