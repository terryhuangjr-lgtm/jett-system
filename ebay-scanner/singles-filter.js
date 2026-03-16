/**
 * Singles Filter - Excludes LOTS and multi-card listings
 * 
 * PERMANENT RULE: All eBay searches should return SINGLES ONLY
 * See SEARCH-RULES.md for full documentation
 */

class SinglesFilter {
  
  /**
   * Check if an item is a single card (not a lot)
   * @param {Object} item - eBay listing item
   * @returns {Boolean} - True if single card, false if lot/multi-card
   */
  static isSingle(item) {
    const title = (item.title || '').toLowerCase();
    const category = (item.categoryPath || '').toLowerCase();
    
    // LOT indicators in title
    const lotKeywords = [
      ' lot',           // "card lot", "3 card lot"
      'lot of',         // "lot of 5"
      'near set',       // "near set 29/30"
      'complete set',   // "complete set"
      'bulk',           // "bulk cards"
      'collection',     // "collection"
      'mixed',          // "mixed lot"
      'bundle'          // "bundle"
    ];
    
    for (const keyword of lotKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }
    
    // Number patterns indicating multiple cards
    // Match: "5 card", "10 cards", "3+", "5+ cards"
    if (title.match(/\d+\s*(card|cards)/) || title.match(/\d+\+/)) {
      return false;
    }
    
    // Category check
    if (category.includes('lot')) {
      return false;
    }
    
    // Passed all checks - it's a single
    return true;
  }
  
  /**
   * Filter an array of items to only singles
   * @param {Array} items - Array of eBay listing items
   * @returns {Array} - Filtered array of singles only
   */
  static filterSingles(items) {
    return items.filter(item => this.isSingle(item));
  }
  
  /**
   * Get rejection reason for a lot/multi-card listing
   * @param {Object} item - eBay listing item
   * @returns {String|null} - Reason for rejection, or null if it's a single
   */
  static getRejectionReason(item) {
    if (this.isSingle(item)) {
      return null;
    }
    
    const title = (item.title || '').toLowerCase();
    const category = (item.categoryPath || '').toLowerCase();
    
    if (title.includes(' lot') || title.includes('lot of')) return 'Contains "lot" in title';
    if (title.includes('near set')) return 'Near set';
    if (title.includes('complete set')) return 'Complete set';
    if (title.includes('bulk')) return 'Bulk listing';
    if (title.includes('collection')) return 'Collection';
    if (title.includes('mixed') || title.includes('bundle')) return 'Bundle/mixed';
    if (title.match(/\d+\s*(card|cards)/)) return 'Multiple cards indicated by number';
    if (title.match(/\d+\+/)) return 'Multiple cards (+ notation)';
    if (category.includes('lot')) return 'Listed in LOT category';
    
    return 'Multi-card listing';
  }
}

module.exports = SinglesFilter;
