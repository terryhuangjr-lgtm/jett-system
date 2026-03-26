# eBay Scanner System

**Dashboard:** http://localhost:3000 → eBay tab

---

## Quick Start

### Run a scan manually
```bash
cd /home/clawd/clawd/ebay-scanner
node run-from-config.js monday
```

### Run scan with vision analysis
```bash
node run-from-config.js monday --vision
```

---

## How It Works

1. **Scheduled scans** - Daily at 9 AM (see cron table)
2. **Config-driven** - `task-manager/ebay-scans-config.json`
3. **Vision filter** - Claude Haiku analyzes card images for condition
4. **Global toggles** - Listing type (BIN/Auction), Card type (Raw/Graded)
5. **Email delivery** - HTML formatted results to terryhuangjr@gmail.com

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ ebay-scans-     │────▶│ run-from-config  │────▶│   HTML Email     │
│ config.json     │     │ (filters + vision)│     │   @gmail.com    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │
        │                        ├─────▶ ebay-browse-api.js (eBay API)
        │                        ├─────▶ raw-card-filter.js (filters)
        │                        ├─────▶ vision-filter.js (Haiku)
        │                        └─────▶ multi-search.js (orchestrator)
        │
        ▼
┌──────────────────┐
│ Mission Control  │
│ (:3000/ebay)     │
│ - Run Scan Now   │
│ - Global Toggles│
└──────────────────┘
```

---

## Configuration

**Config file:** `task-manager/ebay-scans-config.json`

**Structure:**
```json
{
  "version": "1.2",
  "global_filters": {
    "exclude_item_types": ["psa", "bgs", "sgc", ...],
    "quality_rules": {
      "seller_feedback_min": 98,
      "listing_age_max_days": 25
    }
  },
  "scans": {
    "monday": {
      "name": "MJ Topps Finest 1994-1999",
      "enabled": true,
      "card_condition": "raw",     // "raw" or "graded"
      "listing_type": "bin",       // "bin" or "auction"
      "search_terms": ["topps finest michael jordan 1994-1999"],
      "filters": {
        "topN": 25,
        "minPrice": 10,
        "maxPrice": 75,
        "exclude_words": ["mystery", "refractor", ...]
      },
      "useVisionScout": true,
      "useVisionFilter": false
    },
    ...
  }
}
```

### Per-Scan Settings (v1.2+)
- **card_condition**: "raw", "graded", or "both" - controls scorer and exclusions
- **listing_type**: "bin" (Buy It Now), "auction", or "both" - filters eBay results
- **useVisionScout**: true/false - show AI Scout condition notes in email (default: true for Terry)
- **useVisionFilter**: true/false - remove bad cards from results (default: false)
- Each scan configured independently via Mission Control dashboard

---

## Features

### 1. AI Vision (Claude Haiku)

**Two Modes:**
- **AI Scout**: Always ON for Terry. Analyzes card images for condition, adds notes to email. Cost: ~$0.01/scan.
- **AI Filter**: OFF by default. Removes cards with obvious defects from results. Cost: ~$0.02/scan.

**Analyzes:**
- Corners (10=sharp, 5=rounded/worn, 1=badly damaged)
- Centering (10=60/40 or better, 5=70/30, 1=severely off-center)
- Confidence: high/medium/low

**Email Display:**
- [CLEAN]: Score 7+ - good condition
- [REVIEW]: Score 5.5-6.9 - borderline, worth a look
- [CAUTION]: Score <5.5 - visible issues, buyer beware

**Usage:**
```bash
# Scout only (default for Terry)
node run-from-config.js monday

