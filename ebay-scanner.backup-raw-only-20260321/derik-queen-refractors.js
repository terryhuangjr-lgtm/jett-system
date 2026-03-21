#!/usr/bin/env node
/**
 * Derik Queen - Chrome Refractors Only
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchRefractors() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const refractorSearch = {
    name: 'Derik Queen Chrome Refractors',
    keywords: 'derik queen topps chrome refractor',
    categoryId: '261328',
    minPrice: 1,
    maxPrice: 2000,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    const items = await client.search(refractorSearch);

    // Filter for refractors/parallels only
    const refractors = items.filter(item => {
      const titleLower = item.title.toLowerCase();
      
      // Must have "chrome" AND some refractor indicator
      const hasChrome = titleLower.includes('chrome');
      const hasRefractor = titleLower.includes('refractor') ||
                           titleLower.includes('prizm') ||
                           titleLower.includes('pulsar') ||
                           titleLower.includes('speckle') ||
                           titleLower.includes('wave') ||
                           titleLower.includes('shimmer') ||
                           titleLower.includes('orange') ||
                           titleLower.includes('gold') ||
                           titleLower.includes('green') ||
                           titleLower.includes('blue') ||
                           titleLower.includes('red') ||
                           titleLower.includes('purple') ||
                           titleLower.includes('pink') ||
                           titleLower.includes('black') ||
                           titleLower.includes('sepia') ||
                           titleLower.includes('atomic') ||
                           titleLower.includes('/') && (titleLower.includes('499') || titleLower.includes('299') || titleLower.includes('199') || titleLower.includes('99') || titleLower.includes('75') || titleLower.includes('50') || titleLower.includes('25') || titleLower.includes('10') || titleLower.includes('5') || titleLower.includes('1'));

      return hasChrome && hasRefractor && item.sellerPositivePercent >= 98;
    });

    // Analyze each
    const analyzed = [];

    for (const item of refractors) {
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

      // Extract parallel info from title
      const parallel = extractParallel(item.title);

      analyzed.push({
        ...item,
        parallel,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort by rarity (lower numbered = rarer), then by score
    analyzed.sort((a, b) => {
      // Prioritize numbered parallels
      if (a.parallel.numbered && !b.parallel.numbered) return -1;
      if (!a.parallel.numbered && b.parallel.numbered) return 1;
      
      // If both numbered, sort by rarity
      if (a.parallel.numbered && b.parallel.numbered) {
        if (a.parallel.serialNumber !== b.parallel.serialNumber) {
          return a.parallel.serialNumber - b.parallel.serialNumber;
        }
      }
      
      // Otherwise sort by score
      return b.dealScore.score - a.dealScore.score;
    });

    return {
      success: true,
      totalFound: items.length,
      refractorsFound: refractors.length,
      top5: analyzed.slice(0, 5),
      all: analyzed
    };

  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract parallel type and serial number from title
 */
function extractParallel(title) {
  const titleLower = title.toLowerCase();
  
  // Check for serial numbers
  const serialMatch = title.match(/\/(\d+)/);
  const serialNumber = serialMatch ? parseInt(serialMatch[1]) : null;

  // Determine parallel type
  let type = 'Base Refractor';
  
  if (titleLower.includes('pulsar')) type = 'Pulsar';
  else if (titleLower.includes('speckle')) type = 'Speckle';
  else if (titleLower.includes('wave')) type = 'Wave';
  else if (titleLower.includes('shimmer')) type = 'Shimmer';
  else if (titleLower.includes('atomic')) type = 'Atomic Refractor';
  else if (titleLower.includes('orange')) type = 'Orange Refractor';
  else if (titleLower.includes('gold')) type = 'Gold Refractor';
  else if (titleLower.includes('green')) type = 'Green Refractor';
  else if (titleLower.includes('blue')) type = 'Blue Refractor';
  else if (titleLower.includes('red')) type = 'Red Refractor';
  else if (titleLower.includes('purple')) type = 'Purple Refractor';
  else if (titleLower.includes('pink')) type = 'Pink Refractor';
  else if (titleLower.includes('black')) type = 'Black Refractor';
  else if (titleLower.includes('sepia')) type = 'Sepia Refractor';
  else if (titleLower.includes('prism')) type = 'Prism';
  else if (titleLower.includes('prizm')) type = 'Prizm';

  return {
    type,
    numbered: serialNumber !== null,
    serialNumber
  };
}

if (require.main === module) {
  searchRefractors()
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

module.exports = searchRefractors;
