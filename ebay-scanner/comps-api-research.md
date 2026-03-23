# eBay Historic Sales Data ("Comps") API Research Report

**Date:** March 2026  
**Purpose:** Evaluate options for productizing the eBay scanner with reliable sold listings data  
**Researcher:** Jett (AI Assistant)

---

## Executive Summary

**The Finding API's `findCompletedItems` endpoint (currently used in `ebay-api-client.js`) is deprecated.** eBay has moved sold listing data behind higher-tier access walls. 

**Bottom Line Up Front:** There is **NO free, open API** for eBay sold listings in 2026. Options range from "scraping (fragile)" to "Enterprise API access (expensive, requires approval)".

---

## Current State Analysis

### What You're Using Now
1. **`ebay-api-client.js`** - Uses Finding API's `findCompletedItems` ⚠️ **DEPRECATED**
2. **`ebay-sold-scraper.js`** - HTML scraping fallback (fragile but working)
3. **`ebay-browse-api.js`** - Active listings only (Browse API)

### The Problem
The current `ebay-api-client.js` implementation relies on:
```javascript
call: 'findCompletedItems',
findingService.params["itemFilter(0).name"] = "SoldItemsOnly";
```

**Finding API Status:** Deprecated. While still functional in production, it:
- Has no SLA guarantees
- May be shut down without notice
- Returns incomplete/moved data

---

## Option 1: eBay Marketplace Insights API (Official - Limited Access)

### Overview
The **replacement** for Finding API's sold data access. Provides access to completed/sold items via OAuth2.

### Access Requirements
- **Limited Release API** - Requires eBay business approval
- Must complete **Application Growth Check**
- Categories must be **whitelisted** per partner
- Scope: `https://api.ebay.com/oauth/api_scope/buy.marketplace.insights`

### Permissions
- Search sold items by keyword
- Filter by sold date (up to 90 days back via `daysBack` parameter)
- Get final sale prices, bids, and timing data

### Rate Limits (If Approved)
- **5,000 API calls per day** (default tier)
- Can increase via Application Growth Check

### Data Coverage
| Aspect | Details |
|--------|---------|
| Lookback Period | Up to 90 days |
| Categories | Limited - must be whitelisted |
| Sports Cards | Available if category whitelisted (64482 = Sports Mem, Cards & Fan Shop) |
| MJ/Kober Refractors | ✅ Supported if category approved |

### Pros
- ✅ Official eBay API, reliable and supported
- ✅ Structured JSON data
- ✅ OAuth2 authentication
- ✅ Production-ready rate limits

### Cons
- ❌ Requires business-level approval (not guaranteed)
- ❌ 90-day lookback only
- ❌ Category restrictions may exclude sports cards
- ❌ Application process: weeks to months

### Cost
- **FREE** (eBay Developer Program membership)
- But requires being a legitimate business with valid use case

### Integration Code (Node.js)
```javascript
// OAuth2 Client Credentials flow
const axios = require('axios');

const CLIENT_ID = process.env.EBAY_CLIENT_ID;
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

// 1. Get OAuth token
async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://api.ebay.com/identity/v1/oauth2/token', 
    'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope/buy.marketplace.insights', 
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  return response.data.access_token;
}

// 2. Search sold items
async function searchSoldItems(keyword, daysBack = 30) {
  const token = await getAccessToken();
  const response = await axios.get(
    `https://api.ebay.com/buy/marketplace_insights/v1/item_sales/search`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        q: keyword,
        daysBack: daysBack,
        category_ids: '64482', // Sports Cards category
        limit: 200
      }
    }
  );
  return response.data;
}
```

---

## Option 2: Apify eBay Sold Listings Actor (Recommended Alternative)

### Overview
Apify provides a **managed scraping solution** that handles proxies, scaling, and data extraction for you.

### Features
- Returns REAL sold items (not active or unsold completed)
- Final sold price, shipping, end date, seller info
- Supports US, UK, DE, FR, IT, ES, CA, AU marketplaces
- JSON output

### Pricing
| Tier | Cost | Includes |
|------|------|----------|
| **Free** | $0 | 10 compute hours/month (~500-1000 results) |
| **Starter** | $49/mo | 3,000 compute hours |
| **Professional** | $499/mo | 30,000 compute hours |
| **Enterprise** | Custom | Unlimited |

**Per-Request Cost:** ~$0.002-0.005 per 100 results (depends on complexity)

### Daily Scan Cost Estimate
- **7 searches/day** (one per day of config)
- **~100 results per search** = 700 results/day
- **Monthly:** ~21,000 results
- **Cost:** **~$50-100/month** on Starter plan

### Pros
- ✅ No approval process needed
- ✅ Up to 90 days lookback
- ✅ Handles proxy rotation automatically
- ✅ No infrastructure maintenance
- ✅ Good sports card coverage

### Cons
- ❌ Costs money to scale
- ❌ Not "official" eBay API (risk of breaking)
- ❌ Dependency on Apify uptime
- ❌ Scraped data may have occasional gaps

### Integration Code (Node.js)
```javascript
const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

