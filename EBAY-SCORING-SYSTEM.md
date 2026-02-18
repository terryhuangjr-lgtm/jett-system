# eBay Scanner Deal Scoring System

**File:** `/home/clawd/clawd/ebay-scanner/deal-scorer-v2.js`
**Last Updated:** 2026-02-06

---

## Overall Score Calculation

**Final Score = 1-10 scale**

Each listing gets scored 0-10 across 4 categories, then weighted:

```javascript
totalScore = (
  (sellerQuality × 0.30) +
  (listingQuality × 0.30) +
  (searchRelevance × 0.25) +
  (listingFreshness × 0.15)
)

finalScore = totalScore (normalized to 1-10 scale)
```

---

## 1. Seller Quality (30% weight)

**What it measures:** Trust signals from seller feedback and sales history

**Scoring tiers:**

| Feedback | Sales Count | Points | Tier | Trust Level |
|----------|-------------|--------|------|-------------|
| ≥99% | ≥1000 sales | 10.0 | Elite seller | ✅ TRUSTED |
| ≥98% | ≥500 sales | 7.5 | Established seller | ✅ Good |
| ≥95% | ≥100 sales | 5.0 | Decent seller | OK |
| ≥90% | <100 sales | 2.5 | New/low feedback | ⚠️ New seller |
| <90% | Any | 0.0 | Low trust | ⚠️ Low trust |

**Why 30%:** Trusted sellers = less risk of scams, better condition accuracy, reliable shipping

---

## 2. Listing Quality (30% weight)

**What it measures:** Photo quality, condition claims, red flags in description

**Positive signals (+points):**
- Has photos: +5 points
- "Pack fresh" or "Investment" in title: +2.5 points
- "Mint" or "Gem" condition claimed: +1 point

**Red flags (-points):**
- "As-is" listing: -2.5 points
- "Damaged", "Crease", or "Tear" mentioned: -5 points
- "See photos" (unclear condition): -1 point

**Max points:** 10 (clamped at 0 minimum)

**Why 30%:** Quality = actual value. Bad photos/condition = bad deal regardless of price.

---

## 3. Search Relevance (25% weight)

**What it measures:** How well does the listing match what you searched for?

**Sub-components:**

### Part 0: Player Name Validation (CRITICAL)
**Most important check** - wrong player = severe penalty

- **Player name matches:** +3 points
- **Last name only matches:** +2 points
- **Wrong player (or no match):** -5 points

Uses pattern matching to extract player names from search:
- Full names: "michael jordan", "ken griffey jr"
- Distinctive last names: "nowitzki", "giannis", "ohtani"

### Part 1: Card Type Match (0-4 points)
Checks for card type keywords in search:
- Refractor, Prizm, Chrome, Auto, Patch, Rookie, Serial numbered, Parallel

Scoring:
- All requested types present: 4 points
- Some types present: Proportional (2-3 points)
- No requested types: 1-2 points depending on if it's premium

### Part 2: Year/Era Match (0-3 points)
Checks if listing year matches search year:
- Exact year match: 3 points
- Within 2 years: 2 points
- Within 5 years: 1 point
- Wrong era: 0 points

### Part 3: Brand/Set Match (0-3 points)
Checks for brand keywords (Topps, Panini, Upper Deck, Bowman, Fleer, Skybox):
- Requested brand found: 3 points
- Premium brand (not requested): 1.5 points
- No premium brand: 0.5 points

**Max points:** 10 (player validation + card type + year + brand)

**Why 25%:** Relevance = what you actually want. High score on wrong card is useless.

---

## 4. Listing Freshness (15% weight)

**What it measures:** How old is the listing? (Newer = more likely still available)

**Scoring:**

| Listing Age | Points | Status |
|-------------|--------|--------|
| 0-1 days old | 10.0 | Brand new |
| 1-3 days | 7.5 | Very fresh |
| 3-7 days | 5.0 | Fresh |
| 7-14 days | 2.5 | Aging |
| 14+ days | 0.0 | Stale (likely sold or inflexible seller) |
| Age unknown | 5.0 | Neutral |

