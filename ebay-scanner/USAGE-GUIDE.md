# eBay Scored Search - Usage Guide

**Last Updated:** February 2, 2026
**Status:** ✅ Production Ready

---

## Quick Start

```bash
cd /home/clawd/clawd/ebay-scanner

# Search raw cards only (default)
node scored-search.js "dirk nowitzki refractor"

# Include graded cards too
# (edit scored-search.js: rawOnly: false)
```

---

## What's Different Now

### ✅ Raw Cards Only (Default)

**Automatically filters out:**
- PSA, BGS, CGC, SGC graded cards
- Anything with "graded", "gem mint", "pristine" in title

**What you'll see:**
```
Found: 200 listings
Filtering to raw cards only...
200 total → 120 raw (60%)
Scoring 120 listings...
```

**To include graded cards:**
1. Edit `scored-search.js`
2. Change `rawOnly: true` to `rawOnly: false`
3. Run search

Or tell Jett: "search including graded cards"

---

### ✅ Rebalanced Scoring (Fixes Comp Deception)

**New weights:**
- **Price:** 25% (down from 40%) - Less weight because comps are unreliable
- **Seller:** 25% (up from 20%) - More weight because feedback % is reliable
- **Listing:** 30% (up from 20%) - More weight because title/condition matters
- **Fresh:** 10% (same)
- **Comps:** 10% (same)

**Why this matters:**

*Before:*
- Card listed at $26
- One overpriced comp at $2,141
- System: "99% below! Score 10/10!"
- Reality: Card worth $50, so $26 is fair (not a steal)

*After:*
- Same card, same comp
- Price gets 25% weight (not 40%)
- If seller is weak (2.5/10) or listing is sketchy (2/10), score drops
- More balanced evaluation

---

## Output Explained

### Score Ranges

| Score | Rating | Meaning |
|-------|--------|---------|
| 9-10 | 🔥 STEAL | Act immediately |
| 8-9 | ⚡ GREAT | Strong buy |
| 7-8 | 💰 SOLID | Worth buying |
| 6-7 | ✓ DECENT | Consider |
| 5-6 | ~ MAYBE | Manual research |
| <5 | ❌ SKIP | Don't waste time |

### Sample Output

```
╔══════════════════════════════════════════════════════╗
║  DEAL FINDER - DIRK NOWITZKI REFRACTOR         ║
╚══════════════════════════════════════════════════════╝

🔍 Searching eBay...
   Found: 200 listings

🎯 Filtering to raw cards only...
   200 total → 120 raw (60%)

📊 Scoring 120 listings...
⚠️  NOTE: Comps based on active listings (85% discount factor)

✅ Scored 120 listings
   Showing 51 with score ≥ 5.0

═══════════════════════════════════════════════════════
📊 TOP 10 DEALS:

1. [SCORE: 8.2/10] ⚡ GREAT DEAL
   2007 Topps Chrome Dirk Refractor /999
   💰 Price: $99.90 (Median: $424.99 - 76% below)
   👤 Seller: 100.0% (1597 sales) ✅ TRUSTED
   ✨ Has photos, Mint condition claimed
   🔗 [eBay link]

...
```

---

## Score Breakdown

Each listing scored on 5 factors:

### 1. Price vs Market (25% weight)

| Discount | Points | Tier |
|----------|--------|------|
| 50%+ | 10 | STEAL |
| 30-50% | 7.5 | GREAT |
| 20-30% | 5 | SOLID |
| 10-20% | 2.5 | DECENT |
| <10% | 0 | SKIP |

### 2. Seller Trust (25% weight)

| Feedback | Sales | Points | Trust |
|----------|-------|--------|-------|
| 99%+ | 1000+ | 10 | ✅ TRUSTED |
| 98-99% | 500+ | 7.5 | Good |
| 95-98% | 100+ | 5 | OK |
| 90-95% | <100 | 2.5 | New |
| <90% | Any | 0 | Risky |