async function getSoldListings(keyword, days = 30) {
    const input = {
        keyword: keyword,
        categoryId: '64482', // Sports Cards
        daysToScrape: days,
        count: 100,
        ebaySite: 'ebay.com',
        sortOrder: 'endedRecently'
    };

    // Run the actor
    const run = await client.actor('caffein.dev/ebay-sold-listings').call(input);
    
    // Fetch results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
}

// Usage
const soldData = await getSoldListings('Michael Jordan Refractor', 30);
console.log(soldData[0]); 
// { itemId, title, soldPrice, soldCurrency, endedAt, sellerUsername, ... }
```

---

## Option 3: PriceCharting API (Sports-First but Limited)

### Overview
PriceCharting is THE database for sports cards, video games, comics. They already aggregate eBay sold data.

### API Limitations
- **Current prices only** (loose, CIB, new, graded tiers)
- **NO historic sold data** in API
- API provides: "loose-price", "cib-price", "new-price", "graded-price"
- **Marketplace API** only shows PC marketplace transactions, NOT eBay

### Pricing
| Tier | Cost | API Access |
|------|------|------------|
| Premium | ~$60/year | CSV only (1x/day) |
| **Legendary** | ~$240/year | API + CSV |

### Rate Limits
- **1 request per second**
- CSV: 1x per 10 minutes

### Sports Card Coverage
| Player Type | Coverage |
|-------------|----------|
| MJ | ✅ Excellent |
| Kobe | ✅ Excellent |
| Griffey Jr | ✅ Excellent |
| Modern players (Cam Ward) | ✅ Good (2025 cards) |

### Pros
- ✅ Industry standard for card pricing
- ✅ eBay EPIDs included (for listing)
- ✅ PSA/BGS/SGC grade pricing
- ✅ UPC matching

### Cons
- ❌ **No historic sales data via API** (only current prices)
- ❌ Cannot get "last 30 days sold prices"
- ❌ 1 req/sec rate limit is slow
- ❌ Requires Legendary subscription for API

### Integration Code (Node.js)
```javascript
const axios = require('axios');

const PC_TOKEN = process.env.PRICECHARTING_TOKEN;

// Get current prices (NOT sold history)
async function getCardValue(productName, console) {
    const response = await axios.get(
        `https://www.pricecharting.com/api/product`,
        {
            params: {
                t: PC_TOKEN,
                q: `${productName} ${console}`
            }
        }
    );
    
    return {
        loosePrice: response.data['loose-price'] / 100, // pennies to dollars
        gradedPrice: response.data['graded-price'] / 100,
        newPrice: response.data['new-price'] / 100,
        // Note: No sold history available
    };
}

