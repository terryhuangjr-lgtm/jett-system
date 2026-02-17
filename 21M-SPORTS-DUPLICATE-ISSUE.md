# 21M Sports Content Duplication Issue - Fix Spec

**Date:** 2026-02-15  
**Reporter:** Terry  
**Assigned to:** Claude Code / Minimax

---

## Problem Statement

21M Sports content is repeating the same athletes on consecutive days. Yesterday (Feb 14) and today (Feb 15) both generated tweets about:
- Lamar Jackson ($260M contract)
- Patrick Mahomes ($450M contract)  
- Jalen Brunson ($157.5M contract)

**Root cause:** The automation scripts in `~/clawd/automation/` do NOT use the tracking system that was built into the npm package `21m-sports-generator`. They're generating content independently without duplicate prevention.

---

## Current System Architecture

### Two Separate Systems Exist:

**1. NPM Package** (`~/clawd/21m-sports-generator/`)
- Has proper tracking via `modules/used-content-tracker.js`
- Tracks athletes in `data/used-content.json`
- Prevents repeats within 14 days
- ✅ **THIS WORKS** - but it's not being used by automation

**2. Automation Scripts** (`~/clawd/automation/`)
- `21m-sports-verified-generator-v2.js` - The actual generator used
- `21m-sports-real-research.js` - Pulls contracts from web/APIs
- These scripts generate morning content at 5:00 AM
- ❌ **NO DUPLICATE PREVENTION** - this is the problem

---

## Evidence of the Issue

**Slack message history:**
- **Feb 14, 8:23 AM:** Lamar Jackson, Patrick Mahomes, Jalen Brunson
- **Feb 15, 5:00 AM:** Lamar Jackson, Patrick Mahomes, Jalen Brunson (EXACT SAME)

**Tracker file state:**
```bash
$ cat ~/clawd/21m-sports-generator/data/used-content.json
{}
# Empty - proving automation doesn't use this tracking
```

---

## Solution Requirements

### Goal
Add duplicate prevention to the automation scripts so they:
1. Track which athletes have been used
2. Avoid repeating athletes within 14 days
3. Log what was selected for debugging

### Implementation Steps

**Step 1: Create Shared Tracking Module**
- Location: `~/clawd/automation/lib/athlete-tracker.js`
- Functionality:
  - Track athletes by name (normalized, lowercase)
  - Store last-used timestamp
  - Filter out recently-used athletes (within 14 days)
  - Persist to: `~/clawd/memory/21m-sports-used-athletes.json`

**Step 2: Integrate into Research Script**
- File: `~/clawd/automation/21m-sports-real-research.js`
- When selecting contracts:
  - Load used-athletes tracker
  - Filter out athletes used within 14 days
  - If no fresh athletes available, extend timeframe to 30 days
  - Mark selected athletes as used

**Step 3: Integrate into Generator**
- File: `~/clawd/automation/21m-sports-verified-generator-v2.js`
- Before generating content:
  - Load used-athletes tracker
  - Check if athlete was recently used
  - If yes, skip and select next available
  - Mark athlete as used after generation

**Step 4: Logging & Visibility**
- Log selected athletes to: `~/clawd/memory/task-logs/21m-sports-selections-YYYYMMDD.log`
- Format: `[timestamp] Selected: <athlete_name> (last_used: <date or "never">)`
- This allows Terry to audit what was picked and when

**Step 5: Testing**
- Create test script: `~/clawd/automation/test-athlete-tracker.sh`
- Simulate 3 consecutive runs
- Verify no duplicates within 14 days
- Verify fallback works when all athletes used

---

## Detailed Spec for athlete-tracker.js

### File: `~/clawd/automation/lib/athlete-tracker.js`

```javascript
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
        
        // Initialize if empty
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

  /**
   * Check if athlete was used recently
   * @param {string} name - Athlete name
   * @param {number} days - Cooldown period in days
   * @returns {boolean}
   */
  wasRecentlyUsed(name, days = DEFAULT_COOLDOWN_DAYS) {
    const key = name.toLowerCase().trim();
    
    if (!this.data.athletes[key]) return false;
    
    const lastUsed = new Date(this.data.athletes[key]);
    const now = new Date();
    const diffDays = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));
    
    return diffDays < days;
  }

  /**
   * Mark athlete as used
   * @param {string} name - Athlete name
   */
  markUsed(name) {
    const key = name.toLowerCase().trim();
    this.data.athletes[key] = new Date().toISOString();
    this.save();
  }

  /**
   * Filter array of athletes, removing recently used
   * @param {Array} athletes - Array of athlete objects with 'player' or 'name' field
   * @param {number} days - Cooldown period
   * @returns {Array}
   */
  filterUnused(athletes, days = DEFAULT_COOLDOWN_DAYS) {
    return athletes.filter(athlete => {
      const name = athlete.player || athlete.name;
      return !this.wasRecentlyUsed(name, days);
    });
  }

  /**
   * Get stats for logging/debugging
   * @returns {Object}
   */
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
```

