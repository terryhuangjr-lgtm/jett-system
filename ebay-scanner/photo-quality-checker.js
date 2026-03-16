/**
 * Photo Quality Checker - Validates listing completeness
 * Focuses on photo count, completeness, and visibility of key card features
 */

class PhotoQualityChecker {
  constructor() {
    // Keywords that indicate good centering
    this.centeringKeywords = [
      'centered', 'well centered', 'good centering', '50/50', '55/45',
      'centered perfectly', 'nice centering'
    ];

    // Keywords that indicate bad centering
    this.badCenteringKeywords = [
      'off center', 'off-center', 'oc', 'miscut', 'poor centering',
      '70/30', '80/20', '90/10'
    ];

    // Keywords that indicate good corners
    this.cornerKeywords = [
      'sharp corners', 'nice corners', 'mint corners', 'perfect corners',
      'clean corners', 'nm corners'
    ];

    // Keywords that indicate bad corners
    this.badCornerKeywords = [
      'soft corners', 'white corners', 'worn corners', 'damaged corners',
      'corner wear', 'chipped corners', 'rounded corners'
    ];

    // Red flag keywords (auto-reject)
    this.redFlags = [
      'damaged', 'crease', 'creased', 'stain', 'tear', 'torn',
      'water damage', 'surface damage', 'print line', 'scratched'
    ];
  }

  /**
   * Check photo quality and completeness
   * @param {Object} item - eBay listing item
   * @returns {Object} - Photo quality analysis
   */
  checkPhotoQuality(item) {
    const analysis = {
      photoCount: 0,
      hasBackPhoto: false,
      cornersVisible: false,
      photoQualityScore: 5, // Start at baseline
      issues: [],
      passed: true,
      redFlags: []
    };

    // Extract title and description (if available)
    const title = (item.title || '').toLowerCase();
    const description = (item.subtitle || item.condition || '').toLowerCase();
    const combined = `${title} ${description}`;

    // Count photos (estimate from eBay data)
    // Note: eBay Browse API doesn't give us exact photo count,
    // We'll assume sellers have multiple photos unless otherwise indicated
    if (item.imageUrl) analysis.photoCount = 1;
    if (item.additionalImages && item.additionalImages.length > 0) {
      analysis.photoCount += item.additionalImages.length;
    } else {
      // API doesn't provide full photo count, assume average listing has 3-4 photos
      // Only reject if seller explicitly mentions "1 photo only" in title
      analysis.photoCount = 3; // Assumed default
    }

    // Photo count scoring
    if (analysis.photoCount === 0) {
      analysis.issues.push('❌ No photos available');
      analysis.photoQualityScore = 0;
      analysis.passed = false;
    } else if (title.includes('1 photo') || title.includes('single photo')) {
      // Only reject if explicitly stated
      analysis.photoCount = 1;
      analysis.issues.push('⚠️ Only 1 photo stated - cannot verify condition');
      analysis.photoQualityScore = 2;
      analysis.passed = false;
    } else if (analysis.photoCount >= 3) {
      analysis.photoQualityScore = 7;
      analysis.issues.push('✓ Photos available (assumed multiple)');
    }

    // Check if back photo mentioned
    if (combined.includes('front and back') ||
        combined.includes('front & back') ||
        combined.includes('both sides') ||
        analysis.photoCount >= 4) {
      analysis.hasBackPhoto = true;
      analysis.photoQualityScore += 1;
      analysis.issues.push('✓ Back of card likely shown');
    }

    // Check for corner visibility mentions
    if (this.cornerKeywords.some(kw => combined.includes(kw))) {
      analysis.cornersVisible = true;
      analysis.photoQualityScore += 1;
      analysis.issues.push('✓ Sharp corners mentioned');
    }

    // Cap score at 10
    analysis.photoQualityScore = Math.min(10, analysis.photoQualityScore);

    return analysis;
  }

