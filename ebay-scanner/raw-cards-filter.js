/**
 * Raw Cards Filter
 * Filters out graded/slabbed cards to show only raw (ungraded) cards
 */

class RawCardsFilter {
  constructor() {
    // Keywords that indicate graded cards (to filter out)
    this.gradedKeywords = [
      'PSA', 'BGS', 'SGC', 'CGC', 'BVG',
      'graded', 'slabbed', 'gem mint',
      'PSA 10', 'PSA 9', 'BGS 9.5', 'BGS 10',
      'authenticated', 'encapsulated'
    ];
  }

  /**
   * Check if item is a graded card
   * @param {Object} item - eBay listing
   * @returns {Boolean} - True if graded (should filter out)
   */
  isGraded(item) {
    const title = (item.title || '').toLowerCase();
    const condition = (item.condition || '').toLowerCase();
    const subtitle = (item.subtitle || '').toLowerCase();
    
    const combined = `${title} ${condition} ${subtitle}`;
    
    // Check for grading company keywords
    return this.gradedKeywords.some(keyword => 
      combined.includes(keyword.toLowerCase())
    );
  }

  /**
   * Filter array of items to only raw cards
   * @param {Array} items - Array of eBay listings
   * @returns {Array} - Only raw (ungraded) cards
   */
  filterToRawOnly(items) {
    return items.filter(item => !this.isGraded(item));
  }

  /**
   * Get statistics on filtering
   * @param {Array} items - Original array
   * @returns {Object} - Stats
   */
  getStats(items) {
    const graded = items.filter(item => this.isGraded(item));
    const raw = items.filter(item => !this.isGraded(item));
    
    return {
      total: items.length,
      graded: graded.length,
      raw: raw.length,
      percentRaw: Math.round((raw.length / items.length) * 100)
    };
  }
}

module.exports = RawCardsFilter;
