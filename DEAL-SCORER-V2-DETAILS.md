# Deal Scorer V2 - Complete Implementation Details

**Status:** ✅ NOW ACTIVE (all scan scripts switched as of 2026-02-06)
**File:** `/home/clawd/clawd/ebay-scanner/deal-scorer-v2.js`

---

## Why It Wasn't Being Used

**The Problem:**
- `deal-scorer-v2.js` existed but all 24 scan scripts were importing `deal-scorer.js` (the old version)
- Old version used simple additive scoring (no formal weights)
- v2 has proper weighted percentage system but wasn't hooked up

**Fixed:** All scan scripts now use `deal-scorer-v2.js`

---

## Current Weights (Active Now)

```javascript
{
  sellerQuality: 30%,      // Trust & reliability
  listingQuality: 30%,     // Photos & condition
  searchRelevance: 25%,    // Match to your search
  listingFreshness: 15%    // Listing age
}
```

**Formula:**
```
Final Score = (sellerQuality × 0.30) +
              (listingQuality × 0.30) +
              (searchRelevance × 0.25) +
              (listingFreshness × 0.15)

Normalized to 1-10 scale
```

---

## 1. Seller Quality (30% weight)

**What it measures:** Feedback score + sales history

**Scoring tiers:**

| Feedback | Sales | Points | Tier | Trust |
|----------|-------|--------|------|-------|
| 99%+ | 1000+ | 10.0 | Elite seller | ✅ TRUSTED |
| 98%+ | 500+ | 7.5 | Established | ✅ Good |
| 95%+ | 100+ | 5.0 | Decent | OK |
| 90%+ | <100 | 2.5 | New/low | ⚠️ New seller |
| <90% | Any | 0.0 | Low trust | ⚠️ Low trust |

**Example:**
```
Seller: 99.5% feedback, 2000 sales
Score: 10/10 × 0.30 = 3.0 points toward final
```

---

## 2. Listing Quality (30% weight)

**What it measures:** Photo quality, condition claims, red flags

**Positive signals (+points):**
- Has photos: +5 points
- "Pack fresh" or "Investment" in title: +2.5 points
- "Mint" or "Gem" condition: +1 point

**Red flags (penalties):**
- "As-is" listing: -2.5 points
- "Damaged", "Crease", "Tear": -5 points
- "See photos" (unclear condition): -1 point

**Max points:** 10 (clamped, minimum 0)

**Example:**
```
Has photos (+5), Mint condition (+1)
Score: 6/10 × 0.30 = 1.8 points toward final
```

---

## 3. Search Relevance (25% weight)

**What it measures:** How well listing matches your search

**Sub-components:**

### Part 0: Player Name Validation (CRITICAL)
**Most important check** - wrong player = severe penalty

**Scoring:**
- Full name match: **+3 points**
- Last name only: **+2 points**
- Wrong player: **-5 points** ⚠️

**Player detection:**
- Extracts full names from search: "michael jordan", "ken griffey jr"
- Has list of 50+ known distinctive last names
- Excludes brand keywords (topps, chrome, etc.) from being treated as names

**Example:**
```
Search: "kobe bryant refractor"
Title: "Shaquille O'Neal 1996 Topps Chrome Refractor"
Result: -5 points (WRONG PLAYER)
```

### Part 1: Card Type Match (0-4 points)

**Card types checked:**
- Refractor, Prizm, Chrome
- Auto/Autograph
- Patch/Jersey/Memorabilia
- Rookie/RC
- Serial numbered (/99, /25, etc.)
- Parallel/Variation

**Scoring:**
- All requested types present: 4 points
- Some types present: Proportional (2-3 points)
- No specific type but premium card: 2 points
- Base card: 1 point

**Example:**
```
Search: "dirk refractor"
Title has "refractor": +4 points
```

### Part 2: Year/Era Match (0-3 points)

**Scoring:**
- Exact year match: 3 points
- Within 2 years: 2 points
- Within 5 years: 1 point
- Wrong era: 0 points
- No year specified: 1.5 points (neutral)

**Example:**
```
Search includes: "1996"
Title includes: "1996"
Result: +3 points (exact match)
```

### Part 3: Brand/Set Match (0-3 points)

**Brands tracked:**
- Topps (Topps Chrome, Finest, Stadium Club)
- Panini (Prizm, Optic, Select, Donruss)
- Upper Deck (UD, SP Authentic, SPX)
- Bowman (Bowman Chrome)
- Fleer (Ultra, Flair)
- Skybox

**Scoring:**
- Requested brand found: 3 points
- Premium brand (not specifically requested): 1.5 points
- No premium brand: 0.5 points

**Example:**
```
Search: "topps chrome"
Title: "1996 Topps Chrome"
Result: +3 points
```

### Search Relevance Total

**Max points:** 10
- Player validation: -5 to +3
- Card type: 0-4
- Year: 0-3
- Brand: 0-3

**Final calculation:**
```
Total points capped at 10
Score: X/10 × 0.25 = contribution to final score
```

**Example (perfect match):**
```
Player match: +3
Card type: +4
Year match: +3
Brand match: +3
Total: 10/10 × 0.25 = 2.5 points toward final
```

---

## 4. Listing Freshness (15% weight)

**What it measures:** How old is the listing

**Scoring:**

