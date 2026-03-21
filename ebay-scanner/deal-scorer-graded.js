/**
 * Deal Scorer for Graded Cards
 * Optimized for PSA/BGS/SGC graded cards
 * 
 * Differences from raw scorer:
 * - NO vision scoring (slabs obscure the card)
 * - Grade matching instead of condition signals
 * - Higher seller weight (trust matters more for expensive slabs)
 */

class DealScorerGraded {
  constructor(searchKeywords = '') {
    this.searchKeywords = searchKeywords.toLowerCase();
    this.weights = {
      sellerQuality: 0.25,      // 25% - Trust matters more for slabs
      searchRelevance: 0.40,   // 40% - Does it match what you want?
      gradeMatch: 0.20,         // 20% - Grade accuracy (PSA 10 vs 9)
      listingFreshness: 0.15   // 15% - Age matters
      // NO vision weight - not applicable for graded
    };
  }

  /**
   * Score a graded deal
   */
  score(item) {
    const sellerScore = this.scoreSellerQuality(item);
    const relevanceScore = this.scoreSearchRelevance(item);
    const gradeScore = this.scoreGradeMatch(item);
    const freshnessScore = this.scoreListingFreshness(item);

    // Calculate weighted total
    const totalScore = (
      ((sellerScore.points || 0) * this.weights.sellerQuality) +
      ((relevanceScore.points || 0) * this.weights.searchRelevance) +
      ((gradeScore.points || 0) * this.weights.gradeMatch) +
      ((freshnessScore.points || 0) * this.weights.listingFreshness)
    );

    // Normalize to 1-10 scale
    const finalScore = Math.max(0, Math.min(10, Math.round(totalScore * 10) / 10));

    return {
      score: finalScore,
      rating: this.getRating(finalScore),
      breakdown: {
        sellerQuality: sellerScore,
        searchRelevance: relevanceScore,
        gradeMatch: gradeScore,
        listingFreshness: freshnessScore
      },
      flags: this.getFlags(item, {
        sellerScore,
        relevanceScore,
        gradeScore,
        freshnessScore
      })
    };
  }

  /**
   * Seller Quality (25% weight)
   */
  scoreSellerQuality(item) {
    const feedback = item.sellerPositivePercent || 0;
    const salesCount = item.sellerFeedbackScore || 0;

    let points = 0;
    let tier = '';

    if (feedback >= 99 && salesCount >= 1000) {
      points = 10;
      tier = 'Elite seller';
    } else if (feedback >= 98 && salesCount >= 500) {
      points = 7.5;
      tier = 'Established seller';
    } else if (feedback >= 95 && salesCount >= 100) {
      points = 5;
      tier = 'Decent seller';
    } else if (feedback >= 90 || salesCount < 100) {
      points = 2.5;
      tier = 'New/low feedback seller';
    } else {
      points = 0;
      tier = 'Low trust seller';
    }

    return {
      points,
      maxPoints: 10,
      feedback,
      salesCount,
      tier,
      reason: `${feedback}% (${salesCount} sales) - ${tier}`
    };
  }

  /**
   * Grade Match (20% weight)
   * Extract grade from title and score based on quality
   */
  scoreGradeMatch(item) {
    const title = (item.title || '').toLowerCase();
    let points = 5;
    let grade = 'Unknown';
    let signals = [];

    // PSA grades
    if (title.includes('psa 10') || title.includes('psa gem mint')) {
      points = 10;
      grade = 'PSA 10';
      signals.push('PSA 10 - Perfect');
    } else if (title.includes('psa 9')) {
      points = 8;
      grade = 'PSA 9';
      signals.push('PSA 9 - Near Gem Mint');
    } else if (title.includes('psa 8')) {
      points = 6;
      grade = 'PSA 8';
      signals.push('PSA 8 - NM-MT+');
    } else if (title.includes('psa 7')) {
      points = 4;
      grade = 'PSA 7';
      signals.push('PSA 7 - NM-MT');
    } else if (title.includes('psa 6') || title.includes('psa 5') || title.includes('psa 4')) {
      points = 2;
      grade = 'PSA ' + (title.includes('psa 6') ? '6' : title.includes('psa 5') ? '5' : '4');
      signals.push('Lower grade - ' + grade);
    }

    // BGS grades
    else if (title.includes('bgs 10') || title.includes('bgs gem mint')) {
      points = 10;
      grade = 'BGS 10';
      signals.push('BGS 10 - Perfect');
    } else if (title.includes('bgs 9.5')) {
      points = 9;
      grade = 'BGS 9.5';
      signals.push('BGS 9.5 - Gem Mint');
    } else if (title.includes('bgs 9')) {
      points = 7;
      grade = 'BGS 9';
      signals.push('BGS 9 - NM-MT+');
    } else if (title.includes('bgs 8.5')) {
      points = 5;
      grade = 'BGS 8.5';
      signals.push('BGS 8.5 - NM-MT');
    } else if (title.includes('bgs 8')) {
      points = 4;
      grade = 'BGS 8';
      signals.push('BGS 8 - MT');
    }

    // SGC grades
    else if (title.includes('sgc 10')) {
      points = 10;
      grade = 'SGC 10';
      signals.push('SGC 10 - Pristine');
    } else if (title.includes('sgc 9.5')) {
      points = 8;
      grade = 'SGC 9.5';
      signals.push('SGC 9.5 - Gem Mint');
    } else if (title.includes('sgc 9')) {
      points = 6;
      grade = 'SGC 9';
      signals.push('SGC 9 - NM-MT+');
    }

    return {
      points,
      maxPoints: 10,
      grade,
      signals,
      reason: grade
    };
  }

