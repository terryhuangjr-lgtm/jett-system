/**
 * Advanced Filter - Comprehensive filtering rules for card searches
 *
 * PERMANENT RULES:
 * 1. SINGLES ONLY - No lots, boxes, packs, or multi-card listings
 * 2. NO REPRINTS - Only original/authentic cards
 * 3. NO CUSTOMS - No fan-made or custom cards
 * 4. NO STICKERS - No sticker cards or decals
 */

class AdvancedFilter {

  constructor() {
    // RULE 1: Lot/Multi-card indicators
    this.lotKeywords = [
      ' lot', 'lot of', 'lots', 'card lot',
      'near set', 'complete set', 'partial set', 'team set',
      'bulk', 'collection', 'mixed', 'bundle',
      'assorted', 'various', 'multi', 'multiple',
      'combo', 'group', 'pack of'
    ];

    // RULE 2: Sealed product indicators (boxes, packs, cases)
    // REFINED: Removed 'sealed', 'box', 'pack' (too broad - blocks "box topper", "pack fresh", etc.)
    this.sealedProductKeywords = [
      'hobby box', 'retail box', 'jumbo box', 'blaster box',
      'case', 'blaster', 'hanger', 'mega box', 'value box',
      'fat pack', 'cello pack', 'wax box', 'wax case'
    ];

    // Exceptions for sealed products (these are OK)
    this.sealedExceptions = [
      'box topper',           // Premium insert from boxes
      'pack fresh',           // Freshly pulled (good signal!)
      'factory sealed single',// Sealed single card (legitimate)
      'sealed in case',       // Protected/slabbed
      'sealed toploader'      // Protected in toploader
    ];

    // RULE 3: Reprint/Reproduction indicators
    this.reprintKeywords = [
      'reprint', 'reproduction', 'reprinted',
      'copy', 'facsimile', 'bootleg',
      'unlicensed', 'unauthorized'
    ];

    // RULE 4: Custom/Fan-made indicators
    // REFINED: Removed 'commemorative' (too broad - blocks official commemorative sets)
    this.customKeywords = [
      'custom', 'fan made', 'homemade', 'hand made',
      'art card', 'aceo', 'fantasy card', 'tribute card'
    ];

    // RULE 5: Sticker/Decal indicators
    this.stickerKeywords = [
      'sticker', 'stickers', 'decal', 'peel',
      'tattoo', 'puffy sticker'
    ];

    // RULE 6: Non-card items
    // REFINED: Removed 'photo' (too broad - blocks "photo variation" parallels)
    this.nonCardKeywords = [
      'poster', 'photograph print', 'print only',
      'newspaper', 'magazine', 'book', 'guide',
      'display case', 'plaque', 'framed print',
      'jersey card', 'autograph ball'
    ];

    // Card-related exceptions (these ARE cards)
    this.cardExceptions = [
      'photo variation',      // Legitimate parallel type
      'photo match',          // Autograph/patch description
      'memorabilia card',     // Jersey/patch card
      'game used'             // Game-used memorabilia card
    ];

    // RULE 7: Base card indicators (when searching for inserts/parallels only)
    this.baseCardKeywords = [
      'base card', 'base set', 'common', 'commons',
      'regular issue', 'standard'
    ];
  }

  /**
   * Main filter - check if item passes ALL rules
   * @param {Object} item - eBay listing item
   * @param {Object} options - Filter options
   * @returns {Object} - { passed: boolean, reason: string }
   */
  filter(item, options = {}) {
    const title = (item.title || '').toLowerCase();
    const description = (item.subtitle || item.condition || '').toLowerCase();
    const combined = `${title} ${description}`;

    // Default options
    const {
      allowBase = true,         // Allow base cards by default
      requireInsert = false,    // Don't require inserts by default
      singlesOnly = true,       // ALWAYS true (permanent rule)
      maxListingAge = 21        // Only show listings from last 21 days (loosened from 7)
    } = options;

    // RULE 1: Singles only (permanent)
    if (singlesOnly) {
      const lotCheck = this.checkLots(combined);
      if (!lotCheck.passed) {
        return { passed: false, reason: `LOT: ${lotCheck.reason}` };
      }
    }

    // RULE 2: No sealed products
    const sealedCheck = this.checkSealed(combined);
    if (!sealedCheck.passed) {
      return { passed: false, reason: `SEALED: ${sealedCheck.reason}` };
    }

    // RULE 3: No reprints
    const reprintCheck = this.checkReprints(combined);
    if (!reprintCheck.passed) {
      return { passed: false, reason: `REPRINT: ${reprintCheck.reason}` };
    }

    // RULE 4: No customs
    const customCheck = this.checkCustoms(combined);
    if (!customCheck.passed) {
      return { passed: false, reason: `CUSTOM: ${customCheck.reason}` };
    }

    // RULE 5: No stickers (unless it's "sticker auto" which is legit)
    const stickerCheck = this.checkStickers(combined);
    if (!stickerCheck.passed) {
      return { passed: false, reason: `STICKER: ${stickerCheck.reason}` };
    }

    // RULE 6: No non-card items
    const nonCardCheck = this.checkNonCards(combined);
    if (!nonCardCheck.passed) {
      return { passed: false, reason: `NON-CARD: ${nonCardCheck.reason}` };
    }

    // RULE 7: Base cards (optional filter)
    if (!allowBase) {
      const baseCheck = this.checkBase(combined);
      if (!baseCheck.passed) {
        return { passed: false, reason: `BASE: ${baseCheck.reason}` };
      }
    }

    // RULE 8: Listing age (fresh listings only)
    if (maxListingAge) {
      const ageCheck = this.checkListingAge(item, maxListingAge);
      if (!ageCheck.passed) {
        return { passed: false, reason: `OLD: ${ageCheck.reason}` };
      }
    }

    // All checks passed
    return { passed: true, reason: null };
  }

