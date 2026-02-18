#!/usr/bin/env node
/**
 * Allen Iverson Refractors 1996-2008
 * Focus on grading candidates and best deals
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');

async function searchAIRefractors() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const aiSearch = {
    name: 'Allen Iverson',
    keywords: 'allen iverson refractor',
    categoryId: '212',
    minPrice: 1,
    maxPrice: 5000,
    excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'reprint'],
    sortOrder: 'PricePlusShippingLowest',
    condition: 'New'
  };

  try {
    console.log('Searching for Allen Iverson refractors 1996-2008...');
    const items = await client.search(aiSearch);
    console.log(`Found ${items.length} total items`);

    // Filter for refractors from 1996-2008, singles only
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
      
      // MUST be a refractor or chrome parallel
      const isRefractor = titleLower.includes('refractor') ||
                         titleLower.includes('prizm') ||
                         titleLower.includes('atomic') ||
                         titleLower.includes('precious metal') ||
                         (titleLower.includes('chrome') && !titleLower.includes('topps chrome base'));
      
      if (!isRefractor) return false;
      
      // Year filter 1996-2008
      const yearMatch = item.title.match(/\b(1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|2007|2008)\b/);
      if (!yearMatch) return false;
      
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
      const yearMatch = item.title.match(/\b(1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|2007|2008)\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';
      
      // Determine refractor type
      let refractorType = 'Base Refractor';
      if (titleLower.includes('xfractor')) refractorType = 'X-Fractor';
      else if (titleLower.includes('superfractor')) refractorType = 'SuperFractor';
      else if (titleLower.includes('gold refractor')) refractorType = 'Gold Refractor';
      else if (titleLower.includes('orange refractor')) refractorType = 'Orange Refractor';
      else if (titleLower.includes('red refractor')) refractorType = 'Red Refractor';
      else if (titleLower.includes('blue refractor')) refractorType = 'Blue Refractor';
      else if (titleLower.includes('atomic')) refractorType = 'Atomic Refractor';
      else if (titleLower.includes('prizm')) refractorType = 'Prizm';
      else if (titleLower.includes('precious metal')) refractorType = 'Precious Metal Gems';
      
      // Check for serial number
      const serialMatch = item.title.match(/\/(\d+)/);
      const serialNumber = serialMatch ? parseInt(serialMatch[1]) : null;
      
      // Determine set
      let setName = 'Unknown';
      if (titleLower.includes('topps chrome')) setName = 'Topps Chrome';
      else if (titleLower.includes('bowman chrome')) setName = 'Bowman Chrome';
      else if (titleLower.includes('finest')) setName = 'Finest';
      else if (titleLower.includes('pristine')) setName = 'Pristine';
      else if (titleLower.includes('etopps')) setName = 'eTopps';
      else if (titleLower.includes('stadium club')) setName = 'Stadium Club Chrome';
      
      // Is this a rookie year card? (1996-1997)
      const isRookieEra = year === '1996' || year === '1997';
      
      // Grading candidate score (higher = better for grading)
      let gradingScore = 0;
      if (qualityAnalysis.photoQuality.photoQualityScore >= 8) gradingScore += 2;
      if (qualityAnalysis.photoQuality.hasBackPhoto) gradingScore += 1;
      if (qualityAnalysis.photoQuality.cornersVisible) gradingScore += 1;
      if (item.condition && item.condition.toLowerCase().includes('mint')) gradingScore += 1;
      if (isRookieEra) gradingScore += 2;
      if (serialNumber) gradingScore += 1;
      if (profitAnalysis.roi > 50) gradingScore += 2;

      analyzed.push({
        ...item,
        year,
        refractorType,
        setName,
        serialNumber,
        isRookieEra,
        gradingScore,
        qualityAnalysis,
        comps,
        profitAnalysis,
        dealScore
      });
    }

    // Sort: Highest grading score + deal score combined
    analyzed.sort((a, b) => {
      const aTotal = a.gradingScore + (a.dealScore.score / 2);
      const bTotal = b.gradingScore + (b.dealScore.score / 2);
      
      if (bTotal !== aTotal) return bTotal - aTotal;
      
      // Tiebreaker: Prefer rookie era
      if (a.isRookieEra && !b.isRookieEra) return -1;
      if (!a.isRookieEra && b.isRookieEra) return 1;
      
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
  searchAIRefractors()
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

module.exports = searchAIRefractors;
