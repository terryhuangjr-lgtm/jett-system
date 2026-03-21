/**
 * Duplicate Detection
 * Prevents showing the same deals multiple times
 */

const fs = require('fs');
const path = require('path');

class DuplicateTracker {
  
  constructor(trackingFile = 'results/seen-deals.json') {
    this.trackingFile = path.join(__dirname, trackingFile);
    this.seenDeals = this.loadSeenDeals();
  }
  
  /**
   * Load previously seen deals from disk
   */
  loadSeenDeals() {
    try {
      if (fs.existsSync(this.trackingFile)) {
        const data = fs.readFileSync(this.trackingFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading seen deals:', error.message);
    }
    
    return {
      deals: {},
      lastCleanup: Date.now()
    };
  }
  
  /**
   * Save seen deals to disk
   */
  saveSeenDeals() {
    try {
      const dir = path.dirname(this.trackingFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.trackingFile, JSON.stringify(this.seenDeals, null, 2));
    } catch (error) {
      console.error('Error saving seen deals:', error.message);
    }
  }
  
  /**
   * Check if deal has been seen before
   */
  isSeen(itemId, currentPrice) {
    const deal = this.seenDeals.deals[itemId];
    
    if (!deal) {
      return false; // Never seen
    }
    
    // If seen within last 7 days, consider it a duplicate
    const daysSinceSeen = (Date.now() - deal.lastSeen) / (1000 * 60 * 60 * 24);
    
    if (daysSinceSeen < 7) {
      // If price dropped significantly (>20%), treat as new deal
      const priceDrop = ((deal.price - currentPrice) / deal.price) * 100;
      
      if (priceDrop > 20) {
        return false; // Price dropped enough to re-alert
      }
      
      return true; // Duplicate
    }
    
    return false; // Old enough to show again
  }
  
  /**
   * Mark deal as seen
   */
  markAsSeen(itemId, price, title) {
    this.seenDeals.deals[itemId] = {
      price: price,
      title: title,
      firstSeen: this.seenDeals.deals[itemId]?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      timesAlerted: (this.seenDeals.deals[itemId]?.timesAlerted || 0) + 1
    };
    
    this.saveSeenDeals();
  }
  
  /**
   * Clean up old deals (>30 days)
   */
  cleanup() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let cleaned = 0;
    for (const [itemId, deal] of Object.entries(this.seenDeals.deals)) {
      if (deal.lastSeen < thirtyDaysAgo) {
        delete this.seenDeals.deals[itemId];
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.seenDeals.lastCleanup = Date.now();
      this.saveSeenDeals();
      console.log(`🧹 Cleaned up ${cleaned} old deals from tracking`);
    }
  }
  
  /**
   * Filter out duplicate deals from a list
   */
  filterDuplicates(deals) {
    const newDeals = [];
    
    for (const deal of deals) {
      if (!this.isSeen(deal.itemId, deal.totalPrice)) {
        newDeals.push(deal);
        this.markAsSeen(deal.itemId, deal.totalPrice, deal.title);
      }
    }
    
    return newDeals;
  }
  
  /**
   * Get stats on tracking
   */
  getStats() {
    const totalTracked = Object.keys(this.seenDeals.deals).length;
    const daysSinceCleanup = (Date.now() - this.seenDeals.lastCleanup) / (1000 * 60 * 60 * 24);
    
    return {
      totalTracked,
      daysSinceCleanup: Math.floor(daysSinceCleanup)
    };
  }
}

module.exports = DuplicateTracker;
