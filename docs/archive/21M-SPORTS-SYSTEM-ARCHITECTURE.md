# 21M Sports System Architecture

**Version:** 2.0  
**Last Updated:** 2026-02-15  
**Status:** ACTIVE PRODUCTION SYSTEM

---

## 🎯 Purpose

This document is the **single source of truth** for the 21M Sports content generation system. Before making ANY changes, debugging, or adding features - READ THIS FIRST.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [File Locations](#file-locations)
6. [Critical Rules](#critical-rules)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Maintenance Guide](#maintenance-guide)
9. [Files to Clean Up](#files-to-clean-up)

---

## System Overview

**What it does:**
Automatically researches sports contracts, generates Bitcoin-denominated tweets, verifies facts, prevents duplicates, and posts to Slack.

**When it runs:**
- 2:00 AM: Research (find fresh contracts)
- 5:00 AM: Generate (create tweet options)
- 7:30 AM: Deploy (post to #21msports Slack channel)

**Quality standards:**
- All contracts must be verified from real sources
- All athletes must be unique (no repeats within 14 days)
- All BTC prices must be accurate (via CoinGecko API)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    21M SPORTS PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ RESEARCH     │ 2:00 AM Daily
│ LAYER        │
└──────┬───────┘
       │
       │ [1] Search web for recent contracts
       │     (Brave API, ESPN, Spotrac)
       │
       │ [2] Validate URLs are real
       │
       │ [3] Calculate BTC values
       │
       ▼
┌──────────────────────────────────────────────┐
│  21m-sports-verified-research.json           │
│  {                                           │
│    "contract": {                             │
│      "player": "Kerby Joseph",               │
│      "team": "Lions",                        │
│      "value": 20000000,                      │
│      "date": "2026-01-30",                   │
│      "source": "https://espn.com/..."        │
│    },                                        │
│    "btc_price": 68845,                       │
│    "btc_value": 290.51                       │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               │
┌──────────────┴───────┐
│ DUPLICATE CHECK      │ 5:00 AM Daily
│ LAYER (NEW!)         │
└──────┬───────────────┘
       │
       │ [1] Load athlete-tracker.js
       │
       │ [2] Check if athlete used in last 14 days
       │     ├─ If YES: Skip, find another
       │     └─ If NO: Continue to generation
       │
       ▼
┌──────────────┐
│ GENERATION   │ 5:00 AM Daily
│ LAYER        │
└──────┬───────┘
       │
       │ [1] Read research.json
       │
       │ [2] Generate 3 tweet variations
       │     (contract_analysis, bitcoin_standard, fiat_debasement)
       │
       │ [3] Verify all facts
       │
       │ [4] Mark athlete as used (athlete-tracker)
       │
       ▼
┌──────────────────────────────────────────────┐
│  21m-sports-verified-content.json            │
│  {                                           │
│    "tweets": [                               │
│      {                                       │
│        "text": "Kerby Joseph's $20M...",    │
│        "length": 169,                        │
│        "template": "contract_analysis"       │
│      },                                      │
│      ...                                     │
│    ],                                        │
│    "metadata": {                             │
│      "sources": [...],                       │
│      "verified": true                        │
│    }                                         │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               │
┌──────────────┴───────┐
│ DEPLOYMENT           │ 7:30 AM Daily
│ LAYER                │
└──────┬───────────────┘
       │
       │ [1] Read verified-content.json
       │
       │ [2] Format for Slack
       │
       │ [3] Post to #21msports channel
       │
       │ [4] Log deployment
       │
       ▼
┌──────────────────────────────────────────────┐
│  Slack #21msports Channel                    │
│  🏈 21M Sports - Tweet Options               │
│  Option 1: [tweet text]                      │
│  Option 2: [tweet text]                      │
│  Option 3: [tweet text]                      │
│  ✓ VERIFIED SOURCES                          │
└──────────────────────────────────────────────┘
```

---

## Component Details

### 1. Research Layer

**File:** `~/clawd/automation/21m-sports-real-research.js`

**What it does:**
- Searches web for recent sports contracts (last 14 days)
- Validates contract details from real sources
- Calculates BTC value at time of signing
- Saves verified research data

**Input:** Web search queries (Brave API)  
**Output:** `~/clawd/memory/21m-sports-verified-research.json`

**Key Functions:**
```javascript
searchForContracts()   // Web search via Brave API
validateContractUrl()  // Checks URL is real
calculateBtcValue()    // Gets historical BTC price
saveResearch()         // Writes to research.json
```

**Excluded Athletes (hardcoded):**
- Juan Soto
- Shohei Ohtani
- Shedeur Sanders
(These are overused in media, per Terry's request)

---

### 2. Duplicate Check Layer (NEW - REQUIRED)

**File:** `~/clawd/automation/lib/athlete-tracker.js`

**What it does:**
- Tracks which athletes have been used recently
- Prevents same athlete from appearing within 14 days
- Provides fallback if all athletes used (extends to 30 days)

**Data File:** `~/clawd/memory/21m-sports-used-athletes.json`

**Key Functions:**
```javascript
wasRecentlyUsed(name, days)  // Check if athlete used in X days
markUsed(name)               // Mark athlete as used NOW
filterUnused(athletes, days) // Filter array, remove used athletes
getStats()                   // Get tracking stats for debugging
```

**Example Data:**
```json
{
  "athletes": {
    "lamar jackson": "2026-02-14T13:23:31.886Z",
    "patrick mahomes": "2026-02-14T13:23:31.886Z",
    "kerby joseph": "2026-02-15T08:15:07.240Z"
  }
}
```

---

### 3. Generation Layer

**File:** `~/clawd/automation/21m-sports-verified-generator-v2.js`

**What it does:**
- Reads verified research data
- Checks athlete-tracker (NEW!)
- Generates 3 tweet variations
- Validates all facts before saving

**Input:** `~/clawd/memory/21m-sports-verified-research.json`  
**Output:** `~/clawd/memory/21m-sports-verified-content.json`

**Tweet Templates:**
1. **contract_analysis** - Direct BTC comparison
2. **bitcoin_standard** - % of 21M supply
3. **fiat_debasement** - Purchasing power decline

**Validation Checks:**
- Character count (must be ≤280)
- Source URLs are real
- BTC price is accurate
- Athlete not recently used (NEW!)

---

### 4. Deployment Layer

**File:** `~/clawd/automation/post-21m-to-slack.js`

**What it does:**
- Reads verified content
- Formats for Slack (emoji, formatting)
- Posts to #21msports channel
- Logs deployment

**Input:** `~/clawd/memory/21m-sports-verified-content.json`  
**Output:** Slack message in #21msports

**Log File:** `~/clawd/memory/21m-sports-deployments.log`

---

## Data Flow

### Full Pipeline Execution

```
┌─────────────────────────────────────────────────────────────┐
│ NIGHT: 2:00 AM                                              │
└─────────────────────────────────────────────────────────────┘

1. Cron triggers: 21m-sports-real-research.js
2. Script searches web for contracts (last 14 days)
3. Validates URLs, calculates BTC values
4. Saves to: memory/21m-sports-verified-research.json
5. Logs to: memory/task-logs/21m-sports-research-YYYYMMDD-HHMMSS.log

Example research.json:
{
  "type": "21m_sports_research",
  "timestamp": "2026-02-15T07:00:01Z",
  "contract": {
    "player": "Kerby Joseph",
    "team": "Lions",
    "value": 20000000,
    "date": "2026-01-30",
    "source": "https://www.espn.com/nfl/story/_/id/47769172/..."
  },
  "btc_price": 68845,
  "btc_value": 290.51,
  "verified": true
}

┌─────────────────────────────────────────────────────────────┐
│ MORNING: 5:00 AM                                            │
└─────────────────────────────────────────────────────────────┘

1. Cron triggers: 21m-sports-verified-generator-v2.js
2. Script loads: memory/21m-sports-verified-research.json
3. NEW: Checks athlete-tracker (lib/athlete-tracker.js)
   ├─ If athlete used in last 14 days → ABORT, log error
   └─ If athlete NOT used → Continue
4. Generates 3 tweet variations
5. Validates facts (BTC price, source URLs)
6. NEW: Marks athlete as used in tracker
7. Saves to: memory/21m-sports-verified-content.json
8. Logs to: memory/task-logs/21m-sports-content-YYYYMMDD-HHMMSS.log

Example content.json:
{
  "tweets": [
    {
      "text": "Kerby Joseph's $20M contract = 290.51 BTC...",
      "length": 169,
      "template": "contract_analysis"
    },
    {
      "text": "Kerby Joseph signed for $20M. In BTC terms...",
      "length": 161,
      "template": "bitcoin_standard"
    },
    {
      "text": "The Kerby Joseph contract: $20M...",
      "length": 165,
      "template": "fiat_debasement"
    }
  ],
  "metadata": {
    "player": "Kerby Joseph",
    "team": "Lions",
    "contract_value": 20000000,
    "btc_value": 290.51,
    "btc_price": 68845,
    "sources": ["https://www.espn.com/..."],
    "verified": true,
    "generated_at": "2026-02-15T10:00:05Z"
  }
}

┌─────────────────────────────────────────────────────────────┐
│ MORNING: 7:30 AM                                            │
└─────────────────────────────────────────────────────────────┘

1. Cron triggers: post-21m-to-slack.js
2. Script loads: memory/21m-sports-verified-content.json
3. Formats message for Slack
4. Posts to #21msports channel
5. Logs to: memory/21m-sports-deployments.log

Slack message format:
🏈 21M Sports - Tweet Options
Generated at 2/15/2026, 5:00:29 AM
✅ VERIFIED SOURCES (web_search + API verification)

Option 1 (contract_analysis):
[tweet text]
Length: 169 chars

Option 2 (bitcoin_standard):
[tweet text]
Length: 161 chars

Option 3 (fiat_debasement):
[tweet text]
Length: 165 chars

📚 VERIFIED SOURCES:
• Contract: https://... ✓
• BTC Price: https://api.coingecko.com/... ✓

🔒 Verification Method: web_search + coingecko_api + url_check
💡 Pick your favorite and post to X!
```

---

## File Locations

### Code (Active - DO NOT DELETE)
```
~/clawd/automation/
├── 21m-sports-real-research.js        ← Research layer (finds contracts)
├── 21m-sports-verified-generator-v2.js ← Generation layer (creates tweets)
├── post-21m-to-slack.js               ← Deployment layer (posts to Slack)
├── 21m-sports-validator.js            ← Validation helpers
└── lib/
    └── athlete-tracker.js             ← NEW: Duplicate prevention (REQUIRED)
```

### Data Files (Active)
```
~/clawd/memory/
├── 21m-sports-verified-research.json     ← Research output (contracts found)
├── 21m-sports-verified-content.json      ← Generation output (tweets)
├── 21m-sports-used-athletes.json         ← NEW: Tracking data (who was used)
├── 21m-sports-deployments.log            ← Deployment log
├── 21m-sports-api-log.jsonl              ← API call log
└── task-logs/
    ├── 21m-sports-research-YYYYMMDD-HHMMSS.log  ← Research logs
    ├── 21m-sports-content-YYYYMMDD-HHMMSS.log   ← Generation logs
    └── 21m-sports-selections-YYYYMMDD.log       ← NEW: Who was selected
```

### Supporting Files
```
~/clawd/automation/
├── db-bridge.js                       ← Database helpers
└── 21m-nightly.sh                     ← Master cron script (runs all tasks)
```

---

## Critical Rules

### ✅ DO

1. **ALWAYS check athlete-tracker before generating content**
   - Load tracker in research script
   - Filter out recently-used athletes
   - Mark athlete as used after generation

2. **ALWAYS use real web search for contracts**
   - Brave API is the source
   - Validate URLs actually exist
   - No hardcoded athlete lists

3. **ALWAYS verify BTC prices**
   - Use CoinGecko API for historical prices
   - Cross-check with Coinbase API if needed
   - Log all API calls

4. **ALWAYS log everything**
   - Research: what was found
   - Selection: who was picked
   - Generation: what was created
   - Deployment: what was posted

5. **ALWAYS use the V2 generator**
   - Only `21m-sports-verified-generator-v2.js` is production
   - V1 is deprecated (DO NOT USE)

### ❌ DO NOT

1. **NEVER generate content without checking tracker**
   - This causes duplicate athletes
   - Tracker is MANDATORY

2. **NEVER use hardcoded athlete data**
   - All data must come from web search
   - No fake contracts
   - No placeholder names

3. **NEVER skip verification**
   - All URLs must be validated
   - All BTC prices must be accurate
   - All facts must be checked

4. **NEVER modify data files manually**
   - Let scripts handle data files
   - Manual edits cause corruption

5. **NEVER use old/disabled scripts**
   - Files ending in `.DISABLED` are retired
   - Files ending in `-v1.js` are deprecated
   - Stick to the architecture diagram

---

## Common Issues & Solutions

### Issue: "Content repeats same athletes"

**Root Cause:** athlete-tracker.js not being used

**Solution:**
1. Check if `lib/athlete-tracker.js` exists
2. Verify research script loads tracker
3. Verify generator script checks tracker
4. Check tracking data: `cat ~/clawd/memory/21m-sports-used-athletes.json`

**Debug Commands:**
```bash
# Check if tracker file exists
ls -la ~/clawd/automation/lib/athlete-tracker.js

# Check tracking data
cat ~/clawd/memory/21m-sports-used-athletes.json

# Check selection logs
tail -20 ~/clawd/memory/task-logs/21m-sports-selections-*.log

# Test tracker manually
node -e "const T = require('./automation/lib/athlete-tracker.js'); console.log(new T().getStats());"
```

---

### Issue: "Don't know where data is stored"

**Root Cause:** Multiple scripts saving to different locations

**Solution:** ALL data goes to ONE place:
```
~/clawd/memory/21m-sports-*
```

**Quick Reference:**
```bash
# Research output
cat ~/clawd/memory/21m-sports-verified-research.json

# Generation output
cat ~/clawd/memory/21m-sports-verified-content.json

# Tracking data
cat ~/clawd/memory/21m-sports-used-athletes.json

# Recent logs
ls -lt ~/clawd/memory/task-logs/21m-sports-* | head -5
```

---

### Issue: "Generator uses fake data"

**Root Cause:** Wrong script being used (v1 instead of v2)

**Solution:**
1. ONLY use `21m-sports-verified-generator-v2.js`
2. Check cron: `crontab -l | grep 21m-sports`
3. Verify script path is V2

**Production Script:**
```bash
# ✅ CORRECT
~/clawd/automation/21m-sports-verified-generator-v2.js

# ❌ WRONG
~/clawd/automation/21m-sports-verified-generator.js  (v1 - deprecated)
```

---

### Issue: "BTC prices are wrong"

**Root Cause:** Not using historical price API

**Solution:**
1. Use CoinGecko API for historical prices
2. Format date correctly: `DD-MM-YYYY`
3. Fallback to Coinbase API if needed

**Example:**
```javascript
// Get BTC price on contract date
const date = '30-01-2026';
const url = `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${date}`;
const response = await fetch(url);
const data = await response.json();
const btcPrice = data.market_data.current_price.usd;
```

---

### Issue: "Cron jobs not running"

**Root Cause:** Cron schedule misconfigured

**Solution:**
```bash
# Check current cron
crontab -l

# Should see:
0 2 * * * /home/clawd/clawd/automation/21m-sports-real-research.js
0 5 * * * /home/clawd/clawd/automation/21m-sports-verified-generator-v2.js
30 7 * * * /home/clawd/clawd/automation/post-21m-to-slack.js

# Check logs
tail -50 ~/clawd/memory/task-logs/21m-sports-research-*.log
tail -50 ~/clawd/memory/task-logs/21m-sports-content-*.log
```

---

## Maintenance Guide

### Daily Monitoring

**Check these every day:**
```bash
# 1. Check if content was posted to Slack
# Look in #21msports channel around 7:30 AM

# 2. Check for errors in logs
tail -50 ~/clawd/memory/task-logs/21m-sports-content-$(date +%Y%m%d)*.log

# 3. Check tracking stats
node -e "const T = require('./automation/lib/athlete-tracker.js'); console.log(new T().getStats());"
```

**Expected output:**
```json
{
  "total_tracked": 15,
  "recently_used": 3,
  "available": 12
}
```

---

### Weekly Cleanup

**Every Sunday:**
```bash
# 1. Archive old logs (older than 30 days)
find ~/clawd/memory/task-logs/ -name "21m-sports-*" -mtime +30 -exec mv {} ~/clawd/memory/archive/ \;

# 2. Clean up old tracker entries (older than 30 days)
# This happens automatically in athlete-tracker.js clearOld() method

# 3. Check for duplicate files
ls -la ~/clawd/memory/21m-sports-* | grep -E "\.(backup|old|tmp)"
```

---

### Emergency Procedures

**If generation fails completely:**
```bash
# 1. Check research file exists
ls -la ~/clawd/memory/21m-sports-verified-research.json

# 2. Manually trigger research
node ~/clawd/automation/21m-sports-real-research.js

# 3. Manually trigger generation
node ~/clawd/automation/21m-sports-verified-generator-v2.js

# 4. Check for errors
tail -50 ~/clawd/memory/task-logs/21m-sports-content-*.log
```

**If duplicates still occur:**
```bash
# 1. Reset tracker (nuclear option)
echo '{"athletes":{}}' > ~/clawd/memory/21m-sports-used-athletes.json

# 2. Manually mark recent athletes as used
node -e "
const T = require('./automation/lib/athlete-tracker.js');
const t = new T();
t.markUsed('Lamar Jackson');
t.markUsed('Patrick Mahomes');
t.markUsed('Jalen Brunson');
console.log('Marked as used');
"

# 3. Re-run generation
node ~/clawd/automation/21m-sports-verified-generator-v2.js
```

---

## Files to Clean Up

### 🗑️ Deprecated (Safe to Delete)

```bash
# Old V1 generators (replaced by V2)
~/clawd/automation/21m-sports-verified-generator.js
~/clawd/automation/21m-bitcoin-verified-generator.js

# Disabled scripts (already marked)
~/clawd/automation/21m-sports-tweet-generator.js.DISABLED-FAKE-DATA
~/clawd/automation/21m-bitcoin-live-researcher.js.DISABLED
~/clawd/automation/21m-sports-auto-research.js.DISABLED

# Test scripts (no longer needed)
~/clawd/automation/test-21m-system.sh  # Keep if you want it, or replace with new tests

# Old research helpers (consolidated into real-research.js)
~/clawd/automation/21m-sports-research-fresh.js
~/clawd/automation/21m-sports-researcher.js

# Duplicate generators
~/clawd/automation/21m-generator.js  # Generic, not used
~/clawd/automation/21m-claude-generator.js  # Old Claude-specific version
```

**Cleanup Command:**
```bash
cd ~/clawd/automation

# Move old files to archive
mkdir -p archive
mv 21m-sports-verified-generator.js archive/
mv 21m-bitcoin-verified-generator.js archive/
mv *.DISABLED archive/
mv 21m-sports-research-fresh.js archive/
mv 21m-sports-researcher.js archive/
mv 21m-generator.js archive/
mv 21m-claude-generator.js archive/

echo "Cleanup complete. Check archive/ folder."
```

---

## Version History

**V2.0 (2026-02-15)**
- Added athlete-tracker.js (duplicate prevention)
- Consolidated to V2 generators only
- Documented all file locations
- Added maintenance procedures

**V1.0 (2026-02-04)**
- Initial verified research system
- Real web search integration
- Fact verification layer

---

## Questions?

**Before debugging, check:**
1. Is athlete-tracker being used?
2. Is the V2 generator running?
3. Are logs showing errors?
4. Is data in the right location?

**If still stuck:**
- Read this doc again
- Check the architecture diagram
- Look at recent logs
- Ask Terry if it's a policy question

---

**END OF ARCHITECTURE DOCUMENT**

This is the source of truth. Keep it updated. Refer to it often.
