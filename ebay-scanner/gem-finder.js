/**
 * eBay Gem Finder - Finds undervalued sports cards with grading potential
 * Implements search criteria from EBAY-SEARCH-CRITERIA.md
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const SinglesFilter = require('./singles-filter');
const AdvancedFilter = require('./advanced-filter');
const fs = require('fs');
const path = require('path');

class GemFinder {
  constructor() {
    this.client = new EbayBrowseAPI();
    this.advancedFilter = new AdvancedFilter();
    this.searches = this.loadSearches();
  }

  /**
   * Load search configurations
   */
  loadSearches() {
    return {
      rookieCards: {
        name: 'Rookie Cards (Raw)',
        keywords: 'rookie card raw ungraded',
        categoryId: '261328',
        minPrice: 10,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab'],
        sortOrder: 'EndTimeSoonest',
        condition: 'New'
      },

      serialNumbered: {
        name: 'Serial Numbered (/500 or less)',
        keywords: 'serial numbered /500 /250 /100 /50 /25 /10 /5 /1',
        categoryId: '261328',
        minPrice: 10,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'graded'],
        sortOrder: 'PricePlusShippingLowest',
        condition: 'New'
      },

      onCardAutos: {
        name: 'On-Card Autographs',
        keywords: 'on card auto autograph rookie',
        categoryId: '261328',
        minPrice: 25,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'graded', 'sticker auto'],
        sortOrder: 'EndTimeSoonest',
        condition: 'New'
      },

      hotInserts: {
        name: 'Hot Inserts (Downtown/Kaboom/Manga)',
        keywords: '(downtown OR kaboom OR prizm manga) rookie',
        categoryId: '261328',
        minPrice: 10,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'graded'],
        sortOrder: 'EndTimeSoonest',
        condition: 'New'
      },

      michaelJordan: {
        name: 'Michael Jordan',
        keywords: 'michael jordan raw ungraded',
        categoryId: '212',
        minPrice: 10,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'graded', 'reprint'],
        sortOrder: 'PricePlusShippingLowest',
        condition: 'New'
      },

      kenGriffey: {
        name: 'Ken Griffey Jr',
        keywords: 'ken griffey jr rookie raw',
        categoryId: '212',
        minPrice: 10,
        maxPrice: 500,
        excludeKeywords: ['PSA', 'BGS', 'graded'],
        sortOrder: 'PricePlusShippingLowest',
        condition: 'New'
      },

      currentRookies: {
        name: 'Current Rookies (2025-26)',
        keywords: '(cooper flagg OR derik queen) rookie prizm',
        categoryId: '261328',
        minPrice: 10,
        maxPrice: 300,
        excludeKeywords: ['PSA', 'BGS', 'graded'],
        sortOrder: 'EndTimeSoonest',
        condition: 'New'
      }
    };
  }

  /**
   * Run all searches and return results
   * @param {String} searchKey - Optional specific search to run
   * @returns {Promise<Object>} - Search results
   */
  async runSearches(searchKey = null) {
    const results = {};
    const timestamp = new Date().toISOString();

    console.log(`\n🔍 eBay Gem Finder - Starting searches at ${new Date().toLocaleString()}\n`);

    // Run specific search or all searches
    const searchesToRun = searchKey
      ? { [searchKey]: this.searches[searchKey] }
      : this.searches;

    for (const [key, search] of Object.entries(searchesToRun)) {
      try {
        console.log(`🎯 Searching: ${search.name}...`);

        const items = await this.client.search(search);

        console.log(`   Found ${items.length} items`);

        // Filter items
        const filtered = this.filterItems(items, search);
        console.log(`   ✓ ${filtered.length} items passed filters\n`);

        results[key] = {
          searchName: search.name,
          searchParams: search,
          totalFound: items.length,
          filtered: filtered.length,
          items: filtered,
          timestamp: timestamp
        };

      } catch (error) {
        console.error(`   ✗ Error: ${error.message}\n`);
        results[key] = {
          searchName: search.name,
          error: error.message,
          timestamp: timestamp
        };
      }
    }

    return results;
  }

  /**
   * Filter items based on quality criteria
   * @param {Array} items - Items to filter
   * @param {Object} searchConfig - Search configuration
   * @returns {Array} - Filtered items
   */
  filterItems(items, searchConfig) {
    return items.filter(item => {
      // SELLER REPUTATION CHECK (CRITICAL)
      // 99%+ feedback (not 98%)
      if (item.sellerPositivePercent < 99) {
        return false;
      }

      // 500+ transactions (experienced seller)
      if (item.sellerFeedbackScore < 500) {
        return false;
      }

      // Top Rated Seller badge (if available in API)
      // Note: Browse API may not provide this, check when available
      if (item.sellerTopRated === false) {
        return false;
      }

      // Free/Fast shipping preferred (if available)
      if (item.shippingCost > 10) {
        // High shipping cost = potential scam or poor service
        // Allow but reduce score later
      }

      // Returns accepted (if available in API)
      // Note: Browse API may not provide this
      if (item.returnsAccepted === false) {
        return false;
      }

      // Must have image
      if (!item.imageUrl) {
        return false;
      }

      // Price must be in range
      if (item.totalPrice < searchConfig.minPrice ||
          item.totalPrice > searchConfig.maxPrice) {
        return false;
      }

      // ADVANCED FILTER - Singles only, no reprints, no customs, etc.
      const filterResult = this.advancedFilter.filter(item, {
        singlesOnly: true,    // PERMANENT RULE
        allowBase: true,      // Allow base cards (can adjust per search)
        maxListingAge: 7      // Only show listings from last 7 days
      });

      if (!filterResult.passed) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get comps for a specific card
   * @param {String} cardName - Card name to search
   * @returns {Promise<Object>} - Comp analysis
   */
  async getComps(cardName) {
    try {
      // Search for PSA 10 comps
      const psa10Query = `${cardName} PSA 10`;
      const psa10Items = await this.client.getSoldComps(psa10Query);

      // Search for PSA 9 comps
      const psa9Query = `${cardName} PSA 9`;
      const psa9Items = await this.client.getSoldComps(psa9Query);

      // Calculate averages
      const psa10Avg = this.calculateAverage(psa10Items);
      const psa9Avg = this.calculateAverage(psa9Items);

      return {
        psa10: {
          avgPrice: psa10Avg,
          count: psa10Items.length,
          recent: psa10Items.slice(0, 5).map(i => i.totalPrice)
        },
        psa9: {
          avgPrice: psa9Avg,
          count: psa9Items.length,
          recent: psa9Items.slice(0, 5).map(i => i.totalPrice)
        }
      };

    } catch (error) {
      console.error('Error getting comps:', error.message);
      return null;
    }
  }

  /**
   * Calculate average price from items
   * @param {Array} items - Items to average
   * @returns {Number} - Average price
   */
  calculateAverage(items) {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + item.totalPrice, 0);
    return Math.round((sum / items.length) * 100) / 100;
  }

  /**
   * Calculate profit potential
   * @param {Number} currentPrice - Current raw card price
   * @param {Object} comps - Comp data
   * @returns {Object} - Profit analysis
   */
  calculateProfit(currentPrice, comps) {
    const gradingCost = 20;
    const totalCost = currentPrice + gradingCost;

    // PSA 10 profit
    const psa10Profit = comps.psa10.avgPrice - totalCost;

    // PSA 9 profit (assuming PSA 9 is 40% of PSA 10 value)
    const psa9EstValue = comps.psa10.avgPrice * 0.4;
    const psa9Profit = psa9EstValue - totalCost;

    // Expected value (50% PSA 10, 40% PSA 9, 10% lower)
    const expectedValue = (0.5 * psa10Profit) + (0.4 * psa9Profit);

    return {
      cost: totalCost,
      psa10Profit: Math.round(psa10Profit * 100) / 100,
      psa9Profit: Math.round(psa9Profit * 100) / 100,
      expectedValue: Math.round(expectedValue * 100) / 100,
      multiplier: totalCost > 0 ? Math.round((comps.psa10.avgPrice / totalCost) * 10) / 10 : 0
    };
  }

  /**
   * Save results to file
   * @param {Object} results - Results to save
   * @param {String} filename - Output filename
   */
  saveResults(results, filename = null) {
    const outputDir = path.join(__dirname, 'results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const outputFile = filename || path.join(outputDir, `scan-${date}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}\n`);

    return outputFile;
  }
}

module.exports = GemFinder;
