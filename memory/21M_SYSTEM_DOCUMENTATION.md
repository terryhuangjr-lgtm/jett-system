# 21M Content System - Complete Documentation

**Version:** 2.0
**Last Updated:** 2026-02-11
**Related Docs:** [eBay Scanner Documentation](./EBAY_SCANNER_DOCUMENTATION.md)

---

## Overview

The 21M Content System generates Bitcoin/Sports content for X (Twitter). It consists of:
1. **Content Research** - Jett researches and adds verified facts to database
2. **Content Generation** - Claude generates tweets from verified content
3. **Content Deployment** - Tweets are posted to #21msports on Slack/X

---

## Quick Commands

```bash
# Research (runs daily at midnight EST)
node /home/clawd/clawd/automation/jett-daily-research.js --balanced

# Generate tweets
node /home/clawd/clawd/automation/21m-claude-generator.js --type sports
node /home/clawd/clawd/automation/21m-claude-generator.js --type bitcoin

# Deploy to Slack/X
node /home/clawd/clawd/automation/deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json
node /home/clawd/clawd/automation/deploy-21m-tweet.js /home/clawd/clawd/memory/21m-bitcoin-verified-content.json
```

---

## Architecture

### 1. Jett Daily Research (`jett-daily-research.js`)

**Location:** `/home/clawd/clawd/automation/jett-daily-research.js`

Jett researches 1-2 topics per day and adds verified facts to the database.

**Modes:**
```bash
# Default - 1 random topic
node jett-daily-research.js

# Balanced - 1 BTC + 1 Sports (recommended for daily use)
node jett-daily-research.js --balanced

# Explicit
node jett-daily-research.js --btc    # 1 BTC topic
node jett-daily-research.js --sports  # 1 Sports topic

# Multiple topics
node jett-daily-research.js --topics=4  # 4 mixed topics
```

**Topic Rotation:**
- `bitcoin_history` - Halving, Satoshi, whitepaper, crashes
- `bitcoin_quotes` - Saylor, Antonopoulos, Store of Value
- `adoption_milestones` - Corporate treasuries, ETFs, institutional
- `sound_money_principles` - Fiat debasement, inflation, hard money
- `21m-sports` - Contracts, megadeals, athlete finance
- `quotes_and_wisdom` - Athlete mistakes, financial wisdom

**Output:** Adds verified facts to `content_ideas` table with source URLs

### 2. Content Pool Manager (`content_pool_manager.py`)

**Location:** `/home/clawd/clawd/automation/content_pool_manager.py`

Smart content selection algorithm that prevents repetition.

**Features:**
- Skips topics used in last 7 days
- Balances categories (contracts + stories)
- Highest quality score = selected first
- 30-day recycle window

**Usage:**
```bash
# Stats
python3 content_pool_manager.py --stats

# Select content
python3 content_pool_manager.py --select sports
python3 content_pool_manager.py --select bitcoin

# Recycle old content
python3 content_pool_manager.py --recycle 30
```

### 3. Verified Contracts Database (`verified_mega_deals.py`)

**Location:** `/home/clawd/clawd/automation/verified_mega_deals.py`

Curated database of 30 verified star contracts - NO garbage, NO scraping.

**Categories:**
| Category | Count | Examples |
|----------|-------|----------|
| Mega-Deals ($300M+) | 12 | Soto ($765M), Ohtani ($700M), Mahomes ($450M) |
| Historic Stars ($100M-$300M) | 15 | Kobe ($136M), LeBron ($110M), A-Rod ($252M) |
| Legendary (pre-$100M) | 3 | Larry Bird ($33M), Magic ($25M) |

All from verified sources (Spotrac, Wikipedia).

### 4. Claude Tweet Generator (`21m-claude-generator.js`)

**Location:** `/home/clawd/clawd/automation/21m-claude-generator.js`

Generates verified tweets using Claude.

```bash
# Generate sports tweets
node 21m-claude-generator.js --type sports

# Generate bitcoin tweets  
node 21m-claude-generator.js --type bitcoin

# Output to specific file
node 21m-claude-generator.js --type sports --output /path/to/output.json
```

**Output:** JSON file with tweets, saved to `/home/clawd/clawd/memory/21m-{sports|bitcoin}-verified-content.json`

### 5. Deployment (`deploy-21m-tweet.js`)

**Location:** `/home/clawd/clawd/automation/deploy-21m-tweet.js`

