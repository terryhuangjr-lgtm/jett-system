# 21M System - Complete Architecture

**Last Updated:** February 16, 2026

---

## Quick Reference

| Task | Time | Script | Output |
|------|------|--------|---------|
| Research | 00:00 | `jett-daily-research.js --balanced` | Saves to `memory/research/` |
| Consolidate | After research | `consolidate-research.js` | `21m-*-verified-research.json` |
| Sports Tweet Gen | 05:00 | `21m-claude-generator.js --type sports` | 1 athlete, 3 variations |
| Sports Deploy | 07:30 | `deploy-21m-tweet.js` | Posts to #21msports |
| Bitcoin Gen | 04:00 | `21m-claude-generator.js --type bitcoin` | 3 tweet options |
| Bitcoin Deploy | 08:00 | `deploy-21m-tweet.js` | Posts to #21mbitcoin |

---

## Key Changes (Feb 16, 2026)

### Sports Content
- **1 athlete, 3 variations** - Uses only 1 athlete per day to conserve pool
- **Post-2009 only** - Filters out pre-Bitcoin contracts
- **30 valid athletes** - Expanded pool with 2024-2025 contracts
- **Random selection** - Fisher-Yates shuffle, excludes recently used

### Model
- **Sonnet 4.5** - Used ONLY for content generation (tweet drafting)
- **Haiku 4.5** - Default for everything else

---

## File Locations

### Core Scripts
```
/home/clawd/clawd/automation/
├── jett-daily-research.js          # Research task (runs at 00:00)
├── consolidate-research.js           # Sports content consolidator
├── consolidate-bitcoin-research.js  # BTC content consolidator  
├── 21m-claude-generator.js         # Tweet generator (uses Claude)
├── deploy-21m-tweet.js            # Slack deployer
└── lib/
    ├── athlete-tracker.js          # Prevents duplicate athletes (14-day cooldown)
    └── bitcoin-content-tracker.js # Prevents duplicate topics
```

### Data Files
```
/home/clawd/clawd/memory/
├── research/                      # SOURCE OF TRUTH - raw research files
│   ├── 2026-02-06-bitcoin.md
│   ├── 2026-02-06-contracts.md
│   ├── 2026-02-07-bitcoin.md
│   └── ...
├── 21m-sports-verified-research.json   # Sports contracts for tweets
├── 21m-bitcoin-verified-research.json # BTC topics for tweets
├── 21m-sports-verified-content.json    # Generated sports tweets
├── 21m-bitcoin-verified-content.json  # Generated BTC tweets
├── 21m-sports-used-athletes.json       # Tracker (14-day)
└── 21m-bitcoin-used-content.json      # Tracker (14-day)
```

---

## How It Works

### 1. Research (00:00)
- Runs `jett-daily-research.js --balanced`
- Topics rotate through categories:
  - **BTC:** history, quotes, sound money, adoption
  - **Sports:** mega contracts, historic, NFL QB, NBA, NIL
- Uses minimax model for research
- Saves to `/memory/research/YYYY-MM-DD-*.md`

### 2. Consolidate (auto after research)
- Runs `consolidate-research.js` and `consolidate-bitcoin-research.js`
- Reads all files from `research/`
- Adds historical BTC prices to sports contracts
- Outputs to `21m-*-verified-research.json`

### 3. Generate (05:00 / 04:00)
- Runs `21m-claude-generator.js --type [sports|bitcoin]`
- Uses **Claude Sonnet 4.5** for content generation (only model usage)
- Reads from `21m-*-verified-research.json`
- **Sports:** Picks 1 random athlete, generates 3 variations
- **Bitcoin:** Picks 3 topics, generates 3 tweets
- Filters out recently used (14-day tracker)
- Outputs tweet options to `21m-*-verified-content.json`

### 4. Deploy (07:30 / 08:00)
- Runs `deploy-21m-tweet.js [content-file]`
- Posts to Slack (#21msports or #21mbitcoin)

---

## Trackers (14-Day Cooldown)

**Purpose:** Prevent repeating the same athletes/topics

**How it works:**
- When content is generated, athlete/topic is marked with timestamp
- Before generating, filters out anything used in last 14 days
- Falls back to 30 days if all recent content used

**Files:**
- `21m-sports-used-athletes.json` 
- `21m-bitcoin-used-content.json`

---

## Troubleshooting

### Check what's in the pool
```bash
# Sports contracts available
cat /home/clawd/clawd/memory/21m-sports-verified-research.json | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["findings"]))'

# BTC topics available  
cat /home/clawd/clawd/memory/21m-bitcoin-verified-research.json | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["findings"]))'
```

### Check tracker stats
```bash
cd /home/clawd/clawd/automation
node -e "const T=require('./lib/athlete-tracker.js'); console.log(new T().getStats())"
```

### Force regenerate (clear tracker)
```bash
echo '{"athletes":{}}' > /home/clawd/clawd/memory/21m-sports-used-athletes.json
```

### Run manually
```bash
# Research
node /home/clawd/clawd/automation/jett-daily-research.js --balanced

# Consolidate  
cd /home/clawd/clawd/automation
node consolidate-research.js
node consolidate-bitcoin-research.js

# Generate
node 21m-claude-generator.js --type sports
node 21m-claude-generator.js --type bitcoin

# Deploy
node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json
node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-bitcoin-verified-content.json
```

---

## Other Systems

### Podcast Summarization
```
Task: daily at 03:00
Script: /home/clawd/skills/podcast-summary/summarize_podcast.py
Queue: /home/clawd/data/podcasts/queue.txt
Dashboard: http://localhost:5001
```

### Task Manager
```
Dashboard: http://localhost:3000
Database: /home/clawd/clawd/task-manager/tasks.db
```

---

## Rules

1. **NEVER create duplicate scripts** - check archive folder first
2. **Track everything** - use the tracker files to prevent repeats
3. **Single source of truth** - `research/` folder for content
4. **Verify before deploying** - run validator if exists
5. **Update this file** - when system changes

---

## Key Contacts

- **Jett:** AI assistant (Telegram)
- **ClawdBot:** Content generation (Slack)
- **Model Routing:** See `MODEL-ROUTING.md`
