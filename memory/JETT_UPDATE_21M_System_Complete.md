# 21M Content System - Complete Implementation

**Date:** 2026-02-11
**Status:** ✅ COMPLETE

---

## Questions Answered

### 1. Does research happen smartly each night?

**YES.** The system now:

1. **Loads verified mega-deals** from curated database (`verified_mega_deals.py`)
2. **Selects star players** (Soto, Ohtani, Judge, Mahomes, etc.)
3. **No scraping** - all data pre-verified from Spotrac
4. **Adds financial lessons** (bankruptcies, success stories)
5. **Saves to DB** with quality scores

### 2. Is Jett equipped to gather good data?

**YES.** Created:

| File | Purpose |
|------|---------|
| `verified_mega_deals.py` | Curated database of star player contracts |
| `21m-sports-real-research.py` | Research that uses verified data |
| `content_pool_manager.py` | Smart content selection |

### 3. Where did garbage data come from?

**Root cause:** Brave Search API was scraping garbage:
- `Yahoo Sports` - article with "2026" in URL (future prediction)
- `Kerby Joseph` - prediction article, not actual contract

**FIXED:** Replaced scraping with curated database of verified mega-deals.

---

## What Was Built

### 1. Smart Research System
```
Uses: verified_mega_deals.py (curated database)
├── Juan Soto - $765M (MLB)
├── Shohei Ohtani - $700M (MLB)
├── Aaron Judge - $360M (MLB)
├── Patrick Mahomes - $450M (NFL)
├── Jaylen Brown - $304M (NBA)
└── Plus: bankruptcy stories, fiat debasement examples
```

### 2. Smart Content Selection
```
Content Pool Manager selects based on:
├── Skip topics used in last 7 days
├── Balance categories (contracts, stories, lessons)
├── Score by quality, recency, usage count
├── BTC trend awareness (up/down/neutral)
└── Select diverse mix for Claude
```

### 3. Engagement Tracking
```
Tracks:
├── Tweet deployments
├── Engagement metrics (likes, RTs, replies)
├── Performance scores
└── Auto-adjusts content quality
```

---

## Key Files

### New Files Created

| File | Purpose |
|------|---------|
| `verified_mega_deals.py` | **Curated database of star contracts** |
| `content_pool_manager.py` | Smart content selection |
| `engagement_tracker.py` | Track tweet performance |
| `content-pool-bridge.js` | Node.js → Python bridge |
| `mark-content-used.js` | Mark content as used |
| `_mark-used-helper.py` | Helper script |

### Modified Files

| File | Change |
|------|--------|
| `21m-claude-generator.js` | Now uses pool manager |
| `21m-sports-real-research.py` | Uses verified data, no scraping |
| `jett_db.py` | Added `last_used`, `usage_count` columns |

---

## How It Works Now

### Nightly Research (via cron)
```bash
cd /home/clawd/clawd/automation
python3 21m-sports-real-research.py
python3 21m-bitcoin-real-research.py
```

### Morning Generation (via cron)
```bash
cd /home/clawd/clawd/automation
node 21m-claude-generator.js --type sports
node 21m-claude-generator.js --type bitcoin
```

### Selection Algorithm
```
1. Get all available content
2. Filter out topics used in last 7 days
3. Score each item:
   - Quality score (base 7-10)
   - Days since created (newer = better)
   - Usage count (less = better)
   - Category balance
   - BTC context bonus
4. Select diverse mix (contracts + stories + lessons)
5. Feed Claude multiple options + recent post context
```

---

## Verified Mega-Deals Database

Located: `/home/clawd/clawd/automation/verified_mega_deals.py`

Contains ONLY star players with verified contracts:

```python
{
    'player': 'Juan Soto',
    'team': 'New York Mets',
    'sport': 'MLB',
    'contract_value': 765000000,
    'signing_date': '2024-12-08',
    'source_url': 'https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/',
    'notes': 'Largest contract in MLB history - 15-year deal'
}
```

No random players. No predictions. No garbage.

---

## Commands

### Run Research (Nightly)
```bash
cd /home/clawd/clawd/automation

# Sports research (verified data)
python3 21m-sports-real-research.py

# Bitcoin research
python3 21m-bitcoin-real-research.py
```

### Generate Tweets (Morning)
```bash
cd /home/clawd/clawd/automation

# Sports tweets
node 21m-claude-generator.js --type sports

# Bitcoin tweets
node 21m-claude-generator.js --type bitcoin
```

### Pool Management
```bash
# Check pool stats
python3 content_pool_manager.py --stats

# Recycle old content
python3 content_pool_manager.py --recycle 30

# Test selection
python3 content_pool_manager.py --select sports --btc-price 67000
```

### Engagement Tracking
```bash
# Summary (30 days)
python3 engagement_tracker.py --summary

# Best performing
python3 engagement_tracker.py --best 30

# Daily trends
python3 engagement_tracker.py --trends 30
```

---

## Example Output

### Sports Research Output
```
🏈 21M SPORTS RESEARCH (VERIFIED DATA)
========================================
  Contracts researched: 6
  Financial lessons: 2
  Database entries: 6
  Research file: /home/clawd/clawd/memory/research/2026-02-11-contracts.md

Content includes:
✓ Juan Soto - $765M (MLB)
✓ Shohei Ohtani - $700M (MLB)  
✓ Aaron Judge - $360M (MLB)
✓ Patrick Mahomes - $450M (NFL)
```

### Generated Tweets
```
1. (177 chars)
   Juan Soto's $765M Mets contract = 11,384 bitcoin. 
   That's 0.05% of all Bitcoin that will ever exist.

2. (180 chars)
   The largest contract in MLB history: $765 million. 
   Sounds massive... until you measure it in Bitcoin.

3. (193 chars)
   $765M bought Juan Soto 11,384 bitcoin in December 2024. 
   The dollar sign doesn't mean what you think it does.
```

---

## What's Different Now

| Before | After |
|--------|-------|
| Scraped garbage from Brave Search | Curated verified mega-deals |
| Random players (Kerby Joseph) | Star players only (Soto, Ohtani, Judge) |
| Predictions mixed with real deals | ONLY verified signed contracts |
| No content tracking | Full engagement & recycling |
| Same topics repeatedly | 7-day cooldown, 30-day recycle |

---

## Verification

All content now comes from verified sources:
- Spotrac.com for contracts (verified URLs)
- No scraped predictions
- No garbage articles
- No random players

---

*Generated: 2026-02-11*
