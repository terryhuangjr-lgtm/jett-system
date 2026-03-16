/**
 * Deduplication Tracker - Prevents showing same deals repeatedly
 * Tracks seen items for 7 days, then clears
 */

const fs = require('fs');
const path = require('path');

class DedupTracker {
  constructor() {
    this.seenFile = path.join(__dirname, 'seen-deals.json');
    this.retentionDays = 7; // Keep track for 7 days
    this.data = this.load();
  }

  /**
   * Load seen items from file
   */
  load() {
    try {
      if (fs.existsSync(this.seenFile)) {
        const raw = fs.readFileSync(this.seenFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('Error loading seen items:', error.message);
    }

    return {
      seenItems: [],
      lastCleanup: null
    };
  }

  /**
   * Save seen items to file
   */
  save() {
    try {
      fs.writeFileSync(this.seenFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving seen items:', error.message);
    }
  }

  /**
   * Check if item has been seen before
   * @param {String} itemId - eBay item ID
   * @returns {Boolean} - True if already seen
   */
  hasSeenItem(itemId) {
    return this.data.seenItems.some(item => item.itemId === itemId);
  }

  /**
   * Mark item as seen
   * @param {String} itemId - eBay item ID
   * @param {String} title - Item title
   * @param {Number} price - Item price
   */
  markAsSeen(itemId, title, price) {
    if (this.hasSeenItem(itemId)) {
      return; // Already tracked
    }

    this.data.seenItems.push({
      itemId: itemId,
      title: title,
      price: price,
      firstSeen: new Date().toISOString()
    });

    this.save();
  }

  /**
   * Filter out already-seen items from results
   * @param {Array} items - Array of items to check
   * @returns {Array} - New items only
   */
  filterNewItems(items) {
    return items.filter(item => {
      const itemId = this.extractItemId(item.url || item.itemUrl);
      if (!itemId) return true; // Keep if we can't extract ID

      if (this.hasSeenItem(itemId)) {
        console.log(`⏭️  Skipping duplicate: ${item.title?.substring(0, 50)}...`);
        return false;
      }

      // Mark as seen for future scans
      this.markAsSeen(itemId, item.title, item.currentPrice || item.price);
      return true;
    });
  }

  /**
   * Extract eBay item ID from URL
   * @param {String} url - eBay listing URL
   * @returns {String} - Item ID
   */
  extractItemId(url) {
    if (!url) return null;

    // Match pattern: /itm/ITEMID or /itm/ITEMID?
    const match = url.match(/\/itm\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Clean up old seen items (older than retention period)
   */
  cleanup() {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (this.retentionDays * 24 * 60 * 60 * 1000));

    const before = this.data.seenItems.length;
    this.data.seenItems = this.data.seenItems.filter(item => {
      const seenDate = new Date(item.firstSeen);
      return seenDate > cutoffDate;
    });

    const after = this.data.seenItems.length;
    const removed = before - after;

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old items (older than ${this.retentionDays} days)`);
      this.data.lastCleanup = now.toISOString();
      this.save();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTracked: this.data.seenItems.length,
      oldestItem: this.data.seenItems.length > 0 
        ? this.data.seenItems[0].firstSeen 
        : null,
      lastCleanup: this.data.lastCleanup
    };
  }

  /**
   * Clear all tracked items (for testing)
   */
  clear() {
    this.data.seenItems = [];
    this.data.lastCleanup = new Date().toISOString();
    this.save();
    console.log('🗑️  Cleared all tracked items');
  }
}

module.exports = DedupTracker;