// Example: Get current value of MJ PSA 10
const mjValue = await getCardValue('Michael Jordan', 'Basketball Cards');
console.log(`PSA 10 estimated value: $${mjValue.gradedPrice}`);
```

---

## Option 4: Maintain Current Scraper (Status Quo)

### Current Implementation
`ebay-sold-scraper.js` uses Cheerio to parse eBay's HTML:
```javascript
// Current approach: Parse sold listing HTML
const response = await axios.get(
  `https://www.ebay.com/sch/i.html?_nkw=${keyword}&LH_Sold=1&LH_Complete=1`
);
// Parse with Cheerio
```

### Known Issues (from research)
- eBay has switched to **JSON-in-JavaScript** format for listings
- HTML structure changes frequently
- Requires proxy rotation for scale
- Risk of IP blocks/rate limiting

### Cost
- **Free** (minus proxy costs if scaling)
- Proxies: ~$5-20/month for rotating residential

### When to Keep
- Small scale (< 100 searches/day)
- Tolerance for occasional failures
- Budget constraints

---

## Comparison Matrix

| Criteria | Marketplace Insights API | Apify Actor | PriceCharting | Current Scraper |
|----------|-------------------------|-------------|---------------|-----------------|
| **Cost** | Free* | $50-100/mo | $240/yr | Free (~$5-20 proxies) |
| **Setup Difficulty** | Hard (approval) | Easy | Easy | Medium |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Data Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ (no sold history) | ⭐⭐⭐ |
| **Sports Coverage** | Good* | Good | ⭐⭐⭐⭐⭐ | Good |
| **90-day Lookback** | ✅ | ✅ | ❌ | ✅ |
| **1-year Lookback** | ❌ | ❌ | ❌ | ✅ (unreliable) |
| **Rate Limit** | 5K/day | On-demand | 1/sec | Manual |
| **Official API** | ✅ | ❌ | ✅ | ❌ |

*Requires business approval

---

## Recommendations

### 🥇 Option 1: Apify eBay Sold Listings (Recommended for Production)

**Why:** 
- Best balance of reliability, coverage, and time-to-market
- No approval process
- Works TODAY
- Can scale with Terry's business growth

**Migration Plan:**
1. Sign up for Apify (free 10hrs to test)
2. Create `ebay-comps-apify.js` wrapper module
3. Replace `ebay-sold-scraper.js` calls with Apify calls
4. Run parallel for 2 weeks to validate
5. Remove scraper code

**Code:** See Option 2 integration above

---

### 🥈 Option 2: Apply for Marketplace Insights API (Long-term Goal)

**Why:**
- Official eBay solution
- No ongoing $ beyond scale
- Best for large-scale operations

**Action Plan:**
1. Submit Application Growth Check at https://developer.ebay.com/grow/application-growth-check
2. Business justification: "Card pricing research tool for collectors"
3. Expected timeline: 2-4 weeks approval
4. Implement Option 1 as fallback until approved

---

### 🥉 Option 3: Hybrid Approach (Best of Both)

**Implementation:**
- **Current Price Data:** PriceCharting API for quick value estimates
- **Sold Comps:** Apify Actor for actual sold prices
- **Backup:** Existing scraper for manual spot-checks

**Cost:** ~$240/year (PC) + ~$50/mo (Apify) = ~$840/year total

---

## Cost Projection for Scanner Scale

| Scenario | Daily Searches | API Calls/Day | Monthly Cost |
|----------|---------------|---------------|--------------|
| **Current** (7 searches) | ~7 | ~700 | **$50-75** |
| **Growth** (30 searches) | ~30 | ~3,000 | **$150-200** |
| **Scale** (100 searches) | ~100 | ~10,000 | **$400-500** |
| **Enterprise** (unlimited) | Custom | Unlimited | **Custom pricing** |

---

## Migration Path: Scrapers → API

### Phase 1: Immediate (Week 1)
1. ✅ Keep current `ebay-sold-scraper.js` as-is
2. Create `ebay-comps-apify.js` module (parallel implementation)
3. Test with 1-2 searches to validate data quality
4. Compare Apify output vs scraper output

### Phase 2: Transition (Week 2-4)
1. Update `run-from-config.js` to accept `--comps-source=apify` flag
2. Run both in parallel (write to separate results files)
3. Monitor for 2 weeks
4. Validate data matches or exceeds scraper quality

### Phase 3: Production (Week 5+)
1. Make Apify the default
2. Keep scraper as emergency fallback
3. Update documentation
4. Delete scraper after 30 days successful Apify usage

### Phase 4: Enterprise (Future)
1. Apply for Marketplace Insights API
2. Migrate from Apify to official API
3. Reduce ongoing costs to near-zero

---

## Code Implementation: `ebay-comps-apify.js`

```javascript
/**
 * eBay Sold Listings Comps via Apify
 * Replaces: ebay-sold-scraper.js
 * Provides: Historic sold prices for deal comparison
 */

const { ApifyClient } = require('apify-client');

const APIFY_TOKEN = process.env.APIFY_TOKEN || 'YOUR_APIFY_TOKEN';
const client = new ApifyClient({ token: APIFY_TOKEN });

