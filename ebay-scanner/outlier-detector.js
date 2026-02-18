/**
 * Outlier Detector - Identifies suspiciously priced listings
 *
 * PRINCIPLE: If EVERY other listing is $500 and this one is $200, it's damaged.
 *
 * Uses statistical analysis:
 * - Mean and standard deviation of recent comps
 * - Rejects extreme outliers (> 1.5 standard deviations below mean)
 * - Flags moderate outliers (> 1 standard deviation below mean)
 */

class OutlierDetector {
  constructor() {
    // Thresholds for outlier detection
    this.thresholds = {
      extremeOutlier: 1.5,  // Standard deviations below mean
      moderateOutlier: 1.0,
      minComps: 3           // Need at least 3 comps for statistical analysis
    };
  }

  /**
   * Detect if listing price is an outlier vs market comps
   * @param {Number} listingPrice - Current listing price
   * @param {Array} comps - Recent comp prices
   * @returns {Object} - Outlier analysis
   */
  detectOutlier(listingPrice, comps) {
    // Need enough data for statistical analysis
    if (!comps || comps.length < this.thresholds.minComps) {
      return {
        isOutlier: false,
        reason: 'Insufficient comp data',
        confidence: 'none',
        passed: true
      };
    }

    // Calculate statistics
    const stats = this.calculateStats(comps);
    const percentOfMean = (listingPrice / stats.mean) * 100;

    // Use PERCENTAGE-BASED approach (more practical than pure z-scores)
    // This aligns with deal-scorer.js sweet spot of 40-70%

    // TOO CHEAP = Suspicious (< 40% of market = likely damaged/fake)
    if (percentOfMean < 40) {
      return {
        isOutlier: true,
        reason: `EXTREME OUTLIER: ${Math.round(percentOfMean)}% of market (< 40% = suspicious)`,
        confidence: 'high',
        passed: false,
        stats: {
          listingPrice: listingPrice,
          marketMean: Math.round(stats.mean),
          marketMedian: Math.round(stats.median),
          stdDev: Math.round(stats.stdDev),
          percentOfMean: Math.round(percentOfMean)
        }
      };
    }

    // TOO EXPENSIVE = Bad deal (> 80% of market = not enough margin)
    if (percentOfMean > 80) {
      return {
        isOutlier: true,
        reason: `Price too high: ${Math.round(percentOfMean)}% of market (> 80% = low margin)`,
        confidence: 'high',
        passed: false,
        stats: {
          listingPrice: listingPrice,
          marketMean: Math.round(stats.mean),
          marketMedian: Math.round(stats.median),
          stdDev: Math.round(stats.stdDev),
          percentOfMean: Math.round(percentOfMean)
        }
      };
    }

    // SWEET SPOT = 40-80% of market
    // Perfect zone: 50-70%
    if (percentOfMean >= 50 && percentOfMean <= 70) {
      return {
        isOutlier: false,
        reason: `🎯 SWEET SPOT: ${Math.round(percentOfMean)}% of market (perfect pricing!)`,
        confidence: 'excellent',
        passed: true,
        stats: {
          listingPrice: listingPrice,
          marketMean: Math.round(stats.mean),
          marketMedian: Math.round(stats.median),
          stdDev: Math.round(stats.stdDev),
          percentOfMean: Math.round(percentOfMean)
        }
      };
    }

    // Good zone: 40-50% or 70-80%
    return {
      isOutlier: false,
      reason: `Good price: ${Math.round(percentOfMean)}% of market`,
      confidence: 'good',
      passed: true,
      stats: {
        listingPrice: listingPrice,
        marketMean: Math.round(stats.mean),
        marketMedian: Math.round(stats.median),
        stdDev: Math.round(stats.stdDev),
        percentOfMean: Math.round(percentOfMean)
      }
    };
  }

