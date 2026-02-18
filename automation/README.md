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

### 2. 21M Sports Verified Content Pipeline

**⚠️ IMPORTANT: As of Feb 5, 2026, all 21M Sports content MUST be verified.**

The fake content generator has been permanently removed. Only verified sources are used.

#### 2a. Auto-Verified Generator (`21m-sports-auto-verified.js`)
**Purpose:** Generate verified tweet options from research data
**Schedule:**
- Tweet #1: 5 AM prep, 7:30 AM deploy
- Tweet #2: 11 AM prep, 12 PM deploy
**Input:** `memory/21m-sports-research.md` (from task 27 at 3 AM)
**Output:** `/tmp/21m-sports-tweet-1.json` or `/tmp/21m-sports-tweet-2.json`
**Deploy to:** #21msports channel

**Usage:**
```bash
# Generate verified content from research
node 21m-sports-auto-verified.js /tmp/21m-sports-tweet-1.json

# Deploy to #21msports
node deploy-21m-tweet.js /tmp/21m-sports-tweet-1.json
```

**How it works:**
1. Reads overnight research from `memory/21m-sports-research.md`
2. Extracts top contract finding (highest BTC equivalent)
3. Validates all required fields (player, amount, year, BTC, sources)
4. Calls `21m-sports-verified-generator.js` with verified data
5. Outputs JSON with tweet options and source URLs

**Exit codes:**
- `0` = Success, verified content generated
- `1` = Research file missing or invalid
- `1` = No verifiable contract data found
- `1` = Validation failed

#### 2b. Verified Generator (Manual) (`21m-sports-verified-generator.js`)
**Purpose:** Generate content from manually verified data
**Usage:** For manual content creation (requires all inputs)

```bash
node 21m-sports-verified-generator.js \
  --contract-source "https://spotrac.com/..." \
  --btc-price-source "https://coingecko.com/..." \
  --player "Player Name" \
  --amount "$XXX million" \
  --year "YYYY" \
  --btc-equivalent "XXX BTC"
```

**Content Pillars:**
- Contracts in BTC terms
- Athlete wealth destruction/preservation
- Sports business economics
- Macro + sports connections
- Quick hits

#### 2c. Deploy Script with Verification (`deploy-21m-tweet.js`)
**Purpose:** Post verified tweet options to #21msports
**Security:** Blocks deployment if content is not verified

**Verification checks:**
1. `metadata.verified` must be `true`
2. `sources.contract` URL must be present
3. `sources.btc_price` URL must be present
4. All source URLs must be valid (start with http)

**Usage:**
```bash
# Deploy to #21msports (production)
node deploy-21m-tweet.js /tmp/21m-sports-tweet-1.json

# Test verification without posting
node deploy-21m-tweet.js /tmp/21m-sports-tweet-1.json --dry-run
```

**Audit trail:** All deployments logged to `memory/21m-sports-deployments.log`

---

### 3. 21M Sports Researcher (`21m-sports-researcher.js`)
**Purpose:** Search X and web for 21M Sports topics, log to memory
**Schedule:** 3 AM daily (MUST run before content generation)
**Output:** `memory/21m-sports-research.md`

**Usage:**
```bash
node 21m-sports-researcher.js
```

**Critical:** This MUST run before the auto-verified generator. Research provides the verified contract data that content generation depends on.

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
├── morning-brief.js                  # Generate morning brief
├── deploy-morning-brief.js           # Post brief to Slack DM
├── 21m-sports-auto-verified.js       # ✅ Auto-verified content generator
├── 21m-sports-verified-generator.js  # Manual verified generator
├── 21m-sports-validator.js           # Pre-flight verification
├── deploy-21m-tweet.js               # Post tweets (with verification)
├── 21m-sports-researcher.js          # Research and log findings
├── deploy-ebay-scans.js              # Post eBay results to #levelupcards
├── test-verified-pipeline.sh         # Test verified pipeline
└── README.md                         # This file

memory/
├── 21m-sports-research.md            # Research log (input for auto-generator)
├── 21m-sports-verified-content.json  # Generated verified content
├── 21m-sports-deployments.log        # Audit log of all deployments
├── macro-news.md                     # Macro news updates
└── active-projects.md                # Current projects
```

---

## Testing Scripts

**Morning brief:**
```bash
cd ~/clawd/automation
node morning-brief.js /tmp/test-brief.json
cat /tmp/test-brief.json
```

**21M Sports verified pipeline:**
```bash
# Test entire pipeline
cd ~/clawd/automation
./test-verified-pipeline.sh

# Test auto-generator only
node 21m-sports-auto-verified.js /tmp/test-output.json
cat /tmp/test-output.json | jq

# Test deploy script (dry run - no posting)
node deploy-21m-tweet.js /tmp/test-output.json --dry-run
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

## 21M Sports Pipeline Flow

**CRITICAL: Content is ONLY generated from verified sources. No fake data.**

```
┌─────────────────────────────────────────────────────────┐
│ 3:00 AM - Research (Task 27)                           │
│ • 21m-sports-researcher.js                              │
│ • Output: memory/21m-sports-research.md                 │
│ • Finds contracts, verifies with Spotrac               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5:00 AM - Tweet #1 Prep (Task A)                       │
│ • 21m-sports-auto-verified.js                           │
│ • Reads research, extracts top contract                │
│ • Validates all required fields                        │
│ • Calls verified-generator with sources                │
│ • Output: /tmp/21m-sports-tweet-1.json                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 7:30 AM - Tweet #1 Deploy (Task B)                     │
│ • deploy-21m-tweet.js                                   │
│ • Verifies metadata.verified === true                  │
│ • Verifies sources present                             │
│ • Posts to #21msports with source URLs                 │
│ • Logs to audit trail                                  │
└─────────────────────────────────────────────────────────┘

(Same flow repeats at 11 AM prep / 12 PM deploy for Tweet #2)
```

**Verification Gates:**
1. ✅ Research must have valid contract data
2. ✅ Auto-generator validates all fields
3. ✅ Deploy script checks metadata.verified
4. ✅ Deploy script checks source URLs
5. ✅ All deployments logged to audit trail

**Blocks:**
- ❌ Missing research file → Exit 1
- ❌ No contract data → Exit 1
- ❌ Missing required fields → Exit 1
- ❌ metadata.verified !== true → Exit 1
- ❌ Missing source URLs → Exit 1

---

## Troubleshooting

**"Research file not found"**
- Ensure task 27 (21M Sports Researcher) ran successfully at 3 AM
- Check `memory/21m-sports-research.md` exists
- Research must complete BEFORE content generation

**"No verifiable contract data found"**
- Check research file has "Research Session" section
- Verify contract entries have all required fields:
  - Player name
  - Contract amount ($XXM)
  - Year
  - BTC equivalent
  - Source

**"Verification failed"**
- Deploy script blocks unverified content
- Check `metadata.verified` is `true`
- Check `sources.contract` and `sources.btc_price` URLs present
- Never bypass verification checks

**Test pipeline:**
```bash
cd ~/clawd/automation
./test-verified-pipeline.sh
```

---

Last updated: 2026-02-05
