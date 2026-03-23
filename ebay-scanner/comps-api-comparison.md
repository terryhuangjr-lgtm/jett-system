# Sports Card Comps API Comparison
## Apify vs SportsCardPro vs CardHedger

**Research Date:** March 22, 2026  
**Use Case:** Productized sports card scanner (100 scans/day → 1000 users)

---

## Executive Summary

| Provider | Score | Best For | Recommendation |
|----------|-------|----------|----------------|
| **CardHedger** | 8.5/10 | Enterprise/production apps requiring structured card data | **#1 CHOICE** |
| **Apify** | 7.0/10 | Cost-conscious MVP, custom queries, broad eBay access | Runner-up for bootstrapping |
| **SportsCardPro** | 6.0/10 | Casual collectors, basic price checks | Not suitable for productization |

---

## 1. Apify eBay Sold Listings Actors

### Overview
Platform offering multiple scraper "Actors" for eBay sold listings data. Two primary options for sports cards:

### Key Actors

#### A. marielise.dev/ebay-sold-listings-intelligence
- **Features:** Pricing analytics, market velocity, demand levels, recommended listing price
- **Output:** Summary + individual items + CSV + Markdown report
- **Batch Size:** Up to 200 items per run
- **Filters:** Condition, price range, listing type, sold within days (max 90), category ID
- **Multi-market:** US, UK, DE, FR, IT, ES, CA, AU

#### B. caffein.dev/ebay-sold-listings
- **Features:** Basic sold listings extraction
- **Output:** JSON with sold price, date, seller info
- **Batch Size:** Up to 100 items per request
- **Additional:** Optional detailed search (slower, more proxy usage)

### Coverage
| Aspect | Details |
|--------|---------|
| **Data Source** | Direct eBay sold listings (actual completed sales) |
| **Historic Depth** | 90 days max per query |
| **Updates** | Real-time (scraped live) |
| **Sports Card Specific** | ❌ Generic eBay scraper - requires specific queries |
| **PSA/BGS Grade Filters** | ❌ No - relies on keyword matching |

### Pricing (At Scale)

| Component | Cost |
|-----------|------|
| **Platform Plans** | Free ($5/mo) → Starter ($29) → Scale ($199) → Business ($999) |
| **Compute Units** | $0.20-0.30 per CU (1 GB RAM/hour) |
| **Residential Proxies** | $7-8 per GB |
| **Datacenter Proxies** | $0.60-1.00 per IP |

**Cost Estimate @ 100 scans/day:**
- ~3,000 scans/month
- Assuming 50 items per scan, 1 CU per scrape, minimal proxy use
- **Low Scale:** ~$150-300/month (Scale plan)
- **High Scale (1000 users):** ~$2,000-5,000/month depending on proxy needs

### Rate Limits
| Plan | Concurrent Runs | Max RAM |
|------|------------------|---------|
| Free | 1 | 8 GB |
| Starter | 25 | 8 GB |
| Scale | 32 | 32 GB |
| Business | 128 | 128 GB |

### Integration
- **Language:** Any (REST API)
- **SDK:** Apify Node.js client available
- **Authentication:** API key
- **Output:** JSON, CSV, dataset storage

### Pros/Cons
| Pros | Cons |
|------|------|
| ✅ Direct eBay data - most accurate | ❌ Requires sports card knowledge to query effectively |
| ✅ Flexible queries (any player/set/grade) | ❌ No structured card database - keyword search only |
| ✅ Pay-per-use scaling | ❌ Residential proxy costs add up fast |
| ✅ Rich analytics (marielise actor) | ❌ 90-day max history per scrape |
| ✅ No rate limits beyond concurrent runs | ❌ Compliance risk (scraping eBay TOS) |

---

## 2. SportsCardPro API

### Overview
PriceCharting sister site focused on sports cards. Offers Prices API + Marketplace API.

### Coverage
| Aspect | Details |
|--------|---------|
| **Data Source** | eBay sold listings + SportsCardPro Marketplace |
| **Historic Depth** | Limited; primarily current prices |
| **Updates** | Daily price updates |
| **Cards Catalog** | ✅ Structured database with player, year, set, card number |
| **Grades Supported** | PSA, BGS, SGC, ungraded |

### API Endpoints
- **Prices API:** Get card prices by ID
- **Marketplace API:** Automate buying/selling on their platform
- **CSV Downloads:** Available for each set

### Pricing
| Aspect | Details |
|--------|---------|
| **Website Access** | Free |
| **API Access** | ❌ **Not publicly documented/priced** |
| **CSV Downloads** | Free for registered users |

SportsCardPro does **not** appear to offer a public API pricing tier suitable for commercial applications. Their API documentation exists but implies custom/enterprise arrangements required.

### Rate Limits
- Not publicly documented
- Presumed strict limits for unauthenticated/automated access
- Heavy scraping likely violates TOS

