/**
 * Bitcoin Content Usage Tracker
 * Prevents duplicate content by tracking which topics have been used recently
 */

const fs = require('fs');
const path = require('path');

const TRACKER_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-bitcoin-used-content.json');
const DEFAULT_COOLDOWN_DAYS = 14;

class BitcoinContentTracker {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(TRACKER_FILE)) {
        const raw = fs.readFileSync(TRACKER_FILE, 'utf-8');
        const data = JSON.parse(raw);
        
        if (!data.topics) data.topics = {};
        return data;
      }
    } catch (err) {
      console.error('Tracker load error:', err.message);
    }
    
    return { topics: {} };
  }

  save() {
    try {
      const dir = path.dirname(TRACKER_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(TRACKER_FILE, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('Tracker save error:', err.message);
    }
  }

  /**
   * Check if topic was used recently
   * @param {string} topicId - Database ID or topic name
   * @param {number} days - Cooldown period in days
   * @returns {boolean}
   */
  wasRecentlyUsed(topicId, days = DEFAULT_COOLDOWN_DAYS) {
    const key = topicId.toString();
    
    if (!this.data.topics[key]) return false;
    
    const lastUsed = new Date(this.data.topics[key]);
    const now = new Date();
    const diffDays = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));
    
    return diffDays < days;
  }

  /**
   * Mark topic as used
   * @param {string} topicId - Database ID or topic name
   */
  markUsed(topicId) {
    const key = topicId.toString();
    this.data.topics[key] = new Date().toISOString();
    this.save();
  }

  /**
   * Filter array of content, removing recently used
   * @param {Array} contentArray - Array of content objects with 'id' or 'topic' field
   * @param {number} days - Cooldown period
   * @returns {Array}
   */
  filterUnused(contentArray, days = DEFAULT_COOLDOWN_DAYS) {
    return contentArray.filter(content => {
      const id = content.id || content.topic;
      return !this.wasRecentlyUsed(id, days);
    });
  }

  /**
   * Get stats for logging/debugging
   * @returns {Object}
   */
  getStats() {
    const ids = Object.keys(this.data.topics);
    const recentCount = ids.filter(id => this.wasRecentlyUsed(id, DEFAULT_COOLDOWN_DAYS)).length;
    
    return {
      total_tracked: ids.length,
      recently_used: recentCount,
      available: ids.length - recentCount
    };
  }
}

module.exports = BitcoinContentTracker;
