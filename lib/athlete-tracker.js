/**
 * Athlete Usage Tracker
 * Prevents duplicate content by tracking which athletes have been used recently
 */

const fs = require('fs');
const path = require('path');

const TRACKER_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-sports-used-athletes.json');
const DEFAULT_COOLDOWN_DAYS = 14;

class AthleteTracker {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(TRACKER_FILE)) {
        const raw = fs.readFileSync(TRACKER_FILE, 'utf-8');
        const data = JSON.parse(raw);
        
        if (!data.athletes) data.athletes = {};
        return data;
      }
    } catch (err) {
      console.error('Tracker load error:', err.message);
    }
    
    return { athletes: {} };
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

  wasRecentlyUsed(name, days = DEFAULT_COOLDOWN_DAYS) {
    const key = name.toLowerCase().trim();
    
    if (!this.data.athletes[key]) return false;
    
    const lastUsed = new Date(this.data.athletes[key]);
    const now = new Date();
    const diffDays = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));
    
    return diffDays < days;
  }

  markUsed(name) {
    const key = name.toLowerCase().trim();
    this.data.athletes[key] = new Date().toISOString();
    this.save();
  }

  filterUnused(athletes, days = DEFAULT_COOLDOWN_DAYS) {
    return athletes.filter(athlete => {
      const name = athlete.player || athlete.name;
      return !this.wasRecentlyUsed(name, days);
    });
  }

  getStats() {
    const names = Object.keys(this.data.athletes);
    const recentCount = names.filter(n => this.wasRecentlyUsed(n, DEFAULT_COOLDOWN_DAYS)).length;
    
    return {
      total_tracked: names.length,
      recently_used: recentCount,
      available: names.length - recentCount
    };
  }
}

module.exports = AthleteTracker;
