# Enhanced Filters Guide

## Overview

Two powerful new filters to catch damaged cards and avoid bad deals:

### 1. Title/Description Analysis
**Catches hidden damage and seller red flags**

### 2. Outlier Detection
**Identifies suspiciously priced listings using statistical analysis**

---

## 1. Title/Description Analysis

### Red Flag Keywords (Suggest Damage)

#### As-Is / No Guarantees
```
❌ "as-is", "as is", "sold as shown", "see photos"
```
**Why:** Seller avoiding liability = hidden issues

#### No Returns
```
❌ "no returns", "final sale", "no refunds", "all sales final"
```
**Why:** Seller doesn't want it back = knows it's damaged

#### Hidden Flaws
```
❌ "raw", "ungraded", "OBO", "or best offer", "make offer"
```
**Why:** Ungraded can hide flaws, OBO = desperation to sell

#### Condition Issues
```
❌ "slight wear", "minor wear", "edge wear", "corner wear"
❌ "minor damage", "not perfect", "not mint"
❌ "may have", "might have", "could have"
```
**Why:** Any mention of wear = damaged goods

#### Vague Language
```
❌ "untested", "as found", "estate sale"
❌ "unknown condition", "vintage condition"
```
**Why:** Evasive language = hiding something

#### Direct Damage
```
❌ "crease", "bent", "scratch", "scuff", "stain"
❌ "tear", "torn", "rip", "fade", "discolor"
```
**Why:** Explicitly damaged = instant reject

### Good Signals (Indicate Quality)

#### Pack Fresh
```
✅ "pack fresh", "pack pulled", "straight to sleeve"
✅ "never played", "pack to sleeve", "freshly pulled"
```
**Why:** Fresh from pack = likely mint

#### Investment Grade
```
✅ "investment grade", "gem mint", "pristine"
✅ "flawless", "perfect centering", "perfect corners"
✅ "gradeable", "PSA ready", "BGS ready"
```
**Why:** Seller confident in quality

#### Professional Handling
```
✅ "professionally sleeved", "top loader", "penny sleeve"
✅ "smoke free", "pet free", "climate controlled"
```
**Why:** Careful storage = preserved condition

#### Grading Mentioned
```
✅ "PSA 10", "PSA 9", "BGS 9.5", "BGS 10"
✅ "CGC", "SGC", "graded", "gem mt"
```
**Why:** Grading info = transparency

### Scoring System

| Score | Verdict | Action |
|-------|---------|--------|
| ≤ -3  | Poor quality signals | ❌ REJECT |
| -1 to -3 | Concerning language | ❌ REJECT |
| 0     | Neutral | ✅ PASS (with caution) |
| > 0   | Positive indicators | ✅ PASS |
| > 2   | Strong quality signals | ✅✅ STRONG PASS |

### Critical Auto-Reject

**Any of these = instant rejection:**
- Damage keywords ("crease", "bent", "tear", etc.)
- "As-is" language
- 3+ red flags combined

---

## 2. Outlier Detection

### Principle

> **If EVERY other listing is $500 and this one is $200, it's damaged. Period.**

Uses statistical analysis to compare listing price vs recent market sales.

### Price Bands

#### 🚫 TOO CHEAP (< 40% of market)
```
Market: $300
Listing: $80 (26% of market)
Verdict: REJECT - Likely damaged or fake
```
**Why:** Too cheap = something's wrong

#### ⚡ SWEET SPOT (40-80% of market)
```
Market: $300
Listing: $180 (60% of market)
Verdict: PASS - Perfect pricing!
```
**Perfect zone: 50-70% of market**

#### 🚫 TOO EXPENSIVE (> 80% of market)
```
Market: $300
Listing: $270 (90% of market)
Verdict: REJECT - Not enough margin
```
**Why:** Leaves no room for profit after grading

### Statistical Analysis

For each listing:
1. Gather recent sold comps (PSA 10/9 prices)
2. Calculate market mean, median, std deviation
3. Compare listing price to market
4. Flag extreme outliers (< 40% or > 80%)

### Example Output

```
📊 OUTLIER ANALYSIS:
   Market Mean: $306
   Market Median: $305
   % of Market: 59%
   Verdict: 🎯 SWEET SPOT (perfect pricing!)
   Status: ✅ PASS
```

---

## Integration Example

### Basic Usage

```javascript
const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');

// Initialize
const titleAnalyzer = new TitleAnalyzer();
const outlierDetector = new OutlierDetector();

// Analyze a listing
const titleAnalysis = titleAnalyzer.analyze(item.title, item.description);
const outlierAnalysis = outlierDetector.analyzeItem(item, item.comps);

// Combined verdict
const passed = titleAnalysis.passed && outlierAnalysis.passed;

if (!passed) {
  console.log('REJECTED:', titleAnalysis.verdict.reason, outlierAnalysis.reason);
}
```

### Filter Array of Items

```javascript
// Filter by title analysis
const titleFiltered = titleAnalyzer.filterItems(items);

// Filter by outlier detection
const finalFiltered = outlierDetector.filterItems(titleFiltered);
```

