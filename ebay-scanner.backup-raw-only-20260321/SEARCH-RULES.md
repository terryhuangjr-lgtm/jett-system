# eBay Scanner - Search Rules (Permanent)

## Rule 1: Use Multi-Search When Applicable

**Choose based on search intent:**

### Why Multi-Search?

**Problem with single search:**
```bash
# BAD: Searches for cards matching ALL keywords
node scored-search.js "wade refractors autos numbered"
# Result: Finds almost nothing (cards rarely match all 3)
```

**Multi-search solution:**
```bash
# GOOD: Splits into 3 optimized searches
node multi-search.js "wade refractors, autos, numbered"

# Runs:
# 1. "wade refractor"
# 2. "wade auto"
# 3. "wade /25 OR /50 OR /99"

# Then combines, dedupes, scores all results
```

### When to Use Each

✅ **Use multi-search when:**
- Searching for **multiple card types** ("refractors, autos, numbered")
- Searching for **multiple players** ("wade, soto, judge")
- Want **comprehensive results** (catch all variants)
- **Broad hunting** across a player/set

✅ **Use scored-search when:**
- **Very specific single query** ("2003 topps chrome wade refractor /500")
- **Narrow focus** - you know the exact card
- **Precise search** - specific year/set/variant
- **Testing/debugging** a specific search

**TL;DR:** Match the tool to your search intent - broad vs. specific

---

## Rule 2: Price Settings

```javascript
minPrice = 0       // Catch early auctions ($0.99 starts)
maxPrice = null    // No cap (find gems at any price)
```

See `PRICE-RULES.md` for details.

---

## Rule 3: Filter Settings

- ✅ Keep refined filters (refractors, box toppers, pack fresh allowed)
- ✅ Block lots, reprints, sealed products, customs
- ✅ No hardcoded condition filter (finds all conditions)

See `FILTER-REFINEMENT-COMPLETE.md` for details.

---

## Rule 4: Scoring Thresholds

```javascript
minScoreToShow = 7.0   // Only show SOLID DEAL or better
topN = 20              // Top 20 results max
```

**Score scale:**
- 9.0-10.0 → 🔥 POTENTIAL STEAL
- 8.0-8.9  → ⚡ GREAT DEAL
- 7.0-7.9  → 💰 SOLID DEAL
- < 7.0    → Filtered out

---

## Search Commands

**For broad searches (multiple types/players):**
```bash
node multi-search.js "player refractors, autos, numbered"
```

**For specific searches (single exact query):**
```bash
node scored-search.js "2003 topps chrome wade refractor"
```

**Examples:**
```bash
# Single player, multiple types
node multi-search.js "juan soto refractors, autos, numbered"

# Specific year range
node multi-search.js "2003 wade refractors, autos, numbered"

# Vintage broad search
node multi-search.js "1997 michael jordan refractors, numbered"

# Specific set
node multi-search.js "topps chrome dirk refractors, autos"
```

---

## Quick Reference

| Scenario | Use | Example |
|----------|-----|---------|
| Multiple card types | multi-search | "wade refractors, autos, numbered" |
| Single specific query | scored-search | "2003 topps chrome wade refractor /500" |
| Daily automation | multi-search | Task Manager scheduled search |
| Testing filters | scored-search | Quick single test |

---

**Updated:** 2026-02-02
**Default method:** multi-search.js
**Permanent rules:** $0 min, no max, multi-search preferred