  /**
   * Search Relevance (40% weight)
   */
  scoreSearchRelevance(item) {
    const title = (item.title || '').toLowerCase();
    const search = this.searchKeywords;

    let points = 0;
    let matches = [];

    if (!search || search.trim() === '') {
      return { points: 5, maxPoints: 10, matches: [], reason: 'No search keywords' };
    }

    // Player name matching
    const playerPatterns = [
      'michael jordan', 'mike jordan', 'jordan',
      'kobe bryant', 'kobe',
      'lebron james', 'lebron',
      'michael', 'mike'
    ];

    for (const player of playerPatterns) {
      if (search.includes(player) && title.includes(player)) {
        points += 3;
        matches.push(`Player: ${player}`);
        break;
      }
    }

    // Year matching
    const yearMatch = search.match(/19[89]\d|20[0-2]\d/);
    if (yearMatch) {
      if (title.includes(yearMatch[0])) {
        points += 2;
        matches.push(`Year: ${yearMatch[0]}`);
      }
    }

    // Brand/set matching
    const brands = ['topps', 'finest', 'chrome', 'upper deck', 'bowman', 'panini', 'prizm', 'optic'];
    for (const brand of brands) {
      if (search.includes(brand) && title.includes(brand)) {
        points += 1;
        matches.push(`Brand: ${brand}`);
      }
    }

    // Clamp
    points = Math.min(10, points);

    return {
      points,
      maxPoints: 10,
      matches,
      reason: matches.length > 0 ? matches.join(', ') : 'Low relevance'
    };
  }

  /**
   * Listing Freshness (15% weight)
   */
  scoreListingFreshness(item) {
    if (!item.itemEndDate) {
      return { points: 5, maxPoints: 10, ageInDays: null, reason: 'No date available' };
    }

    const endDate = new Date(item.itemEndDate);
    const now = new Date();
    const ageInDays = (now - endDate) / (1000 * 60 * 60 * 24);

    let points = 0;
    let tier = '';

    if (ageInDays < 1) {
      points = 10;
      tier = 'Listed <24 hours - FRESH';
    } else if (ageInDays <= 3) {
      points = 8;
      tier = 'Listed 1-3 days';
    } else if (ageInDays <= 7) {
      points = 6;
      tier = 'Listed this week';
    } else if (ageInDays <= 14) {
      points = 4;
      tier = 'Listed 2 weeks ago';
    } else if (ageInDays <= 30) {
      points = 2;
      tier = 'Listed this month';
    } else {
      points = 0;
      tier = 'Old listing';
    }

    return {
      points,
      maxPoints: 10,
      ageInDays: Math.round(ageInDays),
      tier,
      reason: tier
    };
  }

  /**
   * Get rating string
   */
  getRating(score) {
    if (score >= 9) return '🔥 HOT DEAL';
    if (score >= 8) return '✅ Great Deal';
    if (score >= 7) return '👍 Good Deal';
    if (score >= 5) return '⚠️ Fair Price';
    return '❌ Skip';
  }

  /**
   * Get flags
   */
  getFlags(item, scores) {
    const flags = [];
    const title = (item.title || '').toLowerCase();

    if (scores.sellerScore.points < 5) {
      flags.push('⚠️ Low feedback seller');
    }

    if (scores.gradeScore.grade === 'Unknown') {
      flags.push('⚠️ Unknown grade');
    }

    return flags;
  }
}

module.exports = DealScorerGraded;
