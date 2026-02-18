# Deal Scoring System - Complete Breakdown

## Two Scoring Systems Available

### System 1: Deal Scorer V2 (Current Default)
**File:** `deal-scorer-v2.js`
**Philosophy:** Multi-factor weighted scoring with emphasis on seller quality and listing signals

### System 2: Deal Scorer (Original)
**File:** `deal-scorer.js`
**Philosophy:** Profit-focused with card feature bonuses and price band filtering

---

## Deal Scorer V2 (Recommended)

### Overall Weights
```
Price Analysis:      25%
Seller Quality:      25%
Listing Quality:     30%
Listing Freshness:   10%
Comparability:       10%
─────────────────────────
TOTAL:              100%
```

---

### 1. Price Analysis (25% Weight)

**What it measures:** Discount from median sold price

**Scoring:**
```
50%+ below median  → 10 pts  "STEAL"
30-50% below       → 7.5 pts "GREAT DEAL"
20-30% below       → 5 pts   "SOLID DEAL"
10-20% below       → 2.5 pts "DECENT"
0-10% below        → 0 pts   "At market"
Above market       → 0 pts   "Overpriced"
```

**Max Points:** 10
**Weight:** 25% of total score

**Example:**
- Median PSA 10: $200
- Current listing: $100
- Discount: 50%
- Points: 10 × 0.25 = **2.5 points** toward final score

---

### 2. Seller Quality (25% Weight)

**What it measures:** Seller trustworthiness

**Scoring:**
```
99%+ feedback, 1000+ sales   → 10 pts   "Elite seller ✅ TRUSTED"
98%+ feedback, 500+ sales    → 7.5 pts  "Established ✅ Good"
95%+ feedback, 100+ sales    → 5 pts    "Decent seller - OK"
90%+ OR <100 sales           → 2.5 pts  "New seller ⚠️"
<90% feedback                → 0 pts    "Low trust ⚠️"
```

**Max Points:** 10
**Weight:** 25% of total score

**Example:**
- Seller: 99.5% feedback, 2500 sales
- Points: 10 × 0.25 = **2.5 points** toward final score

---

### 3. Listing Quality (30% Weight)

**What it measures:** Title/description signals

**Scoring (additive/subtractive):**

**Positive signals:**
```
Has photos                    → +5 pts
"Pack fresh" / "Investment"   → +2.5 pts
"Mint" / "Gem"                → +1 pt
```

**Red flags:**
```
"As-is"                       → -2.5 pts
"Damaged" / "Crease" / "Tear" → -5 pts
"See photos"                  → -1 pt
```

**Max Points:** 10 (clamped to 0-10)
**Weight:** 30% of total score

**Example:**
- Has photos (+5)
- "Pack fresh" (+2.5)
- "Mint" (+1)
- Total: 8.5 × 0.30 = **2.55 points** toward final score

---

### 4. Listing Freshness (10% Weight)

**What it measures:** How recently listed

**Scoring:**
```
<24 hours old     → 10 pts   "FRESH"
1-7 days old      → 5 pts    "This week"
8-30 days old     → 2.5 pts  "This month"
30+ days old      → 0 pts    "Old - why still here?"
```

**Max Points:** 10
**Weight:** 10% of total score

**Example:**
- Listed 2 days ago
- Points: 5 × 0.10 = **0.5 points** toward final score

---

### 5. Comparability (10% Weight)

**What it measures:** Confidence in comp data

**Scoring:**
```
10+ comps found   → 10 pts   "High confidence"
5-9 comps found   → 5 pts    "Medium confidence"
<5 comps found    → 0 pts    "Low confidence"
```

**Max Points:** 10
**Weight:** 10% of total score

**Example:**
- 12 comps found
- Points: 10 × 0.10 = **1.0 points** toward final score

---

### Final Score Calculation

**Formula:**
```
Final Score = 
  (Price × 0.25) +
  (Seller × 0.25) +
  (Quality × 0.30) +
  (Freshness × 0.10) +
  (Comps × 0.10)
```

**Scale:** 0-10

**Ratings:**
```
9.0-10.0  →  🔥 POTENTIAL STEAL
8.0-8.9   →  ⚡ GREAT DEAL
7.0-7.9   →  💰 SOLID DEAL
6.0-6.9   →  ✓ DECENT
5.0-5.9   →  ~ MAYBE
4.0-4.9   →  ⚠️ QUESTIONABLE
0-3.9     →  ❌ SKIP
```

