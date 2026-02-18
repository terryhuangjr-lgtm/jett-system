# eBay Gem Finder - Filter Rules

**Last Updated:** February 2, 2026

---

## 🎯 PERMANENT RULES (Always Applied)

These rules are ALWAYS enforced on every search:

### 1. **SINGLES ONLY**
Only single cards are allowed. No lots, sets, or multi-card listings.

**Rejected:**
- "Card lot", "Lot of 5", "3 card lot"
- "Near set", "Complete set", "Team set"
- "Bulk", "Collection", "Bundle", "Mixed"
- "3 cards", "10+ cards", "5 card"
- Any listing with numbers indicating multiple cards

**Allowed:**
- Single cards only
- Card #271 (card number is OK)

---

### 2. **NO SEALED PRODUCTS**
No boxes, packs, or sealed products.

**Rejected:**
- "Sealed box", "Hobby box", "Blaster box"
- "Pack", "Wax pack", "Cello pack"
- "Case", "Hanger", "Mega box"
- "Fat pack", "Value box"

**Allowed:**
- Single raw cards
- Cards with factory protective sleeve

---

### 3. **NO REPRINTS**
Only original/authentic cards.

**Rejected:**
- "Reprint", "Reproduction", "Reprinted"
- "Copy", "Facsimile", "Bootleg"
- "Unlicensed", "Unauthorized"

**Allowed:**
- Original cards only
- Licensed products

---

### 4. **NO CUSTOMS**
No fan-made or custom cards.

**Rejected:**
- "Custom", "Fan made", "Homemade"
- "Art card", "ACEO", "OOAK"
- "Fantasy", "Tribute", "Commemorative"

**Allowed:**
- Officially licensed cards only

---

### 5. **NO STICKERS**
No sticker cards or decals.

**Rejected:**
- "Sticker", "Stickers", "Decal"
- "Peel", "Tattoo", "Puffy sticker"

**Exception:**
- "Sticker auto" is ALLOWED (sticker autograph cards are legit)

---

### 6. **NO NON-CARD ITEMS**
Only trading cards.

**Rejected:**
- "Poster", "Photo", "Photograph", "Print"
- "Newspaper", "Magazine", "Book", "Guide"
- "Display", "Plaque", "Frame", "Framed"
- "Jersey" (unless memorabilia card)

**Allowed:**
- Trading cards only
- Memorabilia cards (cards with jersey/patch swatches)

### 7. **LISTING AGE (Fresh Listings Only)**
Only show recent listings - old listings are red flags.

**Rejected:**
- Listed more than 7 days ago
- Exception: Price recently reduced (renewed interest)

**Logic:**
- If a card has been sitting for 30+ days, why hasn't it sold?
- Either it's overpriced OR there's a hidden issue
- Fresh listings = real opportunities

**Allowed:**
- Listed within last 7 days ✓
- OR price was recently reduced ✓

**Why This Matters:**
- True gems get snatched up quickly
- Old listings = market has already passed on them
- Price reductions = seller is motivated, OK to consider

---

## ⚙️ OPTIONAL FILTERS (Per-Search Basis)

These can be enabled/disabled for specific searches:

### 7. **BASE CARDS**
Filter out base cards when searching for inserts only.

**When Enabled, Rejects:**
- "Base card", "Base set"
- "Common", "Commons"
- "Regular issue", "Standard"

**Use Case:**
- Enable when searching for inserts/parallels only
- Disable for general rookie searches

**Default:** Disabled (base cards allowed)

---

## 🔍 QUALITY FILTERS (Always Applied)

### Seller Feedback
- **Minimum:** 98% positive feedback
- **Reason:** Reduces risk of scams/damaged cards

### Images
- **Required:** At least 1 image
- **Reason:** Can't evaluate condition without photos

### Price Range
- **Configured per search**
- **Default:** $10-500
- **Reason:** Sweet spot for grading arbitrage

### Listing Age
- **Maximum:** 7 days old
- **Exception:** Price reduced listings (any age)
- **Reason:** Fresh listings = real opportunities

---

## 📸 PHOTO QUALITY CHECKS (Always Applied)

See `PHOTO-QUALITY-LOGIC.md` for full details.

### Centering (Critical)
- ✅ PASS: "centered", "well centered", "50/50"
- ❌ REJECT: "off center", "oc", "miscut"

