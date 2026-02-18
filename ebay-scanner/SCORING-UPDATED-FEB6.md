# eBay Scorer Updated - Feb 6, 2026

## Changes Made

### 1. Weights Updated ✅

```
BEFORE:                          AFTER:
Seller Quality:      30%    →    Seller Quality:      20% 
Listing Quality:     30%    →    Listing Quality:     25%
Search Relevance:    25%    →    Search Relevance:    40% ⭐ HIGHEST PRIORITY
Listing Freshness:   15%    →    Listing Freshness:   15% (unchanged)
```

**Search Relevance is now the MOST IMPORTANT factor at 40%.**

### 2. Condition Filter Added ✅

**NM-MT+ ONLY - AUTO-REJECT BELOW**

Cards are now **immediately rejected** (score = 0) if they contain ANY of these keywords:

**Condition keywords:**
- poor, fair, good, very good, vg, ex, excellent
- damaged, crease, creased, tear, torn
- corner wear, edge wear, surface wear
- scratched, stained, marked, writing
- worn, played, well-loved, vintage condition
- as-is, as is, see photos for condition, lower grade

**Low grade indicators:**
- psa 1, psa 2, psa 3, psa 4, psa 5, psa 6
- bgs 1, bgs 2, bgs 3, bgs 4, bgs 5, bgs 6
- sgc 1, sgc 2, sgc 3, sgc 4, sgc 5, sgc 6
- graded poor, graded fair, graded good

**Result:** If ANY of these appear in title or condition field → **Score 0, AUTO-REJECTED**

---

## New Scoring Breakdown

### Final Score Formula:

```
Score = (Seller × 0.20) + (Quality × 0.25) + (Relevance × 0.40) + (Freshness × 0.15)
```

### Criterion 1: Search Relevance (40% - HIGHEST)

**What it checks:**
1. **Player Name** (up to +3 or -5 points)
   - Full name match: +3
   - Last name match: +2
   - **WRONG PLAYER: -5** (severe penalty)

2. **Card Type** (up to +4 points)
   - Refractor, Prizm, Chrome, Auto, Patch, Rookie, Serial #

3. **Year/Era** (up to +3 points)
   - Exact year: +3
   - ±2 years: +2
   - ±5 years: +1

4. **Brand/Set** (up to +3 points)
   - Topps, Panini, Upper Deck, Bowman, etc.

**Example:**
- Search: "michael jordan refractor 1997"
- Match: "1997 Topps Chrome Michael Jordan Refractor" → 10/10 points → 4.0 toward final score

### Criterion 2: Listing Quality (25%)

**FIRST:** Condition check (NM-MT+ required)
- If below NM-MT → **AUTO-REJECT** (score 0)

**If passes NM-MT+ filter:**
- Has photos: +5 points
- Pack fresh/investment: +2.5 points
- Mint/gem claimed: +1 point
- NM/NM-MT stated: +1 point
- High grade (PSA 7+, BGS 7+): +2 points

**Max:** 10 points → 2.5 toward final score

### Criterion 3: Seller Quality (20%)

**Scoring:**
- 99%+, 1000+ sales → 10 points (Elite)
- 98%+, 500+ sales → 7.5 points (Good)
- 95%+, 100+ sales → 5 points (OK)
- <100 sales → 2.5 points (New seller)
- <90% feedback → 0 points (Low trust)

**Max:** 10 points → 2.0 toward final score

### Criterion 4: Listing Freshness (15%)

**Scoring:**
- <24 hours → 10 points (FRESH)
- 1-7 days → 5 points
- 8-30 days → 2.5 points
- 30+ days → 0 points

**Max:** 10 points → 1.5 toward final score

---

## Example Scores

### Example 1: Perfect Match, NM-MT Card

**Listing:** "1997 Topps Chrome Michael Jordan Refractor PSA 9"
- Search: "michael jordan refractor 1997"
- Seller: 99.5%, 2500 sales
- Listed: 2 days ago

**Scoring:**
- Search Relevance: 10/10 × 0.40 = **4.0**
- Listing Quality: 10/10 × 0.25 = **2.5** (passed NM-MT, PSA 9)
- Seller Quality: 10/10 × 0.20 = **2.0**
- Listing Freshness: 5/10 × 0.15 = **0.75**
- **TOTAL: 9.25** 🔥 POTENTIAL STEAL

---

### Example 2: Wrong Player

**Listing:** "1997 Topps Chrome LeBron James Refractor"
- Search: "michael jordan refractor 1997"
- Seller: 99%, 1000 sales
- Listed: 1 day ago

**Scoring:**
- Search Relevance: -5 player penalty + 7 other = 2/10 × 0.40 = **0.8**
- Listing Quality: 8/10 × 0.25 = **2.0**
- Seller Quality: 10/10 × 0.20 = **2.0**
- Listing Freshness: 10/10 × 0.15 = **1.5**
- **TOTAL: 6.3** ✓ DECENT (but wrong player!)

Flags: "⚠️ May not match your search - check details"

---

### Example 3: Below NM-MT (AUTO-REJECTED)

**Listing:** "1997 Topps Chrome Michael Jordan - Creased"
- Search: "michael jordan refractor 1997"
- Seller: 100%, 5000 sales
- Listed: 1 hour ago

**Scoring:**
- Listing Quality: **0/10 (AUTO-REJECT - "creased" detected)**
- All other criteria: N/A (disqualified)
- **TOTAL: 0.0** ❌ REJECTED - BELOW NM-MT

Flags: "❌ REJECTED - Condition below NM-MT"

---

## Impact

**Before:**
- Wrong player cards could still score 7-8 (good deal!)
- Below NM cards just got lower scores
- Search match wasn't prioritized

**After:**
- Wrong player = max score ~6 (questionable)
- Below NM-MT = instant 0 (rejected)
- **Search Relevance is #1 priority** (40%)

---

## Testing

Test the new scorer:

```bash
cd /home/clawd/clawd/ebay-scanner

# Run a search
node multi-search.js "michael jordan refractor" --topN 10

# Check output - should show:
# - Rejected cards marked with ❌ REJECTED - BELOW NM-MT
# - Search relevance score prominently featured
# - High scores only for NM-MT+ cards matching your search
```

---

## Backup

Old scorer saved to: `/home/clawd/clawd/ebay-scanner/deal-scorer-v2.js.backup`

To rollback:
```bash
mv deal-scorer-v2.js.backup deal-scorer-v2.js
```

---

**Summary:** Search Relevance now drives scoring (40%), and anything below NM-MT is auto-rejected. You'll only see cards that match your search AND are high condition.