# With Filter enabled (via dashboard toggle)
node run-from-config.js monday  # useVisionFilter: true in config
```

### 2. Raw vs Graded Modes

**cardMode: "raw"** (default)
- Scorer: deal-scorer-v2.js
- Vision: ON (analyzes corners + centering)
- Email columns: Title | Price | Score
- Excludes: PSA, BGS, SGC, graded, slab

**cardMode: "graded"**
- Scorer: deal-scorer-graded.js
- Vision: OFF (slabs can't be visually assessed)
- Email columns: Title | Grade | Price | Score
- No exclusions (shows all graded cards)

Set via `cardMode` in config or dashboard toggle.

### 3. Deal Scoring (Raw Mode - deal-scorer-v2.js)

**Weights:**
- Seller Quality: 35% (feedback % + sales count curve)
- Listing Quality: 30% (photos + premium condition signals + price vs median)
- Search Relevance: 25% (player/year/brand match)
- Listing Freshness: 10% (age of listing)

**Seller Quality Curve:**
- 99.8%+ & 10K+ sales: 10 pts (Elite)
- 99.5%+ & 2K+ sales: 8.5 pts (Very good)
- 99%+ & 500+ sales: 7.5 pts (Good)
- 98%+ & 100+ sales: 6 pts (Established)
- 95%+: 4 pts (Decent)
- 90%+: 2.5 pts (New)
- <90%: 1 pt (Low trust)

**Freshness Scoring:**
- Priority: itemCreationDate → itemEndDate → fallback
- Unknown age: 4 pts (slight penalty, was 5)
- <1 day: 10 pts | 1-3 days: 8 pts | 4-7 days: 6 pts | 8-14 days: 4 pts | 15-30 days: 2 pts | 30+ days: 0 pts

**Price Signal:**
- 20%+ below median: +3 pts ("Well below median")
- 10-20% below median: +1.5 pts ("Below median price")
- 20%+ above median: -1 pt ("Above median price")

**Auto-Reject Rules:**
- Condition below NM-MT: score 0
- Relevance < 4 points: score 0 (likely wrong card)

**Premium Signals (listing quality):**
- Pack fresh: +2.5 | Investment grade: +2 | Gem mint: +2 | Perfect grade: +2
- Mint condition: +1 | NM-MT: +1 | Well centered: +1 | Clean: +0.5

### 4. Deal Scoring (Graded Mode - deal-scorer-graded.js)

**Weights:**
- Search Relevance: 25% (user search handles player)
- Seller Quality: 25% (trust matters more for slabs)
- Grade Match: 35% (PSA 10/9/8 vs lower)
- Listing Freshness: 15%

**Grade Scoring:**
- PSA 10: 10 pts | PSA 9: 8 pts | PSA 8: 6 pts | PSA 7: 4 pts
- BGS 10: 10 pts | BGS 9.5: 9 pts | BGS 9: 7 pts

### 5. Run Scan Now Button
Located in Mission Control dashboard (eBay tab).
- Triggers immediate scan for selected day
- Uses current config settings
- Sends email on completion

### 4. Global Toggles
In Mission Control dashboard:
- **Listing Type**: Filter by BIN/Auction/Both
- **Card Type**: Filter by Raw/Graded/Both

Saved to config and applied to all scans.

---

## Scheduled Scans

| Day | Time | Target | Cron Command |
|-----|------|--------|--------------|
| Monday | 09:00 | MJ Finest 93-99 | `node run-from-config.js monday` |
| Tuesday | 09:00 | Griffey Jr Refractors | `node run-from-config.js tuesday` |
| Wednesday | 09:00 | Kobe Refractors | `node run-from-config.js wednesday` |
| Thursday | 09:00 | MJ Upper Deck 96-00 | `node run-from-config.js thursday` |
| Friday | 09:00 | Topps Refractors Multi | `node run-from-config.js friday` |
| Saturday | 09:00 | MJ Cards 94-99 | `node run-from-config.js saturday` |
| Sunday | 09:00 | 2025 Cam Ward | `node run-from-config.js sunday` |

**Note:** All cron jobs use deterministic node commands (no LLM). Results emailed to terryhuangjr@gmail.com.

---

## Key Files

```
/home/clawd/clawd/
├── ebay-scanner/
│   ├── run-from-config.js      # Main entry point
│   ├── multi-search.js         # Orchestrator
│   ├── ebay-browse-api.js      # eBay API client
│   ├── raw-card-filter.js      # Card filtering
│   ├── vision-filter.js        # Claude Haiku vision
│   └── results/                # Scan results (gitignored)
├── task-manager/
│   ├── server.js               # Dashboard API
│   └── ebay-scans-config.json  # Scan config
└── lib/
    └── send-email.js           # Email sending
```

---

## Troubleshooting

### No results
- Check eBay API key is valid (`~/.claude.json` or `.env`)
- Check search terms are correct
- Check network connectivity
- eBay Browse API has ~250 char URL limit - filters must be limited

### Filter not working
- Price filter requires `priceCurrency:USD` format
- "fan made" as two-word exclusion breaks eBay queries
- Case-sensitive condition matching in raw-card-filter.js

### Email not received
- Check run-from-config.js completed successfully
- Check Gmail delivery (spam folder)
- Verify `AGENTMAIL_API_KEY` or GWS credentials

### Vision analysis failing
- Check Claude API key is valid
- Image must be publicly accessible URL
- Haiku has rate limits

---

## Future Features (Customer UI)

### Deal Mode vs Browse Mode
- **Deal Mode (default)**: Only show items scoring >= 7.0
- **Browse Mode**: Show all items regardless of score (for customers who just want to see what's available)
- Could be a toggle per scan in the dashboard

### Per-Scan Customization
- Custom minScore threshold
- Toggle between deal-focused vs browse-focused searches

### Market Comps for Graded Cards
- Replace "Score" with "vs. Market" - compare listing to recent sold comps
- Fetch sold listings from eBay (completed listings API)
- If listing $200 and avg sold $300 = "33% below market" ✅
- If listing $400 and avg sold $300 = "33% above market" ❌
- This gives the "deal" scoring real market data to compare against

---

## API Keys Required

| Service | Location |
|---------|----------|
| eBay API | `~/.claude.json` (primaryApiKey) or `.env` |
| Claude (Vision) | `~/.claude.json` or `.env` |
| Gmail | GWS credentials (`~/.config/gws/`) |
