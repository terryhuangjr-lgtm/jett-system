# API Token Spend Tracker - Quick Start

## 🚀 Quick Commands

### Start Dashboard
```bash
/home/clawd/clawd/dashboard/start-dashboard.sh
```
Then open: **http://localhost:8000**

### Stop Dashboard
```bash
/home/clawd/clawd/dashboard/stop-dashboard.sh
```

### Update Data
```bash
/home/clawd/clawd/dashboard/update-data.sh
```

### Check Status
```bash
ps aux | grep "python3 server.py" | grep -v grep
```

## 📊 What's Fixed

### 1. **Reload Issues - FIXED** ✅
- Added cache-busting for JSON files
- Implemented auto-refresh every 15 minutes (configurable in config.json)
- Added manual refresh button
- Better error handling and validation

### 2. **Accuracy Issues - FIXED** ✅
- Script now outputs to both `data/` and `public/` directories
- Added data staleness warnings (shows age of data)
- Fixed path issues that prevented updates

### 3. **Server Management - IMPROVED** ✅
- Simple start/stop scripts
- PID tracking to prevent duplicate servers
- Better logging
- Auto-restart on errors

## 🔄 Automatic Updates (Optional)

To auto-update data every hour, add to crontab:
```bash
0 * * * * /home/clawd/clawd/dashboard/update-data.sh >> /home/clawd/clawd/dashboard/update.log 2>&1
```

To edit crontab:
```bash
crontab -e
```

## 📈 Features

- **Real-time tracking**: View spending across all agents (Jett, subagents, cron)
- **Budget monitoring**: Set daily/weekly/monthly budgets in `public/config.json`
- **Project breakdown**: See costs by project (21M Sports, investing, etc.)
- **Auto-refresh**: Dashboard auto-updates every 15 minutes
- **Responsive**: Works on desktop and mobile

## 🐛 Troubleshooting

### Port 8000 already in use?
```bash
lsof -ti:8000 | xargs kill -9
/home/clawd/clawd/dashboard/start-dashboard.sh
```

### Data not updating?
```bash
# Check if sessions directory exists
ls ~/.clawdbot/agents/main/sessions/

# Manually update
/home/clawd/clawd/dashboard/update-data.sh

# Check logs
cat /home/clawd/clawd/dashboard/update.log
```

### Dashboard shows old data?
The dashboard now shows the age of data. If it's red, run:
```bash
/home/clawd/clawd/dashboard/update-data.sh
```

## 📁 File Structure

```
dashboard/
├── server.py               # HTTP server
├── start-dashboard.sh      # Start server
├── stop-dashboard.sh       # Stop server
├── update-data.sh          # Update data manually
├── public/
│   ├── index.html          # Dashboard UI
│   ├── app.js              # Frontend logic (improved)
│   ├── styles.css          # Styling
│   ├── config.json         # Budget & settings
│   └── token-usage.json    # Data (auto-updated)
└── scripts/
    └── parse-clawdbot.js   # Data parser (improved)
```

## 💡 Tips

1. Keep the dashboard running 24/7 - it's lightweight
2. Set up cron to auto-update data
3. Adjust budgets in `public/config.json` as needed
4. Check the dashboard regularly to track spending
5. Data auto-refreshes, but you can manually refresh anytime

## 📊 Current Stats

Last updated: 2026-02-03
- Total entries: 3,354
- Total cost: $221.10
- Date range: Feb 2-3, 2026

Built by: Jett (original) + Claude Code (improvements)