---

### Example Calculation

**Card:** Aaron Judge Rookie Refractor

**Price Analysis:**
- Median PSA 10: $300
- Listing price: $150
- Discount: 50%
- **Points: 10** × 0.25 = **2.50**

**Seller Quality:**
- 99.8% feedback, 3200 sales
- **Points: 10** × 0.25 = **2.50**

**Listing Quality:**
- Has photos (+5)
- "Pack fresh" (+2.5)
- "PSA ready" (+1)
- **Points: 8.5** × 0.30 = **2.55**

**Listing Freshness:**
- Listed 1 day ago
- **Points: 5** × 0.10 = **0.50**

**Comparability:**
- 15 comps found
- **Points: 10** × 0.10 = **1.00**

**TOTAL SCORE:** 2.50 + 2.50 + 2.55 + 0.50 + 1.00 = **9.05**
**RATING:** 🔥 POTENTIAL STEAL

---

## Deal Scorer (Original) - Alternative System

### Philosophy
Focus on profit potential with price band filtering

### Price Band Filter (CRITICAL)
```
< 40% of market value  →  REJECT (too cheap = damaged/fake)
40-50% of market       →  +1 pt  "Good price"
50-65% of market       →  +2 pts "Perfect sweet spot 🎯"
65-70% of market       →  +1 pt  "Good price"
> 70% of market        →  -2 pts "Too expensive"
```

### Scoring Factors

**1. Expected Value (EV)**
```
EV > $300   →  +3 pts   🔥
EV > $200   →  +2.5 pts 🔥
EV > $100   →  +2 pts   ⚡
EV > $50    →  +1 pt    💰
EV > $0     →  +0.5 pts ✓
EV < $0     →  -1 pt    ⚠️
```

**2. ROI Percentage**
```
ROI > 200%  →  +1.5 pts 📈
ROI > 100%  →  +1 pt    📈
ROI > 50%   →  +0.5 pts 📈
```

**3. Serial Numbering**
```
/10 or less   →  +2 pts   🎯
/11-50        →  +1.5 pts 🎯
/51-100       →  +1 pt    🎯
/101-500      →  +0.5 pts 🎯
```

**4. Hot Inserts**
```
"Downtown", "Kaboom", "Manga", "Prizm", "Case Hit"
Any match  →  +1 pt  🌟
```

**5. Star Players**
```
MJ, LeBron, Kobe, Luka, Wemby, Skenes, Judge, Ohtani, Mahomes, Brady
Any match  →  +0.5 pts  ⭐
```

**6. On-Card Auto**
```
"On card auto" / "On-card auto"
Match  →  +1 pt  ✍️
```

**7. Rookie Card**
```
"Rookie" / " RC "
Match  →  +0.5 pts  🆕
```

**8. Low Price Entry**
```
< $30   →  +0.5 pts  💵
< $50   →  +0.25 pts 💵
```

**9. Seller Feedback**
```
> 99%   →  +1 pt   ✅
> 95%   →  +0.5 pt ✅
< 95%   →  -1 pt   ⚠️
```

**10. Returns Accepted**
```
Yes  →  +0.5 pts  🔄
No   →  -0.5 pts  ⚠️
```

**11. Freshness**
```
< 7 days   →  +1 pt   ⚡
< 30 days  →  +0.5 pt ✓
> 30 days  →  -0.5 pt ⚠️
```

---

## Which System to Use?

### Use Deal Scorer V2 When:
- You want balanced multi-factor evaluation
- Seller quality matters (safety > profit)
- Listing signals important (title/description)
- You trust the comp data

### Use Deal Scorer (Original) When:
- Profit/ROI is primary concern
- You want price band filtering (rejects suspiciously cheap)
- Card features matter (serial #s, star players, inserts)
- You're hunting specific card types

---

## Current Default

**Active System:** Deal Scorer V2
**File:** `deal-scorer-v2.js`
**Used by:** `smart-scanner-with-filters.js`

To switch systems, edit the import in your scanner file:
```javascript
// Current (V2)
const DealScorer = require('./deal-scorer-v2');

// Switch to original
const DealScorer = require('./deal-scorer');
```

---

**Updated:** 2026-02-02
**Note:** Both systems score 1-10 scale, compatible with all scanners
