/**
 * Raw Card Filter
 * Excludes graded/slabbed cards and unwanted listings
 * Reads global rules from task-manager/ebay-scans-config.json
 */

const fs = require('fs');
const path = require('path');

class RawCardFilter {
  constructor(configPath = null) {
    // Default rules - will be overridden by config if available
    this.gradedKeywords = [
      // Grading companies
      'psa', 'bgs', 'cgc', 'sgc', 'bccg', 'ksa', 'ags', 'hga', 'cga', 'gma',
      // Grading indicators
      'graded', 'slab', 'slabbed', 'authenticated',
      // Grade numbers that indicate graded cards
      'psa 10', 'psa 9', 'psa 8', 'psa 7', 'bgs 9.5', 'bgs 10'
    ];
    this.excludeKeywords = [
      // Multiple cards
      'lot', 'lots', 'set', 'sets', 'bundle', 'collection', 'bulk',
      'mixed', '3 card', '5 card', '10 card', 'card lot',
      // Sealed product
      'pack', 'packs', 'box', 'sealed', 'case', 'hobby box',
      'blaster', 'hanger', 'mega box', 'fat pack', 'case break', 'break',
      // Fakes/non-authentic
      'reprint', 'reproduction', 'reprinted', 'custom', 'fan made',
      'homemade', 'bootleg', 'unlicensed', 'facsimile', 'photocopy',
      'commemorative',
      // Other junk
      'binder', 'album', 'mystery', 'random', 'store credit',
      'damaged', 'poor condition'
    ];
    this.qualityRules = {
      sellerFeedbackMin: 98,
      listingAgeMaxDays: 7,
      requireImages: true,
      requireRawCards: true
    };

    // Load config if available
    this.loadConfig(configPath);
  }

  loadConfig(configPath = null) {
    const defaultPath = path.join(__dirname, '..', 'task-manager', 'ebay-scans-config.json');
    const filePath = configPath || process.env.EBAY_SCANS_CONFIG || defaultPath;

    try {
      if (fs.existsSync(filePath)) {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (config.global_filters) {
          const gf = config.global_filters;
          if (gf.graded_keywords) this.gradedKeywords = gf.graded_keywords;
          if (gf.exclude_item_types) this.excludeKeywords = gf.exclude_item_types;
          if (gf.quality_rules) this.qualityRules = { ...this.qualityRules, ...gf.quality_rules };
          console.log('✓ RawCardFilter: Loaded rules from config');
        }
      }
    } catch (e) {
      console.warn('RawCardFilter: Using default rules (config not found)');
    }
  }

  /**
   * Get current rules (for display in dashboard)
   */
  getRules() {
    return {
      gradedKeywords: this.gradedKeywords,
      excludeKeywords: this.excludeKeywords,
      qualityRules: this.qualityRules
    };
  }

  /**
   * Check if a card is raw (not graded) and not an excluded item type
   */
  isRawCard(item) {
    const title = (item.title || '').toLowerCase();
    const condition = (item.condition || '').toLowerCase();

    // ALWAYS check title for graded keywords first - this is the most important filter
    for (const keyword of this.gradedKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }

    // Check for excluded keywords (packs, boxes, etc.)
    for (const keyword of this.excludeKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }

    // Check condition field - "Graded" means not raw
    if (condition.toLowerCase() === 'graded') {
      return false;
    }

    // If title passed all checks and condition is ungraded (or not specified), it's raw
    return true;
  }

  /**
   * Check quality rules
   */
  passesQualityRules(item) {
    // Seller feedback check
    if (this.qualityRules.sellerFeedbackMin && item.sellerPositivePercent) {
      if (item.sellerPositivePercent < this.qualityRules.sellerFeedbackMin) {
        return false;
      }
    }

    // Image requirement - check if imageUrl exists (Browse API doesn't return imageCount)
    if (this.qualityRules.requireImages && !item.imageUrl) {
      return false;
    }

    // Listing age check - skip very old listings
    if (this.qualityRules.listingAgeMaxDays && item.itemEndDate) {
      const endDate = new Date(item.itemEndDate);
      const now = new Date();
      const daysUntilEnd = (endDate - now) / (1000 * 60 * 60 * 24);
      // If auction ends more than listingAgeMaxDays from now, it's too new
      // If it already ended (negative), skip it
      if (daysUntilEnd < -1) {
        return false; // Already ended
      }
    }

    return true;
  }

  /**
   * Filter an array of items to raw cards only that pass quality rules
   */
  filterRawOnly(items) {
    return items.filter(item => this.isRawCard(item) && this.passesQualityRules(item));
  }

  /**
   * Get rejection reason for debugging/logging
   */
  getRejectionReason(item) {
    const title = (item.title || '').toLowerCase();
    const condition = (item.condition || '').toLowerCase();
    
    if (condition === 'graded') return 'Condition field = Graded';
    
    for (const keyword of this.gradedKeywords) {
      if (title.includes(keyword)) return `Graded keyword: "${keyword}"`;
    }
    for (const keyword of this.excludeKeywords) {
      if (title.includes(keyword)) return `Excluded keyword: "${keyword}"`;
    }
    if (!this.passesQualityRules(item)) return 'Failed quality rules';
    return null;
  }

  /**
   * Get stats on raw vs graded
   */
  getStats(items) {
    const raw = items.filter(item => this.isRawCard(item));
    const graded = items.filter(item => !this.isRawCard(item));

    return {
      total: items.length,
      raw: raw.length,
      graded: graded.length,
      rawPercent: items.length > 0 ? ((raw.length / items.length) * 100).toFixed(1) : 0
    };
  }
}

module.exports = RawCardFilter;