**Why 15%:** Fresh listings = better chance of purchase success, more flexible sellers

---

## Score Ratings

Final scores map to ratings:

| Score Range | Rating | Symbol |
|-------------|--------|--------|
| 9.0 - 10.0 | 🔥 HOT DEAL | 🔥 |
| 8.0 - 8.9 | 💰 GREAT DEAL | 💰 |
| 7.0 - 7.9 | SOLID DEAL | ✅ |
| 6.0 - 6.9 | DECENT | 👍 |
| 5.0 - 5.9 | FAIR | 😐 |
| 0.0 - 4.9 | SKIP | ❌ |

---

## Flags System

**High confidence flags** (shown in output):
- ✅ Perfect match for your search
- ✅ Trusted seller + perfect match - HIGH CONFIDENCE
- ⚠️ Player name mismatch (for different player)
- ⚠️ Wrong year/era
- ⚠️ Condition issues noted

---

## Current Weights Summary (Updated 2026-02-06)

```
Search Relevance:   40%  (Player match, card type, year, brand)
Listing Quality:    25%  (Photos & condition - NM-MT+ ONLY)
Seller Quality:     20%  (Trust & reliability)
Listing Freshness:  15%  (Age of listing)
────────────────────────
TOTAL:             100%
```

**Key change:** Search relevance increased to 40% - wrong player or card type now hurts score significantly more.

**Critical filter:** Only NM-MT or better condition accepted. Anything below auto-rejects (score = 0).

---

## Example Calculation

**Listing:** 1996 Kobe Bryant Topps Chrome Refractor PSA 9 - $350

**Seller Quality:** 
- Feedback: 99.8%, Sales: 5000
- Score: 10/10 × 0.30 = 3.0

**Listing Quality:**
- Has photos (+5), Mint claimed (+1)
- Score: 6/10 × 0.30 = 1.8

**Search Relevance:**
- Player match: Kobe Bryant (+3)
- Card type: Refractor found (+4)
- Year: 1996 exact match (+3)
- Brand: Topps found (+3)
- Total: 10/10 × 0.25 = 2.5
  *(Capped at 10, so 10/10)*

**Listing Freshness:**
- Age: 2 days old
- Score: 7.5/10 × 0.15 = 1.125

**Final Score:**
3.0 + 1.8 + 2.5 + 1.125 = **8.425** → **8.4/10** (💰 GREAT DEAL)

---

## Potential Refinements to Consider

### Option 1: Increase Player Name Weight
Current: Player validation is part of 25% relevance bucket (-5 to +3 points within that category)
Alternative: Make player validation its own 10-15% category for more penalty on wrong players

### Option 2: Add Price Analysis Component
Current: No comp/price comparison (would need sold comps database)
Alternative: Add 20% weight for "% below typical sold price" (requires comp data integration)

### Option 3: Adjust Seller vs Quality Balance
Current: 30% seller, 30% quality
Alternative A: 35% seller, 25% quality (prioritize trust)
Alternative B: 25% seller, 35% quality (prioritize item itself)

### Option 4: Add Scarcity Factor
Current: No consideration for card rarity
Alternative: Add points for serial numbered, low pop counts, rare variations

### Option 5: Time-to-End Weighting
Current: Only considers listing age
Alternative: Also consider "ending soon" (auctions ending <6 hours = urgency bonus)

### Option 6: Dynamic Weighting by Category
Current: Fixed weights for all searches
Alternative: Different weights for graded vs raw, vintage vs modern, etc.

---

## Questions to Consider

1. **Is 30% seller weight too high?** 
   - Pro: Avoids scams
   - Con: Might miss good deals from newer sellers

2. **Should player validation be its own category?**
   - Currently embedded in 25% relevance
   - -5 point penalty might not be enough

3. **Do we need price comp integration?**
   - Would require maintaining comps database
   - Could add "% below market" as major factor

4. **Should graded cards score higher than raw?**
   - Currently treats equally
   - PSA 10 vs raw different value propositions

5. **Is freshness too low at 15%?**
   - Stale listings often already sold
   - Could increase to 20% to prioritize new finds

---

**Ready for your analysis and refinements.**
