/**
 * Simple Scorer - No comp API calls, just listing quality
 * FAST scoring based on:
 * - Seller trust (50%)
 * - Listing quality (30%)
 * - Price (20% - lower is better)
 */

class SimpleScorer {
  /**
   * Score a card without comp lookups
   * @param {Object} item - eBay item
   * @returns {Object} - Score breakdown
   */
  score(item) {
    const scores = {
      seller: this.scoreSeller(item),
      listing: this.scoreListing(item),
      price: this.scorePrice(item)
    };

    // Weighted total (max 10)
    const total = (
      (scores.seller.score * 0.5) +  // 50%
      (scores.listing.score * 0.3) +  // 30%
      (scores.price.score * 0.2)      // 20%
    );

    return {
      totalScore: Math.round(total * 10) / 10,
      breakdown: scores,
      rating: this.getRating(total)
    };
  }

  /**
   * Score seller trust (0-10)
   */
  scoreSeller(item) {
    const feedback = parseFloat(item.sellerPositivePercent) || 0;
    const sales = item.sellerFeedbackScore || 0;

    let score = 0;
    let notes = [];

    // Feedback percentage
    if (feedback >= 99.5) {
      score += 5;
      notes.push('99.5%+ feedback');
    } else if (feedback >= 98) {
      score += 4;
      notes.push('98-99.5% feedback');
    } else if (feedback >= 95) {
      score += 3;
      notes.push('95-98% feedback');
    } else if (feedback >= 90) {
      score += 1;
      notes.push('90-95% feedback');
    } else {
      notes.push('<90% feedback - RISKY');
    }

    // Sales volume
    if (sales >= 1000) {
      score += 5;
      notes.push(`${sales} sales (TRUSTED)`);
    } else if (sales >= 500) {
      score += 4;
      notes.push(`${sales} sales (established)`);
    } else if (sales >= 100) {
      score += 3;
      notes.push(`${sales} sales`);
    } else {
      score += 1;
      notes.push(`${sales} sales (new seller)`);
    }

    return { score, notes };
  }

  /**
   * Score listing quality (0-10)
   */
  scoreListing(item) {
    const title = (item.title || '').toLowerCase();
    let score = 5; // Base score
    let signals = [];

    // Positive signals
    if (item.imageUrl && item.imageUrl !== '') {
      score += 1;
      signals.push('Has photos');
    }

    if (title.includes('mint') || title.includes('nm') || title.includes('near mint')) {
      score += 1;
      signals.push('Mint condition claimed');
    }

    if (title.includes('pack fresh') || title.includes('investment')) {
      score += 1;
      signals.push('Pack fresh / investment grade');
    }

    if (title.includes('refractor') || title.includes('prizm') || title.includes('chrome')) {
      score += 1;
      signals.push('Premium parallel');
    }

    // Check for serial number
    const serialMatch = title.match(/\/(\d+)/);
    if (serialMatch) {
      const num = parseInt(serialMatch[1]);
      if (num <= 25) {
        score += 2;
        signals.push(`Numbered /${num} - RARE`);
      } else if (num <= 99) {
        score += 1;
        signals.push(`Numbered /${num}`);
      }
    }

    // Negative signals
    if (title.includes('damaged') || title.includes('crease') || title.includes('worn')) {
      score -= 3;
      signals.push('⚠️ Damaged/worn');
    }

    if (title.includes('as-is') || title.includes('as is')) {
      score -= 2;
      signals.push('⚠️ Sold as-is');
    }

    // Cap at 10
    score = Math.min(Math.max(score, 0), 10);

    return { score, signals };
  }

  /**
   * Score price (0-10) - lower price = higher score
   */
  scorePrice(item) {
    const price = item.totalPrice || 0;
    let score = 0;
    let note = '';

    if (price < 25) {
      score = 10;
      note = 'Under $25 - LOW RISK';
    } else if (price < 50) {
      score = 8;
      note = '$25-50 - Low risk';
    } else if (price < 100) {
      score = 6;
      note = '$50-100 - Medium risk';
    } else if (price < 250) {
      score = 4;
      note = '$100-250 - Higher risk';
    } else {
      score = 2;
      note = '$250+ - High risk';
    }

    return { score, note, price };
  }

  /**
   * Get rating label
   */
  getRating(score) {
    if (score >= 9) return '🔥🔥🔥 EXCEPTIONAL';
    if (score >= 8) return '🔥🔥 GREAT';
    if (score >= 7) return '🔥 SOLID';
    if (score >= 6) return '✓ DECENT';
    if (score >= 5) return '~ MAYBE';
    return '❌ SKIP';
  }
}

module.exports = SimpleScorer;
