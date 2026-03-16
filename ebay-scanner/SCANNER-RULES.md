# eBay Scanner - Permanent Rules

## Updated: 2026-02-02

### SINGLES ONLY - NO LOTS

**Rule:** All eBay searches must filter out lots and multi-card listings. Only show single cards.

**Filter logic (apply to ALL searches):**

```javascript
const titleLower = item.title.toLowerCase();

// Exclude if ANY of these match:
if (titleLower.includes(' lot') || 
    titleLower.includes('lot of') ||
    titleLower.includes('qty') ||
    titleLower.includes('quantity') ||
    /\d+\s*(card|pc|pcs)/.test(titleLower) ||
    titleLower.includes('multi') ||
    titleLower.includes('bundle') ||
    titleLower.includes('set of')) {
  return false; // Skip this item
}

// Check category path
if (item.categoryPath && item.categoryPath.toLowerCase().includes('lot')) {
  return false;
}
```

**Why:** Lots are usually packed with junk cards. Singles give better grading candidates and clearer profit analysis.

**Exception:** If Terry specifically asks for "sets" or "lots", then allow them for that search only.

---

## Photo Quality Analysis

**Built-in:** Yes - `PhotoQualityChecker` analyzes:
- Photo count (prefer 4+)
- Centering indicators
- Corner condition
- Red flags (off-center, worn corners, damage keywords)

**Scoring adjustment:** Cards with confirmed good centering/corners get +1.5 to +3 points on deal score.

---

## Comp Analysis

- Searches for PSA 10 and PSA 9 sold comps
- Calculates expected value based on 40% PSA 10 / 40% PSA 9 / 20% lower distribution
- Includes $20 grading cost in profit calculations
- ROI% calculated on total investment (card + grading)

---

## Deal Scoring (0-10 scale)

**10:** 🔥🔥🔥 EXCEPTIONAL - EV > $300, ROI > 200%
**9-9.9:** 🔥🔥🔥 EXCEPTIONAL - Strong profit indicators
**8-8.9:** 🔥🔥 HOT - High priority buys
**7-7.9:** 🔥 VERY GOOD - Worth serious consideration
**6-6.9:** ⚡ GOOD - Review carefully
**< 6:** Lower priority

---

## Standard Filters

- Seller feedback: 98%+
- Must have image
- Price range: configurable per search
- Condition: "New" preferred (raw cards)
- Exclude: PSA, BGS, SGC, graded, slab, reprint, fake

---

*Last updated by Terry's request: Feb 2, 2026*
