#!/usr/bin/env node
/**
 * Shaquille O'Neal Cards Numbered /25 or Less
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchShaqNumbered() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const shaqSearch = {
    name: 'Shaquille O\'Neal',
    keywords: 'shaquille oneal',
    categoryId: '212',
    minPrice: 1,
    maxPrice: 10000,
    excludeKeywords: ['reprint'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    console.log('Searching for Shaq numbered /25 or less...');
    const items = await client.search(shaqSearch);
    console.log(`Found ${items.length} total items`);

    // Filter for numbered cards only
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
      
      // MUST have serial number /25 or less
      const serialMatch = item.title.match(/\/(\d+)/);
      if (!serialMatch) return false;
      
      const serialNumber = parseInt(serialMatch[1]);
      if (serialNumber > 25) return false;
      
      // Must have good seller
      if (item.sellerPositivePercent < 98) return false;
      
      // Must have image
      if (!item.imageUrl) return false;
      
      return true;
    });

    console.log(`${filtered.length} cards passed filters`);

    // Analyze each
    const analyzed = [];

    for (const item of filtered) {
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
      const yearMatch = item.title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';
      
      // Determine card type
      let cardType = 'Base';
      if (titleLower.includes('refractor')) cardType = 'Refractor';
      else if (titleLower.includes('chrome')) cardType = 'Chrome';
      else if (titleLower.includes('prizm')) cardType = 'Prizm';
      else if (titleLower.includes('atomic')) cardType = 'Atomic';
      else if (titleLower.includes('finest')) cardType = 'Finest';
      else if (titleLower.includes('precious metal')) cardType = 'Precious Metal Gems';
      else if (titleLower.includes('select')) cardType = 'Select';
      else if (titleLower.includes('optic')) cardType = 'Optic';
      
      // Check for serial number
      const serialMatch = item.title.match(/\/(\d+)/);
      const serialNumber = serialMatch ? parseInt(serialMatch[1]) : null;
      
      // Check if graded
      const isGraded = titleLower.includes('psa') || 
                      titleLower.includes('bgs') || 
                      titleLower.includes('sgc') ||
                      titleLower.includes('graded');

      analyzed.push({
        ...item,
        year,
        cardType,
        serialNumber,
        isGraded,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort: Lower serial numbers first, then by score, then by year (earlier = better)
    analyzed.sort((a, b) => {
      // Prioritize lower serial numbers (/1, /2, etc.)
      if (a.serialNumber !== b.serialNumber) {
        return a.serialNumber - b.serialNumber;
      }
      
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
  searchShaqNumbered()
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

module.exports = searchShaqNumbered;