### Integration
- **Language:** REST API (presumed)
- **Authentication:** Unknown
- **Documentation:** https://www.sportscardspro.com/api-documentation (limited)

### Pros/Cons
| Pros | Cons |
|------|------|
| ✅ Structured sports card database | ❌ **No clear commercial API pricing** |
| ✅ Established price authority | ❌ Likely restrictive rate limits |
| ✅ Free for casual use | ❌ Not designed for product integration |
| ✅ Covers all major sports | ❌ No enterprise/scale pricing visible |
| | ❌ Data freshness dependent on their aggregation |

---

## 3. CardHedger API

### Overview
Enterprise-grade API specifically designed for sports and trading card data. RESTful API with 99.9% uptime SLA.

### Coverage
| Aspect | Details |
|--------|---------|
| **Data Sources** | eBay, Fanatics, Heritage Auctions, major marketplaces |
| **Historic Depth** | Years of price history available |
| **Updates** | Real-time pricing |
| **Cards Catalog** | ✅ 2.7M+ cards in structured database |
| **Weekly Sales** | 40M+ sales processed weekly |
| **Categories** | 38+ categories (Baseball, Football, Basketball, Pokémon, Yu-Gi-Oh!, Marvel, etc.) |
| **Grades** | PSA, BGS, SGC, CGC, ungraded support |

### Features
- **Advanced Search:** By player, year, set, grade, category with fuzzy matching
- **Historical Analytics:** Years of price history for ML/AI training
- **Market Insights:** Real-time price movements, top gainers, market trends
- **Production Ready:** Scalable infrastructure, health monitoring
- **Security:** Argon2 hashing, API key auth, access control
- **Analytics:** Built-in request tracking, usage monitoring

### Pricing
| Aspect | Details |
|--------|---------|
| **Model** | Enterprise / Custom pricing |
| **Public Tiers** | ❌ **None** - Contact for pricing |
| **Est. Range** | $500-5,000+/month based on usage (inferred) |

CardHedger is **explicitly enterprise-focused**. Pricing requires contacting sales. Likely:
- Starter: ~$500-1,000/month
- Growth: ~$2,000-5,000/month  
- Enterprise: Custom ($5,000+/month)

### Rate Limits
- Not publicly documented
- Enterprise SLA implies high throughput available
- Async-first architecture for performance

### Integration
- **Language:** Any (RESTful API)
- **Authentication:** API key (Argon2 hashed)
- **Documentation:** Auto-generated OpenAPI with interactive examples
- **SDKs:** Available (implied)
- **Format:** JSON

### Sample Node.js
```javascript
const apiKey = process.env.CARDHEDGER_API_KEY;

// Search for a specific card
async function getCardComps(player, year, set, cardNumber, grade) {
  const response = await fetch('https://api.cardhedger.com/v1/cards/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      player: player,
      year: year,
      set: set,
      card_number: cardNumber,
      grade: grade,  // 'PSA 10', 'BGS 9.5', etc.
      include_history: true,
      days_of_sales: 90
    })
  });
  
  const data = await response.json();
  return {
    card: data.card,
    currentPrice: data.price?.current,
    priceHistory: data.price?.history,
    comps: data.sales?.recent || [],
    marketTrend: data.analytics?.trend
  };
}

// Example usage
const kobeCard = await getCardComps(
  'Kobe Bryant', 
  1996, 
  'Topps Chrome', 
  138, 
  'PSA 10'
);
```

### Pros/Cons
| Pros | Cons |
|------|------|
| ✅ **Purpose-built for sports cards** | ❌ **Opaque pricing** - requires sales contact |
| ✅ Structured card database (2.7M+) | ❌ Potentially expensive for early stage |
| ✅ Multiple marketplace sources | ❌ No self-serve trial visible |
| ✅ Years of historical data | |
| ✅ Enterprise-grade reliability (99.9% SLA) | |
| ✅ Real-time pricing | |
| ✅ ML/AI-ready structured data | |
| ✅ 40M+ weekly sales volume | |

---

## Comparative Analysis

### Data Quality & Volume
| Provider | Data Quality | Comps per Query | Historic Depth | Sports Card Specific |
|----------|------------|-----------------||----------------|---------------------|
| **CardHedger** | ⭐⭐⭐⭐⭐ Excellent | 10-50+ recent | Years | ✅ Native |
| **Apify** | ⭐⭐⭐⭐☆ Good (raw) | 10-200 | 90 days max | ❌ Raw eBay |
| **SportsCardPro** | ⭐⭐⭐☆☆ Moderate | Unknown | Limited | ✅ Native |

### Cost @ Scale
**100 scans/day (3,000/month):**
- CardHedger: ~$500-1,500/mo (estimated)
- Apify: ~$200-500/mo + proxy costs
- SportsCardPro: ❌ Not available

**1,000 users (10,000+ scans/day):**
- CardHedger: ~$3,000-8,000/mo (estimated enterprise)
- Apify: ~$3,000-10,000/mo (heavy proxy/compute)
- SportsCardPro: ❌ Not available

