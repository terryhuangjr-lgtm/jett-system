# Setup Guide

Complete installation guide for the Sports Betting Research System.

## Prerequisites

- Python 3.x installed
- Internet connection
- Slack workspace (optional but recommended)

## Installation Steps

### 1. Install Dependencies

```bash
# Install Python packages via apt (if not already installed)
sudo apt-get update
sudo apt-get install -y python3-bs4 python3-requests

# Verify installation
python3 -c "import requests; import bs4; print('✅ Dependencies installed')"
```

### 2. Initialize Database

```bash
cd ~/clawd/sports_betting
python3 init_db.py
```

You should see:
```
Database initialized successfully at: ~/clawd/data/sports_betting.db

Tables created:
  - bet_recommendations
  - bet_results
  - betting_lines
  - games
  - player_stats
  - system_config
  - team_stats
```

### 3. Configure Slack (Optional but Recommended)

**Get Webhook URL:**
1. Go to https://api.slack.com/messaging/webhooks
2. Click "Create your Slack app"
3. Choose "From scratch"
4. Name: "Sports Betting System"
5. Select your workspace
6. Click "Incoming Webhooks" in sidebar
7. Toggle "Activate Incoming Webhooks" to ON
8. Click "Add New Webhook to Workspace"
9. Choose channel (create #sports-betting if needed)
10. Copy the webhook URL

**Update Configuration:**
```bash
nano ~/clawd/sports_betting/config.py
```

Replace this line:
```python
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

With your actual webhook URL:
```python
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
```

Save and exit (Ctrl+X, Y, Enter).

**Test Slack Integration:**
```bash
python3 test_slack.py
```

Expected output:
```
Testing Slack integration...
Sending test message to Slack...
✅ Sent to Slack successfully

✅ SUCCESS! Check your Slack channel for the test message.
```

### 4. Test the System

Run a complete analysis:
```bash
cd ~/clawd/sports_betting
python3 orchestrator.py
```

You should see:
- Step-by-step progress
- Games collected
- Analysis performed
- Report generated
- Message sent to Slack (if configured)

### 5. Set Up Automation (Cron Job)

**Option A: Automated Setup (Recommended)**
```bash
cd ~/clawd/sports_betting
chmod +x setup_cron.sh
./setup_cron.sh
```

Follow the prompts to choose your schedule.

**Option B: Manual Setup**
```bash
crontab -e
```

Add one of these lines:

For nightly analysis at 1:00 AM:
```
0 1 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/nightly_$(date +\%Y\%m\%d).log 2>&1
```

For evening analysis at 6:00 PM:
```
0 18 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/nightly_$(date +\%Y\%m\%d).log 2>&1
```

For morning delivery at 6:00 AM:
```
0 6 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/morning_$(date +\%Y\%m\%d).log 2>&1
```

Save and exit.

**Verify Cron Job:**
```bash
crontab -l | grep orchestrator
```

### 6. Verify Installation

Run the system health check:
```bash
cd ~/clawd/sports_betting
python3 check_system.py
```

All checks should pass:
```
✅ Database exists
✅ All tables present
✅ All files present
✅ Dependencies installed
✅ Configuration valid
✅ Cron job configured
✅ Logs directory exists
✅ SYSTEM READY
```

## Configuration Options

Edit `config.py` to customize:

```python
# Database location
DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

# Slack webhook
SLACK_WEBHOOK_URL = 'your_webhook_url_here'

# Safety limits
MAX_BET_AMOUNT = 10.0        # Maximum dollars per bet
DAILY_BET_LIMIT = 1          # Max bets per day
MONTHLY_BUDGET = 200.0       # Max total wagered per month

# Analysis thresholds
MIN_CONFIDENCE = 7.0         # Minimum confidence to recommend
MIN_EXPECTED_VALUE = 3.0     # Minimum expected value percentage

# Sports to analyze
ENABLED_SPORTS = 'nba'       # Comma-separated list

# Safety mode
PAPER_TRADING = True         # Track without real money
```

## Verification Checklist

Before going live, verify:

- [ ] Database initialized successfully
- [ ] Config.py updated with settings
- [ ] Slack webhook configured (optional)
- [ ] Slack test message received
- [ ] Manual orchestrator run successful
- [ ] Cron job scheduled
- [ ] Logs directory created
- [ ] check_system.py passes all checks
- [ ] Understand how to log results
- [ ] Understand how to view stats

## Usage Guide

### Daily Workflow

**Morning (Automated):**
1. System runs at scheduled time
2. Analyzes upcoming games
3. Sends report to Slack
4. You review recommendation

**During the Day:**
```bash
# View current recommendation
cd ~/clawd/sports_betting
python3 -c "
import sqlite3
conn = sqlite3.connect('$HOME/clawd/data/sports_betting.db')
cursor = conn.cursor()
cursor.execute('SELECT bet_selection, confidence_score FROM bet_recommendations WHERE is_daily_pick = 1 ORDER BY recommended_at DESC LIMIT 1')
print(cursor.fetchone())
"
```

**After Game Completes:**
```bash
# See pending bets
python3 log_result.py

# Log the outcome
python3 log_result.py nba_20260211_Lakers_Warriors win
# or loss/push
```

**Weekly Review:**
```bash
# View performance stats
python3 show_stats.py
```

### Monitoring

**Check logs:**
```bash
# View today's log
tail -f ~/clawd/sports_betting/logs/nightly_$(date +%Y%m%d).log

# List recent logs
ls -lt ~/clawd/sports_betting/logs/ | head
```

**Check cron execution:**
```bash
# View cron log
grep CRON /var/log/syslog | tail -20
```

**Check system status:**
```bash
python3 check_system.py
```

## Troubleshooting

### Dependencies Missing

**Problem:** ImportError: No module named 'bs4'

**Solution:**
```bash
sudo apt-get install -y python3-bs4 python3-requests
```

### Slack Not Working

**Problem:** Webhook test fails

**Solutions:**
1. Verify webhook URL in config.py
2. Check URL starts with https://hooks.slack.com/
3. Test webhook manually:
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test"}' YOUR_WEBHOOK_URL
```

### Cron Not Running

**Problem:** Analysis not running automatically

**Solutions:**
1. Check cron service is running:
```bash
sudo service cron status
```

2. Verify crontab entry:
```bash
crontab -l | grep orchestrator
```

3. Check cron logs:
```bash
grep CRON /var/log/syslog | grep orchestrator
```

4. Test command manually:
```bash
cd ~/clawd/sports_betting && python3 orchestrator.py
```

### Database Errors

**Problem:** Database corrupted or tables missing

**Solution:**
```bash
# Backup existing database
cp ~/clawd/data/sports_betting.db ~/clawd/data/sports_betting.db.backup

# Reinitialize
cd ~/clawd/sports_betting
python3 init_db.py
```

## Advanced Configuration

### Adjust Scoring Weights

Edit `analyzer/bet_scorer.py`:

```python
self.weights = {
    'team_quality': 0.25,    # Increase for team strength emphasis
    'recent_form': 0.20,     # Increase for hot/cold streaks
    'home_court': 0.15,      # Increase for home advantage
    'injury_impact': 0.15,   # Increase for injury concerns
    'line_value': 0.25       # Increase for value betting
}
```

### Add Custom Notifications

Create new notifier in `notifiers/` directory following the pattern in `slack_notifier.py`.

### Change Analysis Schedule

Multiple daily runs:
```
# Morning update at 6 AM
0 6 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/morning.log 2>&1

# Evening update at 6 PM
0 18 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/evening.log 2>&1
```

## Security Best Practices

1. **Keep webhook URL secret**
   - Don't commit config.py to public repos
   - Add to .gitignore if using git
   - Regenerate if exposed

2. **Use paper trading first**
   - Test system for weeks/months
   - Only use real money after proven profitable
   - Start with small amounts

3. **Set conservative limits**
   - Keep MAX_BET_AMOUNT low
   - Enforce MONTHLY_BUDGET
   - Never bet more than you can afford to lose

4. **Monitor regularly**
   - Check logs daily
   - Review stats weekly
   - Verify system health

## Next Steps

After successful setup:

### Week 1-2: Testing Phase
- Let system run in paper trading mode
- Log hypothetical results
- Monitor performance
- Verify accuracy of predictions

### Week 3-4: Analysis Phase
- Review stats: `python3 show_stats.py`
- Check win rate (need >52.4% to profit)
- Analyze confidence level breakdown
- Identify strengths/weaknesses

### Week 5+: Decision Phase
- If profitable in paper trading, consider real money
- Start with minimum bet amounts
- Continue tracking everything
- Adjust algorithm based on results

## Support

If you encounter issues:

1. Run health check: `python3 check_system.py`
2. Check logs: `tail -f logs/nightly_*.log`
3. Review README.md troubleshooting section
4. Verify all configuration settings

## Important Reminders

⚠️ **Risk Disclaimer:**
- Gambling involves risk of loss
- Past performance ≠ future results
- Only bet what you can afford to lose
- This is research/entertainment, not financial advice
- Check local gambling laws

✅ **Best Practices:**
- Always start with paper trading
- Track every bet
- Review performance regularly
- Adjust strategy based on data
- Stay disciplined with limits

---

**Setup Complete!** Your automated betting research system is ready to run. Good luck! 🎯
