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
    this.gradedKeywords = ['psa', 'bgs', 'cgc', 'sgc', 'bccg', 'ksa', 'ags'];
    this.excludeKeywords = ['pack', 'packs', 'box', 'sealed', 'reprint', 'lot', 'set', 'bundle', 'collection', 'custom', 'fan made', 'reproduction'];
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

    // Check condition field - "Ungraded" means RAW, "Graded" means not raw
    if (condition === 'graded') {
      return false;
    }

    // Check for excluded keywords (packs, boxes, etc.)
    for (const keyword of this.excludeKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }

    // "Ungraded" is explicitly raw - don't check further
    if (condition === 'ungraded') {
      return true;
    }

    // Check title for graded keywords
    for (const keyword of this.gradedKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }

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

    return true;
  }

  /**
   * Filter an array of items to raw cards only that pass quality rules
   */
  filterRawOnly(items) {
    return items.filter(item => this.isRawCard(item) && this.passesQualityRules(item));
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
