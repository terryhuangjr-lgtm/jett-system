/**
 * Scam Detection Logic
 * Catches common eBay card scams
 */

class ScamDetector {
  
  /**
   * Check for title/card mismatches
   */
  static checkTitleMismatch(title, description = '') {
    const text = (title + ' ' + description).toLowerCase();
    
    // Red flags: Title claims high-value card but listing contains these
    const scamIndicators = [
      'checklist',
      'team card',
      'team checklist',
      'leader card',
      'subset',
      'promo card',
      'reprint',
      'reproduction',
      'facsimile',
      'not the actual card',
      'similar to',
      'style of'
    ];
    
    for (const indicator of scamIndicators) {
      if (text.includes(indicator)) {
        return {
          isScam: true,
          reason: `Potential scam: Contains "${indicator}" in listing`,
          confidence: 'high'
        };
      }
    }
    
    return { isScam: false };
  }
  
  /**
   * Check for price manipulation tactics
   */
  static checkPriceTooGoodToBeTrue(title, price, estimatedValue) {
    // If price is <10% of estimated value, very suspicious
    if (estimatedValue > 0 && price < (estimatedValue * 0.1)) {
      return {
        isScam: true,
        reason: `Price too low ($${price} vs estimated $${estimatedValue})`,
        confidence: 'medium'
      };
    }
    
    return { isScam: false };
  }
  
  /**
   * Check for low-quality seller tactics
   */
  static checkSellerRedFlags(sellerFeedback, sellerRating) {
    // Very low feedback + claiming high-value cards = suspicious
    if (sellerFeedback < 100 && sellerRating < 95) {
      return {
        isScam: true,
        reason: 'Low seller reputation claiming valuable cards',
        confidence: 'low'
      };
    }
    
    return { isScam: false };
  }
  
  /**
   * Master scam check - run all checks
   */
  static analyze(item) {
    const checks = [
      this.checkTitleMismatch(item.title, item.description),
      this.checkPriceTooGoodToBeTrue(
        item.title, 
        item.totalPrice, 
        item.profitAnalysis?.psa10Scenario?.avgCompPrice || 0
      ),
      this.checkSellerRedFlags(
        item.sellerFeedbackScore,
        parseFloat(item.sellerPositivePercent)
      )
    ];
    
    // If any check flags as scam, reject
    const scamCheck = checks.find(c => c.isScam);
    
    if (scamCheck) {
      return {
        passed: false,
        ...scamCheck
      };
    }
    
    return {
      passed: true,
      isScam: false
    };
  }
}

module.exports = ScamDetector;
