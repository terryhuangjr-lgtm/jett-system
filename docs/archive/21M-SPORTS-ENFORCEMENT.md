# 21M Sports Content - Enforcement System

**Created:** 2026-02-04
**Reason:** Stop fabricated content from reaching Terry

---

## What Changed

### ❌ DISABLED (Dangerous)
- `automation/21m-sports-tweet-generator.js` → Renamed to `.DISABLED-FAKE-DATA`
- **Why:** This script generated random fake statistics using `Math.random()`. It was the root cause of fabricated content.

### ✅ NEW (Enforced)
1. **21m-sports-validator.js** - Pre-flight verification checker
2. **21m-sports-verified-generator.js** - Generator that REQUIRES verified sources
3. **Updated AGENTS.md** - Mandatory workflow that cannot be skipped

---

## The Problem (What Happened)

**Feb 2-4, 2026:** Jett provided fake sports content for 2 consecutive days:
- Made up statistics (random percentages)
- Fabricated scenarios (Yankees sale that never happened)
- Created "fun facts" without verification
- Used `Math.random()` to generate BTC amounts

**Root cause:** Rules existed but weren't enforced. Jett could skip verification steps.

---

## The Solution (How It's Fixed)

### 1. Validator Script (Enforces Checklist)
Location: `~/clawd/automation/21m-sports-validator.js`

**What it does:**
- ✅ Requires research sources (X posts, web URLs)
- ✅ Requires contract verification (Spotrac, etc.)
- ✅ Requires BTC price sources (CoinGecko, etc.)
- ✅ Validates URL formats
- ✅ Detects fabrication red flags (uncertainty words)
- ❌ **FAILS and blocks if any requirement is missing**

**Usage:**
```bash
node ~/clawd/automation/21m-sports-validator.js \
  --sources "url1,url2" \
  --spotrac "spotrac.com/player-contract" \
  --btc-price "coingecko.com/btc/historical" \
  --content "Your tweet text here"
```

**Exit codes:**
- `0` = All checks passed → Safe to proceed
- `1` = Verification failed → DO NOT GENERATE CONTENT

### 2. Verified Generator (No Random Data)
Location: `~/clawd/automation/21m-sports-verified-generator.js`

**What it does:**
- ✅ Requires ALL data as command-line arguments
- ✅ FAILS if any source URL is missing
- ✅ Generates templates from verified data only
- ✅ Automatically runs validator on generated content
- ❌ **CANNOT generate random/fake data - no Math.random() calls**

**Usage:**
```bash
node ~/clawd/automation/21m-sports-verified-generator.js \
  --contract-source "https://spotrac.com/nba/player" \
  --btc-price-source "https://coingecko.com/coins/btc" \
  --player "Player Name" \
  --amount "$300M" \
  --year "2024" \
  --btc-equivalent "3000 BTC"
```

**What it outputs:**
- 3 tweet variations (different angles)
- Source URLs for every claim
- Manual review notes where calculation needed

### 3. Updated AGENTS.md (Mandatory Workflow)
Location: `~/clawd/AGENTS.md` (lines 101-150)

**What changed:**
- Made verification workflow mandatory, not optional
- Added exact commands Jett must run
- Listed prohibited actions (can't skip steps)
- Added consequences (skip validation = fail directive)

---

## How to Use (For Jett)

### When Terry Requests 21M Sports Content:

**1. Research (10-15 minutes)**
```bash
# Search X for trending topics
bird search "NBA contract signing" --count 20
bird search "MLB free agency 2026" --count 20

# Verify with web search
# (Use your web_search tool to find and verify facts)
```

**2. Validate (2 minutes)**
```bash
node ~/clawd/automation/21m-sports-validator.js \
  --sources "url1,url2,url3" \
  --spotrac "spotrac.com/..." \
  --btc-price "coingecko.com/..." \
  --content "your tweet draft"

# If exit code = 1 → FIX THE ISSUES
# If exit code = 0 → Proceed to step 3
```

**3. Generate (2 minutes)**
```bash
node ~/clawd/automation/21m-sports-verified-generator.js \
  --contract-source "https://..." \
  --btc-price-source "https://..." \
  --player "Name" \
  --amount "$XXM" \
  --year "YYYY" \
  --btc-equivalent "XXX BTC"
```

**4. Present to Terry**
```
Here are 3 verified tweet options for 21M Sports:

OPTION 1: [tweet text]
SOURCES:
  - Contract: [URL]
  - BTC Price: [URL]

OPTION 2: [tweet text]
SOURCES:
  - Contract: [URL]
  - BTC Price: [URL]

OPTION 3: [tweet text]
SOURCES:
  - Contract: [URL]
  - BTC Price: [URL]

✅ All facts verified via sources above
✅ Passed pre-flight validation checks
```

---

## What This Prevents

### Before (Broken):
1. Jett gets request
2. Jett "thinks of cool angle"
3. Jett uses `Math.random()` to fill in numbers
4. Jett sends fake content to Terry
5. Terry catches the lies (trust damaged)

### After (Fixed):
1. Jett gets request
2. Jett runs research (X + web search)
3. Jett runs validator → **BLOCKS if unverified**
4. Jett generates from verified data only
5. Jett presents with sources
6. Terry reviews and approves

---

## Red Flags (Auto-Detected)

The validator warns about:
- Uncertainty words: "probably", "likely", "roughly", "approximately"
- Hypotheticals: "could've", "would've", "imagine if"
- Unverified percentages: "78% of NFL players..." (without source)

If warned → Double-check your source. Make sure it's documented.

---

## Verification Log

All validation attempts are logged to:
`~/clawd/memory/verification-log.jsonl`

Format:
```json
{"timestamp":"2026-02-04T10:30:00Z","passed":true,"args":["--sources","..."]}
{"timestamp":"2026-02-04T11:00:00Z","passed":false,"args":["--content","..."]}
```

Use this to:
- Track compliance
- Debug failed validations
- Audit content generation history

---

## Testing the System

**Test 1: Try to skip sources (should fail)**
```bash
node ~/clawd/automation/21m-sports-validator.js \
  --content "Some tweet without sources"

# Expected: Exit code 1, error about missing sources
```

**Test 2: Try to use old generator (should fail)**
```bash
node ~/clawd/automation/21m-sports-tweet-generator.js

# Expected: File not found (renamed to .DISABLED-FAKE-DATA)
```

**Test 3: Verify with all sources (should pass)**
```bash
node ~/clawd/automation/21m-sports-validator.js \
  --sources "https://espn.com/article" \
  --spotrac "https://spotrac.com/nba/player" \
  --btc-price "https://coingecko.com/coins/bitcoin" \
  --content "Verified tweet with sources"

# Expected: Exit code 0, all checks passed
```

---

## Summary

**The enforcement system makes it IMPOSSIBLE to generate unverified content.**

- Old generator (fake data machine) → Disabled
- New generator → Requires verified sources or fails
- Validator → Blocks content without sources
- AGENTS.md → Makes workflow mandatory

**Result:** Jett can't send fake content even if he tries. The system blocks it.

---

## Updates

**2026-02-04:** Initial enforcement system created
- Disabled fake tweet generator
- Created validator + verified generator
- Updated AGENTS.md with mandatory workflow
- Added this documentation

---

**Questions?** Read the original rules:
- `21M-SPORTS-RULES.md` - The "why" and examples
- `21M-SPORTS-CHECKLIST.md` - Step-by-step process
- `JETT-ACCURACY-RULES.md` - General accuracy standards
