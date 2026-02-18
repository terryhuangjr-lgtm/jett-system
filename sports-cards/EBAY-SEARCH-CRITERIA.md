# eBay API Search Criteria - Sports Card Business

## Core Strategy: Find Raw Cards with Grading Potential

**Goal:** Identify ungraded cards that will likely grade PSA 9 or 10

---

## Search Filters (eBay Finding API)

### **Base Search #1: Rookie Cards (Raw)**

```javascript
{
  keywords: "rookie card raw ungraded",
  categoryId: "261328", // Sports Trading Cards
  
  itemFilter: [
    // Exclude already graded
    { name: "ExcludeSeller", value: ["pwcc", "goldinauctions"] }, // Big grading sellers
    
    // Condition
    { name: "Condition", value: "New" }, // Mint/near mint only
    
    // Price range
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "500" },
    
    // Listing type
    { name: "ListingType", value: ["Auction", "FixedPrice"] },
    
    // Ending soon (good deals)
    { name: "EndTimeFrom", value: "now" },
    { name: "EndTimeTo", value: "+6h" }
  ],
  
  // Keywords to EXCLUDE (avoid graded cards)
  excludeKeywords: ["PSA", "BGS", "SGC", "graded", "slab"],
  
  // Sort by ending soonest
  sortOrder: "EndTimeSoonest"
}
```

---

### **Search #2: Serial Numbered (/500 or less)**

```javascript
{
  keywords: "serial numbered /500 /250 /100 /50 /25 /10 /5 /1",
  categoryId: "261328",
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "500" }
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded"],
  
  // Serial numbered cards are hot
  sortOrder: "PricePlusShippingLowest" // Find deals
}
```

---

### **Search #3: On-Card Autographs**

```javascript
{
  keywords: "on card auto autograph rookie",
  categoryId: "261328",
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "25" }, // Autos typically higher floor
    { name: "MaxPrice", value: "500" }
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded", "sticker auto"],
  
  sortOrder: "EndTimeSoonest"
}
```

---

### **Search #4: Hot Inserts (Current Trends)**

```javascript
{
  keywords: "(downtown OR kaboom OR prizm manga) rookie",
  categoryId: "261328",
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "500" }
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded"],
  
  // These are hot, grab before price spikes
  sortOrder: "EndTimeSoonest"
}
```

---

### **Search #5: Michael Jordan (Always)**

```javascript
{
  keywords: "michael jordan raw ungraded",
  categoryId: "212", // Sports Trading Cards
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "500" }
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded", "reprint"],
  
  sortOrder: "PricePlusShippingLowest"
}
```

---

### **Search #6: Ken Griffey Jr**

```javascript
{
  keywords: "ken griffey jr rookie raw",
  categoryId: "212",
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "500" }
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded"],
  
  sortOrder: "PricePlusShippingLowest"
}
```

---

### **Search #7: Current Rookies (2025-26)**

```javascript
{
  keywords: "(cooper flagg OR derik queen) rookie prizm",
  categoryId: "261328",
  
  itemFilter: [
    { name: "Condition", value: "New" },
    { name: "MinPrice", value: "10" },
    { name: "MaxPrice", value: "300" } // Newer rookies, lower ceiling
  ],
  
  excludeKeywords: ["PSA", "BGS", "graded"],
  
  // Time-sensitive, grab before hype
  sortOrder: "EndTimeSoonest"
}
```

---

## Advanced Filtering Logic (After API Returns Results)

### **Step 1: Initial Filter**
- ✅ Price in range ($10-500)
- ✅ Ungraded (no PSA/BGS in title/description)
- ✅ Good photos (at least 3 images)
- ✅ Reputable seller (feedback > 98%)

### **Step 2: Grading Potential Check**
**Look for indicators in photos/description:**
- Centered (this is KEY for PSA 10)
- Sharp corners visible
- No obvious surface issues
- "Near Mint" or "Mint" condition stated

