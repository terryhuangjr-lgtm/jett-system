# Default Search Method

**Updated:** February 2, 2026
**Decision:** Use scoring system for ALL searches

---

## Primary Tool

**Use:** `scored-search.js`

**Why:**
- Shows ALL results (not binary filtering)
- Transparent scoring (see reasoning)
- Flexible cutoffs (you decide what's worth your time)
- CSV export (sort/filter in Excel)

---

## Configuration

**Default settings:**
```javascript
{
  rawOnly: true,           // Filter to raw cards only
  minScoreToShow: 5.0,     // Show scores ≥ 5.0
  minPrice: 10,
  maxPrice: 500
}
```

**Scoring weights:**
- Price: 25% (reduced - comps unreliable)
- Seller: 25% (increased - very reliable)
- Listing: 30% (increased - title/condition matter)
- Freshness: 10%
- Comps: 10%

---

## Usage

### Via Jett (Recommended)
```
"Jett, search for Dirk Nowitzki refractors"
"Jett, find Ken Griffey rookies under $200"
"Jett, search 90s Jordan inserts, show 7+ scores only"
```

Jett will:
1. Configure scored-search.js
2. Run the search
3. Send results to Slack
4. Save CSV for Excel review

### Manual
```bash
cd /home/clawd/clawd/ebay-scanner
node scored-search.js "search terms"
```

---

## What You Get

**Console output:**
- Top 10 deals with scores
- Full reasoning for each

**Files:**
- JSON: Full data with all scores
- CSV: Excel-ready, sort/filter however you want

**Slack (when via Jett):**
- Summary of top deals
- Score distribution
- Links to CSV files

---

## Retired Methods

~~`scan-and-notify.js`~~ - Binary filtering (too aggressive)
~~`scan-and-notify-enhanced.js`~~ - 6-stage filtering (99.7% rejection rate)

**Problem with filtering:** Missed too many deals, no transparency on what was rejected.

**Solution:** Score everything, let you decide the cutoff.

---

## Score Interpretation

| Score | Action |
|-------|--------|
| 8-10 | Buy confidently |
| 7-8 | Review and buy if fits |
| 6-7 | Consider carefully |
| 5-6 | Manual research needed |
| <5 | Probably skip |

---

## Quick Reference

**Raw cards only (default):**
✅ Filters out PSA/BGS/CGC/graded automatically

**Include graded cards:**
Edit scored-search.js: `rawOnly: false`
Or tell Jett: "include graded"

**Adjust score cutoff:**
Edit scored-search.js: `minScoreToShow: 7.0` (only show 7+)
Or tell Jett: "show 8+ only"

**Change price range:**
Edit scored-search.js: `minPrice: 5, maxPrice: 1000`
Or tell Jett: "search under $200"

---

**This is now the standard.** All searches use scoring unless you specifically request otherwise.
