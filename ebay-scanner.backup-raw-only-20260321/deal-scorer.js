/**
 * Deal Scorer - Rates opportunities 1-10 based on multiple factors
 * Uses profit potential, card features, market timing, etc.
 */

class DealScorer {
  constructor() {
    // Hot keywords that increase score
    this.hotInserts = ['downtown', 'kaboom', 'manga', 'prizm', 'case hit'];
    this.starPlayers = [
      'michael jordan', 'lebron james', 'kobe bryant', 'luka doncic',
      'wembanyama', 'cooper flagg', 'paul skenes', 'aaron judge',
      'ken griffey', 'shohei ohtani', 'patrick mahomes', 'tom brady'
    ];
  }

  /**
   * Score a deal (1-10)
   * @param {Object} item - Card item
   * @param {Object} profitAnalysis - Profit analysis from CompAnalyzer
   * @returns {Object} - Score and breakdown
   */
  score(item, profitAnalysis) {
    let score = 5; // Start at baseline
    const breakdown = [];

    // PRICE BAND FILTERING (CRITICAL)
    // Check if price is in the sweet spot vs market value
    if (profitAnalysis && !profitAnalysis.insufficientData) {
      const marketValue = profitAnalysis.psa10Scenario?.avgCompPrice || 0;

      if (marketValue > 0) {
        const priceRatio = (item.totalPrice / marketValue) * 100;

        // TOO CHEAP = Suspicious (damaged, fake, or hidden issues)
        if (priceRatio < 40) {
          score = 0;
          breakdown.push(`🚫 REJECT: Too cheap (${priceRatio.toFixed(0)}% of market) - Likely damaged/fake`);
          return { score, rating: '❌ SKIP', breakdown, recommendation: 'Too cheap = suspicious' };
        }

        // TOO EXPENSIVE = Not enough margin
        if (priceRatio > 70) {
          score -= 2;
          breakdown.push(`⚠️ Price too high (${priceRatio.toFixed(0)}% of market) - Low margin (-2 points)`);
        }

        // SWEET SPOT = 40-70% of market
        if (priceRatio >= 40 && priceRatio <= 70) {
          if (priceRatio >= 50 && priceRatio <= 65) {
            // Perfect sweet spot!
            score += 2;
            breakdown.push(`🎯 Perfect price (${priceRatio.toFixed(0)}% of market) - Sweet spot! (+2 points)`);
          } else {
            score += 1;
            breakdown.push(`✓ Good price (${priceRatio.toFixed(0)}% of market) (+1 point)`);
          }
        }
      }
    }

    // Factor 1: Expected profit value
    if (profitAnalysis && !profitAnalysis.insufficientData) {
      const ev = profitAnalysis.expectedValue;

      if (ev > 300) {
        score += 3;
        breakdown.push(`🔥 EV > $300 (+3 points)`);
      } else if (ev > 200) {
        score += 2.5;
        breakdown.push(`🔥 EV > $200 (+2.5 points)`);
      } else if (ev > 100) {
        score += 2;
        breakdown.push(`⚡ EV > $100 (+2 points)`);
      } else if (ev > 50) {
        score += 1;
        breakdown.push(`💰 EV > $50 (+1 point)`);
      } else if (ev > 0) {
        score += 0.5;
        breakdown.push(`✓ Positive EV (+0.5 points)`);
      } else {
        score -= 1;
        breakdown.push(`⚠️ Negative EV (-1 point)`);
      }

      // Factor 2: ROI percentage
      const roi = profitAnalysis.roi;
      if (roi > 200) {
        score += 1.5;
        breakdown.push(`📈 ROI > 200% (+1.5 points)`);
      } else if (roi > 100) {
        score += 1;
        breakdown.push(`📈 ROI > 100% (+1 point)`);
      } else if (roi > 50) {
        score += 0.5;
        breakdown.push(`📈 ROI > 50% (+0.5 points)`);
      }
    }

    // Factor 3: Serial numbered cards
    const serialNum = this.extractSerialNumber(item.title);
    if (serialNum) {
      if (serialNum <= 10) {
        score += 2;
        breakdown.push(`🎯 Numbered /${serialNum} (+2 points)`);
      } else if (serialNum <= 50) {
        score += 1.5;
        breakdown.push(`🎯 Numbered /${serialNum} (+1.5 points)`);
      } else if (serialNum <= 100) {
        score += 1;
        breakdown.push(`🎯 Numbered /${serialNum} (+1 point)`);
      } else if (serialNum <= 500) {
        score += 0.5;
        breakdown.push(`🎯 Numbered /${serialNum} (+0.5 points)`);
      }
    }

    // Factor 4: Hot inserts
    const titleLower = item.title.toLowerCase();
    for (const insert of this.hotInserts) {
      if (titleLower.includes(insert)) {
        score += 1;
        breakdown.push(`🌟 Hot insert: ${insert} (+1 point)`);
        break; // Only count once
      }
    }

    // Factor 5: Star players
    for (const player of this.starPlayers) {
      if (titleLower.includes(player)) {
        score += 0.5;
        breakdown.push(`⭐ Star player: ${player} (+0.5 points)`);
        break; // Only count once
      }
    }

    // Factor 6: On-card autograph
    if (titleLower.includes('on card auto') || titleLower.includes('on-card auto')) {
      score += 1;
      breakdown.push(`✍️ On-card auto (+1 point)`);
    }

    // Factor 7: Rookie card
    if (titleLower.includes('rookie') || titleLower.includes(' rc ')) {
      score += 0.5;
      breakdown.push(`🆕 Rookie card (+0.5 points)`);
    }

    // Factor 8: Low price (higher ROI potential)
    if (item.totalPrice < 30) {
      score += 0.5;
      breakdown.push(`💵 Low entry price (+0.5 points)`);
    }

    // Factor 9: Seller reputation (ENHANCED)
    if (item.sellerPositivePercent >= 99.5) {
      score += 1;
      breakdown.push(`✅ Excellent seller (99.5%+) (+1 point)`);
    } else if (item.sellerPositivePercent >= 99) {
      score += 0.5;
      breakdown.push(`✅ Good seller (99%+) (+0.5 points)`);
    }

    // Bonus for experienced seller (500+ transactions)
    if (item.sellerFeedbackScore >= 1000) {
      score += 1;
      breakdown.push(`👍 Experienced seller (1000+ transactions) (+1 point)`);
    } else if (item.sellerFeedbackScore >= 500) {
      score += 0.5;
      breakdown.push(`👍 Established seller (500+ transactions) (+0.5 points)`);
    }

    // Bonus for Top Rated Seller
    if (item.sellerTopRated === true) {
      score += 1;
      breakdown.push(`⭐ Top Rated Seller (+1 point)`);
    }

    // Bonus for free/fast shipping
    if (item.shippingCost === 0) {
      score += 0.5;
      breakdown.push(`📦 Free shipping (+0.5 points)`);
    }

    // Bonus for returns accepted
    if (item.returnsAccepted === true) {
      score += 0.5;
      breakdown.push(`🔄 Returns accepted (+0.5 points)`);
    }

    // Penalties

    // Penalty 1: High price = higher risk
    if (item.totalPrice > 300) {
      score -= 0.5;
      breakdown.push(`⚠️ High price risk (-0.5 points)`);
    }

    // Penalty 2: Low seller feedback (shouldn't happen if filters working)
    if (item.sellerPositivePercent < 99) {
      score -= 2;
      breakdown.push(`⚠️ Lower seller rating (<99%) (-2 points)`);
    }

    // Penalty 3: New seller (< 500 transactions)
    if (item.sellerFeedbackScore < 500) {
      score -= 1;
      breakdown.push(`⚠️ New/unproven seller (-1 point)`);
    }

    // Penalty 4: High shipping cost (potential scam)
    if (item.shippingCost > 10) {
      score -= 1;
      breakdown.push(`⚠️ High shipping cost ($${item.shippingCost}) (-1 point)`);
    }

    // Penalty 5: No returns accepted
    if (item.returnsAccepted === false) {
      score -= 1;
      breakdown.push(`⚠️ No returns accepted (-1 point)`);
    }

    // Ensure score stays in 1-10 range
    score = Math.max(1, Math.min(10, score));
    score = Math.round(score * 10) / 10; // Round to 1 decimal

    // Determine rating
    const rating = this.getRating(score);

    return {
      score: score,
      rating: rating,
      breakdown: breakdown,
      recommendation: this.getRecommendation(score, profitAnalysis)
    };
  }