Posts generated tweets to Slack/X.

```bash
# Deploy sports tweets
node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json

# Deploy bitcoin tweets
node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-bitcoin-verified-content.json
```

---

## Database Schema

### content_ideas table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| topic | TEXT | Topic name |
| category | TEXT | Category (sports, bitcoin, etc.) |
| content | TEXT | The actual content/fact |
| status | TEXT | draft/published |
| quality_score | INTEGER | 1-10 quality rating |
| source | TEXT | Source URL |
| last_used | TEXT | ISO timestamp of last use |
| usage_count | INTEGER | Number of times used |

### Tables Created

- `content_usage_log` - Log of every content use
- `tweet_deployments` - Track of deployments

---

## Task Manager Schedule

Tasks managed at http://localhost:3000

| Time (EST) | Task |
|------------|------|
| Midnight | Jett Daily Research (--balanced) |
| 9:00 AM | eBay Scans (per day) |
| 1:30 PM | eBay Deploy to Slack |
| 5:00 AM | Sports Tweet Generation |
| 7:30 AM | Sports Tweet Deployment |
| 11:00 AM | Sports Tweet Generation (slot 2) |
| 12:00 PM | Sports Tweet Deployment (slot 2) |
| 4:00 AM | Bitcoin Tweet Generation |
| 6:00 AM | Bitcoin Tweet Deployment |

---

## eBay Scanner Manager

**Dashboard:** http://localhost:3000/ebay.html

A separate dashboard for managing eBay scans. See [EBAY_SCANNER_DOCUMENTATION.md](./EBAY_SCANNER_DOCUMENTATION.md)

---

## Important Notes

### No Scraping
The system NO LONGER uses Brave Search or web scraping. All content is either:
- Pre-verified in `verified_mega_deals.py`
- Researched by Jett with source verification

### Single Slack Listener
Only ONE Slack listener should be active:
- ✅ clawdbot with native Slack plugin
- ❌ slack-bridge.js (DISABLED)

### Content Cooldown
- Topics used in last 7 days are skipped
- After 30 days, content can be reused
- Quality score affects selection priority

---

## Troubleshooting

### Tweets not generating
1. Check Claude API: `curl http://localhost:11434/api/tags`
2. Check content pool: `python3 content_pool_manager.py --stats`
3. Review logs in `/home/clawd/clawd/memory/`

### Deploy fails
1. Verify clawdbot is running: `ps aux | grep clawdbot`
2. Test Slack: `clawdbot message send --target "#21msports" --message "test"`
3. Check deploy script logs

### Duplicate responses in Slack
1. Verify only clawdbot is running (not slack-bridge.js)
2. Run: `ps aux | grep slack-bridge`
3. If running, kill: `pkill -9 -f slack-bridge.js`

### Content pool empty
1. Run research: `node jett-daily-research.js --balanced`
2. Check database: `python3 content_pool_manager.py --stats`
3. Verify items in DB: `sqlite3 /home/clawd/clawd/data/jett_knowledge.db "SELECT COUNT(*) FROM content_ideas"`

---

## Jett Instructions

When working on 21M content:

1. **Research new content:**
   ```bash
   node /home/clawd/clawd/automation/jett-daily-research.js --balanced
   ```

2. **Check content availability:**
   ```bash
   python3 /home/clawd/clawd/automation/content_pool_manager.py --stats
   ```

3. **Generate tweets (for Terry to review):**
   ```bash
   node /home/clawd/clawd/automation/21m-claude-generator.js --type sports
   node /home/clawd/clawd/automation/21m-claude-generator.js --type bitcoin
   ```

4. **DO NOT:**
   - Use brave-search.js or scraping
   - Modify task schedules directly (use Task Manager dashboard)
   - Use old generators (21m-sports-verified-generator.js)
   - Have multiple Slack listeners running

5. **ALWAYS:**
   - Include source URLs in research
   - Verify all facts before adding to DB
   - Use the content pool manager for selection
   - Mark content as used after generation

---

## File Inventory

