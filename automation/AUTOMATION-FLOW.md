# Daily Automation Flow

## Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DAILY AUTOMATION                             │
└─────────────────────────────────────────────────────────────────────┘

03:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► 21M Sports Researcher
             - Searches X/web for sports + BTC topics
             - Logs findings to memory/21m-sports-research.md
             📁 Output: memory/21m-sports-research.md

04:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Weekly eBay Scan (depends on day of week)
             Monday:    MJ Topps Finest 1993-1999
             Tuesday:   Griffey Jr Refractors
             Wednesday: 1989 Griffey Jr Rookies
             Thursday:  MJ Upper Deck 96-00
             Friday:    Multi-Search (Kobe/Duncan/Dirk/Wade)
             Saturday:  MJ Base 94-99
             Sunday:    2025 Cam Ward
             📁 Output: /tmp/[scan-name]-scan.json

05:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Tweet #1 Generator
             - Generates 3 tweet variations
             - Content pillars: Contracts/Athlete Wealth/Business/Macro
             📁 Output: /tmp/21m-sports-tweet-1.json

06:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Morning Brief Generator
             - Weather (11040 New Hyde Park, NY)
             - Macro news from memory
             - Active projects
             - Today's tasks
             📁 Output: /tmp/morning-brief.json

07:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Morning Brief Deployment
             📤 Posts to: Terry's Slack DM
             📱 Channel: U0ABTP704QK

07:30 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Tweet #1 Deployment
             📤 Posts to: #21msports channel
             📱 Channel: C0ABK99L0B1
             📝 3 tweet variations ready to post to X

08:30 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► eBay Scan Deployment
             📤 Posts to: #levelupcards channel
             📱 Channel: C0ACEEDAC68
             📊 Top 10 results with scores, prices, links

11:00 AM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Tweet #2 Generator
             - Generates 3 tweet variations
             - Different from morning tweets
             📁 Output: /tmp/21m-sports-tweet-2.json

12:00 PM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │
         └─► Tweet #2 Deployment
             📤 Posts to: #21msports channel
             📱 Channel: C0ABK99L0B1
             📝 3 tweet variations ready to post to X

```

---

## Data Flow

### Morning Brief Flow
```
morning-brief.js
    ├─► Fetches weather from wttr.in
    ├─► Reads memory/macro-news.md
    ├─► Reads memory/active-projects.md
    ├─► Queries task-manager for pending tasks
    └─► Outputs /tmp/morning-brief.json
            │
            └─► deploy-morning-brief.js
                    └─► Posts to Terry's DM via clawdbot
```

### 21M Sports Tweet Flow
```
21m-sports-tweet-generator.js
    ├─► Selects 3 content pillars
    ├─► Fills templates with data
    ├─► Logs to memory/21m-sports-research.md
    └─► Outputs /tmp/21m-sports-tweet-{1,2}.json
            │
            └─► deploy-21m-tweet.js
                    └─► Posts to #21msports via clawdbot
```

### eBay Scan Flow
```
ebay-scanner/multi-search.js (runs at 4 AM)
    └─► Outputs /tmp/[scan-name]-scan.json
            │
            └─► deploy-ebay-scans.js (runs at 8:30 AM)
                    ├─► Auto-detects today's scan file
                    ├─► Formats top 10 results
                    └─► Posts to #levelupcards via clawdbot
```

---

## Task Dependencies

```
Task 27 (3 AM Research)
    └─► Populates memory for future content

Task 25 (5 AM Tweet #1 Prep)
    └─► Task 36 (7:30 AM Deploy)

Task 24 (6 AM Morning Brief Prep)
    └─► Task 35 (7 AM Deploy)

Tasks 28-34 (4 AM eBay Scans)
    └─► Task 38 (8:30 AM Deploy)

Task 26 (11 AM Tweet #2 Prep)
    └─► Task 37 (12 PM Deploy)
```

---

## File System

```
~/clawd/
│
├── automation/                    ← NEW SCRIPTS
│   ├── morning-brief.js
│   ├── deploy-morning-brief.js
│   ├── 21m-sports-tweet-generator.js
│   ├── deploy-21m-tweet.js
│   ├── 21m-sports-researcher.js
│   ├── deploy-ebay-scans.js
│   ├── README.md
│   ├── AUTOMATION-COMPLETE.md
│   └── AUTOMATION-FLOW.md (this file)
│
├── memory/                        ← DATA STORAGE
│   ├── 21m-sports-research.md     (auto-generated)
│   ├── macro-news.md              (manual updates)
│   └── active-projects.md         (manual updates)
│
├── task-manager/                  ← SCHEDULING
│   ├── cli.js
│   ├── database.js
│   └── tasks.db (15 tasks)
│
└── ebay-scanner/                  ← EXISTING
    └── multi-search.js

/tmp/                              ← TEMP OUTPUT
├── morning-brief.json
├── 21m-sports-tweet-1.json
├── 21m-sports-tweet-2.json
└── [ebay scan files].json
```

---

## Slack Destinations

```
Morning Brief
    └─► Terry's DM (U0ABTP704QK)
        Example: "☀️ Good Morning - Monday, Feb 3, 2026
                  📍 Weather: 36°F ☀️
                  📰 Macro News: [latest]
                  🎯 Active Projects: [list]
                  ✅ Today's Tasks: [list]"

21M Sports Tweets
    └─► #21msports (C0ABK99L0B1)
        Example: "🏈 21M Sports - Tweet Options
                  Option 1 (contracts): [tweet]
                  Option 2 (macro): [tweet]
                  Option 3 (athlete_wealth): [tweet]"

eBay Scans
    └─► #levelupcards (C0ACEEDAC68)
        Example: "📊 eBay Scan: MJ Topps Finest 1993-1999
                  🔍 Found 25 results (showing top 10)
                  1. [title]
                     💰 $45 | 📈 Score: 8.5
                     🔗 [link]"
```

---

## Commands Reference

**View all tasks:**
```bash
cd ~/clawd/task-manager && node cli.js list
```

**Check task logs:**
```bash
node cli.js logs TASK_ID
```

**Manual test:**
```bash
cd ~/clawd/automation
node morning-brief.js /tmp/test.json
```

**Update memory:**
```bash
echo "- New item" >> ~/clawd/memory/macro-news.md
```

---

## Status

✅ 15 tasks configured
✅ 6 automation scripts built
✅ All scripts tested
✅ Slack integration working
✅ Documentation complete

**System is LIVE and ready to run.**

---

Last updated: 2026-02-02
