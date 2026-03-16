#!/usr/bin/env node
/**
 * Broader Dirk Nowitzki Search
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchDirkBroad() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const dirkSearch = {
    name: 'Dirk Nowitzki',
    keywords: 'dirk nowitzki',
    categoryId: '212',
    minPrice: 1,
    maxPrice: 5000,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'reprint'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    console.log('Searching for Dirk Nowitzki cards...');
    const items = await client.search(dirkSearch);
    console.log(`Found ${items.length} total items`);

    // Filter for refractor singles from 1998-2005
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
      
      // Prefer refractors/chrome/special cards
      const hasSpecialCard = titleLower.includes('refractor') ||
                             titleLower.includes('chrome') ||
                             titleLower.includes('prizm') ||
                             titleLower.includes('atomic') ||
                             titleLower.includes('finest') ||
                             titleLower.includes('precious metal') ||
                             titleLower.includes('parallel') ||
                             /\/\d+/.test(item.title);
      
      // Year filter 1998-2005 (or vintage set names)
      const yearMatch = item.title.match(/\b(1998|1999|2000|2001|2002|2003|2004|2005)\b/);
      
      // Must have good seller
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      return true;
    });

    console.log(`${filtered.length} cards passed filters`);

    // Analyze each
    const analyzed = [];

    for (const item of filtered.slice(0, 30)) {
      const titleLower = item.title.toLowerCase();
      
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
      const yearMatch = item.title.match(/\b(1998|1999|2000|2001|2002|2003|2004|2005)\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';
      
      // Determine card type
      let cardType = 'Base';
      if (titleLower.includes('refractor')) cardType = 'Refractor';
      else if (titleLower.includes('chrome')) cardType = 'Chrome';
      else if (titleLower.includes('prizm')) cardType = 'Prizm';
      else if (titleLower.includes('atomic')) cardType = 'Atomic';
      else if (titleLower.includes('finest')) cardType = 'Finest';
      else if (titleLower.includes('precious metal')) cardType = 'Precious Metal Gems';
      
      // Check for serial number
      const serialMatch = item.title.match(/\/(\d+)/);
      const serialNumber = serialMatch ? parseInt(serialMatch[1]) : null;
      
      // Priority scoring for refractors
      const isRefractor = titleLower.includes('refractor') || 
                         titleLower.includes('chrome') ||
                         titleLower.includes('prizm') ||
                         titleLower.includes('atomic') ||
                         serialNumber !== null;

      analyzed.push({
        ...item,
        year,
        cardType,
        serialNumber,
        isRefractor,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort: Refractors first, then by score, then by year (earlier = better)
    analyzed.sort((a, b) => {
      // Prioritize refractors/special cards
      if (a.isRefractor && !b.isRefractor) return -1;
      if (!a.isRefractor && b.isRefractor) return 1;
      
      // Prioritize numbered cards
      if (a.serialNumber && !b.serialNumber) return -1;
      if (!a.serialNumber && b.serialNumber) return 1;
      
      // Sort by score
      if (b.dealScore.score !== a.dealScore.score) {
        return b.dealScore.score - a.dealScore.score;
      }
      
      // Prefer earlier years
      const aYear = parseInt(a.year) || 9999;
      const bYear = parseInt(b.year) || 9999;
      if (aYear !== bYear) return aYear - bYear;
      
      // Then by price
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
  searchDirkBroad()
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

module.exports = searchDirkBroad;