| File | Status | Purpose |
|------|--------|---------|
| `verified_mega_deals.py` | ✅ ACTIVE | 30 verified contracts |
| `jett-daily-research.js` | ✅ ACTIVE | Research new content |
| `content_pool_manager.py` | ✅ ACTIVE | Smart selection |
| `21m-claude-generator.js` | ✅ ACTIVE | Generate tweets |
| `deploy-21m-tweet.js` | ✅ ACTIVE | Deploy to Slack |
| `brave-search.js` | ❌ DISABLED | Scraping (garbage) |
| `21m-bitcoin-live-researcher.js` | ❌ DISABLED | Scraping |
| `21m-sports-auto-research.js` | ❌ DISABLED | Scraping |
| `slack-bridge.js` | ❌ DISABLED | Duplicate Slack |

---

## Success Criteria

✅ Content pool has 100+ verified items
✅ Tweets generate without errors
✅ Single Slack listener (no duplicates)
✅ Research adds 2-3 items per day
✅ No fabricated content
✅ Usage tracking works (last_used, usage_count)

---

## Sample Output

### content_pool_manager.py --stats
```bash
$ python3 content_pool_manager.py --stats

Content Pool Statistics:
========================
Total items: 104
Published items: 104

Categories:
  bitcoin_available: 48
  sports_available: 14
  quotes_and_wisdom: 35
  adoption_milestones: 2
  sound_money_principles: 1
  unknown: 4

Quality Distribution:
  1-3: 0 items
  4-6: 8 items
  7-8: 72 items
  9-10: 24 items

Top 10 Topics:
  #1: soto contract - usage_count: 1, quality: 9.2
  #2: ohtani contract - usage_count: 1, quality: 9.5
  #3: mahomes contract - usage_count: 1, quality: 9.0
  #4: bitcoin halving - usage_count: 0, quality: 8.5
  #5: satoshi quotes - usage_count: 0, quality: 8.0

Recently Used (last 7 days):
  ohtani contract - last_used: 2026-02-11
  soto contract - last_used: 2026-02-11
  bitcoin halving - last_used: 2026-02-10
```

### Good Research Output (from jett-daily-research.js)
```bash
$ node jett-daily-research.js --balanced

🔍 JETT DAILY RESEARCH
========================

📚 Research 1/2: Michael Saylor Bitcoin strategy
   Category: bitcoin_quotes

   Found 3 verified items:

   ✓ Added: "MicroStrategy has purchased over 1 million BTC across 2020-2024" [Source: https://microstrategy.com/ir]
   ✓ Added: "Saylor believes Bitcoin will reach $1 million per coin" [Source: https://twitter.com/saylor]
   ✓ Added: "MicroStrategy's Bitcoin holdings worth $40B+ at current prices" [Source: https://coinmarketcap.com]

📚 Research 2/2: NBA contract extensions 2025
   Category: 21m-sports

   Found 2 verified items:

   ✓ Added: "Jayson Tatum signed 5-year $314 million supermax extension" [Source: https://spotrac.com/nba/players/jayson-tatum]
   ✓ Added: "Donovan Mitchell agreed to 3-year $163 million extension" [Source: https://spotrac.com/nba/players/donovan-mitchell]

✅ Research complete!
   Topics: 2
   Items added: 5
```

### Sample Generated Tweet (21m-claude-generator.js output)
```json
{
  "tweets": [
    {
      "content": "🏀 NBA megadeals in BTC terms:\n\nSoto's $765M = 11,423 BTC\nOhtani's $700M = 10,448 BTC\nMahomes' $450M = 6,716 BTC\n\nThese aren't just contracts — they're generational wealth in a single transaction.\n\n#Bitcoin #21M",
      "category": "sports",
      "topic": "mega_contracts_2024",
      "quality_score": 9.2,
      "btc_price_used": 67000,
      "content_ids": [1, 2, 3]
    },
    {
      "content": "📈 2024 Bitcoin halving reduced supply growth from 1.8% to 0.8% annually.\n\nAt $67K BTC, we're seeing institutional accumulation accelerate.\n\nThe math is simple: less supply + more demand = ?\n\n#Bitcoin #Halving",
      "category": "bitcoin",
      "topic": "halving_supply",
      "quality_score": 8.5,
      "content_ids": [45, 46]
    }
  ],
  "generated_at": "2026-02-11T10:30:00Z"
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-08 | Initial system with brave-search scraping |
| 1.5 | 2026-02-09 | Added verified_mega_deals.py database |
| 2.0 | 2026-02-11 | Complete overhaul: removed scraping, added content pool, usage tracking, Jett daily research, eBay scanner manager |

**See Also:** [eBay Scanner Documentation](./EBAY_SCANNER_DOCUMENTATION.md)
