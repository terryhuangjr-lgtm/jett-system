# Two-Stage Analysis System

## Overview

The system now runs twice daily to account for late-breaking news and line movements:

- **Scout Mode (1 AM)**: Morning screening to identify promising games
- **Final Mode (4 PM)**: Deep analysis with latest injury reports and betting lines

## Why Two Stages?

**Problem:** Sports betting lines and injury reports change throughout the day. A 1 AM analysis might miss:
- Afternoon injury updates
- Line movements
- Late-breaking news

**Solution:** Two-stage analysis
1. Morning scout identifies games worth watching
2. Afternoon final re-analyzes with fresh data

## How It Works

### Scout Mode (1 AM)

**Purpose:** Quick screening of all games

**Process:**
1. Collect today's/tomorrow's games
2. Update team statistics
3. Check injury reports
4. Get betting lines
5. Quick analysis (lower 6.5 threshold)
6. Create watch list of promising games
7. Send scout report to Slack

**Output:** "Games to Watch" list

**Example Slack Message:**
```
🔍 SCOUT REPORT - Games to Watch

Analyzed 8 games | 2 worth watching

1. Lakers @ Warriors (7:30 PM)
   Early confidence: 6.8/10
   Early lean: Warriors -4.5

2. Celtics @ Heat (8:00 PM)
   Early confidence: 6.7/10
   Early lean: Heat +3.0

⏰ Final recommendations coming at 4 PM
```

### Final Mode (4 PM)

**Purpose:** Deep analysis with latest data

**Process:**
1. Load morning watch list
2. **Re-collect fresh injury reports** (may have changed!)
3. **Update betting lines** (may have moved!)
4. Re-analyze each game
5. Apply full 7.0 confidence threshold
6. Select daily pick
7. Send complete recommendation to Slack

**Output:** Full betting recommendation with confidence change tracking

**Example Slack Message:**
```
🏀 DAILY PICK

Lakers @ Warriors | 7:30 PM

🎯 BET: Warriors -5.0
🔥 Confidence: 7.2/10
📈 Updated from morning: 6.8 → 7.2 (+0.4)

💰 Expected Value: +18%
💵 Suggested Bet: $7.00

✅ WHY:
• Line moved in our favor (-4.5 → -5.0)
• Warriors injury report cleared
• Lakers added questionable starter
```

## Usage

### Test Modes

```bash
# Test scout mode
python3 orchestrator.py --mode scout

# Test final mode (requires scout run first)
python3 orchestrator.py --mode final

# Test both (full run)
python3 orchestrator.py --mode full
```

### Set Up Cron Jobs

Edit crontab:
```bash
crontab -e
```

Add both jobs:
```
# Morning scout (1 AM)
0 1 * * * cd ~/clawd/sports_betting && python3 orchestrator.py --mode scout >> logs/scout_$(date +\%Y\%m\%d).log 2>&1

# Afternoon final (4 PM)
0 16 * * * cd ~/clawd/sports_betting && python3 orchestrator.py --mode final >> logs/final_$(date +\%Y\%m\%d).log 2>&1
```

Save and exit.

### Verify Cron Setup

```bash
crontab -l | grep orchestrator
```

Should show both entries.

## Database Changes

### New Table: watch_list

Stores games identified in scout mode:

```sql
CREATE TABLE watch_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    date DATE NOT NULL,
    confidence REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, date)
);
```

**Already created** if you followed the setup!

### Verify Table Exists

```bash
python3 -c "
import sqlite3
conn = sqlite3.connect('/home/clawd/clawd/data/sports_betting.db')
cursor = conn.cursor()
cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='watch_list'\")
if cursor.fetchone():
    print('✅ watch_list table exists')
else:
    print('❌ watch_list table missing - run setup command')
"
```

## Command Reference

### Modes

- `--mode scout` - Morning screening only
- `--mode final` - Afternoon analysis only (requires scout data)
- `--mode full` - Both modes sequentially

### Examples

```bash
# Run just morning scout
python3 orchestrator.py --mode scout

# Run just afternoon final
python3 orchestrator.py --mode final

# Run both (for testing)
python3 orchestrator.py --mode full

# Default (full if no --mode specified)
python3 orchestrator.py
```

## Typical Daily Flow

