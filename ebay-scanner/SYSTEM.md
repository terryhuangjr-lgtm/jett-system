# eBay Scanner System

**Dashboard:** http://localhost:3000 (Task Manager section)

---

## Quick Start

### Run a scan manually
```bash
cd /home/clawd/clawd/automation
node deploy-ebay-scans-balanced.js
```

### Check scan results
```bash
ls -la /home/clawd/clawd/memory/ebay-scans/
```

---

## How It Works

1. **Scheduled scans** - Various eBay scans run weekly (see Task Manager)
2. **Searches** - Different card types (Kobe, MJ, etc.)
3. **Filters** - By price, condition, grade
4. **Posts** - Results to Slack #ebay-scans

---

## Scheduled Scans

| Day | Time | Target |
|-----|------|--------|
| Monday | 09:00 | MJ Finest 93-99 |
| Tuesday | 09:00 | Griffey Jr Refractors |
| Wednesday | 09:00 | Kobe Refractors |
| Thursday | 09:00 | MJ Upper Deck 96-00 |
| Friday | 09:00 | Topps Refractors Multi |
| Saturday | 09:00 | MJ Cards 94-99 |
| Sunday | 09:00 | 2025 Cam Ward |

---

## Key Files

```
/home/clawd/clawd/
├── automation/
│   └── deploy-ebay-scans-balanced.js    # Main scanner
│   └── deploy-ebay-scans.js            # Legacy
├── memory/
│   └── ebay-scans/                    # Scan results
└── ebay-scanner/                       # Scanner code
```

---

## Configuration

Edit `/home/clawd/clawd/config/jett-config.json`:
```json
{
  "ebay": {
    "search_terms": {
      "monday": ["Michael Jordan", "Finest", "1993-1999"],
      "wednesday": ["Kobe Bryant", "Refractor"],
      ...
    },
    "filters": {
      "min_price": 50,
      "max_price": 1000
    }
  }
}
```

---

## Troubleshooting

### No results
- Check eBay API key is valid
- Check search terms are correct
- Check network connectivity

### Filter not working
- Review filters in config
- Check scan logs