| Age | Points | Status |
|-----|--------|--------|
| 0-1 days | 10.0 | Brand new |
| 1-3 days | 7.5 | Very fresh |
| 3-7 days | 5.0 | Fresh |
| 7-14 days | 2.5 | Aging |
| 14+ days | 0.0 | Stale |
| Unknown | 5.0 | Neutral |

**Example:**
```
Listing: 2 days old
Score: 7.5/10 × 0.15 = 1.125 points toward final
```

---

## Final Score Ratings

| Score | Rating | Symbol |
|-------|--------|--------|
| 9.0-10.0 | 🔥 HOT DEAL | 🔥 |
| 8.0-8.9 | 💰 GREAT DEAL | 💰 |
| 7.0-7.9 | SOLID DEAL | ✅ |
| 6.0-6.9 | DECENT | 👍 |
| 5.0-5.9 | FAIR | 😐 |
| 0.0-4.9 | SKIP | ❌ |

---

## Complete Example Calculation

**Listing:**
```
Title: "1996 Kobe Bryant Topps Chrome Refractor"
Price: $150
Seller: 99.8% (5000 sales)
Photos: Yes, "Mint" mentioned
Age: 2 days old
```

**Search:** "kobe bryant refractor"

**Scoring:**

**1. Seller Quality:**
- 99.8%, 5000 sales = Elite = 10/10
- Contribution: 10 × 0.30 = **3.0 points**

**2. Listing Quality:**
- Has photos (+5)
- "Mint" (+1)
- Total: 6/10
- Contribution: 6 × 0.30 = **1.8 points**

**3. Search Relevance:**
- Player: "kobe bryant" found (+3)
- Card type: "refractor" found (+4)
- Year: 1996 in both (+3)
- Brand: "topps" found (+3)
- Total: 10/10 (capped)
- Contribution: 10 × 0.25 = **2.5 points**

**4. Listing Freshness:**
- 2 days old = 7.5/10
- Contribution: 7.5 × 0.15 = **1.125 points**

**Final Score:**
```
3.0 + 1.8 + 2.5 + 1.125 = 8.425
Rounded: 8.4/10
Rating: 💰 GREAT DEAL
```

---

## What's NOT Implemented (Yet)

### Price Analysis (Exists but Not Used)

**There's a `scorePriceAnalysis()` method** that compares to median sold price:

**Scoring tiers:**
- 50%+ below median: 10 points (STEAL)
- 30-50% below: 7.5 points (GREAT DEAL)
- 20-30% below: 5 points (SOLID DEAL)
- 10-20% below: 2.5 points (DECENT)
- At/above market: 0 points

**Why not active?**
- Would require comps data for every listing
- Comps are estimated (active listings × 85%)
- Would slow down scanning significantly
- Could add as optional 5th category

**If we added it:**
```
Suggested weights:
- Price Analysis: 20%
- Seller Quality: 25% (reduced from 30%)
- Listing Quality: 25% (reduced from 30%)
- Search Relevance: 20% (reduced from 25%)
- Listing Freshness: 10% (reduced from 15%)
```

### Comparability Score
**Not implemented** - would measure confidence in comp data quality

---

## Flags System

**High-confidence indicators shown in output:**
- ✅ Perfect match for your search
- ✅ Trusted seller + perfect match = HIGH CONFIDENCE
- ⚠️ Player name mismatch (different player)
- ⚠️ Wrong year/era
- ⚠️ Condition issues noted

---

## Adjusting Weights

**To change weights, edit `deal-scorer-v2.js` line 6-11:**

```javascript
this.weights = {
  sellerQuality: 0.30,      // Change these
  listingQuality: 0.30,
  searchRelevance: 0.25,
  listingFreshness: 0.15
};
```

**Must sum to 1.0 (100%)**

**Suggested alternatives:**

**Option A: Prioritize player matching**
```javascript
{
  sellerQuality: 0.25,
  listingQuality: 0.25,
  searchRelevance: 0.35,    // Increased from 25%
  listingFreshness: 0.15
}
```

**Option B: Prioritize trust**
```javascript
{
  sellerQuality: 0.40,      // Increased from 30%
  listingQuality: 0.30,
  searchRelevance: 0.20,
  listingFreshness: 0.10
}
```

**Option C: Add price analysis**
```javascript
{
  priceAnalysis: 0.20,      // NEW
  sellerQuality: 0.25,
  listingQuality: 0.25,
  searchRelevance: 0.20,
  listingFreshness: 0.10
}
// Requires enabling price analysis in score() method
```

---

## Testing

**Test command:**
```bash
cd ~/clawd/ebay-scanner
node -e "
const DealScorer = require('./deal-scorer-v2');
const scorer = new DealScorer('kobe bryant refractor');

const item = {
  title: 'Kobe Bryant 1996 Topps Chrome Refractor',
  totalPrice: 150,
  sellerPositivePercent: 99.5,
  sellerFeedbackScore: 2000,
  imageUrl: 'http://example.com/image.jpg',
  listingAge: 2
};

const result = scorer.score(item, null);
console.log('Score:', result.score);
console.log('Rating:', result.rating);
console.log(JSON.stringify(result.breakdown, null, 2));
"
```

---

## Summary

**Active weights:**
- Seller: 30% (trust/reliability)
- Quality: 30% (photos/condition)
- Relevance: 25% (player match + card type + year + brand)
- Freshness: 15% (listing age)

**Key feature:** Player name validation with -5 point penalty for wrong player

**Not active:** Price analysis (exists but not used)

**All 24 scan scripts now use this system.**

---

**Questions or want to adjust weights? Let me know.**