**1:00 AM - Scout Mode Runs**
- Jett wakes up and screens games
- Identifies 2-3 promising matchups
- Sends scout report to Slack
- You wake up and see watch list

**Morning (8 AM - 4 PM)**
- Monitor injury news
- Watch line movements
- See which games stay interesting

**4:00 PM - Final Mode Runs**
- Jett re-analyzes watch list games
- Uses fresh injury reports
- Uses updated betting lines
- Confidence may increase or decrease
- Sends final recommendation

**Example:**
```
Morning: Warriors -4.5 @ 6.8/10 confidence
Afternoon: Warriors -5.0 @ 7.2/10 confidence
✅ Recommendation improved! Line moved favorably.

Morning: Celtics +3.0 @ 6.7/10 confidence
Afternoon: Celtics +3.0 @ 6.2/10 confidence
❌ Dropped below threshold (key injury reported)
```

## Benefits

**1. Catches Late News**
- Injury reports often come out 2-4 PM
- Line movements reveal sharp money
- Late scratches change everything

**2. Better Decisions**
- More data = better analysis
- Two checkpoints reduce false positives
- Can pass on deteriorated spots

**3. Transparency**
- See morning vs afternoon confidence
- Understand what changed
- Track why picks improved/declined

**4. Efficiency**
- Morning scout filters 10 games → 2-3 watch
- Afternoon only analyzes promising games
- Saves processing power

## Monitoring

### Check Scout Logs

```bash
tail -f ~/clawd/sports_betting/logs/scout_$(date +%Y%m%d).log
```

### Check Final Logs

```bash
tail -f ~/clawd/sports_betting/logs/final_$(date +%Y%m%d).log
```

### View Watch List

```bash
python3 -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('/home/clawd/clawd/data/sports_betting.db')
cursor = conn.cursor()
cursor.execute('''
    SELECT g.away_team, g.home_team, w.confidence
    FROM watch_list w
    JOIN games g ON w.game_id = g.game_id
    WHERE w.date = DATE('now')
''')
print('Today\\'s Watch List:')
for row in cursor.fetchall():
    print(f'  {row[0]} @ {row[1]} - Confidence: {row[2]:.1f}/10')
"
```

## Troubleshooting

### Final Mode Says "No watch list"

**Cause:** Scout mode hasn't run yet today

**Fix:**
```bash
# Run scout mode first
python3 orchestrator.py --mode scout
```

### Watch List Shows Old Games

**Cause:** Scout mode clears old entries, but games table may have old data

**Fix:** Normal - watch_list table auto-clears old dates

### Both Modes Running Twice

**Cause:** Both cron entries AND old single entry

**Fix:**
```bash
crontab -e
# Remove old single orchestrator.py entry
# Keep only scout and final entries
```

### Confidence Changes Look Wrong

**Cause:** Random stats generation in test mode

**Fix:** Normal in test mode - will stabilize with real data

## Best Practices

1. **Always run scout before final**
   - Scout creates watch list
   - Final needs watch list to work

2. **Check Slack twice daily**
   - Morning: See watch list
   - Afternoon: See final pick

3. **Monitor confidence changes**
   - Big increase = good sign
   - Big decrease = be cautious

4. **Trust the process**
   - System accounts for new data
   - Two stages reduce false positives

5. **Log results as usual**
   - Same log_result.py workflow
   - Performance tracking unchanged

## Advanced: Custom Timing

Want different times? Edit crontab:

```
# Earlier scout (11 PM night before)
0 23 * * * cd ~/clawd/sports_betting && python3 orchestrator.py --mode scout >> logs/scout.log 2>&1

# Later final (6 PM for night games)
0 18 * * * cd ~/clawd/sports_betting && python3 orchestrator.py --mode final >> logs/final.log 2>&1

# Weekend-only
0 1 * * 6,0 cd ~/clawd/sports_betting && python3 orchestrator.py --mode scout >> logs/scout.log 2>&1
```

## Success Metrics

After a week of two-stage analysis:

**Check improvement:**
```bash
python3 show_stats.py
```

**Compare:**
- Win rate before two-stage
- Win rate after two-stage
- Did late data help?
- Fewer bad beats from injuries?

---

**Two-Stage System Active!** 🔍➡️🎯

Scout Mode finds the games.
Final Mode makes the picks.
You get better recommendations!
