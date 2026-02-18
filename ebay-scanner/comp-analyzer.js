/**
 * Comp Analyzer - Finds sold comps for graded cards
 * Calculates profit potential by comparing raw vs graded prices
 */

const EbayBrowseAPI = require('./ebay-browse-api');

class CompAnalyzer {
  constructor() {
    this.client = new EbayBrowseAPI();
    this.gradingCost = 20; // Average PSA grading cost
    this.cache = {}; // Cache comps to avoid duplicate API calls
  }

  /**
   * Get comps for a raw card
   *
   * NOTE: These are ESTIMATED comps based on active listings (not actual sold prices)
   * We apply an 85% discount factor to asking prices to estimate sold prices.
   *
   * @param {String} cardTitle - Title of the raw card
   * @returns {Promise<Object>} - Comp analysis with PSA 10 and PSA 9 data
   */
  async getComps(cardTitle) {
    // Clean up title for comp search
    const cleanTitle = this.cleanTitleForComps(cardTitle);

    // Check cache
    const cacheKey = cleanTitle.toLowerCase();
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      // Search for PSA 10 active listings (with discount applied)
      const psa10Results = await this.searchSoldComps(`${cleanTitle} PSA 10`);

      // Search for PSA 9 active listings (with discount applied)
      const psa9Results = await this.searchSoldComps(`${cleanTitle} PSA 9`);

      const comps = {
        psa10: {
          count: psa10Results.length,
          avgPrice: this.calculateAverage(psa10Results),
          recentSales: psa10Results.slice(0, 5).map(item => ({
            price: item.totalPrice,
            originalAskingPrice: item.originalPrice, // Include original for reference
            title: item.title,
            url: item.viewItemURL,
            estimated: true // Flag that this is estimated, not actual sold
          }))
        },
        psa9: {
          count: psa9Results.length,
          avgPrice: this.calculateAverage(psa9Results),
          recentSales: psa9Results.slice(0, 5).map(item => ({
            price: item.totalPrice,
            originalAskingPrice: item.originalPrice,
            title: item.title,
            url: item.viewItemURL,
            estimated: true
          }))
        },
        foundComps: psa10Results.length > 0 || psa9Results.length > 0,
        estimatedData: true, // Flag that all data is estimated
        dataSource: 'Active listings with 85% discount factor'
      };

      // Cache results
      this.cache[cacheKey] = comps;

      return comps;

    } catch (error) {
      console.error('Error getting comps:', error.message);
      return {
        psa10: { count: 0, avgPrice: 0, recentSales: [] },
        psa9: { count: 0, avgPrice: 0, recentSales: [] },
        foundComps: false,
        error: error.message
      };
    }
  }

  /**
   * Search for active listings as proxy for sold comps
   *
   * IMPORTANT: eBay APIs no longer support searching sold/completed items
   * This method searches ACTIVE listings and applies a discount factor
   * to estimate what they would sell for.
   *
   * Discount factor: 85% (assumes asking price is ~15% higher than sold price)
   *
   * @param {String} keywords - Search keywords
   * @returns {Promise<Array>} - Active items with estimated sold prices
   */
  async searchSoldComps(keywords) {
    const SOLD_PRICE_FACTOR = 0.85; // 85% of asking = estimated sold price

    const results = await this.client.search({
      keywords: keywords,
      minPrice: 10,
      maxPrice: 10000,
      limit: 50
    });

    // Apply discount factor to estimate sold prices
    return results.map(item => ({
      ...item,
      originalPrice: item.totalPrice,
      totalPrice: Math.round(item.totalPrice * SOLD_PRICE_FACTOR * 100) / 100,
      estimatedSold: true // Flag to indicate this is an estimate
    }));
  }

  /**
   * Calculate profit potential
   * @param {Number} rawPrice - Current price of raw card
   * @param {Object} comps - Comp data from getComps()
   * @returns {Object} - Profit analysis
   */
  calculateProfit(rawPrice, comps) {
    if (!comps.foundComps) {
      return {
        insufficientData: true,
        message: 'Not enough comp data available'
      };
    }

    const totalCost = rawPrice + this.gradingCost;

    // PSA 10 profit scenario
    const psa10Profit = comps.psa10.avgPrice > 0
      ? comps.psa10.avgPrice - totalCost
      : 0;

    // PSA 9 profit scenario (typically 40-60% of PSA 10 value)
    const psa9EstValue = comps.psa10.avgPrice > 0
      ? comps.psa10.avgPrice * 0.4
      : comps.psa9.avgPrice;

    const psa9Profit = psa9EstValue > 0
      ? psa9EstValue - totalCost
      : 0;

    // Expected value (conservative: 40% PSA 10, 40% PSA 9, 20% lower grade)
    const expectedValue = (0.4 * psa10Profit) + (0.4 * psa9Profit);

    // ROI percentage
    const roi = totalCost > 0
      ? ((expectedValue / totalCost) * 100)
      : 0;

    return {
      insufficientData: false,
      totalCost: Math.round(totalCost * 100) / 100,
      rawPrice: Math.round(rawPrice * 100) / 100,
      gradingCost: this.gradingCost,

      psa10Scenario: {
        avgCompPrice: Math.round(comps.psa10.avgPrice * 100) / 100,
        profit: Math.round(psa10Profit * 100) / 100,
        multiplier: totalCost > 0 ? Math.round((comps.psa10.avgPrice / totalCost) * 10) / 10 : 0
      },

      psa9Scenario: {
        avgCompPrice: Math.round(psa9EstValue * 100) / 100,
        profit: Math.round(psa9Profit * 100) / 100,
        multiplier: totalCost > 0 ? Math.round((psa9EstValue / totalCost) * 10) / 10 : 0
      },

      expectedValue: Math.round(expectedValue * 100) / 100,
      roi: Math.round(roi * 10) / 10,

      recommendation: this.getRecommendation(expectedValue, roi)
    };
  }

  /**
   * Get recommendation based on profit analysis
   * @param {Number} expectedValue - Expected profit
   * @param {Number} roi - ROI percentage
   * @returns {String} - Recommendation
   */
  getRecommendation(expectedValue, roi) {
    if (expectedValue > 200 && roi > 150) {
      return '🔥 EXCEPTIONAL - Strong buy candidate';
    } else if (expectedValue > 100 && roi > 100) {
      return '⚡ GREAT - Very good opportunity';
    } else if (expectedValue > 50 && roi > 50) {
      return '💰 GOOD - Solid profit potential';
    } else if (expectedValue > 20 && roi > 25) {
      return '✓ DECENT - Consider if low risk';
    } else {
      return '⚠️ MARGINAL - Proceed with caution';
    }
  }

  /**
   * Clean title for comp search - extract core card identifiers only
   * LOOSENED VERSION - More flexible matching for better comp discovery
   * @param {String} title - Raw title
   * @returns {String} - Cleaned title with key search terms
   */
  cleanTitleForComps(title) {
    let cleaned = title.toLowerCase();

    // Extract key components
    const keywords = [];

    // Extract year (1993-94, 1996-97, etc.) - OPTIONAL now, not required
    const yearMatch = cleaned.match(/\b(19\d{2}[-\/]?\d{0,2}|20\d{2}[-\/]?\d{0,2})\b/);
    if (yearMatch) keywords.push(yearMatch[0]);

    // Extract brand/set names - EXPANDED list
    const brands = [
      'topps', 'finest', 'fleer', 'upper deck', 'ud', 'skybox', 'bowman',
      'prizm', 'optic', 'chrome', 'select', 'donruss', 'panini', 'hoops',
      'stadium club', 'sp authentic', 'spx', 'flair'
    ];
    brands.forEach(brand => {
      if (cleaned.includes(brand)) keywords.push(brand);
    });

    // Extract insert names - EXPANDED list
    const inserts = [
      'showstoppers', 'finishers', 'refractor', 'atomic', 'embossed', 'mystery',
      'xfractor', 'x-fractor', 'pulsar', 'wave', 'prizm', 'silver', 'gold',
      'black', 'red', 'blue', 'green', 'orange', 'purple', 'rookie', 'rc'
    ];
    inserts.forEach(insert => {
      if (cleaned.includes(insert)) keywords.push(insert);
    });

    // Extract player name - More flexible approach
    // Try to extract first distinctive word that looks like a last name
    const commonPlayers = [
      'jordan', 'kobe', 'lebron', 'curry', 'giannis', 'luka', 'zion',
      'nowitzki', 'dirk', 'shaq', "o'neal", 'duncan', 'garnett', 'iverson',
      'bryant', 'james', 'durant', 'westbrook', 'harden', 'tatum', 'booker',
      'doncic', 'morant', 'jokic', 'embiid', 'antetokounmpo'
    ];

    // Check for known players
    let foundPlayer = false;
    commonPlayers.forEach(player => {
      if (cleaned.includes(player)) {
        keywords.push(player);
        foundPlayer = true;
      }
    });

    // If no known player, try to extract name from title
    if (!foundPlayer) {
      // Try to extract what looks like a player name (capitalized words at start)
      const nameMatch = title.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
      if (nameMatch) {
        keywords.push(nameMatch[1].toLowerCase());
      }
    }

    // Extract card number if present - LESS STRICT
    const cardNumMatch = cleaned.match(/#\s?\d{1,4}\b/);
    if (cardNumMatch) {
      keywords.push(cardNumMatch[0].replace(/\s/g, ''));
    }

    // Build search string from keywords
    let searchString = keywords.join(' ');

    // Fallback: if we extracted very few keywords, use MORE of the title
    if (keywords.length < 2) {
      // Remove noise but keep MORE context than before
      searchString = cleaned
        .replace(/\b(raw|ungraded|gem|pristine)\b/gi, '')
        .replace(/\b(with coating|no coating|protective peel|coating|peel)\b/gi, '')
        .replace(/\b(chicago bulls|bulls|p\.o[0-9][a-z]|hof)\b/gi, '')
        .replace(/[!@$%^&*()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80); // Increased from 60 to 80 chars
    }

    return searchString.trim();
  }

  /**
   * Calculate average price from items
   * @param {Array} items - Items to average
   * @returns {Number} - Average price
   */
  calculateAverage(items) {
    if (items.length === 0) return 0;

    const prices = items
      .map(item => item.totalPrice)
      .filter(price => price > 0);

    if (prices.length === 0) return 0;

    const sum = prices.reduce((acc, price) => acc + price, 0);
    return Math.round((sum / prices.length) * 100) / 100;
  }

  /**
   * Check if asking price is within acceptable variance of comps
   * @param {Number} askPrice - Current asking price (raw card)
   * @param {Object} comps - Comp data from getComps()
   * @param {Number} variancePercent - Acceptable variance (default 5%)
   * @returns {Object} - { withinRange: boolean, reason: string, lastComp: number }
   */
  isPriceWithinVariance(askPrice, comps, variancePercent = 5) {
    if (!comps.foundComps) {
      return {
        withinRange: null,
        reason: 'No comps found - manual review needed',
        lastComp: null
      };
    }

    // Use most recent PSA 10 comp as benchmark
    const lastComp = comps.psa10.recentSales && comps.psa10.recentSales.length > 0
      ? comps.psa10.recentSales[0].price
      : comps.psa10.avgPrice;

    if (!lastComp || lastComp === 0) {
      return {
        withinRange: null,
        reason: 'No valid comp price - manual review needed',
        lastComp: null
      };
    }

    // Calculate acceptable range
    // Raw card should be significantly cheaper than graded (to make profit)
    // But we'll check if it's within variance of what similar RAW cards should cost
    // Rough estimate: raw card should be 20-40% of PSA 10 value
    const estimatedRawValue = lastComp * 0.3; // 30% of PSA 10 value
    const maxAcceptable = estimatedRawValue * (1 + (variancePercent / 100));
    const minAcceptable = estimatedRawValue * (1 - (variancePercent / 100));

    const withinRange = askPrice <= maxAcceptable;

    return {
      withinRange,
      reason: withinRange
        ? `Price OK: $${askPrice} ≤ $${maxAcceptable.toFixed(2)} (${variancePercent}% variance)`
        : `Price too high: $${askPrice} > $${maxAcceptable.toFixed(2)} (${variancePercent}% variance)`,
      lastComp,
      estimatedRawValue: Math.round(estimatedRawValue * 100) / 100,
      maxAcceptable: Math.round(maxAcceptable * 100) / 100
    };
  }

  /**
   * Clear comp cache
   */
  clearCache() {
    this.cache = {};
  }
}

module.exports = CompAnalyzer;
