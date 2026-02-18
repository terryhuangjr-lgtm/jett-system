# eBay API Implementation Plan

## 🎴 CONTEXT: Active Sports Card Business

**Terry + his brother already buy/sell/trade sports cards** as hobby + side hustle (generates revenue).

**Goal:** Scale operation in 2026 by eliminating gruntwork through automation.

**This isn't exploration** - it's professional infrastructure for an existing business.

---

## Current Status

**Waiting on:** eBay Developer account approval (1 day)

**Why API > Scraping:**
- ✅ 100% faster (direct API calls vs browser loading)
- ✅ More reliable (no bot detection, no page changes)
- ✅ Structured data (clean JSON responses)
- ✅ Advanced filters (condition, price range, ending time, etc.)
- ✅ Rate limits clearly defined
- ✅ Historical sold listings (comp data!)

**Claude Code's recommendation:** Use official eBay Finding API

---

## What We Need

**Once dev account is approved:**
1. **App ID** (Client ID)
2. **Cert ID** (Client Secret)  
3. **Dev ID** (Developer ID)

**eBay APIs to use:**
- **Finding API** - Search active listings
- **Shopping API** - Get item details
- **Trading API** - (Optional) Place bids/purchases

---

## Search Criteria to Implement

### Michael Jordan Cards
```javascript
{
  keywords: "michael jordan",
  categoryId: "212", // Sports Trading Cards
  condition: "New", // PSA/BGS graded
  minPrice: 100,
  maxPrice: 5000,
  sortOrder: "EndTimeSoonest",
  itemFilter: [
    { name: "ListingType", value: "Auction" },
    { name: "EndTimeFrom", value: "now" },
    { name: "EndTimeTo", value: "+2h" }
  ]
}
```

### Vintage Jerseys
```javascript
{
  keywords: "vintage jersey authentic",
  categoryId: "24510", // Sports Mem, Cards & Fan Shop
  minPrice: 50,
  maxPrice: 500,
  sortOrder: "EndTimeSoonest"
}
```

### Rookie Cards
```javascript
{
  keywords: "michael jordan rookie card psa",
  categoryId: "212",
  minPrice: 200,
  maxPrice: 10000,
  sortOrder: "PricePlusShippingLowest"
}
```

---

## Implementation Plan

**Once API keys arrive:**

### Step 1: Build API Client (Claude Code)
```javascript
// ebay-api-client.js
const EbayAPI = require('ebay-api');

class EbayGemFinder {
  constructor(appId, certId, devId) {
    this.api = new EbayAPI({
      appId,
      certId,
      devId,
      sandbox: false
    });
  }

  async findGems(searchConfig) {
    const results = await this.api.finding.findItemsAdvanced(searchConfig);
    return this.filterUndervaluedItems(results);
  }

  filterUndervaluedItems(items) {
    // Compare to sold listings
    // Calculate potential profit
    // Return only good deals
  }
}
```

### Step 2: Schedule Daily Searches
```bash
# Replace scraping tasks with API tasks
node task-manager/cli.js add "eBay API - MJ PSA 10" \
  "node scripts/ebay-api-scanner.js --config mj-psa10" \
  --schedule "daily at 06:00"
```

### Step 3: Add Comp Comparison
- Query sold listings for price history
- Calculate average sold price
- Flag items below market value
- Estimate profit potential

### Step 4: Slack Notifications
- Send alerts for exceptional deals
- Include: item link, current price, sold comps, profit estimate
- Priority levels (🔥 hot, ⚡ good, 💰 maybe)

---

## Data Storage

**Results saved to:**
```
/home/clawd/clawd/ebay-api/
├── searches/
│   └── YYYY-MM-DD/
│       ├── mj-psa10.json
│       ├── vintage-jerseys.json
│       └── rookie-cards.json
├── comps/
│   └── sold-listings-cache.json
└── deals/
    └── flagged-opportunities.json
```

---

## Rate Limits (eBay Finding API)

**Free tier:**
- 5,000 calls/day
- Plenty for our use case

**Our usage:**
- 3 searches/day = 3 calls
- Comp lookups = ~10-20 calls/day
- **Total: ~25 calls/day** (well under limit)

---

## Advantages Over Scraping

| Feature | Scraping | API |
|---------|----------|-----|
| Speed | Slow (browser load) | Fast (direct) |
| Reliability | Can break | Stable |
| Data quality | HTML parsing | Structured JSON |
| Filters | Limited | Advanced |
| Comps | Manual | Built-in |
| Rate limit | Unknown | 5k/day |
| Bot detection | Risk | None |

---

## Timeline

**Today (Feb 2):** Dev account approval pending  
**Tomorrow (Feb 3):** Get API keys  
**Feb 3-4:** Claude Code builds API client  
**Feb 4:** Deploy and test  
**Feb 5:** First automated API-based scans

---

## Temporary Plan

**For now (until API ready):**
- ✅ Scraping tasks DISABLED (paused)
- ✅ 21M research still running
- ✅ Opportunity scanner still running
- ✅ Morning reports still compiling

**Once API arrives:**
- Replace scraping with API calls
- Add comp comparison
- Set up Slack alerts
- Full automation with better data

---

## Notes

Claude Code was 100% right - API is the way. The scraping I built works as a backup, but API is:
- Faster
- More reliable  
- Better data
- More features

Good call waiting for the proper tool.

---

**Status:** Waiting on API approval (1 day)  
**Next:** Claude Code builds API client once keys arrive  
**ETA to production:** Feb 4-5, 2026

**eBay scraping tasks:** Paused (will delete once API works)
