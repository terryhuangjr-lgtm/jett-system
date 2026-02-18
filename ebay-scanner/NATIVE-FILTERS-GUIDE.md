# eBay Native Filters - Complete Guide

## Problem Solved
**Before:** Hardcoded "New" condition filter was excluding refractors and other cards
**After:** All filters now configurable using eBay's native filter system

## Available Native Filters

### 1. Condition
Control what condition cards to include:
```javascript
condition: null                    // ALL conditions (default)
condition: 'New'                   // New only
condition: 'Used'                  // Used only
condition: ['New', 'Used']         // Multiple conditions
```

### 2. Listing Type
Control auction vs buy-it-now:
```javascript
listingType: ['Auction', 'FixedPrice']  // Both (default)
listingType: 'Auction'                   // Auctions only
listingType: 'FixedPrice'                // BIN only
```

### 3. Price Range
```javascript
minPrice: 10    // Minimum price
maxPrice: 500   // Maximum price
```

### 4. Quality Filters
```javascript
topRatedOnly: true      // Top-rated sellers only
returnsOnly: true       // Returns accepted only
freeShippingOnly: true  // Free shipping only
```

### 5. Location
```javascript
locatedIn: 'US'    // Domestic (US) only
locatedIn: null    // All countries (default)
```

### 6. Seller Management
```javascript
excludeSellers: ['badSeller1', 'badSeller2']  // Block specific sellers
```

### 7. Deduplication
```javascript
hideDuplicates: true   // Remove duplicate listings (default)
hideDuplicates: false  // Show all
```

## Example Usage

### Search for Refractors (All Conditions)
```javascript
const api = new EbayFindingAPI();

const items = await api.findItems({
  keywords: '2024 Topps Chrome Juan Soto Refractor',
  minPrice: 5,
  maxPrice: 100,
  condition: null,              // ✓ FIXED: Don't filter by condition
  topRatedOnly: false,
  returnsOnly: true,            // Safety: returns accepted
  hideDuplicates: true
});
```

### Search for Graded Cards Only
```javascript
const items = await api.findItems({
  keywords: '1997 Michael Jordan PSA',
  minPrice: 100,
  maxPrice: 1000,
  condition: null,              // Graded = various conditions
  topRatedOnly: true,           // Quality sellers
  returnsOnly: true,
  locatedIn: 'US'               // Domestic only
});
```

### Auction Snipes (Ending Soon)
```javascript
const items = await api.findItems({
  keywords: 'Aaron Judge Rookie Auto',
  minPrice: 50,
  maxPrice: 500,
  listingType: 'Auction',       // Auctions only
  sortOrder: 'EndTimeSoonest',  // Ending soon first
  condition: null,
  returnsOnly: true
});
```

### Budget Deals (All Conditions)
```javascript
const items = await api.findItems({
  keywords: 'Victor Wembanyama Prizm',
  maxPrice: 20,                 // Under $20
  condition: null,              // Any condition (find deals)
  freeShippingOnly: true,       // Free shipping = better ROI
  hideDuplicates: true
});
```

## Migration Notes

**Old code (BROKEN):**
```javascript
// ❌ Hardcoded "New" - misses refractors!
const items = await api.findItems({
  keywords: 'Topps Chrome Refractor',
  minPrice: 10,
  maxPrice: 100
});
```

**New code (FIXED):**
```javascript
// ✓ No condition filter - gets everything
const items = await api.findItems({
  keywords: 'Topps Chrome Refractor',
  minPrice: 10,
  maxPrice: 100,
  condition: null              // Explicitly allow all conditions
});
```

## Benefits

1. **Finds more opportunities** - No longer missing refractors, used gems, etc.
2. **Faster** - eBay filters server-side (less data to process)
3. **More accurate** - Native filters understand eBay's data model
4. **Flexible** - Configure per search based on what you're hunting
5. **Cleaner code** - Less post-processing/filtering needed

## Testing

Run the test suite to verify filters work:
```bash
cd ~/clawd/ebay-scanner
node test-native-filters.js
```

This will test:
- All conditions vs specific conditions
- Multiple listing types
- Quality filters (top-rated, returns, shipping)
- Location filters
- Seller exclusions

---

**Updated:** 2026-02-02
**Issue:** Refractors excluded due to hardcoded "New" condition
**Fix:** Made all filters configurable, default to broad searches