### Corners (Critical)
- ✅ PASS: "sharp corners", "mint corners"
- ❌ REJECT: "white corners", "worn corners"

### Red Flags (Auto-Reject)
- ❌ "damaged", "crease", "tear", "stain"
- ❌ "water damage", "surface damage"

---

## 📊 Filter Priority

Filters are applied in this order:

1. **Price range** (must be in range)
2. **Seller feedback** (98%+)
3. **Image check** (must have image)
4. **Advanced filter** (singles, no reprints, etc.)
5. **Listing age** (7 days or price reduced)
6. **Photo quality** (centering, corners)
7. **Comp analysis** (profit potential)
8. **Deal scorer** (final score 1-10)

**Rejected at any stage = skipped entirely**

---

## 🎯 Examples

### PASSES ALL FILTERS ✅
```
Title: "Luka Doncic 2018 Prizm Rookie #280 RAW Sharp Corners Well Centered"
Price: $220
Seller: 99.5% (5000 feedback)
Images: 4

✅ Single card
✅ Not a reprint
✅ Not custom
✅ Good centering
✅ Sharp corners
✅ In price range
✅ Good seller

Result: ANALYZED → Scored → Alerted if hot deal
```

### REJECTED - LOT ❌
```
Title: "Michael Jordan Lot of 3 Cards RAW"
Price: $150

❌ REJECTED: LOT - Contains "lot of"
Reason: Not a single card
```

### REJECTED - REPRINT ❌
```
Title: "1986 Fleer Michael Jordan Rookie Reprint"
Price: $25

❌ REJECTED: REPRINT - Contains "reprint"
Reason: Not an original card
```

### REJECTED - OFF-CENTER ❌
```
Title: "Ken Griffey Jr 1989 Upper Deck Rookie RAW Off-Center"
Price: $45

❌ REJECTED: Condition - Off-center
Reason: Won't grade PSA 10
```

### REJECTED - SEALED PRODUCT ❌
```
Title: "2023 Prizm Basketball Hobby Box Sealed"
Price: $300

❌ REJECTED: SEALED - Contains "sealed"
Reason: Not a single card
```

---

## 🛠️ Customization

### Add New Filter Keywords

Edit `advanced-filter.js`:

```javascript
this.lotKeywords = [
  ' lot',
  'your new keyword here'
];
```

### Disable Specific Filters

In search config:

```javascript
const filterResult = this.advancedFilter.filter(item, {
  singlesOnly: true,    // Always true (permanent)
  allowBase: false,     // Set to false to reject base cards
  allowReprints: false  // Set to true to allow (not recommended)
});
```

### Adjust Seller Feedback Threshold

In `gem-finder.js`:

```javascript
if (item.sellerPositivePercent < 98) {  // Change 98 to your threshold
  return false;
}
```

---

## 📈 Filter Statistics

Want to see what's being filtered out?

```javascript
const stats = filter.getFilterStats(items);
console.log(stats);

// Output:
// {
//   total: 100,
//   passed: 45,
//   rejected: 55,
//   reasons: {
//     'LOT': 30,
//     'SEALED': 15,
//     'REPRINT': 5,
//     'CUSTOM': 3,
//     'STICKER': 2
//   }
// }
```

---

## 🎯 Summary

**Goal:** Only get SINGLE, AUTHENTIC, GRADEABLE cards

**Filter Rate:** ~50-70% of listings rejected (good!)

**Why So Strict?**
- Grading arbitrage requires perfect cards
- Lots/reprints/customs have no PSA value
- Off-center/damaged cards won't grade PSA 10
- Better to miss some deals than waste time on junk

**Philosophy:** Be aggressive with filters. It's better to analyze 10 great cards than 100 mediocre ones.

---

## 🧪 Testing

Test the filters:

```bash
cd /home/clawd/clawd/ebay-scanner

# Test advanced filter
node test-advanced-filter.js

# Test photo quality
node test-photo-checker.js

# Run full scan
node scan-and-notify.js
```

---

**Files:**
- `advanced-filter.js` - Main filter logic
- `photo-quality-checker.js` - Photo/condition checks
- `singles-filter.js` - Legacy (use advanced-filter instead)
- `gem-finder.js` - Integrates all filters

**Created:** February 2, 2026
**Status:** Production ready
