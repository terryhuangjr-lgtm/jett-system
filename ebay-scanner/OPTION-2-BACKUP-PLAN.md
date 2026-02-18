# OPTION 2: BACKUP PLAN (If Option 1 Still Sucks)

**Status:** Not implemented - use only if Option 1 results are still poor

---

## Philosophy: Simplicity Over Complexity

The current system is too smart for its own good. Option 2 strips everything back to basics:

1. **Let eBay search do what it does best** (finding cards)
2. **Apply only essential filters** (singles, no reprints, no scams)
3. **Flag questionable deals** (don't auto-reject, let human decide)

---

## The New Approach

### Phase 1: Broad Search
```javascript
const search = {
  keywords: 'dirk chrome refractors',  // Simple, natural language
  categoryId: '212',
  minPrice: 10,
  maxPrice: 500,
  excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded'], // Only exclude graded
  sortOrder: 'PricePlusShippingLowest'
};
```

**NO keyword requirements**
**NO year matching**
**NO brand restrictions**

Let eBay's algorithm handle it. It's very good at understanding search intent.

---

### Phase 2: Essential Filters ONLY

Apply these filters (and ONLY these):

#### PERMANENT FILTERS ✅
- Singles only (no lots, no sets)
- No reprints
- No customs
- No sealed products
- No stickers

#### QUALITY FILTERS ✅
- Seller feedback 95%+ (loosened from 98%)
- Has at least 1 image
- Not an obvious scam (weird pricing, sketchy title)

#### REMOVED FILTERS ❌
- ~~Listing age~~ (removed entirely)
- ~~Required keywords~~ (removed)
- ~~Year matching~~ (removed)
- ~~Photo quality perfection~~ (just flag damage, don't require perfect)
- ~~Comp price variance~~ (show all, flag outliers)

---

### Phase 3: Flag, Don't Reject

Instead of rejecting cards, FLAG them for manual review:

```javascript
{
  title: "Dirk Nowitzki Chrome Refractor",
  price: 45,
  flags: [
    "⚠️ No comps found",
    "⚠️ Listing 45 days old",
    "⚠️ Photo shows minor corner wear"
  ],
  recommendation: "REVIEW - May still be worth it"
}
```

Show EVERYTHING that passes permanent filters, but give context.

---

## Example Output

### Current System (Option 1 - Still Too Strict?)
```
Found: 500 listings
After filters: 8 listings
Top 10 deals: 3

Result: Not enough data to work with
```

### Option 2 (Backup Plan)
```
Found: 500 listings
After permanent filters: 120 listings
After quality filters: 85 listings

Top 20 deals (sorted by potential):
1. 🔥 GREAT DEAL - No flags
2. 💰 GOOD DEAL - Minor flag: Old listing
3. ✓ OK DEAL - Flag: No comps found
4. ⚠️ REVIEW - Flags: Price seems high, old listing
...
```

**Result:** User gets 10-20 leads per search, can manually review flagged ones.

---

## Implementation Plan

If you decide to go with Option 2, here's what to build:

### 1. Simple Scanner (`simple-scanner.js`)
```javascript
// Pseudocode
const results = await ebay.search(keywords);

// Apply only permanent filters
const filtered = results.filter(item => {
  if (isLot(item)) return false;
  if (isReprint(item)) return false;
  if (isCustom(item)) return false;
  if (isScam(item)) return false;
  return true; // Everything else passes
});

// Score and flag (don't reject)
const scored = filtered.map(item => {
  const comps = getComps(item); // Try to get comps
  const flags = [];

  if (!comps) flags.push("No comps found");
  if (listingAge > 30) flags.push("Old listing");
  if (hasMinorDamage) flags.push("Minor damage noted");

  return { ...item, flags, score: calculateScore(item, comps) };
});

// Return top 20, sorted by score
return scored.sort(byScore).slice(0, 20);
```

### 2. Flag System
Create categories of flags:
- 🔥 **No flags** - Hot deal, buy now
- 💰 **Minor flags** - Good deal, likely safe
- ✓ **Medium flags** - OK deal, review carefully
- ⚠️ **Major flags** - Risky, proceed with caution

### 3. Manual Review Workflow
Build a simple dashboard:
```
TOP 20 DEALS:

1. [🔥] 1996 Topps Finest MJ #271 Refractor - $125
   Flags: None
   Comps: PSA 10 avg $450 | ROI: 180%
   [BUY NOW] [SKIP] [SAVE]

2. [💰] 2005 Topps Chrome Dirk Refractor - $45
   Flags: Listing 15 days old
   Comps: PSA 10 avg $180 | ROI: 120%
   [BUY NOW] [SKIP] [SAVE]

3. [⚠️] 1993 Finest Jordan Refractor - $200
   Flags: No comps found, Price may be high
   Comps: None available
   [RESEARCH] [SKIP] [SAVE]
```

---

## Comparison: Option 1 vs Option 2

| Aspect | Option 1 (Loosened) | Option 2 (Backup) |
|--------|-------------------|-------------------|
| **Listing Age** | 21 days | No limit |
| **Year Matching** | Optional | Not checked |
| **Comp Search** | Broadened | Best effort only |
| **Price Variance** | Within 5% | Flag outliers |
| **Photo Quality** | Some checks | Flag damage only |
| **Results** | 5-10 deals | 15-25 deals |
| **False Negatives** | Some missed | Very few missed |
| **Manual Work** | Minimal | More review needed |

---

## When to Use Option 2

Use Option 2 if Option 1 results in:
- **< 5 deals per search** (not enough data)
- **Missing obvious deals** (you search eBay manually and find better cards)
- **Too many "no comps found"** (comp search too narrow)
- **Frustration** (you're spending more time tweaking filters than finding cards)

---

## Key Insight

The goal is NOT to find the perfect card automatically.

The goal is to **surface 15-20 potential deals** so you can:
1. Review them quickly (2-3 minutes)
2. Click through to eBay for the promising ones
3. Make informed buying decisions

**It's better to review 20 deals and find 3-4 gems than to see 2 pre-filtered "perfect" deals that aren't actually that great.**

---

## Next Steps (If Implementing Option 2)

1. Build `simple-scanner.js` with minimal filters
2. Build flag system (categorize concerns)
3. Test on Dirk Chrome search
4. Compare results with Option 1
5. Build simple dashboard for manual review (optional)

---

**Created:** February 2, 2026
**Status:** Backup plan - not implemented yet
