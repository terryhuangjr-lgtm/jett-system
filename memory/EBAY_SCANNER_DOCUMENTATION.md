# eBay Scanner Manager - Documentation

**Version:** 1.0
**Last Updated:** 2026-02-11
**Related Docs:** [21M System Documentation](./21M_SYSTEM_DOCUMENTATION.md)

---

## Overview

The eBay Scanner Manager provides a centralized dashboard for managing all eBay scan tasks. Instead of hardcoding scan configurations in task definitions, all scans now read from a single source of truth: `ebay-scans-config.json`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  eBay Scanner Manager Dashboard                                   │
│  URL: http://localhost:3000/ebay.html                           │
│                                                                  │
│  Features:                                                       │
│  • Toggle scans on/off per day                                  │
│  • Edit search terms                                             │
│  • Adjust filters (min/max price, topN)                         │
│  • Add/remove exclusion words                                    │
│  • Manually trigger scans                                        │
│  • View last run status                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Config File (Source of Truth)                                  │
│  📄 /home/clawd/clawd/task-manager/ebay-scans-config.json       │
│                                                                  │
│  {                                                              │
│    "scans": {                                                   │
│      "monday": { "name": "...", "enabled": true, ... },        │
│      "tuesday": { ... },                                        │
│      ...                                                         │
│    },                                                           │
│    "deploy": { "time": "13:30", "slack_channel": "#levelupcards" }
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task Worker                                                     │
│  Scans read config before running                                │
│  Command: node /home/clawd/clawd/ebay-scanner/run-from-config.js│
└─────────────────────────────────────────────────────────────────┘
```

## File Locations

| File | Purpose |
|------|---------|
| `/home/clawd/clawd/task-manager/ebay-scans-config.json` | Source of truth for all eBay scans |
| `/home/clawd/clawd/task-manager/dashboard/ebay.html` | Dashboard UI |
| `/home/clawd/clawd/ebay-scanner/run-from-config.js` | Scanner wrapper that reads config |
| `/home/clawd/clawd/task-manager/server.js` | API endpoints for dashboard |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ebay-scans` | GET | Get all scan configurations |
| `/api/ebay-scans/{day}` | PUT | Update a day's scan config |
| `/api/ebay-scans/{day}/run` | POST | Manually trigger a scan |
| `/api/ebay-deploy` | POST | Trigger deploy to Slack |

## Daily Schedule (EST)

| Time | Task |
|------|------|
| 9:00 AM | Daily eBay scan runs (based on config) |
| 1:30 PM | Results deployed to #levelupcards |

## Adding a New Scan

To add a new eBay scan (e.g., "Mike Trout Rookie Cards"):

### Option 1: Via Dashboard
1. Open http://localhost:3000/ebay.html
2. Click "Edit" on the appropriate day
3. Update search terms, filters, etc.
4. Click "Save Changes"

### Option 2: Edit Config Directly
```bash
nano /home/clawd/clawd/task-manager/ebay-scans-config.json
```

Add a new entry:
```json
{
  "name": "Mike Trout Rookie Cards",
  "enabled": true,
  "search_terms": ["mike trout topps chrome rookie 2011", "mike trout bowman rookie"],
  "filters": {
    "minPrice": 50,
    "maxPrice": 500,
    "topN": 20,
    "exclude_words": ["auto", "patch", "jersey"]
  },
  "output_file": "/tmp/trout-rookies-scan.json"
}
```

## Scan Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name for the scan |
| `enabled` | boolean | Whether the scan runs automatically |
| `search_terms` | array | Search keywords (joined with OR) |
| `filters.minPrice` | number | Minimum price filter |
| `filters.maxPrice` | number | Maximum price filter |
| `filters.topN` | number | Number of results to return |
| `filters.exclude_words` | array | Words to exclude |
| `output_file` | string | Where to save results |

## CLI Usage

```bash
# Run a specific day's scan
node /home/clawd/clawd/ebay-scanner/run-from-config.js monday
node /home/clawd/clawd/ebay-scanner/run-from-config.js tuesday
# etc.

# Run today's scan
node /home/clawd/clawd/ebay-scanner/run-from-config.js

# Deploy to Slack (manual)
node /home/clawd/clawd/automation/deploy-ebay-scans.js
```

## Troubleshooting

### Scan not running
1. Check if scan is enabled: GET `/api/ebay-scans`
2. Verify task is scheduled: Check Task Manager dashboard
3. Check logs: `/home/clawd/clawd/memory/task-logs/`

### Deploy not posting to Slack
1. Verify clawdbot is running with Slack enabled
2. Test: `clawdbot message send --target "#levelupcards" --message "test"`
3. Check clawdbot logs: `tail -f /tmp/clawdbot.log`

### No results found
1. Verify search terms are valid
2. Try broadening filters (remove maxPrice, increase topN)
3. Check if eBay API is responding

## Jett Instructions

When Terry asks you to modify eBay scans:

1. **To view current scans:** `curl http://localhost:3000/api/ebay-scans`
2. **To edit a scan:** Use the dashboard at http://localhost:3000/ebay.html
3. **To run a scan manually:** `node /home/clawd/clawd/ebay-scanner/run-from-config.js {day}`
4. **To deploy results:** `node /home/clawd/clawd/automation/deploy-ebay-scans.js`

Always verify changes by checking the config file after edits. Do NOT modify individual task definitions in the Task Manager - all eBay scans should be controlled via the dashboard or direct config edits.

---

## Example Config with Annotations

```json
{
  "scans": {
    "wednesday": {
      "name": "Kobe Bryant Chrome/Finest Refractors 1997-2005",
      "enabled": true,
      "search_terms": [
        "kobe bryant topps chrome, topps finest 1997-2005 refractor"
      ],
      "filters": {
        "minPrice": 10,           // Skip cheap junk (likely damaged/fakes)
        "maxPrice": 5000,         // Cap at serious collector prices
        "topN": 20,               // Return top 20 results
        "exclude_words": [
          "pokemon",               // Cross-category junk
          "magic",                 // CCG competitors  
          "yugioh"                // CCG competitors
        ]
      },
      "output_file": "/tmp/kobe-refractors-scan.json",
      "last_run": "2026-02-11T04:00:11Z",
      "last_results": {
        "success": true,
        "items_found": 36
      }
    }
  }
}
```

### Field Explanations

| Field | Purpose | Best Practices |
|-------|---------|----------------|
| `name` | Display name in dashboard | Clear, descriptive |
| `enabled` | Toggle for auto-run | Uncheck to pause a day |
| `search_terms` | eBay search keywords | Use commas for OR logic |
| `minPrice` | Minimum price filter | Skip junk/potential fakes |
| `maxPrice` | Maximum price filter | Set realistic caps |
| `topN` | Results to return | 15-25 works well |
| `exclude_words` | Filter out junk | Add common noise words |
| `output_file` | Where results go | Default location is fine |

---

## Sample Output Structure

### Scan Results JSON (`/tmp/kobe-refractors-scan.json`)

```json
{
  "timestamp": "2026-02-11T04:00:11.039Z",
  "searchQuery": "kobe bryant topps chrome finest 1997-2005 refractor",
  "scanDuration": "45.2s",
  "summary": {
    "totalFound": 156,
    "uniqueItems": 142,
    "rawCardsOnly": 98,
    "showingResults": 20
  },
  "results": [
    {
      "itemId": "143746288697",
      "title": "1997-1998 Kobe Bryant Topps Chrome Destiny Refractor Los Angeles Lakers 2nd Yr",
      "price": 1056.40,
      "condition": "Ungraded",
      "shipping": 6.40,
      "url": "https://www.ebay.com/itm/143746288697",
      "dealScore": {
        "score": 8.0,
        "breakdown": {
          "price_fairness": 7.5,
          "rarity": 8.5,
          "player_demand": 8.0,
          "condition_uncertainty": 8.0
        }
      },
      "marketContext": {
        "recent_sales": [
          { "price": 980, "date": "2026-01-28" },
          { "price": 1100, "date": "2026-01-15" }
        ],
        "estimated_value": 1050
      }
    },
    {
      "itemId": "197534980258",
      "title": "1997-98 Topps Finest Gold Refractor /289 KOBE BRYANT #323",
      "price": 3922.99,
      "condition": "Ungraded",
      "shipping": 34.99,
      "url": "https://www.ebay.com/itm/197534980258",
      "dealScore": {
        "score": 8.0,
        "breakdown": {
          "price_fairness": 8.0,
          "rarity": 9.0,
          "player_demand": 8.0,
          "condition_uncertainty": 7.0
        }
      },
      "marketContext": {
        "recent_sales": [
          { "price": 3800, "date": "2026-02-01" },
          { "price": 4200, "date": "2026-01-20" }
        ],
        "estimated_value": 4000
      }
    }
  ]
}
```

### Dashboard JSON (from `/api/ebay-scans`)

```json
{
  "version": "1.0",
  "last_updated": "2026-02-11T16:00:00-05:00",
  "scans": {
    "monday": {
      "name": "MJ Topps Finest 93-99",
      "enabled": true,
      "search_terms": ["topps finest michael jordan 1994-1999 base"],
      "filters": {
        "minPrice": 10,
        "maxPrice": 100,
        "topN": 20,
        "exclude_words": ["pokemon", "magic", "yugioh", "non-sport"]
      },
      "output_file": "/tmp/mj-finest-scan.json",
      "last_run": "2026-02-09T09:00:00Z",
      "last_results": { "success": true, "items_found": 12 }
    },
    "tuesday": { ... },
    "wednesday": { ... }
  },
  "deploy": {
    "enabled": true,
    "time": "13:30",
    "slack_channel": "#levelupcards",
    "last_run": "2026-02-11T13:30:00Z"
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-11 | Initial release with dashboard, config-based scanning |

**See Also:** [21M System Documentation](./21M_SYSTEM_DOCUMENTATION.md)
