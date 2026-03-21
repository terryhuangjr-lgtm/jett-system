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
  "global": {
    "listing_type": "BIN",        // "BIN", "Auction", "Both"
    "card_type": "Raw"           // "Raw", "Graded", "Both"
  },
  "scans": {
    "monday": {
      "name": "MJ Topps Finest",
      "search_terms": ["Michael Jordan", "Topps Finest", "1993-1999"],
      "filters": {
        "min_price": 50,
        "max_price": 1500,
        "exclude_keywords": ["PSA", "BGS", "graded", "lot of"],
        "condition": "Raw"
      }
    },
    ...
  }
}
```

### Global Filters
- **listing_type**: BIN (Buy It Now), Auction, Both
- **card_type**: Raw (ungraded), Graded (PSA/BGS), Both

---

## Features

### 1. Vision Filter (Claude Haiku)
Analyzes card images to detect:
- Centering issues
- Corners/edges damage
- Surface scratches
- Overall condition score

**Usage:**
```bash
node run-from-config.js monday --vision
```

**API:**
```javascript
const vision = require('./vision-filter.js');
const score = await vision.analyzeImage(imageUrl);
```

### 2. Run Scan Now Button
Located in Mission Control dashboard (eBay tab).
- Triggers immediate scan for selected day
- Uses current config settings
- Sends email on completion

### 3. Global Toggles
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

---

## API Keys Required

| Service | Location |
|---------|----------|
| eBay API | `~/.claude.json` (primaryApiKey) or `.env` |
| Claude (Vision) | `~/.claude.json` or `.env` |
| Gmail | GWS credentials (`~/.config/gws/`) |
