# Refractor Fix Summary

## Problem
**Refractors were missing from search results** because condition was hardcoded to "New" in both API clients.

## Root Cause
Found in 2 files:
1. `ebay-finding-api.js` - line 81-83: Hardcoded condition filter to "New"
2. `ebay-api-client.js` - default parameter: `condition = 'New'`

This excluded:
- Refractors marked as "Used"
- Cards listed with "Unspecified" condition
- Any non-"New" listings
- Many legitimate opportunities

## Fix Applied

### 1. Changed Default Behavior
**Before:**
```javascript
condition = 'New'  // Hardcoded - excludes refractors
```

**After:**
```javascript
condition = null   // All conditions by default - finds everything
```

### 2. Added Full Native Filter Support
Now supports ALL eBay native filters:
- ✅ `condition` - null (all), 'New', 'Used', or array
- ✅ `topRatedOnly` - Quality sellers
- ✅ `returnsOnly` - Safety net
- ✅ `freeShippingOnly` - Better ROI
- ✅ `locatedIn` - Domestic filtering
- ✅ `hideDuplicates` - Cleaner results
- ✅ `excludeSellers` - Block bad actors

### 3. Updated Files
- ✅ `ebay-finding-api.js` - Complete rewrite of filter logic
- ✅ `ebay-api-client.js` - Added all native filters
- ✅ `NATIVE-FILTERS-GUIDE.md` - Documentation
- ✅ `test-native-filters.js` - Test suite
- ✅ `REFRACTOR-FIX-SUMMARY.md` - This file

## Testing

Run the test suite:
```bash
cd ~/clawd/ebay-scanner
node test-native-filters.js
```

Expected results:
- Test 1: Should find refractors (all conditions)
- Test 2: Should find fewer items (New only)
- Tests 3-6: Quality filters, auctions, shipping, etc.

## Migration Guide

### Old Code (Broken)
```javascript
// ❌ Misses refractors!
const items = await api.findItems({
  keywords: 'Topps Chrome Refractor Juan Soto',
  minPrice: 5,
  maxPrice: 50
});
```

### New Code (Fixed)
```javascript
// ✓ Finds all refractors
const items = await api.findItems({
  keywords: 'Topps Chrome Refractor Juan Soto',
  minPrice: 5,
  maxPrice: 50,
  condition: null              // Explicitly: all conditions
});
```

### Advanced Usage
```javascript
// Quality sellers + domestic only
const items = await api.findItems({
  keywords: 'Aaron Judge Prizm',
  minPrice: 20,
  maxPrice: 200,
  condition: null,             // All conditions
  topRatedOnly: true,          // Quality sellers
  returnsOnly: true,           // Returns accepted
  locatedIn: 'US',             // Domestic only
  hideDuplicates: true
});
```

## Benefits

1. **Finds More Opportunities** - No longer missing refractors/used gems
2. **Faster** - eBay filters server-side (less post-processing)
3. **More Accurate** - Native filters understand eBay's data model
4. **Flexible** - Configure per search
5. **Safer** - Can require top-rated sellers, returns, etc.
6. **Cheaper** - Free shipping filter = better ROI

## Verification

After fix, run a refractor search:
```javascript
const api = new EbayFindingAPI();
const items = await api.findItems({
  keywords: 'Topps Chrome Refractor',
  minPrice: 5,
  maxPrice: 100,
  condition: null  // Should find refractors now!
});

console.log(`Found ${items.length} refractors`);
```

**Expected:** Should return refractors that were previously excluded.

## Next Steps

1. ✅ Fix applied to both API clients
2. ✅ Documentation updated
3. ✅ Test suite created
4. 🔲 Run test suite to verify
5. 🔲 Update any existing scanner scripts to use new filters
6. 🔲 Monitor results to confirm refractors appear

---

**Fixed:** 2026-02-02
**Issue:** Refractors excluded due to hardcoded "New" condition
**Solution:** Made condition filter optional (null = all conditions)
**Impact:** All future searches will find refractors and other non-"New" gems
