# Sports Betting System

**Dashboard:** http://localhost:3000 (Task Manager section)

---

## Quick Start

### Run scout mode manually
```bash
cd /home/clawd/clawd/automation
node 21m-sports-scout.js
```

### Run pick of the day
```bash
cd /home/clawd/clawd/automation  
node 21m-sports-pick.js
```

---

## How It Works

### 1. Scout Mode (10:00 AM daily)
- Analyzes upcoming games
- Looks for value bets
- Posts analysis to Slack

### 2. Pick of the Day (4:00 PM daily)
- Single best pick
- Higher confidence
- Posts to Slack

---

## Key Files

```
/home/clawd/clawd/
├── sports_betting/
│   ├── analyzer/
│   │   └── bet_scorer.js         # Scoring system
│   ├── collectors/
│   │   ├── injury_collector.js
│   │   ├── game_collector.js
│   │   └── odds_collector.js
│   └── analytics/
│       └── performance_tracker.js
├── automation/
│   └── 21m-sports-scout.js     # Scout mode
│   └── 21m-sports-pick.js      # Pick of day
└── memory/
    └── sports_betting/          # Historical picks
```

---

## Data Sources

- Game schedules
- Injury reports
- Betting odds
- Team stats
- Weather (outdoor games)

---

## Configuration

Edit `/home/clawd/clawd/config/jett-config.json`:
```json
{
  "sports_betting": {
    "scout": {
      "enabled": true,
      "min_confidence": 0.6
    },
    "pick": {
      "enabled": true,
      "min_confidence": 0.75
    }
  }
}
```

---

## Output

Posts to Slack:
- #sports-betting (if configured)
- Or #21msports

---

## Troubleshooting

### No picks found
- Check data sources are working
- Verify API keys
- Check game schedule

### Wrong predictions
- Review scoring model in `bet_scorer.js`
- Adjust confidence thresholds
