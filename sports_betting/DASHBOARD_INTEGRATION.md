# Dashboard Integration Guide

## Overview

The sports betting system now integrates with Jett's Task Manager Dashboard at `localhost:3000`.

All analysis results, picks, and performance stats are automatically posted to your central dashboard!

## What Gets Posted

### 1. Scout Mode Results (1 AM)
```json
{
  "type": "sports_betting_scout",
  "title": "🔍 Scout Mode: 2 games to watch",
  "description": "Analyzed 8 games, identified 2 worth watching",
  "status": "completed",
  "metadata": {
    "mode": "scout",
    "total_games": 8,
    "watch_list_count": 2
  }
}
```

### 2. Final Mode Picks (4 PM)
```json
{
  "type": "sports_betting_final",
  "title": "🎯 Daily Pick: Warriors -4.5",
  "description": "Full pick details with confidence, EV, reasoning",
  "status": "pending",
  "metadata": {
    "confidence": 7.4,
    "bet_amount": 5.00,
    "game_id": "nba_20260211_Lakers_Warriors"
  }
}
```

### 3. Bet Results
```json
{
  "type": "sports_betting_result",
  "title": "✅ Bet Result: WIN",
  "description": "Warriors -4.5 won, +$4.54 profit",
  "status": "completed",
  "metadata": {
    "result": "win",
    "profit": 4.54
  }
}
```

### 4. Season Stats
```json
{
  "type": "sports_betting_stats",
  "title": "📊 Season Stats: 12-8 (60%)",
  "description": "Current performance summary",
  "status": "info",
  "metadata": {
    "wins": 12,
    "losses": 8,
    "profit": 37.50
  }
}
```

## Dashboard API Endpoints

Your dashboard should expose these endpoints:

```javascript
POST /api/tasks
GET /api/tasks?type=sports_betting
PUT /api/tasks/:id
DELETE /api/tasks/:id
```

## Integration in Orchestrator

Add to your orchestrator.py:

```python
from dashboard_integration import DashboardIntegration

# In __init__
self.dashboard = DashboardIntegration()

# After scout mode completes
self.dashboard.post_scout_results(watch_list, total_games)

# After final mode completes
self.dashboard.post_final_pick(daily_pick, recommendations)
```

## Manual Commands

```bash
# Test connection
python3 dashboard_integration.py test

# Post current stats
python3 dashboard_integration.py stats

# Fetch tasks from dashboard
python3 dashboard_integration.py fetch
```

## Dashboard Display Examples

### Scout Report Card
```
┌─────────────────────────────────────┐
│ 🔍 Scout Mode: 2 games to watch    │
│ Completed at 1:05 AM                │
├─────────────────────────────────────┤
│ Analyzed 8 games                    │
│                                      │
│ • Lakers @ Warriors - 6.8/10        │
│ • Celtics @ Heat - 6.7/10           │
└─────────────────────────────────────┘
```

### Daily Pick Card
```
┌─────────────────────────────────────┐
│ 🎯 Daily Pick: Warriors -4.5       │
│ Pending - Game at 7:30 PM           │
├─────────────────────────────────────┤
│ Confidence: 7.4/10 🔥               │
│ Expected Value: +25%                │
│ Bet: $5.00                          │
│                                      │
│ Why:                                 │
│ • Recent form advantage             │
│ • Home court edge                   │
│ • Line value found                  │
└─────────────────────────────────────┘
```

### Result Card
```
┌─────────────────────────────────────┐
│ ✅ Bet Result: WIN                  │
│ Completed at 10:15 PM               │
├─────────────────────────────────────┤
│ Warriors -4.5                       │
│ Won by 8 points                     │
│                                      │
│ Profit: +$4.54                      │
│ Season: 13-8 (61.9%)                │
└─────────────────────────────────────┘
```

## Workflow Integration

### Automated (via Cron)

1. **1:00 AM - Scout Mode**
   - Runs analysis
   - Posts to dashboard: "Scout Results"
   - Status: completed

2. **4:00 PM - Final Mode**
   - Runs deep analysis
   - Posts to dashboard: "Daily Pick"
   - Status: pending (until game completes)

3. **After Game - Manual**
   - You log result: `python3 log_result.py [game_id] win`
   - System posts to dashboard: "Bet Result"
   - Status: completed

### Dashboard Benefits

**Single Source of Truth:**
- All Jett's tasks in one place
- Sports betting alongside other projects
- Unified view of everything

**Real-Time Updates:**
- See analysis results immediately
- Track pending picks
- Monitor performance

**Historical Tracking:**
- View past picks
- Analyze success rate
- Review reasoning for each bet

## Dashboard Schema

Recommended task schema:

```typescript
interface Task {
  id: string;
  type: string;  // 'sports_betting_scout' | 'sports_betting_final' | etc
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'info';
  timestamp: string;
  metadata: {
    [key: string]: any;
  };
}
```

## Error Handling

If dashboard is unreachable:
- System continues to work
- Logs warning
- Analysis still runs
- Slack notifications still sent

The dashboard is **supplementary** - system doesn't depend on it.

## Testing

```bash
# 1. Ensure dashboard is running
curl http://localhost:3000/api/tasks

# 2. Test integration
python3 dashboard_integration.py test

# 3. Post test task
python3 -c "
from dashboard_integration import DashboardIntegration
d = DashboardIntegration()
d.post_task('test', '🏀 Test', 'Testing integration')
"

# 4. Check dashboard UI
# Should see the test task appear
```

## Dashboard UI Components

### Task List View
Shows all betting tasks chronologically:
- Scout reports (morning)
- Daily picks (afternoon)
- Results (evening)
- Stats updates (weekly)

### Betting Summary Widget
Current season stats:
- Record (W-L)
- Win rate
- Total profit
- ROI

### Pending Picks Section
Active bets waiting for results:
- Game info
- Confidence
- Bet amount
- Time until game

## Next Steps

1. **Verify Dashboard Running:**
   ```bash
   curl http://localhost:3000/api/tasks
   ```

2. **Test Integration:**
   ```bash
   python3 dashboard_integration.py test
   ```

3. **Update Orchestrator:**
   Add dashboard posts to scout and final modes

4. **Monitor:**
   Check dashboard tomorrow at 1 AM and 4 PM

---

**Your sports betting system is now integrated with your central task management dashboard!** 📊🎯
