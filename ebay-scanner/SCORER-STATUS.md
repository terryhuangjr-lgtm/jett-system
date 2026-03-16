# eBay Scanner Scorer Status

**Date:** February 6, 2026
**Status:** ✅ All scans using deal-scorer-v2.js

---

## Summary

✅ **ALL eBay scanner scripts are using deal-scorer-v2.js**

No updates needed - everything is already on the v2 scorer with Search Relevance included.

---

## Scoring Weights (Current)

```javascript
{
  sellerQuality: 0.30,      // 30% - Feedback/sales history
  listingQuality: 0.30,     // 30% - Photos, keywords, red flags
  searchRelevance: 0.25,    // 25% - Player match, card type, year, brand
  listingFreshness: 0.15    // 15% - How recently listed
}
```

---

## Scripts Using deal-scorer-v2.js

### Main Scanner (Used by Task Manager):
- ✅ `multi-search.js` - Used by ALL scheduled scans

### Individual Search Scripts:
- ✅ `ai-refractors-96-08.js`
- ✅ `ai-refractors-search.js`
- ✅ `broad-derik-queen-search.js`
- ✅ `custom-derik-queen-search.js`
- ✅ `derik-queen-refractors.js`
- ✅ `derik-queen-search.js`
- ✅ `dirk-broad-search.js`
- ✅ `dirk-chrome-finest-search.js`
- ✅ `dirk-refractors-search.js`
- ✅ `dwade-rookie-search.js`
- ✅ `flexible-search-template.js`
- ✅ `mj-finest-search.js`
- ✅ `mj-finest-simple.js`
- ✅ `mj-simple-search.js`
- ✅ `mj-singles-search.js`
- ✅ `mj-vintage-search.js`
- ✅ `run-smart-scan.js`
- ✅ `scan-and-notify-enhanced.js`
- ✅ `scan-and-notify.js`
- ✅ `scanner.js`
- ✅ `scored-search.js`
- ✅ `shaq-numbered-25.js`
- ✅ `shaq-rare-search.js`
- ✅ `smart-scanner-with-filters.js`
- ✅ `wade-premium-search.js`

### Test Scripts:
- ✅ `test-full-scan.js`
- ✅ `test-smart-filters.js`

---

## Scheduled eBay Scans (All Using V2)

All use `multi-search.js` which uses deal-scorer-v2:

- **Monday (4 AM):** MJ Topps Finest 1993-1999
- **Tuesday (4 AM):** Griffey Jr Chrome/Finest Refractors
- **Wednesday (4 AM):** Kobe Refractors
- **Thursday (4 AM):** MJ Upper Deck 1996-2000
- **Friday (4 AM):** Multi-Search (Kobe/Duncan/Dirk/Wade)
- **Saturday (4 AM):** MJ Base 1994-1999
- **Sunday (4 AM):** 2025 Cam Ward

---

## Old Scorer Status

**deal-scorer.js** (original) - Still exists but NOT USED

Location: `/home/clawd/clawd/ebay-scanner/deal-scorer.js`
Status: Legacy file, no scripts reference it
Action: Can be deleted or kept as backup

---

## Search Relevance Features (25% Weight)

The v2 scorer includes comprehensive search matching:

### Player Name Matching:
- Full name match: +3 points
- Last name match: +2 points
- **Wrong player: -5 points** (severe penalty)

### Card Type Matching:
- Refractor, Prizm, Chrome, Auto, Patch, Rookie, Serial #, Parallel
- Checks if your search terms appear in listing title
- Up to +4 points

### Year/Era Matching:
- Exact year: +3 points
- ±2 years: +2 points
- ±5 years: +1 point

### Brand/Set Matching:
- Topps, Panini, Upper Deck, Bowman, etc.
- Up to +3 points

**Total possible from Search Relevance: 10 points**
**Weight: 25% of final score**

---

## Verification

Run any scan to confirm v2 is being used:

```bash
cd /home/clawd/clawd/ebay-scanner

# Quick test
node multi-search.js "michael jordan refractor" --topN 5

# Check scoring breakdown in output
# Should show: sellerQuality, listingQuality, searchRelevance, listingFreshness
```

Output will show score breakdown including `searchRelevance` field.

---

## Documentation Status

⚠️ **Documentation files are OUTDATED:**

These files show old weights (without Search Relevance):
- `SCORING-SYSTEM.md`
- `SCORING-BREAKDOWN.md`
- `SCORING-QUICK-REFERENCE.md`

**Code is correct. Docs are wrong.**

Want to update docs to match actual code? Let me know.

---

**Bottom Line:** You're already using deal-scorer-v2.js everywhere. Search Relevance (player name matching, card type, etc.) is active at 25% weight in ALL scans.
