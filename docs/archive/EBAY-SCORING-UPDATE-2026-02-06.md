# eBay Scoring System Update - February 6, 2026

**Status:** ✅ IMPLEMENTED
**Files updated:** `deal-scorer-v2.js`, all 24 scan scripts

---

## Changes Made

### 1. Weight Adjustments

**Old weights:**
```
Seller Quality:     30%
Listing Quality:    30%
Search Relevance:   25%
Listing Freshness:  15%
```

**New weights:**
```
Search Relevance:   40%  ← Increased from 25%
Listing Quality:    25%  ← Decreased from 30%
Seller Quality:     20%  ← Decreased from 30%
Listing Freshness:  15%  (unchanged)
```

**Why:** Prioritize getting the RIGHT card over seller trust. Wrong player/card type now severely impacts score.

---

### 2. Strict Condition Filtering

**New requirement:** Only NM-MT (Near Mint-Mint) or better

**Auto-reject conditions:**
- Excellent (EX, EX-MT, EX+)
- Very Good (VG, VG-EX, VG+)
- Good, Fair, Poor
- Any damage terms: damaged, crease, tear, bent, corner wear, stain, mark, scratch, ding
- Condition terms: played, worn, used condition, vintage condition, reader, binder

**Result when rejected:**
- Score: 0
- Rating: "❌ REJECTED - Condition below NM-MT"
- Flag: "❌ CONDITION REJECTED: Below NM-MT minimum"

---

## New Scoring Breakdown

### 1. Search Relevance (40% weight) - HIGHEST PRIORITY

**Player Name Validation (most critical):**
- Full name match: +3 points
- Last name only: +2 points
- **Wrong player: -5 points** ⚠️

**Card Type Match:**
- All requested types found: 4 points
- Partial match: 2-3 points
- Premium card (not requested): 2 points
- Base card: 1 point

**Year/Era Match:**
- Exact year: 3 points
- Within 2 years: 2 points
- Within 5 years: 1 point

**Brand/Set Match:**
- Requested brand found: 3 points
- Premium brand (not requested): 1.5 points
- No premium brand: 0.5 points

**Max:** 10 points × 0.40 = **4.0 points** toward final score

---

### 2. Listing Quality (25% weight) - WITH CONDITION FILTER

**STRICT FILTER FIRST:**
- If condition below NM-MT → **AUTO-REJECT** (score = 0)

**If condition acceptable:**
- Has photos: +5 points
- Pack fresh / Investment grade: +2.5 points
- Mint / Gem / NM-MT claimed: +1 point
- "As-is" listing: -2.5 points
- Unclear condition ("see photos"): -1 point

**Max:** 10 points × 0.25 = **2.5 points** toward final score

---

### 3. Seller Quality (20% weight)

**Unchanged scoring tiers:**
- Elite (99%+, 1000+ sales): 10 points
- Established (98%+, 500+ sales): 7.5 points
- Decent (95%+, 100+ sales): 5 points
- New/Low: 0-2.5 points

**Max:** 10 points × 0.20 = **2.0 points** toward final score

---

### 4. Listing Freshness (15% weight)

**Unchanged:**
- 0-1 days: 10 points
- 1-3 days: 7.5 points
- 3-7 days: 5 points
- 7-14 days: 2.5 points
- 14+ days: 0 points

**Max:** 10 points × 0.15 = **1.5 points** toward final score

---

## Example Calculations

### Example 1: Perfect Match, NM-MT

**Listing:**
```
Title: "1998 Dirk Nowitzki Topps Chrome Refractor NM-MT"
Price: $150
Seller: 99.5% (2000 sales)
Photos: Yes
Age: 2 days
```

**Search:** "dirk nowitzki refractor"

**Scoring:**

1. **Search Relevance:**
   - Player: "dirk nowitzki" match (+3)
   - Card type: refractor (+4)
   - Year: 1998 present (+3)
   - Brand: Topps (+3)
   - Total: 10/10 × 0.40 = **4.0**