  /**
   * Calculate mean, median, and standard deviation
   * @param {Array} values - Array of prices
   * @returns {Object} - Statistics
   */
  calculateStats(values) {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0 };
    }

    // Sort for median
    const sorted = [...values].sort((a, b) => a - b);

    // Mean
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Standard deviation
    const variance = values.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0
    ) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, stdDev };
  }

  /**
   * Analyze item price vs comps
   * @param {Object} item - eBay listing item
   * @param {Object} comps - Comps from CompAnalyzer (psa10/psa9 data)
   * @returns {Object} - Outlier analysis
   */
  analyzeItem(item, comps) {
    // Extract comp prices
    let compPrices = [];

    // Try PSA 10 comps first
    if (comps.psa10 && comps.psa10.recentSales && comps.psa10.recentSales.length > 0) {
      compPrices = comps.psa10.recentSales.map(sale => sale.price);
    }
    // Fallback to PSA 9 if PSA 10 not available
    else if (comps.psa9 && comps.psa9.recentSales && comps.psa9.recentSales.length > 0) {
      compPrices = comps.psa9.recentSales.map(sale => sale.price);
    }

    // Run outlier detection
    return this.detectOutlier(item.totalPrice, compPrices);
  }

  /**
   * Filter items - remove extreme outliers
   * @param {Array} items - Items with comps
   * @returns {Array} - Filtered items
   */
  filterItems(items) {
    return items.filter(item => {
      if (!item.comps) return true; // No comp data = pass through

      const analysis = this.analyzeItem(item, item.comps);

      // Add analysis to item
      item.outlierAnalysis = analysis;

      // Only filter out extreme outliers
      return analysis.passed;
    });
  }

  /**
   * Get statistics on outlier detection
   * @param {Array} items - Items with comps
   * @returns {Object} - Statistics
   */
  getStats(items) {
    const analyses = items
      .filter(item => item.comps)
      .map(item => this.analyzeItem(item, item.comps));

    const stats = {
      total: analyses.length,
      extremeOutliers: 0,
      moderateOutliers: 0,
      normal: 0,
      tooExpensive: 0,
      insufficientData: 0
    };

    analyses.forEach(analysis => {
      if (analysis.confidence === 'none') {
        stats.insufficientData++;
      } else if (analysis.isOutlier && analysis.confidence === 'high' && !analysis.warning) {
        if (analysis.stats.zScore > 1.5) {
          stats.tooExpensive++;
        } else {
          stats.extremeOutliers++;
        }
      } else if (analysis.isOutlier && analysis.warning) {
        stats.moderateOutliers++;
      } else {
        stats.normal++;
      }
    });

    return stats;
  }

  /**
   * Check if price difference vs market is acceptable
   * @param {Number} listingPrice - Current listing price
   * @param {Number} marketPrice - Market average price
   * @returns {Object} - Result
   */
  checkPriceDifference(listingPrice, marketPrice) {
    if (marketPrice === 0) {
      return { acceptable: true, reason: 'No market data available' };
    }

    const percentOfMarket = (listingPrice / marketPrice) * 100;

    // Too cheap = suspicious (< 40%)
    if (percentOfMarket < 40) {
      return {
        acceptable: false,
        reason: `TOO CHEAP: ${percentOfMarket.toFixed(0)}% of market value`,
        percentOfMarket: Math.round(percentOfMarket)
      };
    }

    // Too expensive = bad deal (> 80%)
    if (percentOfMarket > 80) {
      return {
        acceptable: false,
        reason: `TOO EXPENSIVE: ${percentOfMarket.toFixed(0)}% of market value`,
        percentOfMarket: Math.round(percentOfMarket)
      };
    }

    // Sweet spot: 40-80% of market
    return {
      acceptable: true,
      reason: `Good price: ${percentOfMarket.toFixed(0)}% of market value`,
      percentOfMarket: Math.round(percentOfMarket)
    };
  }
}

module.exports = OutlierDetector;
