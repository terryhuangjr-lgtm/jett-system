# OPTION 1: FILTER IMPROVEMENTS

**Status:** ✅ Implemented
**Date:** February 2, 2026

---

## What Changed

### 1. Listing Age: 7 Days → 21 Days
**File:** `advanced-filter.js:84`

**Before:**
```javascript
maxListingAge = 7  // Only show listings from last 7 days
```

**After:**
```javascript
maxListingAge = 21  // Only show listings from last 21 days (loosened from 7)
```

**Why:** Good deals can sit for 10-14 days. 7 days was too aggressive and eliminated real opportunities.

---

### 2. Comp Search: Broadened Matching
**File:** `comp-analyzer.js:186-246`

**Key Changes:**
- **Expanded brand list:** Added 'select', 'donruss', 'panini', 'hoops', 'stadium club', 'sp authentic', 'spx', 'flair'
- **Expanded insert list:** Added 'xfractor', 'x-fractor', 'pulsar', 'wave', 'prizm', 'silver', 'gold', 'black', 'red', 'blue', 'green', 'orange', 'purple', 'rookie', 'rc'
- **Better player name extraction:** Added more common players (nowitzki, dirk, shaq, duncan, garnett, etc.)
- **More flexible fallback:** Increased from 60 chars to 80 chars when extracting title
- **Card number less strict:** Accept 1-4 digit card numbers (was 1-3)

**Why:** eBay listings vary wildly. Comp search was too narrow and missing valid comparables.

---

### 3. Price Variance Check: NEW FEATURE
**File:** `comp-analyzer.js:275-312`

**New Method:** `isPriceWithinVariance(askPrice, comps, variancePercent = 5)`

**What it does:**
- Estimates raw card value (30% of PSA 10 comp)
- Checks if asking price is within 5% variance
- Returns:
  - `withinRange: true` = Good price
  - `withinRange: false` = Too expensive
  - `withinRange: null` = No comps, needs manual review

**Example:**
```javascript
PSA 10 comp: $300
Estimated raw value: $90 (30% of $300)
Max acceptable: $94.50 (5% variance)

Card priced at $85 → ✅ PASS (within range)
Card priced at $120 → ❌ REJECT (too expensive)
Card priced at $90 (no comps) → ⚠️ FLAG (manual review)
```

**Why:** This is the key filter you wanted - eliminate overpriced cards while keeping deals.

---

## New Search Template

Created: `flexible-search-template.js`

**Features:**
- Demonstrates loosened filtering approach
- Shows all filter stages with counts
- Applies price variance check
- Flags items needing manual review (doesn't auto-reject)
- Better logging and debugging

**How to use:**
```bash
cd /home/clawd/clawd/ebay-scanner

# Copy and customize
cp flexible-search-template.js my-custom-search.js

# Edit search keywords (line 47)
# Run it
node my-custom-search.js
```

---

## Filters Comparison

| Filter | Before (Too Strict) | After (Loosened) |
|--------|-------------------|------------------|
| **Listing Age** | 7 days | 21 days |
| **Year Required** | Yes (in many scripts) | Optional |
| **Comp Matching** | Narrow keywords | Broad + flexible |
| **Price Check** | None | Within 5% variance |
| **Brand Matching** | 9 brands | 17 brands |
| **Player Names** | 7 players | 27+ players |

---

## Permanent Filters (Unchanged)

These are still enforced - they're good:

✅ Singles only (no lots)
✅ No reprints
✅ No customs
✅ No sealed products
✅ No stickers
✅ Seller feedback 98%+
✅ Must have images

---

## Expected Results

### Before (Too Strict)
```
eBay search: 500 listings
After filters: 3-5 listings
Top deals: 1-2

Result: Not enough data
```

### After (Option 1)
```
eBay search: 500 listings
After filters: 25-40 listings
Top deals: 8-12

Result: Much better signal
```

---

## Testing Recommendations

### Test 1: Dirk Chrome Refractors
```bash
node flexible-search-template.js
# Change keywords to: "dirk chrome refractors"
```

**Expected:** 8-15 results (vs previous 1-3)

### Test 2: MJ Finest
```bash
# Change keywords to: "michael jordan finest"
```

**Expected:** 10-20 results with comps

### Test 3: Your Problem Card
```bash
# Use the exact search that returned 0 results before
```

**Expected:** At least 5-10 results now

---

## If Results Still Suck

**Symptoms:**
- Still getting < 5 results per search
- Still seeing "no comps found" too often
- Still missing obvious deals you find manually

**Solution:** Implement Option 2 (see `OPTION-2-BACKUP-PLAN.md`)

Option 2 removes almost ALL filters and shows everything with flags for manual review.

---

## Rollback (If Option 1 Breaks Things)

To revert changes:

```bash
cd /home/clawd/clawd/ebay-scanner

# Revert listing age to 7 days
# Edit advanced-filter.js line 84: maxListingAge = 7

# Revert comp analyzer
# Restore from git (if tracked) or manually undo changes
```

---

## Next Steps

1. **Test the flexible template:**
   ```bash
   node flexible-search-template.js
   ```

2. **Check the results:**
   - Are you getting 8-15 deals per search? ✅
   - Are comps being found? ✅
   - Is price variance working? ✅

3. **If good:** Apply this pattern to other searches
4. **If still bad:** Move to Option 2

---

**Status:** Ready to test
**Files changed:**
- `advanced-filter.js`
- `comp-analyzer.js`
- `flexible-search-template.js` (new)
- `OPTION-2-BACKUP-PLAN.md` (backup)