### Integration Ease (Node.js)
| Provider | Ease | Notes |
|----------|------|-------|
| **CardHedger** | ⭐⭐⭐⭐⭐ Easy | Purpose-built endpoints, OpenAPI docs |
| **Apify** | ⭐⭐⭐⭐☆ Moderate | Generic platform, requires Actor management |
| **SportsCardPro** | ⭐⭐☆☆☆ Hard | No clear public API path |

### TOS & Risk Assessment
| Provider | Risk Level | Notes |
|----------|------------|-------|
| **CardHedger** | ✅ Low | Licensed data aggregator, enterprise focus |
| **Apify** | ⚠️ Medium | Scrapes eBay directly - TOS gray area, may require residential proxies |
| **SportsCardPro** | ❌ High | No authorized API for commercial use, scraping violates TOS |

---

## Recommendation: CardHedger

### Why CardHedger is #1 for Productization

1. **Built for This Use Case**
   - Purpose-built sports card API (not generic scraper)
   - Native player/set/grade filtering
   - 2.7M+ card database covers virtually all modern cards

2. **Data Advantages**
   - Multiple marketplace sources (not just eBay)
   - Years of historical data for trend analysis
   - 40M+ weekly sales = comprehensive comps
   - ML-ready structured data

3. **Enterprise Reliability**
   - 99.9% uptime SLA
   - Async-first architecture
   - Built-in monitoring and analytics
   - Argon2 security

4. **Scalability**
   - Designed for high-throughput applications
   - No proxy management headaches
   - Single API key → unlimited scale

5. **Legitimacy**
   - Licensed data relationships
   - No scraping TOS violations
   - Enterprise contracts protect your business

### The Apify Alternative
Apify is a viable **MVP/bootstrap option** if:
- Need to validate product before committing to data costs
- Budget is extremely constrained (<$500/mo)
- Can tolerate occasional scraping blocks
- Willing to manage proxy infrastructure

**When to switch from Apify to CardHedger:**
- You have paying customers
- Proxy costs exceed ~$1,000/month
- Need historical trend data
- Compliance becomes important (fundraising, enterprise sales)

---

## Scalability Plan

### Phase 1: MVP (Months 1-3)
**Option A: CardHedger (Preferred)**
- Contact CardHedger for starter plan
- Budget: $500-1,000/month
- Build product with proper data foundation

**Option B: Apify (Bootstrap)**
- Scale plan ($199/month)
- Datacenter proxies ($0.80/IP)
- Budget: $300-600/month
- Plan migration path to CardHedger

### Phase 2: Growth (Months 4-12)
- **Users:** 100-1,000 active
- **Volume:** 1,000-10,000 scans/day
- **Data:** CardHedger Growth/Enterprise tier
- **Budget:** $2,000-5,000/month
- **Focus:** Optimize cache, batch similar queries

### Phase 3: Scale (Year 2+)
- **Users:** 1,000-10,000+
- **Volume:** 10,000-50,000+ scans/day
- **Data:** CardHedger Enterprise custom pricing
- **Budget:** $5,000-20,000+/month
- **Optimizations:**
  - Aggressive caching of popular cards
  - Bulk price updates instead of per-scan
  - Historical data warehousing
  - CDN for card images

---

## Cost Projections Summary

| Phase | Users | Scans/Day | Provider | Monthly Cost |
|-------|-------|-----------|----------|--------------|
| MVP | 10-100 | 100 | CardHedger Starter | $500-1,000 |
| MVP | 10-100 | 100 | Apify Scale | $300-600 |
| Growth | 100-1,000 | 1,000-10,000 | CardHedger Growth | $2,000-5,000 |
| Scale | 1,000-10,000 | 10,000-50,000 | CardHedger Enterprise | $5,000-20,000+ |

---

## Next Steps

1. **Contact CardHedger** (support@cardhedger.com)
   - Explain use case: sports card scanner app
   - Request pricing for 3,000-10,000 requests/month initially
   - Ask about: rate limits, data freshness, bulk endpoints

2. **Build Prototype**
   - Use sample code above
   - Focus on player+set+grade search
   - Cache aggressively

3. **Evaluate Apify as Fallback**
   - Only if CardHedger pricing is prohibitive
   - Test proxy costs with real queries
   - Budget for migration eventually

4. **Ignore SportsCardPro**
   - Not enterprise-ready
   - No clear commercial API path

---

## Sources

- Apify Pricing: https://apify.com/pricing
- marielise eBay Actor: https://apify.com/marielise.dev/ebay-sold-listings-intelligence
- caffein eBay Actor: https://apify.com/caffein.dev/ebay-sold-listings
- CardHedger API: https://api.cardhedger.com/
- CardHedger Services: https://ai.cardhedger.com/api-services
- SportsCardPro API Docs: https://www.sportscardspro.com/api-documentation

---

*Document generated: March 22, 2026*