2. **Listing Quality:**
   - Condition: NM-MT ✅ (passes filter)
   - Has photos (+5)
   - NM-MT claimed (+1)
   - Total: 6/10 × 0.25 = **1.5**

3. **Seller Quality:**
   - 99.5%, 2000 sales = Elite
   - Total: 10/10 × 0.20 = **2.0**

4. **Listing Freshness:**
   - 2 days old
   - Total: 7.5/10 × 0.15 = **1.125**

**Final Score:** 4.0 + 1.5 + 2.0 + 1.125 = **8.625** → **8.6/10**
**Rating:** ⚡ GREAT DEAL

---

### Example 2: Wrong Player

**Listing:**
```
Title: "1998 Michael Jordan Topps Chrome Refractor NM-MT"
Price: $150
Seller: 99.5% (2000 sales)
Photos: Yes
Age: 2 days
```

**Search:** "dirk nowitzki refractor"

**Scoring:**

1. **Search Relevance:**
   - Player: WRONG PLAYER (-5) ⚠️
   - Card type: refractor (+4)
   - Year: 1998 (+3)
   - Brand: Topps (+3)
   - Total: 5/10 × 0.40 = **2.0** (capped at min)

2. **Listing Quality:** 1.5 (same as above)
3. **Seller Quality:** 2.0 (same)
4. **Freshness:** 1.125 (same)

**Final Score:** 2.0 + 1.5 + 2.0 + 1.125 = **6.625** → **6.6/10**
**Rating:** 👍 DECENT

**Impact:** Wrong player dropped score from 8.6 → 6.6 (2 full points)

---

### Example 3: Excellent Condition (AUTO-REJECT)

**Listing:**
```
Title: "1998 Dirk Nowitzki Topps Chrome Refractor EX"
Price: $80
Seller: 99.5% (2000 sales)
Photos: Yes
Age: 2 days
```

**Search:** "dirk nowitzki refractor"

**Result:**
- **Score: 0**
- **Rating: ❌ REJECTED - Condition below NM-MT**
- **Flag: ❌ CONDITION REJECTED: Below NM-MT minimum**

No scoring breakdown - auto-failed at condition check.

---

## Impact Analysis

### Before (old weights):
```
Wrong player with good seller/condition:
- Search: 5/10 × 0.25 = 1.25
- Quality: 6/10 × 0.30 = 1.8
- Seller: 10/10 × 0.30 = 3.0
- Fresh: 7.5/10 × 0.15 = 1.125
- Total: 7.2/10 (still "SOLID DEAL")
```

### After (new weights):
```
Wrong player with good seller/condition:
- Search: 5/10 × 0.40 = 2.0
- Quality: 6/10 × 0.25 = 1.5
- Seller: 10/10 × 0.20 = 2.0
- Fresh: 7.5/10 × 0.15 = 1.125
- Total: 6.6/10 (now "DECENT")
```

**Difference:** Wrong player listings drop from 7.2 → 6.6

---

## Testing Results

**Test 1: NM-MT card**
- Score: 8.3/10 ✅
- Rating: GREAT DEAL ✅
- Passed condition filter ✅

**Test 2: EX condition**
- Score: 0 ✅
- Rating: REJECTED ✅
- Auto-failed condition filter ✅

**Test 3: Crease damage**
- Score: 0 ✅
- Rating: REJECTED ✅
- Auto-failed condition filter ✅

---

## Files Changed

1. `deal-scorer-v2.js` - Updated weights + condition filter
2. All 24 scan scripts - Already using v2 (no changes needed)

---

## Summary

**What changed:**
- ✅ Search relevance now 40% (was 25%)
- ✅ Seller quality now 20% (was 30%)
- ✅ Listing quality now 25% (was 30%)
- ✅ Strict NM-MT+ filter (auto-reject anything below)

**Impact:**
- Getting the RIGHT card matters more than seller trust
- Wrong player drops score ~2 points (was ~1.5)
- No more low-grade cards slipping through
- Focus on quality inventory only

**Next scans will use these new settings.**