**Red flags (skip these):**
- Visible damage
- Off-center
- Poor photo quality (can't assess condition)
- Seller mentions flaws

### **Step 3: Comp Analysis**
**For each card that passes Step 1-2:**

1. **Query sold listings for GRADED version:**
   - Same card + "PSA 10"
   - Same card + "PSA 9"
   - Get average sold price (last 30 days)

2. **Calculate profit potential:**
   ```
   Current raw price: $X
   PSA 10 avg sold: $Y
   Grading cost: ~$20
   
   If PSA 10: Profit = $Y - $X - $20
   If PSA 9: Profit = ($Y * 0.4) - $X - $20  // PSA 9 ~40% of PSA 10
   
   Expected value (assuming 50% chance PSA 10, 40% chance PSA 9):
   EV = (0.5 * PSA10_profit) + (0.4 * PSA9_profit)
   ```

3. **Flag if EV > $50** (good opportunity)

### **Step 4: Deal Scoring (1-10)**

```javascript
Score calculation:
- Base: 5 points
- EV > $100: +2 points
- EV > $200: +3 points (hot deal!)
- Serial numbered /100 or less: +1 point
- Hot insert (downtown/kaboom): +1 point
- Ending soon (<2 hours): +1 point
- Star player (MJ, Griffey, etc.): +1 point
- Perfect centering visible: +1 point

Score 8-10 = 🔥 HOT (alert immediately)
Score 6-7 = ⚡ GOOD (add to daily report)
Score 4-5 = 💰 MAYBE (include if slow day)
Score <4 = Skip
```

---

## Output Format

**For each flagged deal:**

```json
{
  "title": "Cooper Flagg 2025 Prizm Rookie #145 /249 Raw",
  "currentPrice": "$87.50",
  "endTime": "2h 15m",
  "seller": "cardking99 (99.2%)",
  "images": 4,
  
  "comps": {
    "psa10_avg": "$425",
    "psa9_avg": "$170",
    "psa10_recent": ["$450", "$410", "$415"]
  },
  
  "profit_analysis": {
    "cost": "$87.50 + $20 grading = $107.50",
    "psa10_profit": "$317.50 (3x)",
    "psa9_profit": "$62.50 (60%)",
    "expected_value": "$215" 
  },
  
  "flags": [
    "Serial numbered /249",
    "Hot rookie (pre-NBA debut)",
    "Prizm (popular set)",
    "Good centering visible"
  ],
  
  "score": 9,
  "rating": "🔥 HOT",
  
  "link": "https://ebay.com/itm/..."
}
```

---

## Daily Scan Schedule

**6:00 AM** - Rookie cards scan  
**6:15 AM** - Serial numbered scan  
**6:30 AM** - Hot inserts scan  
**6:45 AM** - MJ + Griffey scan  
**7:00 AM** - Current rookies scan  
**7:15 AM** - On-card autos scan  

**7:30 AM** - Compile all results, score deals, send report

---

## Alert Priorities

**🔥 Immediate Slack Alert (Score 8-10):**
- EV > $150
- Ending in <2 hours
- Send to #sports-cards channel

**⚡ Morning Report (Score 6-7):**
- EV $50-150
- Include in daily summary
- Reviewed when convenient

**💰 Weekly Digest (Score 4-5):**
- Marginal deals
- Review on weekends when time

---

## Multi-Platform (Future)

**Once eBay working, expand to:**
- Buyee (Japanese eBay) - brother's secret weapon
- Chinese auction sites
- Comc.com
- StockX (sports cards)

**Same criteria, different platforms.**

---

## Notes

**This is NOT simple keyword search.**

**This is sophisticated grading arbitrage with:**
- Condition assessment
- Comp analysis
- Profit calculation
- Market timing
- Trend awareness

**The automation needs to be SMART.**

---

Created: Feb 3, 2026  
Status: Ready for eBay API implementation
