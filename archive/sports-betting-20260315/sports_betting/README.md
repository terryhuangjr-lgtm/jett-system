# Sports Betting Research System

Automated nightly analysis of NBA games with AI-powered betting recommendations.

## 🎯 What It Does

- Scrapes upcoming NBA games from ESPN
- Collects team statistics and injury reports
- Analyzes betting lines for value
- Scores games using multi-factor algorithm
- Generates daily betting recommendations
- Sends beautiful reports to Slack
- Tracks performance over time

## 📁 System Structure

```
~/clawd/sports_betting/
├── schema.sql              # Database schema
├── config.py               # System configuration
├── orchestrator.py         # Main nightly runner
├── collectors/             # Data collection modules
│   ├── game_collector.py   # ESPN game scraper
│   ├── stats_collector.py  # Team statistics
│   ├── injury_collector.py # Injury reports
│   └── odds_collector.py   # Betting lines
├── analyzer/               # Betting analysis
│   └── bet_scorer.py       # Scoring algorithm
├── notifiers/              # Notification services
│   └── slack_notifier.py   # Slack integration
├── analytics/              # Performance tracking
│   └── performance_tracker.py
├── log_result.py           # CLI: Log bet results
├── show_stats.py           # CLI: View performance
└── logs/                   # Log files

~/clawd/data/
└── sports_betting.db       # SQLite database
```

## 🚀 Quick Start

### 1. Initial Setup

```bash
cd ~/clawd/sports_betting

# Initialize database
python3 init_db.py

# Install dependencies (if needed)
sudo apt-get install -y python3-bs4 python3-requests
```

### 2. Configure Slack (Optional but Recommended)

```bash
# Edit config
nano config.py

# Add your Slack webhook URL
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

# Test it
python3 test_slack.py
```

See [SLACK_SETUP.md](SLACK_SETUP.md) for detailed instructions.

### 3. Run Your First Analysis

```bash
python3 orchestrator.py
```

You'll see:
- Step-by-step progress
- Game analysis
- Betting recommendations
- Report in Slack (if configured)

## 📊 Daily Usage

### View Recommendations

Run manually:
```bash
cd ~/clawd/sports_betting
python3 orchestrator.py
```

Or schedule with cron (see Automation section).

### Log Bet Results

After a game completes:
```bash
# See pending bets
python3 log_result.py

# Log outcome
python3 log_result.py nba_20260211_Lakers_Warriors win
python3 log_result.py nba_20260211_Lakers_Warriors loss
python3 log_result.py nba_20260211_Lakers_Warriors push
```

### View Performance

```bash
python3 show_stats.py
```

Shows:
- Season record and win rate
- Total profit/loss
- ROI (Return on Investment)
- Recent form (last 10 bets)
- Weekly performance
- Breakdown by confidence level

## 🤖 Automation

### Set Up Nightly Cron Job

```bash
# Edit crontab
crontab -e

# Run every day at 6 PM
0 18 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/nightly_$(date +\%Y\%m\%d).log 2>&1

# Alternative: Run at 6 AM for morning delivery
0 6 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/morning_$(date +\%Y\%m\%d).log 2>&1
```

### Check Logs

```bash
# View today's log
tail -f ~/clawd/sports_betting/logs/nightly_$(date +%Y%m%d).log

# View recent logs
ls -lt ~/clawd/sports_betting/logs/ | head
```

## 🧮 How The Algorithm Works

### Scoring Factors (Weighted)

1. **Team Quality (25%)** - Point differential comparison
2. **Recent Form (20%)** - Last 10 games performance
3. **Home Court (15%)** - Home/away advantage
4. **Injury Impact (15%)** - Key player availability
5. **Line Value (25%)** - Model prediction vs actual spread

### Decision Logic

- Requires **minimum 7.0/10 confidence** (configurable)
- Needs **1+ point of line value** for recommendation
- Uses **conservative Kelly Criterion** for bet sizing
- Risk assessment: Low (8+), Medium (7-8), High (<7)
- Auto-pass on low confidence plays

### Example Analysis

```
🔍 Analyzing: Lakers @ Warriors

Scoring Breakdown:
  Team Quality:    +2.5  (Warriors better)
  Recent Form:     +4.0  (Warriors hot)
  Home Court:      +5.7  (Strong home team)
  Injury Impact:    0.0  (No major injuries)
  Line Value:     +10.0  (Great value found!)

Composite: 7.4/10 (Good)

✅ RECOMMENDATION: Warriors -4.5
💰 Bet: $5.00
```

## 🎛️ Configuration

Edit `config.py` to customize:

```python
# Safety limits
MAX_BET_AMOUNT = 10.0        # Max per bet
DAILY_BET_LIMIT = 1          # Max bets per day
MONTHLY_BUDGET = 200.0       # Max wagered per month

# Analysis settings
MIN_CONFIDENCE = 7.0         # Minimum to recommend
MIN_EXPECTED_VALUE = 3.0     # Minimum edge needed

# Mode
PAPER_TRADING = True         # Safe mode (no real money)
```

## 📱 Slack Integration

Messages include:
- 🏀 Header with date
- 📅 Season stats (record, ROI)
- 🌟 Daily pick with full analysis
- 🎯 Bet selection and confidence
- ✅ Reasoning (why this bet)
- ⚠️ Concerns (what to watch)
- 📋 Alternative good bets

Example:
```
🏀 Daily Betting Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Season: 12-8 (60%) | Recent: 7-3 L10

🌟 DAILY PICK
Lakers @ Warriors | 7:30 PM

🎯 BET: Warriors -4.5
🔥 Confidence: 7.4/10
💰 Expected Value: +25%
💵 Suggested: $5.00

✅ WHY:
• Warriors 7-3 in last 10
• Home court advantage
• Line value: +8.4 points
```

