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
      "useVision": true
    },
    ...
  }
}
```

### Per-Scan Settings (v1.2+)
- **card_condition**: "raw" or "graded" - controls scorer and exclusions
- **listing_type**: "bin" (Buy It Now) or "auction" - filters eBay results
- Priority: scan setting > global setting > default

---

## Features

### 1. Vision Filter (Claude Haiku)
Analyzes card images to detect:
- Centering issues (50% weight)
- Corners/edges damage (50% weight)
- Surface scratches (IGNORED - always neutral)
- Overall condition score with confidence multiplier

**Confidence Multiplier:**
- High: 1.0x
- Medium: 0.85x
- Low: 0.7x

**Usage:**
```bash
node run-from-config.js monday --vision
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
- Search Relevance: 40% (player/year/brand match)
- Seller Quality: 20% (feedback % + sales count)
- Listing Quality: 15% (photos + premium condition signals)
- Listing Freshness: 15% (age of listing)
- Vision Score: 10% (image analysis)

**Freshness Tiers:**
- <1 day: 10 pts | 1-3 days: 8 pts | 4-7 days: 6 pts | 8-14 days: 4 pts | 15-30 days: 2 pts | 30+ days: 0 pts

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
