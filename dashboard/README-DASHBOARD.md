# API Usage Dashboard - User Guide

## Overview

Beautiful, functional dashboard to track API usage and costs across all agents (Jett, subagents, cron jobs).

**Current data:** 1,478 entries, $88.61 historical cost

## Quick Start

### View Dashboard

Open in your browser:
```bash
file:///home/clawd/clawd/dashboard/public/index.html
```

Or:
```bash
cd ~/clawd/dashboard/public
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Update Data

Refresh the data from Clawdbot sessions:
```bash
cd ~/clawd/dashboard
./scripts/update-data.sh
```

This runs automatically but you can manually trigger it anytime.

## Dashboard Features

### Overview Cards
- **All Time** - Total spend and tokens
- **This Month** - Monthly spend with budget tracking
- **This Week** - Weekly spend with budget tracking
- **Today** - Today's spend with budget tracking
- **Avg Per Day** - Average daily cost with trend indicator

### Charts

**Daily Spend Over Time**
- Line chart showing cost per day
- Color-coded by agent type (Jett, subagents, cron)
- See spending patterns and spikes

**Cost by Project**
- Pie chart breaking down spend by project:
  - 21M Sports
  - Batting Cage
  - Investing
  - Morning Brief
  - General

**Cost by Agent**
- Bar chart showing which agents cost the most
- Compare Jett vs subagents vs cron jobs

**Token Usage Over Time**
- Stacked bar chart showing token consumption
- Break down by: input, output, cache read, cache write

### Filters

**Date Range:**
- Today, This Week, This Month, All Time

**Agent:**
- All, Jett, Subagents, Grok Subagents, Cron

**Project:**
- All, 21M Sports, Batting Cage, Investing, etc.

**Model:**
- All, Claude Sonnet 4.5, Grok-3

### Recent Activity Table
- Last 20-100 API calls
- Sortable columns
- Search functionality
- Shows: timestamp, agent, project, tokens, cost

### Theme Toggle
- Dark mode (default)
- Light mode (click 🌙/☀️ button)

## Budget Alerts

### Configuration

Edit `config.json` to set your budgets:
```json
{
  "budgets": {
    "daily": 5.00,
    "weekly": 30.00,
    "monthly": 120.00
  },
  "alerts": {
    "enabled": true,
    "slackChannel": "Terry",
    "thresholds": [0.8, 0.9, 1.0]
  }
}
```

### Running Alerts

Check budgets manually:
```bash
node ~/clawd/dashboard/scripts/check-budget.js
```

**Alert thresholds:**
- 80% - Info alert (ℹ️)
- 90% - Warning alert (⚠️)
- 100% - Critical alert (🚨)

Alerts are sent to your Slack DM.

### Automated Monitoring

Set up hourly budget checks:
```bash
crontab -e
# Add this line:
0 * * * * node /home/clawd/clawd/dashboard/scripts/check-budget.js
```

## Weekly Summary

### Generate Summary

Create a weekly usage report:
```bash
node ~/clawd/dashboard/scripts/weekly-summary.js
```

**Report includes:**
- Total spend and change vs last week
- Top 5 projects by cost
- Agent breakdown (Jett, subagents, cron)
- Model usage (Claude vs Grok)
- Busiest day
- Token usage breakdown
- Insights and recommendations

### Automated Reports

Set up Sunday summaries:
```bash
crontab -e
# Add this line:
0 9 * * 0 node /home/clawd/clawd/dashboard/scripts/weekly-summary.js
```

This sends a report every Sunday at 9 AM.

## Automation Setup

### Recommended Cron Jobs

```bash
crontab -e
```

Add these lines:
```cron
# Update dashboard data daily at 3 AM
0 3 * * * /home/clawd/clawd/dashboard/scripts/update-data.sh

# Check budgets every hour
0 * * * * node /home/clawd/clawd/dashboard/scripts/check-budget.js

# Weekly summary every Sunday at 9 AM
0 9 * * 0 node /home/clawd/clawd/dashboard/scripts/weekly-summary.js
```

## File Structure

```
dashboard/
├── public/
│   ├── index.html      # Main dashboard UI
│   ├── styles.css      # Dark theme styling
│   └── app.js          # Charts and data processing
├── scripts/
│   ├── parse-clawdbot.js    # Data extraction
│   ├── check-budget.js      # Budget alerts
│   ├── weekly-summary.js    # Weekly reports
│   └── update-data.sh       # Update script
├── data/
│   └── token-usage.json     # Usage data (1,478 entries)
├── config.json              # Budgets and settings
└── README-DASHBOARD.md      # This file
```

## Troubleshooting

### Dashboard Not Loading

**Check data file:**
```bash
ls -lh ~/clawd/dashboard/data/token-usage.json
```

**Regenerate data:**
```bash
cd ~/clawd/dashboard
node scripts/parse-clawdbot.js
```

### Alerts Not Sending

**Test Slack connection:**
```bash
node scripts/check-budget.js
```

**Check config:**
```bash
cat config.json
```

Make sure `alerts.enabled` is `true`.

### Charts Not Rendering

**Check browser console** (F12) for errors

**Verify Chart.js loaded:**
- Should load from CDN automatically
- Check internet connection

## Customization

### Adjust Budgets

Edit `config.json`:
```json
{
  "budgets": {
    "daily": 10.00,    // Increase daily budget
    "weekly": 60.00,   // Increase weekly budget
    "monthly": 250.00  // Increase monthly budget
  }
}
```

### Change Alert Thresholds

Edit `config.json`:
```json
{
  "alerts": {
    "thresholds": [0.75, 0.90, 1.0]  // 75%, 90%, 100%
  }
}
```

### Add Projects

Projects are auto-detected from the data. To categorize sessions:
1. Update Clawdbot session metadata
2. Re-run `parse-clawdbot.js`
3. Refresh dashboard

## Tips

**Bookmark the dashboard:**
- Add `file:///home/clawd/clawd/dashboard/public/index.html` to bookmarks
- Quick access anytime

**Review weekly:**
- Check the dashboard every Sunday
- Review the weekly summary in Slack
- Adjust budgets if needed

**Monitor patterns:**
- Watch for spending spikes
- Identify high-cost projects
- Optimize cache usage if cache writes are high

**Use filters:**
- Filter by project to see specific costs
- Filter by agent to compare Jett vs subagents
- Filter by date to analyze trends

## Support

**Questions?** Check:
1. `HANDOFF.md` - Technical details
2. `README.md` - Main dashboard docs
3. Ask Jett in Slack

## Success Metrics

Dashboard provides:
- ✅ Real-time usage tracking
- ✅ Budget monitoring with alerts
- ✅ Project cost breakdown
- ✅ Agent performance analysis
- ✅ Token usage insights
- ✅ Weekly automated reports

---

**Built:** 2026-01-30
**Data source:** Clawdbot session files
**Status:** Production ready
**Automation:** Cron jobs recommended