  /**
   * Check centering and corners from title/description
   * @param {Object} item - eBay listing item
   * @returns {Object} - Condition analysis
   */
  checkCondition(item) {
    const analysis = {
      centering: 'unknown',
      centeringScore: 5,
      corners: 'unknown',
      cornerScore: 5,
      overallCondition: 'unknown',
      issues: [],
      passed: true,
      confidence: 'low'
    };

    const title = (item.title || '').toLowerCase();
    const description = (item.subtitle || item.condition || '').toLowerCase();
    const combined = `${title} ${description}`;

    // CHECK FOR RED FLAGS FIRST (auto-reject)
    const foundRedFlags = this.redFlags.filter(flag => combined.includes(flag));
    if (foundRedFlags.length > 0) {
      analysis.passed = false;
      analysis.issues.push(`🚫 RED FLAG: ${foundRedFlags.join(', ')}`);
      analysis.centering = 'damaged';
      analysis.corners = 'damaged';
      analysis.overallCondition = 'reject';
      analysis.confidence = 'high';
      return analysis;
    }

    // Check centering
    if (this.centeringKeywords.some(kw => combined.includes(kw))) {
      analysis.centering = 'good';
      analysis.centeringScore = 9;
      analysis.confidence = 'medium';
      analysis.issues.push('✅ Good centering indicated');
    } else if (this.badCenteringKeywords.some(kw => combined.includes(kw))) {
      analysis.centering = 'poor';
      analysis.centeringScore = 2;
      analysis.passed = false;
      analysis.confidence = 'high';
      analysis.issues.push('❌ Off-center - SKIP');
    }

    // Check corners
    if (this.cornerKeywords.some(kw => combined.includes(kw))) {
      analysis.corners = 'sharp';
      analysis.cornerScore = 9;
      analysis.confidence = 'medium';
      analysis.issues.push('✅ Sharp corners indicated');
    } else if (this.badCornerKeywords.some(kw => combined.includes(kw))) {
      analysis.corners = 'worn';
      analysis.cornerScore = 2;
      analysis.passed = false;
      analysis.confidence = 'high';
      analysis.issues.push('❌ Worn corners - SKIP');
    }

    // Overall condition assessment
    if (combined.includes('nm-mt') || combined.includes('gem mint')) {
      analysis.overallCondition = 'excellent';
      analysis.confidence = 'medium';
      analysis.issues.push('✓ Gem Mint/NM-MT condition');
    } else if (combined.includes('near mint') || combined.includes('nm')) {
      analysis.overallCondition = 'good';
      analysis.confidence = 'low';
      analysis.issues.push('✓ Near Mint condition');
    } else if (combined.includes('excellent') || combined.includes('mint')) {
      analysis.overallCondition = 'good';
      analysis.confidence = 'low';
    }

    // If no info available, mark as unknown (don't reject)
    if (analysis.centering === 'unknown' && analysis.corners === 'unknown') {
      analysis.issues.push('⚠️ No condition details in listing');
      analysis.confidence = 'very low';
    }

    return analysis;
  }

  /**
   * Complete listing quality check
   * @param {Object} item - eBay listing item
   * @returns {Object} - Complete quality analysis
   */
  analyzeListing(item) {
    const photoAnalysis = this.checkPhotoQuality(item);
    const conditionAnalysis = this.checkCondition(item);

    // Combine analyses
    const completeAnalysis = {
      photoQuality: photoAnalysis,
      condition: conditionAnalysis,

      // Overall pass/fail
      passed: photoAnalysis.passed && conditionAnalysis.passed,

      // Combined score (1-10)
      listingQualityScore: Math.round(
        (photoAnalysis.photoQualityScore * 0.4) +
        ((conditionAnalysis.centeringScore + conditionAnalysis.cornerScore) / 2 * 0.6)
      ),

      // Recommendation
      recommendation: this.getRecommendation(photoAnalysis, conditionAnalysis)
    };

    return completeAnalysis;
  }

  /**
   * Get recommendation based on analysis
   * @param {Object} photoAnalysis - Photo quality analysis
   * @param {Object} conditionAnalysis - Condition analysis
   * @returns {String} - Recommendation
   */
  getRecommendation(photoAnalysis, conditionAnalysis) {
    // Red flags = auto-reject
    if (!conditionAnalysis.passed) {
      return '🚫 REJECT - Condition issues identified';
    }

    // Explicitly stated 1 photo only = skip
    if (photoAnalysis.photoCount === 1) {
      return '⚠️ SKIP - Only 1 photo stated';
    }

    // Good centering + sharp corners = strong candidate
    if (conditionAnalysis.centering === 'good' &&
        conditionAnalysis.corners === 'sharp') {
      return '🔥 EXCELLENT - Strong grading candidate';
    }

    // Either centering or corners good = proceed with caution
    if (conditionAnalysis.centering === 'good' ||
        conditionAnalysis.corners === 'sharp') {
      return '✅ GOOD - One key factor confirmed';
    }

    // No info = PASS (don't reject, let profit analysis decide)
    // Seller didn't mention condition issues, so assume it's worth checking
    if (conditionAnalysis.centering === 'unknown' &&
        conditionAnalysis.corners === 'unknown') {
      return '✅ PROCEED - No red flags detected';
    }

    // Default
    return '✅ PROCEED - Check profit potential';
  }

  /**
   * Adjust deal score based on listing quality
   * @param {Number} baseScore - Original deal score
   * @param {Object} qualityAnalysis - Quality analysis
   * @returns {Number} - Adjusted score
   */
  adjustDealScore(baseScore, qualityAnalysis) {
    let adjustedScore = baseScore;

    // Red flags or bad condition = reject (score 0)
    if (!qualityAnalysis.passed) {
      return 0;
    }

    // Bonus for good centering (most important)
    if (qualityAnalysis.condition.centering === 'good') {
      adjustedScore += 1.5;
    }

    // Bonus for sharp corners (second most important)
    if (qualityAnalysis.condition.corners === 'sharp') {
      adjustedScore += 1.5;
    }

    // Bonus for multiple photos
    if (qualityAnalysis.photoQuality.photoCount >= 4) {
      adjustedScore += 0.5;
    }

    // Penalty for only 2 photos
    if (qualityAnalysis.photoQuality.photoCount === 2) {
      adjustedScore -= 0.5;
    }

    // Cap at 10
    return Math.min(10, Math.max(0, adjustedScore));
  }
}

module.exports = PhotoQualityChecker;