  /**
   * Check for lots/multi-card listings
   */
  checkLots(text) {
    // Check lot keywords
    for (const keyword of this.lotKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }

    // Check number patterns (e.g., "5 cards", "3+")
    if (text.match(/\d+\s*(card|cards)(?!\s*#)/)) {
      return { passed: false, reason: 'Multiple cards indicated (number)' };
    }

    if (text.match(/\d+\+\s*(card|cards)?/)) {
      return { passed: false, reason: 'Multiple cards (+ notation)' };
    }

    return { passed: true };
  }

  /**
   * Check for sealed products
   */
  checkSealed(text) {
    // Check exceptions FIRST (box topper, pack fresh, etc. are OK)
    for (const exception of this.sealedExceptions) {
      if (text.includes(exception)) {
        return { passed: true }; // Exception found - allow it
      }
    }

    // Now check for sealed product keywords
    for (const keyword of this.sealedProductKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check for reprints
   */
  checkReprints(text) {
    for (const keyword of this.reprintKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check for custom/fan-made cards
   */
  checkCustoms(text) {
    for (const keyword of this.customKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check for stickers (but allow "sticker auto" which is legitimate)
   */
  checkStickers(text) {
    // "sticker auto" is OK (it's a card with sticker autograph)
    if (text.includes('sticker auto')) {
      return { passed: true };
    }

    for (const keyword of this.stickerKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check for non-card items
   */
  checkNonCards(text) {
    // Check exceptions FIRST (photo variation, memorabilia card, etc. are OK)
    for (const exception of this.cardExceptions) {
      if (text.includes(exception)) {
        return { passed: true }; // Exception found - it IS a card
      }
    }

    // Now check for non-card keywords
    for (const keyword of this.nonCardKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Contains "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check if it's a base card (when searching for inserts only)
   */
  checkBase(text) {
    for (const keyword of this.baseCardKeywords) {
      if (text.includes(keyword)) {
        return { passed: false, reason: `Base card: "${keyword}"` };
      }
    }
    return { passed: true };
  }

  /**
   * Check listing age (fresh listings only)
   * Red flag: Cards listed 30+ days ago that haven't sold
   * @param {Object} item - eBay listing item
   * @param {Number} maxDays - Max listing age in days
   * @returns {Object} - { passed: boolean, reason: string }
   */
  checkListingAge(item, maxDays = 7) {
    // Check if we have listing start date
    if (!item.itemCreationDate && !item.itemEndDate) {
      // No date info available - allow it (can't filter what we can't check)
      return { passed: true };
    }

    const now = Date.now();
    let listingDate;

    // Try itemCreationDate first (when listing was created)
    if (item.itemCreationDate) {
      listingDate = new Date(item.itemCreationDate).getTime();
    }
    // Fallback: calculate from end date if it's an auction
    else if (item.itemEndDate && item.listingType === 'AUCTION') {
      const endDate = new Date(item.itemEndDate).getTime();
      // Auctions typically run 7-10 days, estimate start date
      listingDate = endDate - (7 * 24 * 60 * 60 * 1000);
    }

    if (!listingDate) {
      // No date info - allow it
      return { passed: true };
    }

    // Calculate age in days
    const ageInDays = (now - listingDate) / (1000 * 60 * 60 * 24);

    // Check for price reduction FIRST (if available)
    // Price reduced recently = OK even if listing is old
    if (item.priceReduced || item.price?.wasReduced) {
      return { passed: true }; // Price drop = renewed interest, pass regardless of age
    }

    // Check if listing is too old (and price NOT reduced)
    if (ageInDays > maxDays) {
      return {
        passed: false,
        reason: `Listed ${Math.round(ageInDays)} days ago (max: ${maxDays} days)`
      };
    }

    return { passed: true };
  }

  /**
   * Get detailed rejection reason with category
   * @param {Object} item - eBay listing item
   * @returns {String} - Detailed rejection reason
   */
  getDetailedRejection(item) {
    const result = this.filter(item);
    if (result.passed) {
      return null;
    }
    return `REJECTED: ${result.reason}`;
  }

  /**
   * Filter array of items
   * @param {Array} items - Array of items
   * @param {Object} options - Filter options
   * @returns {Array} - Filtered items
   */
  filterItems(items, options = {}) {
    return items.filter(item => this.filter(item, options).passed);
  }

  /**
   * Get statistics on filtered items
   * @param {Array} items - Array of items
   * @returns {Object} - Statistics
   */
  getFilterStats(items) {
    const stats = {
      total: items.length,
      passed: 0,
      rejected: 0,
      reasons: {}
    };

    items.forEach(item => {
      const result = this.filter(item);
      if (result.passed) {
        stats.passed++;
      } else {
        stats.rejected++;
        const category = result.reason.split(':')[0];
        stats.reasons[category] = (stats.reasons[category] || 0) + 1;
      }
    });

    return stats;
  }
}

module.exports = AdvancedFilter;
