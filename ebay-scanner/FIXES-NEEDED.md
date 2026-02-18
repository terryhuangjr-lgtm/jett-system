# Critical Fixes Needed for Scoring System

**Date:** February 2, 2026
**From:** Terry (via Jett)
**Status:** 🚨 HIGH PRIORITY

---

## Issue #1: Raw Cards Only (Default)

### Problem
Currently searches return both raw AND graded cards (PSA, BGS, CGC, etc.)
User wants to see **raw cards only by default**.

### Solution
Add filter to exclude graded cards:

```javascript
// In scored-search.js or deal-scorer-v2.js
const DEFAULT_CONFIG = {
  excludeGraded: true,  // NEW: Filter out graded cards by default
  gradedKeywords: ['PSA', 'BGS', 'CGC', 'SGC', 'graded', 'gem mint', 'gem mt']
};

// Filter logic
function isRawCard(title, condition) {
  if (!config.excludeGraded) return true;
  
  const titleLower = title.toLowerCase();
  const conditionLower = (condition || '').toLowerCase();
  
  // Exclude if any graded keyword found
  for (const keyword of config.gradedKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  // Exclude if condition explicitly says "Graded"
  if (conditionLower === 'graded') {
    return false;
  }
  
  return true;
}
```

### Usage
```bash
# Default: raw cards only
node scored-search.js "dirk nowitzki refractor"

# Include graded cards when needed
node scored-search.js "dirk nowitzki refractor" --include-graded

# Or Jett can override: "search dirk refractors including graded"
```

---

## Issue #2: Comp Data is Deceiving (MAJOR)

### Problem
Price analysis gets **40% weight** but comp data is UNRELIABLE:

**What's happening:**
1. System uses **active listings** (not sold prices)
2. Applies **85% discount factor** (rough estimate)
3. **One outlier** ($5,000 overpriced listing) skews the median
4. System thinks $200 is a "steal" (96% below $5,000)
5. **Reality:** Card is worth $100, so $200 is actually overpriced

**Example from real data:**
```
Listing: $25.98
Median comp: $2,141.15
Discount: 99% below
Score: 10/10 on price

BUT: That $2,141 comp is probably ONE overpriced listing!
Real value might be $50-100, making $26 fair (not a steal)
```

### Root Cause
Price gets **40% weight** but is based on **unreliable data**.

### Solution: Reweight the Scoring

**Current weights:**
```javascript
this.weights = {
  priceAnalysis: 0.40,      // 40% - TOO MUCH for unreliable data
  sellerQuality: 0.20,      // 20%
  listingQuality: 0.20,     // 20%
  listingFreshness: 0.10,   // 10%
  comparability: 0.10       // 10%
};
```

**NEW weights (Terry's suggestion):**
```javascript
this.weights = {
  priceAnalysis: 0.25,      // 25% - Reduced (unreliable data)
  sellerQuality: 0.30,      // 30% - Increased (very trustworthy)
  listingQuality: 0.25,     // 25% - Increased (title/condition matter!)
  listingFreshness: 0.10,   // 10% - Keep same
  comparability: 0.10       // 10% - Keep same
};
```

**Rationale:**
- **Seller trust is VERY reliable** - feedback % doesn't lie
- **Listing quality is VERY reliable** - "pack fresh" vs "as-is" is clear
- **Price is UNRELIABLE** - based on sketchy comp data
- Reduce price weight, increase trust/quality weight

### Alternative: Add Comp Confidence Multiplier

If comps have low confidence, reduce price weight further:

```javascript
// In scorePriceAnalysis()
let pricePoints = calculatePricePoints(discount);

// Apply confidence multiplier
const compConfidence = this.getCompConfidence(comps);
if (compConfidence === 'Low confidence') {
  pricePoints *= 0.5;  // Reduce by 50% if low confidence
  flags.push('⚠️ Low comp data - price estimate uncertain');
}
```

### What This Fixes

**Before (40% price weight):**
- $26 card with "99% below $2,141" = 10/10 on price = 8.0 total score
- Looks like a steal, but might be overpriced

**After (25% price weight, 30% seller, 25% listing):**
- Same card = 10/10 on price (still good) but only 25% weight
- If seller is weak (2.5/10) or listing is sketchy (2/10), total score drops
- More balanced evaluation

---

## Implementation Priority

1. **Fix #2 first** (comp weight) - This is causing false positives
2. **Then Fix #1** (raw filter) - This is user preference

## Testing

After implementing:

1. Run same Dirk Nowitzki search
2. Compare score distribution (should see fewer inflated scores)
3. Check if sketchy listings with "99% below" still score 8+
4. Verify trusted sellers + good listings still score high

---

## Expected Impact

**Fix #1 (Raw filter):**
- Cleaner results
- Fewer graded slabs in the way
- Better focus on raw grading opportunities

**Fix #2 (Reweight):**
- Fewer false positives from sketchy comp data
- Seller trust + listing quality matter more
- "99% below market" doesn't auto-score 8-10
- More realistic scoring

---

## Notes

Terry's feedback:
> "i like the scoring method - i see more results, reasoning, and can browse through myself. other method just wasn't yielding enough and was too binary. however... the comps are truly deceiving though. all it takes is one active listing that is way overpriced, and then it makes us think we're getting a huge steal."

**He's absolutely right.** The scoring system is great, but the weights need adjustment because the price data is unreliable.

---

Last updated: 2026-02-02 15:30 EST
By: Jett (on behalf of Terry)
For: Claude Code to implement