### Get Statistics

```javascript
// Title analysis stats
const titleStats = titleAnalyzer.getStats(items);
console.log(`Red Flags Found: ${titleStats.redFlags.total}`);
console.log(`Good Signals: ${titleStats.goodSignals.total}`);

// Outlier stats
const outlierStats = outlierDetector.getStats(items);
console.log(`Extreme Outliers: ${outlierStats.extremeOutliers}`);
console.log(`Normal Pricing: ${outlierStats.normal}`);
```

---

## Real-World Example

### Listing #1: PASS ✅

```
Title: "1997 Skybox Metal Universe MJ #23 - Pack Fresh Investment Grade"
Description: "Straight to sleeve. Perfect centering. PSA ready."
Price: $150
Market: $306

Title Analysis:
  ✅ Good signals: "pack fresh", "investment grade"
  Score: +4 (Strong quality signals)

Outlier Analysis:
  ✅ 49% of market (sweet spot: 40-80%)

VERDICT: ✅ PASS - Excellent opportunity!
```

### Listing #2: REJECT ❌

```
Title: "1997 Skybox Metal Universe MJ #23 - AS-IS"
Description: "See photos. Sold as shown. No returns."
Price: $80
Market: $306

Title Analysis:
  ❌ Critical red flags: "as-is", "no returns"
  Score: -4 (Critical)

Outlier Analysis:
  ❌ 26% of market (< 40% = suspicious)

VERDICT: ❌ REJECT - Multiple red flags + extreme outlier
```

### Listing #3: REJECT ❌

```
Title: "1997 Skybox Metal Universe MJ #23"
Description: "Edge wear. Corner damage. Slight crease."
Price: $50
Market: $306

Title Analysis:
  ❌ Critical damage: "crease"
  ❌ Red flags: "edge wear", "corner damage"
  Score: -4 (Critical)

Outlier Analysis:
  ❌ 16% of market (< 40% = extreme outlier)

VERDICT: ❌ REJECT - Damaged + suspiciously cheap
```

---

## Testing

Run the test suite:

```bash
cd /home/clawd/clawd/ebay-scanner
node test-enhanced-filters.js
```

Expected output:
- Detailed analysis of 6 test listings
- Summary statistics
- Combined filtering results
- Pass/fail breakdown

---

## Adding to Existing Scanners

### Option 1: Add to gem-finder.js

```javascript
const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');

class GemFinder {
  constructor() {
    // ... existing code ...
    this.titleAnalyzer = new TitleAnalyzer();
    this.outlierDetector = new OutlierDetector();
  }

  async analyze(item) {
    // ... existing analysis ...

    // Add title analysis
    const titleAnalysis = this.titleAnalyzer.analyze(item.title, item.description);
    if (!titleAnalysis.passed) {
      return null; // Reject
    }

    // Add outlier detection (after getting comps)
    const outlierAnalysis = this.outlierDetector.analyzeItem(item, comps);
    if (!outlierAnalysis.passed) {
      return null; // Reject
    }

    // Continue with normal analysis...
  }
}
```

### Option 2: Add to scan-and-notify.js

```javascript
const TitleAnalyzer = require('./title-analyzer');
const OutlierDetector = require('./outlier-detector');

const titleAnalyzer = new TitleAnalyzer();
const outlierDetector = new OutlierDetector();

// Filter results before notifying
const filteredResults = results
  .filter(item => {
    const titleAnalysis = titleAnalyzer.analyze(item.title, item.description);
    return titleAnalysis.passed;
  })
  .filter(item => {
    const outlierAnalysis = outlierDetector.analyzeItem(item, item.comps);
    return outlierAnalysis.passed;
  });

// Send only filtered results to Slack
await notifySlack(filteredResults);
```

---

## Configuration

### Adjust Red Flag Sensitivity

Edit `/ebay-scanner/title-analyzer.js`:

```javascript
this.weights = {
  asIs: -2,           // More negative = stricter
  damage: -3,         // Critical = instant reject
  packFresh: +2,      // Higher = more weight
  investment: +2
};
```

### Adjust Outlier Thresholds

Edit `/ebay-scanner/outlier-detector.js`:

```javascript
// Current: 40-80% of market is acceptable
// To be more strict: 45-75%
// To be more lenient: 35-85%

if (percentOfMean < 40) {  // Change this
  return { passed: false, reason: 'Too cheap' };
}
```

---

## Summary

### Title Analysis
- ✅ Detects damage keywords
- ✅ Flags seller red flags
- ✅ Rewards quality signals
- ✅ Auto-rejects critical issues

### Outlier Detection
- ✅ Uses statistical analysis
- ✅ Compares to recent market sales
- ✅ Identifies suspiciously cheap listings
- ✅ Filters overpriced items

### Combined Power
- ✅ Catches damaged cards (title analysis)
- ✅ Catches fake deals (outlier detection)
- ✅ Identifies true opportunities (passes both)
- ✅ Reduces false positives

**Result: Only see legitimate deals, not damaged cards or scams.**
