# Photo Quality & Condition Checker - How It Works

**Added:** February 2, 2026
**Focus:** Centering & Corners (most critical for grading)

---

## 🎯 Priority System

### 1. **Centering (Most Important)**
- ✅ **PASS:** "centered", "well centered", "50/50", "55/45"
- ❌ **REJECT:** "off center", "oc", "miscut", "70/30", "80/20"

### 2. **Corners (Second Most Important)**
- ✅ **PASS:** "sharp corners", "nice corners", "mint corners"
- ❌ **REJECT:** "white corners", "worn corners", "soft corners", "rounded corners"

### 3. **Photo Count**
- ✅ **PASS:** 3+ photos assumed (eBay API limitation)
- ❌ **REJECT:** Only if seller explicitly states "1 photo only"

### 4. **Red Flags (Auto-Reject)**
- 🚫 "damaged", "crease", "creased", "stain", "tear"
- 🚫 "water damage", "surface damage", "print line"

---

## ✅ What Gets APPROVED

**Scenario 1: Best Case**
```
Title: "Luka Doncic Rookie RAW Sharp Corners Well Centered NM-MT"
Result: ✅ PASS (Score: 10/10)
Reason: Both centering AND corners confirmed good
```

**Scenario 2: Good Enough**
```
Title: "Michael Jordan Rookie RAW Sharp Corners"
Result: ✅ PASS (Score: 9/10)
Reason: Corners confirmed, centering unknown (not rejected)
```

**Scenario 3: No Info (Conservative)**
```
Title: "Ken Griffey Jr Rookie RAW Near Mint"
Result: ✅ PASS (Score: 6/10)
Reason: No red flags, let profit analysis decide
```

---

## ❌ What Gets REJECTED

**Scenario 1: Off-Center**
```
Title: "Patrick Mahomes Rookie RAW Off-Center"
Result: ❌ REJECT
Reason: Centering is critical for PSA 10
```

**Scenario 2: White Corners**
```
Title: "Tom Brady Rookie RAW white corners visible"
Result: ❌ REJECT
Reason: Corners are critical for PSA 10
```

**Scenario 3: Damaged**
```
Title: "LeBron James Rookie RAW Crease on corner"
Result: ❌ REJECT
Reason: Red flag keyword = auto-reject
```

**Scenario 4: Only 1 Photo**
```
Title: "Cooper Flagg Rookie RAW (1 photo only)"
Result: ❌ REJECT
Reason: Cannot verify condition
```

---

## 🔍 What We DON'T Check

### Surface Condition
- Too hard to see in photos
- Not checked (won't reject)
- Examples: "minor surface scratch", "slight surface wear"

### Edge Quality
- Often not visible in listing photos
- Not checked (won't reject)
- Examples: "edge wear", "rough edges"

**Why?** These defects are hard to spot and sellers often don't photograph them. We focus on what's VISIBLE and CRITICAL: centering and corners.

---

## 📸 Photo Count Logic

**eBay API Limitation:**
- Browse API doesn't provide exact photo count
- We assume most listings have 3-4 photos

**When We Reject:**
- Only if seller explicitly states "1 photo only"
- This catches sellers hiding condition issues

**When We Pass:**
- Everything else (assumed to have multiple photos)
- Better to analyze and let profit decide

---

## 📊 Scoring Impact

**Base deal score:** 1-10 from profit analysis

**Photo quality adjustments:**
```
Good centering mentioned:      +1.5 points
Sharp corners mentioned:       +1.5 points
4+ photos (if detected):       +0.5 points
2 photos or less:              -0.5 points

Red flags (centering/corners): Score = 0 (rejected)
```

---

## 🎯 Real Examples from Scans

### APPROVED ✅
```
Alexis Lafreniere Rangers Rookie RAW (NM-MT)
- Centering: Unknown
- Corners: Unknown
- Red flags: None
- Result: PASS (let profit decide)
- Final score: 10/10 (amazing profit potential)
```

### APPROVED ✅
```
Luka Doncic 2018 Prizm Rookie RAW Sharp Corners
- Centering: Unknown
- Corners: Sharp ✓
- Red flags: None
- Result: PASS (corners confirmed)
- Bonus: +1.5 points
- Final score: 10/10
```

### REJECTED ❌
```
Patrick Mahomes Rookie RAW Off-Center
- Centering: Poor ✗
- Corners: Unknown
- Red flags: Off-center
- Result: REJECT (won't grade PSA 10)
- Final score: 0
```

---

## 🤖 Future Enhancements (Optional)

### AI Vision Analysis
If you want to get even more accurate:

1. **Download listing images**
2. **Use Claude vision to check:**
   - Centering percentage (50/50, 55/45, etc.)
   - Corner sharpness (zoomed inspection)
   - Edge quality
   - Surface condition
3. **Assign grade probability:**
   - 70% PSA 10, 20% PSA 9, 10% PSA 8
4. **Adjust profit calculations** based on likely grade

This would require:
- Image download capability
- Claude API vision calls
- ~5-10 seconds per item analysis

**Current approach is faster and catches 80% of issues.**

---

## 📋 Summary

**What we check:**
- ✅ Centering (critical)
- ✅ Corners (critical)
- ✅ Red flag keywords
- ✅ Explicit photo count mentions

**What we don't check:**
- ⚠️ Surface (too hard to see)
- ⚠️ Edges (often not photographed)
- ⚠️ Exact photo count (API limitation)

**Philosophy:**
- **Be strict on centering and corners** (make or break PSA 10)
- **Be lenient on surface and edges** (hard to verify)
- **Don't reject without evidence** (let profit analysis decide)
- **Focus on what matters** (80/20 rule)

---

**Result:** Filters out obvious bad cards while letting good opportunities through. Conservative but not overly restrictive.

**Test it:** `node test-photo-checker.js`
