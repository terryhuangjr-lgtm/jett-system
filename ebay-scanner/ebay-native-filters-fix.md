# eBay Native Filters - What We Should Be Using

## Problem
Currently hardcoding filters in code. Should use eBay's native filters instead.

## eBay Finding API Item Filters (Built-in)
https://developer.ebay.com/devzone/finding/callref/types/ItemFilterType.html

**Key filters we should use:**

### 1. Condition
- Values: New, Used, Unspecified
- **FIX:** Remove hardcoded "New" - let user choose or default to all

### 2. ListingType
- Values: Auction, AuctionWithBIN, FixedPrice, StoreInventory
- **Current:** Already using this correctly ✓

### 3. MinPrice / MaxPrice
- **Current:** Already using this correctly ✓

### 4. ExcludeSeller
- Filter out specific sellers

### 5. TopRatedSellerOnly
- Values: true, false
- Quality filter option

### 6. ReturnsAcceptedOnly
- Values: true, false
- Safety filter option

### 7. FreeShippingOnly
- Values: true, false
- Cost filter option

### 8. LocatedIn
- Country code filter
- Useful for domestic only searches

### 9. SoldItemsOnly
- For comp analysis (already using in getSoldComps) ✓

### 10. HideDuplicateItems
- Values: true, false
- Clean up results

## Proposed Fix

**Make filters configurable:**
```javascript
async findItems(params) {
  const {
    keywords,
    categoryId,
    minPrice,
    maxPrice,
    condition = null,           // null = all conditions
    listingType = ['Auction', 'FixedPrice'],
    topRatedOnly = false,
    returnsOnly = false,
    freeShippingOnly = false,
    locatedIn = null,           // null = all countries
    hideDuplicates = true,
    sortOrder = 'EndTimeSoonest',
    maxResults = 100
  } = params;
  
  // Build filters dynamically...
}
```

## Benefits
1. **Fix refractor issue** - stop hardcoding "New"
2. **More flexible** - configure per search
3. **Less post-filtering** - eBay does the work
4. **Faster** - smaller result sets
5. **More accurate** - native filters are better

## Action Items
1. Remove hardcoded "New" condition filter
2. Make all filters configurable
3. Default to broad searches, let user narrow down
4. Document available filters in search functions