### 3. Listing Quality (30% weight)

**Positive signals:**
- Has photos: +5 pts
- "Pack fresh" / "Investment": +2.5 pts
- "Mint" / "Gem": +1 pt

**Red flags:**
- "As-is": -2.5 pts
- "Damaged" / "Crease": -5 pts

### 4. Freshness (10% weight)

| Age | Points |
|-----|--------|
| <24 hours | 10 |
| 1-7 days | 5 |
| 8-30 days | 2.5 |
| 30+ days | 0 |

### 5. Comp Confidence (10% weight)

| Comps | Points |
|-------|--------|
| 10+ | 10 |
| 5-9 | 5 |
| <5 | 0 |

---

## Files Generated

Every search creates 2 files:

### JSON (Full Data)
```
results/dirk_nowitzki_refractor_2026-02-02.json
```

Contains:
- All scored listings
- Complete score breakdowns
- Comp data
- Timestamps

### CSV (Excel-Ready)
```
results/dirk_nowitzki_refractor_2026-02-02.csv
```

Columns:
- Score, Rating, Title, Price, Median_Comp, Discount_%, 
  Seller_Feedback, Sales_Count, Age_Days, Red_Flags, URL

**Open in Excel:**
- Sort by score (highest first)
- Filter by price range
- Filter by seller feedback
- Easy sharing

---

## Custom Searches

### Edit scored-search.js

```javascript
const {
  keywords = 'dirk nowitzki refractor',  // Search terms
  categoryId = '212',                     // Sports cards
  minPrice = 10,                          // Min price
  maxPrice = 500,                         // Max price
  rawOnly = true,                         // Raw cards only
  minScoreToShow = 5.0,                   // Min score to display
  topN = 10                               // Top N in report
} = searchConfig || {};
```

### Common Changes

**Show only great deals (8+):**
```javascript
minScoreToShow = 8.0
```

**Wider price range:**
```javascript
minPrice = 5,
maxPrice = 1000
```

**Include graded cards:**
```javascript
rawOnly = false
```

---

## Via Jett

Instead of editing files, just ask:

```
"Jett, search for 90s Jordan inserts under $300"
"Jett, find Ken Griffey rookies, score 7+ only"
"Jett, search Luka Doncic prizm including graded"
```

Jett will configure and run the search for you.

---

## Troubleshooting

### "Too many results"
Increase `minScoreToShow`:
- 5.0 = Show everything decent or better (~50-80 results)
- 6.0 = Show only decent+ (~25-50 results)
- 7.0 = Show only solid+ (~10-20 results)
- 8.0 = Show only great (~4-10 results)

### "No results found"
Lower `minScoreToShow` or widen price range:
```javascript
minScoreToShow = 4.0,  // More permissive
maxPrice = 1000        // Higher ceiling
```

### "Too many graded cards"
Check that `rawOnly = true` in scored-search.js

### "Scores seem wrong"
Check the breakdown - each factor shows reasoning:
- Price: X/10 - Why
- Seller: X/10 - Why
- Listing: X/10 - Why
- Fresh: X/10 - Why
- Comps: X/10 - Why

---

## Daily Automation (Optional)

To run searches automatically:

```bash
# Add to cron (7 AM daily)
0 7 * * * cd /home/clawd/clawd/ebay-scanner && node scored-search.js "your search" >> logs/search.log 2>&1
```

Or use Clawdbot cron:
```bash
node task-manager/cli.js add "Daily Card Search" \
  "node /home/clawd/clawd/ebay-scanner/scored-search.js 'dirk nowitzki'" \
  --schedule "daily at 07:00"
```

---

## Next Steps

1. ✅ Test with a real search
2. ✅ Review results in CSV
3. ✅ Adjust minScoreToShow if needed
4. ✅ Set up daily automation (optional)

---

**Questions?** Ask Jett or check SCORING-SYSTEM.md for full details.