## 📈 Performance Tracking

### Key Metrics

- **Win Rate:** % of bets won (need >52.4% to profit)
- **ROI:** Return on investment (% profit on total wagered)
- **Units:** Track in standardized bet sizes
- **Recent Form:** Momentum (hot or cold streak)

### Example Stats

```
Season: 15-10-1 (60%)
Wagered: $250.00
Profit: $+37.50
ROI: +15%

By Confidence:
  High (8-10):   5-2  (71%)  $+25.00
  Medium (7-8):  10-8 (56%)  $+12.50
```

## 🔧 Troubleshooting

### No Recommendations Generated

**Cause:** Games don't meet confidence threshold

**Fix:** Lower `MIN_CONFIDENCE` in config.py (default: 7.0)

### Slack Messages Not Sending

**Causes:**
1. Webhook URL not configured
2. Invalid webhook
3. Network issues

**Fixes:**
```bash
# Test webhook
python3 test_slack.py

# Verify URL in config.py
nano config.py

# Test manually
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test"}' YOUR_WEBHOOK_URL
```

### Game Collector Fails

**Cause:** beautifulsoup4 not installed

**Fix:**
```bash
sudo apt-get install -y python3-bs4
```

### Database Errors

**Cause:** Database corrupted or missing

**Fix:**
```bash
# Backup first
cp ~/clawd/data/sports_betting.db ~/clawd/data/sports_betting.db.backup

# Reinitialize
cd ~/clawd/sports_betting
python3 init_db.py
```

### Cron Job Not Running

**Fixes:**
```bash
# Check cron is running
sudo service cron status

# View cron logs
grep CRON /var/log/syslog

# Test command manually
cd ~/clawd/sports_betting && python3 orchestrator.py

# Verify crontab entry
crontab -l
```

## 🔒 Safety Features

### Paper Trading Mode

Default: **ENABLED**

No real money involved. Track hypothetical performance.

To disable (use caution!):
```python
# In config.py
PAPER_TRADING = False
```

### Bet Limits

System enforces:
- Max bet amount ($10 default)
- Daily bet limit (1 default)
- Monthly budget ($200 default)

### Conservative Approach

- Only recommends high-confidence plays
- "Better to pass than force a bet"
- Transparent reasoning for every pick
- Risk warnings included

## 📚 Additional Documentation

- [SLACK_SETUP.md](SLACK_SETUP.md) - Slack webhook setup
- [schema.sql](schema.sql) - Database structure
- [config.py](config.py) - Configuration options

## 🎓 Understanding the System

### Data Flow

```
1. ESPN → Scrape games
2. Database → Store games + stats
3. Odds → Collect betting lines
4. Analyzer → Score each game
5. Orchestrator → Select daily pick
6. Slack → Send report
7. User → Place bet (optional)
8. log_result.py → Log outcome
9. Analytics → Calculate performance
10. Feedback → Improve model
```

### When to Bet

✅ **Good signs:**
- High confidence (8+)
- Multiple factors aligned
- Clear line value
- No major concerns

❌ **Red flags:**
- Low confidence (<7)
- Conflicting factors
- Key injuries
- Trap line (too good to be true)

### Bankroll Management

1. **Fixed Unit Size:** Always bet same amount
2. **Never Chase Losses:** Stick to limits
3. **Track Everything:** Log all results
4. **Review Regularly:** Check stats weekly
5. **Adjust if Needed:** Lower stakes if losing

## 🚨 Important Disclaimers

- **For Research/Entertainment Only**
- **Past performance ≠ Future results**
- **Gambling involves risk of loss**
- **Only bet what you can afford to lose**
- **Check local gambling laws**
- **Paper trading recommended**

## 🛠️ Development

### Add New Sport

1. Create collector in `collectors/[sport]_collector.py`
2. Add to `orchestrator.py` in `_collect_games()`
3. Update `config.py` → `ENABLED_SPORTS`

### Improve Algorithm

1. Review performance: `python3 show_stats.py`
2. Identify weaknesses (e.g., home underdogs)
3. Adjust weights in `analyzer/bet_scorer.py`
4. Test with historical data
5. Deploy and monitor

### Add Data Source

1. Create new collector class
2. Follow existing patterns
3. Save to database
4. Update scorer to use new data

## 📞 Support

Issues? Check:
1. This README troubleshooting section
2. Log files in `logs/` directory
3. Database integrity
4. Configuration in `config.py`

## 📊 System Status Check

```bash
# Quick health check
cd ~/clawd/sports_betting

# Check database
ls -lh ~/clawd/data/sports_betting.db

# Check recent logs
ls -lt logs/ | head -5

# Check last recommendation
python3 -c "
import sqlite3
conn = sqlite3.connect('$HOME/clawd/data/sports_betting.db')
cursor = conn.cursor()
cursor.execute('SELECT bet_selection, confidence_score, recommended_at FROM bet_recommendations ORDER BY recommended_at DESC LIMIT 1')
print(cursor.fetchone())
"

# Check performance
python3 show_stats.py
```

## 🎉 Success!

You now have a complete automated betting research system!

**Next Steps:**
1. ✅ Configure Slack notifications
2. ✅ Set up nightly cron job
3. ✅ Run first analysis
4. ✅ Log some results
5. ✅ Monitor performance
6. ✅ Refine algorithm based on data

**Remember:** Start with paper trading, track everything, and only use real money if you're comfortable with the risk!

---

Built with ❤️ for responsible sports betting research