  /**
   * Extract serial number from title (e.g., "/50", "/249")
   * @param {String} title - Card title
   * @returns {Number|null} - Serial number or null
   */
  extractSerialNumber(title) {
    const match = title.match(/\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Get rating emoji based on score
   * @param {Number} score - Score (1-10)
   * @returns {String} - Rating emoji and text
   */
  getRating(score) {
    if (score >= 9) return '🔥🔥🔥 EXCEPTIONAL';
    if (score >= 8) return '🔥🔥 HOT';
    if (score >= 7) return '🔥 VERY GOOD';
    if (score >= 6) return '⚡ GOOD';
    if (score >= 5) return '💰 DECENT';
    if (score >= 4) return '✓ CONSIDER';
    if (score >= 3) return '⚠️ MARGINAL';
    return '❌ SKIP';
  }

  /**
   * Get recommendation based on score and profit analysis
   * @param {Number} score - Deal score
   * @param {Object} profitAnalysis - Profit analysis
   * @returns {String} - Recommendation
   */
  getRecommendation(score, profitAnalysis) {
    if (score >= 8) {
      return 'Strong buy - excellent opportunity with multiple positive factors';
    } else if (score >= 7) {
      return 'Very good opportunity - worth serious consideration';
    } else if (score >= 6) {
      return 'Good opportunity - review comps and card condition carefully';
    } else if (score >= 5) {
      return 'Decent opportunity - consider if it fits your strategy';
    } else if (score >= 4) {
      return 'Marginal opportunity - only if you have specific knowledge of this card';
    } else {
      return 'Skip - better opportunities available';
    }
  }

  /**
   * Batch score multiple items
   * @param {Array} items - Items to score
   * @param {Function} getProfitAnalysis - Function to get profit analysis for an item
   * @returns {Promise<Array>} - Items with scores
   */
  async batchScore(items, getProfitAnalysis) {
    const scoredItems = [];

    for (const item of items) {
      const profitAnalysis = await getProfitAnalysis(item);
      const dealScore = this.score(item, profitAnalysis);

      scoredItems.push({
        ...item,
        profitAnalysis: profitAnalysis,
        dealScore: dealScore
      });
    }

    // Sort by score (highest first)
    scoredItems.sort((a, b) => b.dealScore.score - a.dealScore.score);

    return scoredItems;
  }
}

module.exports = DealScorer;