// Category IDs
const CATEGORIES = {
    SPORTS_CARDS: '64482',
    ALL: '0'
};

/**
 * Get sold comps for a search term
 * @param {string} keyword - Search term (e.g., "Michael Jordan Refractor")
 * @param {Object} options
 * @param {number} options.daysBack - How many days back (1-90)
 * @param {number} options.maxResults - Max results to return
 * @param {number} options.minPrice - Minimum price filter
 * @param {number} options.maxPrice - Maximum price filter
 * @returns {Promise<Array>} - Array of sold items
 */
async function getSoldComps(keyword, options = {}) {
    const {
        daysBack = 30,
        maxResults = 100,
        minPrice = 0,
        maxPrice = null,
        categoryId = CATEGORIES.SPORTS_CARDS
    } = options;

    const input = {
        keyword,
        categoryId,
        daysToScrape: Math.min(daysBack, 90),
        count: maxResults,
        ebaySite: 'ebay.com',
        sortOrder: 'endedRecently',
        minPrice,
        maxPrice,
        itemCondition: 'any'
    };

    try {
        console.log(`[Apify] Fetching sold comps: "${keyword}" (last ${daysBack} days)...`);
        
        // Run the actor
        const run = await client.actor('caffein.dev/ebay-sold-listings').call(input);
        
        // Fetch results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        // Transform to standard format
        const comps = items.map(item => ({
            itemId: item.itemId,
            title: item.title,
            soldPrice: parseFloat(item.soldPrice),
            totalPrice: parseFloat(item.totalPrice),
            soldDate: item.endedAt,
            currency: item.soldCurrency,
            url: item.url,
            seller: item.sellerUsername,
            shipping: parseFloat(item.shippingPrice) || 0
        }));

        // Calculate stats
        const prices = comps.map(c => c.soldPrice).filter(p => !isNaN(p));
        const avgPrice = prices.length > 0 
            ? prices.reduce((a, b) => a + b, 0) / prices.length 
            : 0;

        console.log(`[Apify] Found ${comps.length} sold items. Avg: $${avgPrice.toFixed(2)}`);

        return {
            comps,
            stats: {
                count: comps.length,
                avgPrice,
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                currency: 'USD'
            }
        };
    } catch (error) {
        console.error('[Apify] Error fetching comps:', error.message);
        throw error;
    }
}

/**
 * Get market comparison for a listing
 * @param {string} searchTerm - What to search
 * @param {number} listingPrice - Current listing price to compare
 * @returns {Promise<Object>} - Comparison metrics
 */
async function getMarketComparison(searchTerm, listingPrice) {
    const { comps, stats } = await getSoldComps(searchTerm, { daysBack: 90 });
    
    if (stats.count === 0) {
        return { hasComps: false, reason: 'No sold items found' };
    }

    const diff = listingPrice - stats.avgPrice;
    const percentDiff = (diff / stats.avgPrice) * 100;

    return {
        hasComps: true,
        listingPrice,
        marketAvg: stats.avgPrice,
        marketMin: stats.minPrice,
        marketMax: stats.maxPrice,
        diff: diff,
        percentDiff: percentDiff,
        isDeal: percentDiff < -15, // 15% below market
        samples: stats.count
    };
}

module.exports = {
    getSoldComps,
    getMarketComparison,
    CATEGORIES
};
```

---

## Required Environment Variables

Add to `.env`:
```bash
# Apify (for sold comps)
APIFY_TOKEN=your_apify_token_here

# PriceCharting (optional, for current values)
PRICECHARTING_TOKEN=your_pc_token_here

# eBay (existing - keep using for active listings)
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
```

---

## Conclusion

**Recommended Path:**
1. **Week 1:** Implement Apify sold listings (start paying ~$50/mo)
2. **Week 2-4:** Apply for Marketplace Insights API (free but requires approval)
3. **Month 2+:** Migrate to official API if approved, stay on Apify if not

**Bottom Line:** For the eBay scanner to scale, you need to move off HTML scraping. Apify is the fastest path to reliable sold comps data at ~$50-100/month. Marketplace Insights API is the free long-term goal but requires business approval.

---

*Report generated: March 21, 2026*
*Sources: eBay Developer Documentation, Apify Docs, PriceCharting API Docs, Community Forums*