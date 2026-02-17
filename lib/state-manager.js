#!/usr/bin/env node
/**
 * State Manager - Efficient state tracking to avoid redundant operations
 * Reduces token spend by tracking what's been checked/processed
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'memory', 'state.json');

class StateManager {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('Failed to load state:', err.message);
    }
    return {
      lastChecks: {},
      cache: {},
      counters: {},
      flags: {}
    };
  }

  save() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('Failed to save state:', err.message);
    }
  }

  // Check if enough time has passed since last check
  shouldCheck(key, intervalMinutes = 30) {
    const last = this.state.lastChecks[key];
    if (!last) return true;
    const elapsed = (Date.now() - last) / 1000 / 60;
    return elapsed >= intervalMinutes;
  }

  // Mark that something was checked
  markChecked(key) {
    this.state.lastChecks[key] = Date.now();
    this.save();
  }

  // Get/Set cache with TTL
  getCache(key, ttlMinutes = 60) {
    const cached = this.state.cache[key];
    if (!cached) return null;
    const age = (Date.now() - cached.timestamp) / 1000 / 60;
    if (age > ttlMinutes) {
      delete this.state.cache[key];
      this.save();
      return null;
    }
    return cached.value;
  }

  setCache(key, value, ttlMinutes = 60) {
    this.state.cache[key] = {
      value,
      timestamp: Date.now(),
      ttl: ttlMinutes
    };
    this.save();
  }

  // Increment counter
  increment(key) {
    this.state.counters[key] = (this.state.counters[key] || 0) + 1;
    this.save();
    return this.state.counters[key];
  }

  // Get/Set flags
  getFlag(key) {
    return this.state.flags[key] || false;
  }

  setFlag(key, value) {
    this.state.flags[key] = value;
    this.save();
  }

  // Clean old cache entries
  cleanCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, cached] of Object.entries(this.state.cache)) {
      const age = (now - cached.timestamp) / 1000 / 60;
      if (age > cached.ttl) {
        delete this.state.cache[key];
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.save();
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const state = new StateManager();
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'check':
      const [checkKey, interval] = args.slice(1);
      console.log(state.shouldCheck(checkKey, parseInt(interval) || 30));
      break;
    case 'mark':
      state.markChecked(args[1]);
      console.log(`Marked ${args[1]} as checked`);
      break;
    case 'get':
      console.log(JSON.stringify(state.getCache(args[1]), null, 2));
      break;
    case 'set':
      state.setCache(args[1], args[2]);
      console.log(`Cached ${args[1]}`);
      break;
    case 'clean':
      state.cleanCache();
      break;
    case 'dump':
      console.log(JSON.stringify(state.state, null, 2));
      break;
    default:
      console.log('Usage: state-manager.js [check|mark|get|set|clean|dump] <args>');
  }
}

module.exports = StateManager;
