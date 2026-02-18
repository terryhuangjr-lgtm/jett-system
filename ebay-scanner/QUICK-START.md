# eBay Scanner - Quick Start

## Default Search Method: Multi-Search

**Always use multi-search for best results.**

### Quick Command

```bash
./search.sh "player refractors, autos, numbered"
```

This wrapper automatically uses multi-search (the smart way).

---

## Examples

### Single Player, Multiple Types
```bash
./search.sh "juan soto refractors, autos, numbered"
```

**What happens:**
1. Splits into 3 searches: refractors, autos, numbered
2. Runs each search optimally
3. Combines all results
4. Removes duplicates
5. Scores everything
6. Shows top 20 (score 7.0+)

### Specific Year + Player
```bash
./search.sh "2003 dwyane wade refractors, autos, numbered"
```

### Vintage Search
```bash
./search.sh "1997 michael jordan refractors, numbered cards"
```

### Set-Specific
```bash
./search.sh "topps chrome dirk nowitzki refractors, autos"
```

---

## Direct Command (without wrapper)

```bash
node multi-search.js "player refractors, autos, numbered"
```

---

## Current Rules (Permanent)

### Price
- **Minimum:** $0 (catch early auctions)
- **Maximum:** None (find gems at any price)

### Filters
- ✅ Refractors, box toppers, pack fresh allowed
- ❌ Lots, reprints, sealed products blocked
- ✅ All conditions (New, Used, Unspecified)

### Scoring
- Show: 7.0+ only (Solid Deal or better)
- Top: 20 results max
- Weights: 30% Seller, 30% Listing, 25% Relevance, 15% Freshness

---

## Output

You'll see:
1. **Query parsing** - How it split your search
2. **Search results** - Items found per variant
3. **Top 20 scored** - Best opportunities only
4. **Score breakdown** - Why each scored high/low

---

## For Task Manager / Automation

Schedule daily searches:
```bash
node cli.js add "Daily Soto Scan" \
  "cd /home/clawd/clawd/ebay-scanner && node multi-search.js 'juan soto refractors, autos, numbered' --output daily-soto.json" \
  --schedule "daily at 02:00"
```

---

**Default:** Always use multi-search
**Wrapper:** `./search.sh` for convenience
**Documentation:** See `SEARCH-RULES.md` for details
