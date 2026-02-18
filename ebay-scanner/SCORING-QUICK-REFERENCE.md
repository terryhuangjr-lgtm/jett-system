# Deal Scoring - Quick Reference Card

## Current System: Deal Scorer V2

### Weight Distribution (Pie Chart)
```
┌─────────────────────────────────────┐
│  LISTING QUALITY        30%  🎨     │
│  PRICE ANALYSIS         25%  💰     │
│  SELLER QUALITY         25%  ✅     │
│  LISTING FRESHNESS      10%  ⚡     │
│  COMPARABILITY          10%  📊     │
└─────────────────────────────────────┘
```

---

## Score Breakdown (100 Point Scale → 10 Point Final)

### 1. Price Analysis (25 points max)
```
Discount from Market:
  50%+ off  ▓▓▓▓▓▓▓▓▓▓ 10 pts  STEAL
  30-50%    ▓▓▓▓▓▓▓░░░ 7.5 pts GREAT
  20-30%    ▓▓▓▓▓░░░░░ 5 pts   SOLID
  10-20%    ▓▓░░░░░░░░ 2.5 pts DECENT
  0-10%     ░░░░░░░░░░ 0 pts   MARKET
  Above     ░░░░░░░░░░ 0 pts   PASS
```

### 2. Seller Quality (25 points max)
```
Feedback + Sales:
  99%+ / 1K+   ▓▓▓▓▓▓▓▓▓▓ 10 pts   ELITE ✅
  98%+ / 500+  ▓▓▓▓▓▓▓░░░ 7.5 pts  GOOD ✅
  95%+ / 100+  ▓▓▓▓▓░░░░░ 5 pts    OK
  90%+ / <100  ▓▓░░░░░░░░ 2.5 pts  NEW ⚠️
  <90%         ░░░░░░░░░░ 0 pts    RISKY ⚠️
```

### 3. Listing Quality (30 points max)
```
Positive Signals:          Negative Signals:
  ✅ Has photos      +5      ❌ "As-is"      -2.5
  ✅ Pack fresh     +2.5     ❌ Damaged      -5
  ✅ Mint/Gem       +1       ❌ See photos   -1
```

### 4. Listing Freshness (10 points max)
```
Age:
  <24 hrs   ▓▓▓▓▓▓▓▓▓▓ 10 pts   FRESH ⚡
  1-7 days  ▓▓▓▓▓░░░░░ 5 pts    RECENT
  8-30 days ▓▓░░░░░░░░ 2.5 pts  OK
  30+ days  ░░░░░░░░░░ 0 pts    OLD ⚠️
```

### 5. Comparability (10 points max)
```
Comp Count:
  10+ comps  ▓▓▓▓▓▓▓▓▓▓ 10 pts  HIGH 📊
  5-9 comps  ▓▓▓▓▓░░░░░ 5 pts   MED 📊
  <5 comps   ░░░░░░░░░░ 0 pts   LOW ⚠️
```

---

## Final Score Scale (1-10)

```
10.0  ███████████████████████████  🔥 POTENTIAL STEAL
 9.0  ████████████████████████░░   🔥 POTENTIAL STEAL
 8.0  ████████████████████░░░░░░   ⚡ GREAT DEAL
 7.0  ███████████████░░░░░░░░░░░   💰 SOLID DEAL
 6.0  ████████████░░░░░░░░░░░░░░   ✓ DECENT
 5.0  █████████░░░░░░░░░░░░░░░░░   ~ MAYBE
 4.0  ██████░░░░░░░░░░░░░░░░░░░░   ⚠️ QUESTIONABLE
 3.0  ███░░░░░░░░░░░░░░░░░░░░░░░   ❌ SKIP
 2.0  ░░░░░░░░░░░░░░░░░░░░░░░░░░   ❌ SKIP
 1.0  ░░░░░░░░░░░░░░░░░░░░░░░░░░   ❌ SKIP
```

---

## Example Scenarios

### 🔥 Perfect Score (9.0+)
```
✅ 50%+ off market          (2.5 pts)
✅ Elite seller (99%+)      (2.5 pts)
✅ Pack fresh + photos      (2.55 pts)
✅ Listed <24h              (1.0 pts)
✅ 10+ comps                (1.0 pts)
─────────────────────────────────────
   TOTAL:                   9.55/10  🔥
```

### ⚡ Great Deal (8.0)
```
✅ 30% off market           (1.875 pts)
✅ Good seller (98%+)       (1.875 pts)
✅ Mint + photos            (1.8 pts)
✅ Listed 3 days ago        (0.5 pts)
✅ 8 comps found            (0.5 pts)
─────────────────────────────────────
   TOTAL:                   8.0/10   ⚡
```

### ⚠️ Pass (4.0)
```
❌ At market price          (0 pts)
✓ OK seller (95%+)          (1.25 pts)
❌ "As-is" listing          (0.75 pts)
✓ Listed this week          (0.5 pts)
❌ Only 3 comps             (0 pts)
─────────────────────────────────────
   TOTAL:                   4.0/10   ⚠️
```

---

## Common Flags

### ✅ Buy Signals
- Trusted seller + great price = HIGH CONFIDENCE
- Pack fresh + photos = QUALITY ASSURED
- Fresh listing + good discount = ACT FAST

### ⚠️ Caution Flags
- New seller + low price = VERIFY CAREFULLY
- Old listing + good price = WHY STILL HERE?
- "As-is" / "See photos" = CONDITION UNKNOWN
- <5 comps = RESEARCH NEEDED

### ❌ Red Flags
- "Damaged" / "Crease" / "Tear" = REJECT
- <90% seller feedback = HIGH RISK
- Above market price = NO MARGIN
- 30+ days old = STALE LISTING

---

## Minimum Thresholds

**Recommended filters:**
```
Minimum score:     5.0  (only show "MAYBE" or better)
Ideal score:       7.0+ (focus on "SOLID" or better)
Auto-buy trigger:  9.0+ (potential steals with elite sellers)
```

**Adjust based on:**
- Risk tolerance (lower = more cautious)
- Time available (higher = fewer alerts)
- Market conditions (hot market = lower threshold)

---

**System:** Deal Scorer V2
**File:** `deal-scorer-v2.js`
**Created:** 2026-02-02
