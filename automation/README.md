# Automation Scripts

Complete automation system for daily tasks, 21M Sports content, and eBay scans.

---

## Scripts Overview

### 1. Morning Brief (`morning-brief.js`)
**Purpose:** Generate daily morning brief with weather, macro news, and tasks
**Schedule:** 6 AM (prep), 7 AM (deploy)
**Output:** `/tmp/morning-brief.json`
**Deploy to:** Terry's Slack DM

**Usage:**
```bash
node morning-brief.js [output-file]
node deploy-morning-brief.js [brief-file]
```

**Components:**
- Weather for 11040 (New Hyde Park, NY)
- Macro news from memory/macro-news.md
- Active projects from memory/active-projects.md
- Today's scheduled tasks from task-manager

---

### 2. 21M Sports Tweet Generator (`21m-sports-tweet-generator.js`)
**Purpose:** Generate 3 tweet variations for Bitcoin-denominated sports content
**Schedule:**
- Tweet #1: 5 AM prep, 7:30 AM deploy
- Tweet #2: 11 AM prep, 12 PM deploy
**Output:** `/tmp/21m-sports-tweet.json`
**Deploy to:** #21msports channel

**Usage:**
```bash
node 21m-sports-tweet-generator.js [output-file]
node deploy-21m-tweet.js [tweet-file]
```

**Content Pillars:**
- Contracts in BTC terms
- Athlete wealth destruction/preservation
- Sports business economics
- Macro + sports connections
- Quick hits

---

### 3. 21M Sports Researcher (`21m-sports-researcher.js`)
**Purpose:** Search X and web for 21M Sports topics, log to memory
**Schedule:** 3 AM daily
**Output:** `memory/21m-sports-research.md`

**Usage:**
```bash
node 21m-sports-researcher.js
```

---

### 4. eBay Scan Deployment (`deploy-ebay-scans.js`)
**Purpose:** Post eBay scan results to #levelupcards
**Schedule:** 8:30 AM (after 4 AM scans complete)
**Input:** `/tmp/*-scan.json` files
**Deploy to:** #levelupcards channel

**Usage:**
```bash
# Auto-detect today's scan
node deploy-ebay-scans.js

# Specify scan file
node deploy-ebay-scans.js /tmp/mj-finest-scan.json
```

**Weekly Schedule:**
- Monday: MJ Topps Finest 1993-1999
- Tuesday: Griffey Jr Chrome/Finest refractors
- Wednesday: 1989 Griffey Jr rookies
- Thursday: MJ Upper Deck serial #'d 1996-2000
- Friday: Multi-search (Kobe, Duncan, Dirk, Wade)
- Saturday: MJ base 1994-1999
- Sunday: 2025 Cam Ward

---

## File Structure

```
automation/
├── morning-brief.js              # Generate morning brief
├── deploy-morning-brief.js       # Post brief to Slack DM
├── 21m-sports-tweet-generator.js # Generate tweet variations
├── deploy-21m-tweet.js           # Post tweets to #21msports
├── 21m-sports-researcher.js      # Research and log findings
├── deploy-ebay-scans.js          # Post eBay results to #levelupcards
└── README.md                     # This file

memory/
├── 21m-sports-research.md        # Research log
├── macro-news.md                 # Macro news updates
└── active-projects.md            # Current projects
```

---

## Testing Scripts

**Morning brief:**
```bash
cd ~/clawd/automation
node morning-brief.js /tmp/test-brief.json
cat /tmp/test-brief.json
```

**Tweet generator:**
```bash
node 21m-sports-tweet-generator.js /tmp/test-tweet.json
cat /tmp/test-tweet.json
```

**Researcher:**
```bash
node 21m-sports-researcher.js
cat ~/clawd/memory/21m-sports-research.md
```

---

## Task Manager Integration

View tasks:
```bash
cd ~/clawd/task-manager
node cli.js list
```

Update task command:
```bash
node cli.js update TASK_ID --command "node ~/clawd/automation/script.js"
```

---

## Slack Channels

- Terry's DM: `U0ABTP704QK`
- #21msports: `C0ABK99L0B1`
- #levelupcards: `C0ACEEDAC68`

---

Last updated: 2026-02-02