---

## Integration Points

### In 21m-sports-real-research.js

**Current behavior:**
- Searches for recent contracts
- Picks random contracts from results

**New behavior:**
```javascript
const AthleteTracker = require('./lib/athlete-tracker.js');
const tracker = new AthleteTracker();

// After getting contracts from web search:
let availableContracts = tracker.filterUnused(contracts, 14);

// Fallback if all used recently
if (availableContracts.length === 0) {
  console.log('All athletes used recently, extending to 30 days...');
  availableContracts = tracker.filterUnused(contracts, 30);
}

// If still none, use full list as last resort
if (availableContracts.length === 0) {
  console.log('All athletes used in 30 days, using full list...');
  availableContracts = contracts;
}

// Select from available
const selected = availableContracts[Math.floor(Math.random() * availableContracts.length)];

// Mark as used
tracker.markUsed(selected.player);

// Log selection
const logFile = path.join(MEMORY_DIR, 'task-logs', `21m-sports-selections-${dateStr}.log`);
fs.appendFileSync(logFile, `[${new Date().toISOString()}] Selected: ${selected.player}\n`);
```

### In 21m-sports-verified-generator-v2.js

**Before generating content:**
```javascript
const AthleteTracker = require('./lib/athlete-tracker.js');
const tracker = new AthleteTracker();

// Check if research subject was recently used
const playerName = research.contract?.player || research.player;

if (tracker.wasRecentlyUsed(playerName, 14)) {
  console.log(`⚠️  ${playerName} was used recently, skipping generation`);
  process.exit(1);
}

// Generate content...

// After successful generation, mark as used
tracker.markUsed(playerName);
```

---

## Testing Plan

**Test Script:** `~/clawd/automation/test-athlete-tracker.sh`

```bash
#!/bin/bash
# Test duplicate prevention

echo "=== Testing Athlete Tracker ==="

# Run 3 times in a row
for i in 1 2 3; do
  echo ""
  echo "Run $i:"
  node ~/clawd/automation/21m-sports-real-research.js --test
  node ~/clawd/automation/21m-sports-verified-generator-v2.js --test
  
  # Show what was selected
  tail -n 1 ~/clawd/memory/task-logs/21m-sports-selections-*.log
done

echo ""
echo "=== Tracker Stats ==="
node -e "const t = require('./lib/athlete-tracker.js'); console.log(new t().getStats());"

echo ""
echo "=== Used Athletes ==="
cat ~/clawd/memory/21m-sports-used-athletes.json
```

**Expected Results:**
- Run 1: Selects athlete A
- Run 2: Selects athlete B (not A)
- Run 3: Selects athlete C (not A or B)
- No repeats within same test session

---

## Acceptance Criteria

✅ **No duplicate athletes within 14 days**  
✅ **Tracking persists across runs**  
✅ **Fallback logic works (extends to 30 days if needed)**  
✅ **Logs show which athletes were selected**  
✅ **Test script passes without duplicates**  
✅ **Backward compatible** (doesn't break existing automation)

---

## Files to Create/Modify

**Create:**
- `~/clawd/automation/lib/athlete-tracker.js` (new module)
- `~/clawd/automation/test-athlete-tracker.sh` (test script)

**Modify:**
- `~/clawd/automation/21m-sports-real-research.js` (add filtering)
- `~/clawd/automation/21m-sports-verified-generator-v2.js` (add check before generation)

**Data Files:**
- `~/clawd/memory/21m-sports-used-athletes.json` (tracker data)
- `~/clawd/memory/task-logs/21m-sports-selections-YYYYMMDD.log` (selection log)

---

## Priority: HIGH

**Impact:** User sees duplicate content daily  
**Complexity:** Medium (straightforward implementation)  
**Risk:** Low (fallback logic prevents blocking content generation)

---

## Questions for Implementation

1. Should we backfill the tracker with recently posted athletes? (Check Slack history and mark them as used?)
2. What happens if Terry manually posts someone? (Should there be a way to manually mark athletes as used?)
3. Should the cooldown be configurable per athlete type? (e.g., 14 days for contracts, 7 days for bankruptcy stories?)

---

**Ready for implementation by Claude Code or Minimax.**
