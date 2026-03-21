# eBay Scanner Price Rules

## Current Settings (Permanent)

```javascript
minPrice = 0       // NO MINIMUM (catch early auctions starting at $0.99)
maxPrice = null    // NO CAP (find all raw cards regardless of price)
```

## Why These Rules

### No Minimum ($0)
- **Auctions start low** - Many start at $0.99 or $1.00
- **Early bird advantage** - Catch auctions before bidding wars
- **Filters handle junk** - Advanced filters + title analysis catch damaged/reprints
- **Scoring evaluates quality** - Bad listings score low regardless of price

### No Maximum
- Raw cards can be worth thousands
- Don't want to miss high-value gems
- Price is scored in relevance/quality, not hard-filtered
- Let the scoring system evaluate if it's worth it

## How It Works

**API sends:**
```
price:[0..]
```
This means: "Any price from $0 up, no upper limit"

**Catches auctions at:**
- $0.99 starting bid
- $1.00 starting bid  
- $3.50 early bid (before it heats up)

**Applied in:**
- ✅ `scored-search.js` - Single searches
- ✅ `multi-search.js` - Multi-variant searches
- ✅ `ebay-browse-api.js` - API client (handles null correctly)

## Examples

### Will Find:
- ✅ Auction at $0.99 (just started)
- ✅ Auction at $3.50 (early bid)
- ✅ $15 refractor BIN
- ✅ $85 numbered card
- ✅ $250 rookie auto
- ✅ $1,500 vintage gem
- ✅ $5,000 1/1 plate

### Filtered by Quality Checks (not price):
- ❌ Damaged card (title analyzer flags it)
- ❌ Reprint (advanced filter blocks it)
- ❌ Card lot (advanced filter blocks it)
- ❌ "As-is" listing (title analyzer penalizes it)

## Override in Specific Searches

If you want a cap for a specific search:

```bash
node scored-search.js "dirk refractor" --maxPrice 500
```

But **default is now unlimited** for all raw card scans.

---

**Updated:** 2026-02-02
**Status:** ✅ Implemented (Claude Code + Jett)
**Permanent rule:** $0 min (catch early auctions), no max
