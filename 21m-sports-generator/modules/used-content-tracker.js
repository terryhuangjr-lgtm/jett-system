/**
 * Used Content Tracker
 * Tracks which athletes/contracts have been used to avoid repeats
 */

import fs from 'fs';
import path from 'path';

const TRACKER_FILE = path.join(process.cwd(), 'data', 'used-content.json');

class UsedContentTracker {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(TRACKER_FILE)) {
        const raw = fs.readFileSync(TRACKER_FILE, 'utf-8');
        const data = JSON.parse(raw);
        
        // If file exists but is empty object, initialize it
        if (Object.keys(data).length === 0) {
          return this.getDefaultStructure();
        }
        
        // Ensure all required keys exist
        if (!data.contracts) data.contracts = { used: [], lastUsed: {} };
        if (!data.athletes) data.athletes = { used: [], lastUsed: {} };
        if (!data.stories) data.stories = { used: [], lastUsed: {} };
        
        return data;
      }
    } catch (error) {
      console.error('Error loading tracker:', error.message);
    }
    
    return this.getDefaultStructure();
  }
  
  getDefaultStructure() {
    return {
      contracts: {
        used: [],
        lastUsed: {}
      },
      athletes: {
        used: [],
        lastUsed: {}
      },
      stories: {
        used: [],
        lastUsed: {}
      }
    };
  }

  save() {
    try {
      const dir = path.dirname(TRACKER_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(TRACKER_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving tracker:', error.message);
    }
  }

  /**
   * Mark an athlete/contract as used
   * @param {string} type - 'contract' | 'athlete' | 'story'
   * @param {string} name - Name of the player or contract
   */
  markUsed(type, name) {
    const key = name.toLowerCase().trim();
    
    if (!this.data[type]) {
      this.data[type] = { used: [], lastUsed: {} };
    }
    
    if (!this.data[type].used.includes(key)) {
      this.data[type].used.push(key);
    }
    
    this.data[type].lastUsed[key] = new Date().toISOString();
    this.save();
  }

  /**
   * Check if an athlete/contract has been used recently
   * @param {string} type - 'contract' | 'athlete' | 'story'
   * @param {string} name - Name to check
   * @param {number} days - Number of days to consider "recent" (default: 14)
   */
  wasRecentlyUsed(type, name, days = 14) {
    const key = name.toLowerCase().trim();
    
    if (!this.data[type] || !this.data[type].lastUsed[key]) {
      return false;
    }
    
    const lastUsed = new Date(this.data[type].lastUsed[key]);
    const now = new Date();
    const diffTime = Math.abs(now - lastUsed);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= days;
  }

  /**
   * Get a random item from a list, filtering out recently used ones
   * @param {Array} items - List of items to choose from
   * @param {string} type - Type of content
   * @param {number} days - Days to consider "recent"
   */
  getRandomWithFilter(items, type, days = 14) {
    // Filter out recently used
    const available = items.filter(item => {
      const name = item.player || item.name;
      return !this.wasRecentlyUsed(type, name, days);
    });
    
    // If all used, fall back to full list
    const pool = available.length > 0 ? available : items;
    
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Get tracking stats
   */
  getStats() {
    const stats = {};
    for (const [type, data] of Object.entries(this.data)) {
      stats[type] = {
        totalUsed: data.used?.length || 0,
        recentlyUsed: data.lastUsed ? Object.keys(data.lastUsed).filter(k => {
          return this.wasRecentlyUsed(type, k, 14);
        }).length : 0
      };
    }
    return stats;
  }

  /**
   * Clear old entries (for maintenance)
   * @param {number} days - Remove entries older than this
   */
  clearOld(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const type of Object.keys(this.data)) {
      if (this.data[type]?.lastUsed) {
        for (const [key, dateStr] of Object.entries(this.data[type].lastUsed)) {
          if (new Date(dateStr) < cutoff) {
            delete this.data[type].lastUsed[key];
            this.data[type].used = this.data[type].used.filter(u => u !== key);
          }
        }
      }
    }
    
    this.save();
  }
}

export default UsedContentTracker;
