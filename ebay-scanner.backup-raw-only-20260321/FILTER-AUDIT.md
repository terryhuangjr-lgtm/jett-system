# Filter Audit - What's Being Eliminated?

## Current Problem
Filters are too aggressive. The AI scoring system should handle quality checks, so we can be MORE permissive and let more items through.

## Keyword Analysis

### 🚨 PROBLEMATIC FILTERS (Blocking Good Cards)

#### 1. Sealed Product Keywords
**Current blocklist:**
```javascript
'sealed', 'box', 'boxes', 'case', 'blaster',
'hobby box', 'retail box', 'jumbo box',
'pack', 'packs', 'cello', 'wax pack',
'hanger', 'mega box', 'value box',
'fat pack', 'blaster box'
```

**Issues:**
- ❌ "sealed" blocks "factory sealed single card" (legitimate!)
- ❌ "sealed" blocks "sealed in case" (protective measure)
- ❌ "box" blocks "box topper" cards (premium inserts!)
- ❌ "pack" blocks "pack fresh" (GOOD signal - freshly pulled!)

**Recommendation:**
- Keep: 'hobby box', 'retail box', 'jumbo box', 'blaster box', 'case', 'blaster', 'hanger', 'mega box'
- REMOVE: 'sealed', 'box', 'pack' (too broad)
- ADD context checks: "box topper" = OK, "hobby box" = blocked

#### 2. Non-Card Keywords
**Current blocklist:**
```javascript
'poster', 'photo', 'photograph', 'print',
'newspaper', 'magazine', 'book', 'guide',
'display', 'plaque', 'frame', 'framed',
'jersey', 'autograph ball', 'memorabilia card'
```

**Issues:**
- ❌ "photo" blocks "photo variation" cards (legitimate parallel!)
- ❌ "photo" blocks "photo match" (autograph/patch description)
- ⚠️ "memorabilia card" already has exception (inconsistent logic)

**Recommendation:**
- REMOVE: 'photo' (too broad - "photo variation" is a card type)
- Keep others (they're actually non-cards)

#### 3. Custom Keywords
**Current blocklist:**
```javascript
'custom', 'fan made', 'homemade', 'hand made',
'art card', 'aceo', 'ooak', 'one of a kind',
'fantasy', 'tribute', 'commemorative'
```

**Issues:**
- ❌ "commemorative" blocks official commemorative cards (legitimate!)
- ⚠️ "one of a kind" could be 1/1 plate or unique variation

**Recommendation:**
- REMOVE: 'commemorative' (too broad - many official sets)
- Keep: 'custom', 'fan made', 'homemade', 'hand made', 'art card', 'fantasy', 'tribute'
- Consider: 'one of a kind' (could be legit 1/1s)

#### 4. Title Analyzer Red Flags
**Current red flags:**
```javascript
hiddenFlaws: ['raw', 'ungraded', 'obo', 'or best offer', 'make offer', 'open to offers']
```

**Issues:**
- ❌ "raw" = ungraded card (MANY DEALS HERE! Raw gems!)
- ❌ "ungraded" = same issue
- ⚠️ "obo" / "make offer" = negotiable price (not necessarily bad!)

**Recommendation:**
- REMOVE from red flags: 'raw', 'ungraded' (scoring system should evaluate)
- DOWNGRADE: 'obo', 'or best offer', 'make offer' (minor flag, not rejection)

---

### ✅ GOOD FILTERS (Keep These)

#### Lot/Multi-Card (Keep)
```javascript
' lot', 'lot of', 'lots', 'card lot',
'near set', 'complete set', 'partial set', 'team set',
'bulk', 'collection', 'mixed', 'bundle'
```
**Verdict:** ✓ Good - we want singles only

#### Reprints (Keep)
```javascript
'reprint', 'reproduction', 'reprinted',
'copy', 'facsimile', 'bootleg',
'unlicensed', 'unauthorized'
```
**Verdict:** ✓ Good - no reprints

#### Stickers (Keep with exception)
```javascript
'sticker', 'stickers', 'decal', 'peel', 'tattoo'
// Exception: 'sticker auto' allowed
```
**Verdict:** ✓ Good - already has exception for "sticker auto"

#### Actual Damage (Keep)
```javascript
'crease', 'creased', 'bent', 'corner damage',
'scratch', 'scratched', 'tear', 'torn'
```
**Verdict:** ✓ Good - scoring system should catch this, but OK to filter

---

## Recommended Changes

### Priority 1: Remove These Immediately
1. "sealed" (blocks "factory sealed single")
2. "box" (blocks "box topper")
3. "pack" (blocks "pack fresh")
4. "photo" (blocks "photo variation")
5. "commemorative" (blocks official commemoratives)

### Priority 2: Adjust Title Analyzer
1. Remove "raw" and "ungraded" from red flags (deals!)
2. Downgrade "obo"/"make offer" from -1.5 to -0.5

### Priority 3: Add Context Logic
Instead of blanket bans, add context:
```javascript
// BAD
if (text.includes('box')) return false;

// GOOD
if (text.includes('hobby box') || text.includes('retail box')) return false;
if (text.includes('box topper')) return true; // Exception
```

---

## Testing Strategy

After fixes:
1. Search "Topps Chrome box topper" - should find box toppers
2. Search "photo variation" - should find photo variation parallels
3. Search "factory sealed single" - should find sealed singles
4. Search "pack fresh" - should find fresh pulls
5. Search "commemorative" - should find official commemoratives
6. Search "raw gem" - should find ungraded gems

---

## Impact Analysis

**Current pass rate:** ~10-15% (too strict)
**Target pass rate:** ~30-40% (let scoring do the work)

**Philosophy shift:**
- OLD: Filter aggressively, pass only perfect listings
- NEW: Filter obvious trash, let AI scoring evaluate quality

**Why this works:**
- Scoring system evaluates comps, seller quality, price outliers
- Better to see 100 opportunities and score them than miss 50 gems
- Can always adjust scoring thresholds, can't recover filtered items

---

**Created:** 2026-02-02
**Issue:** Filters too aggressive, blocking legitimate opportunities
**Solution:** Loosen keyword filters, rely on AI scoring for quality
