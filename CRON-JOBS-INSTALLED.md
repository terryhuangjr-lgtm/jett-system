# Cron Jobs Installed - Summary

**Date:** 2026-02-07
**Status:** ✅ Both cron jobs active

---

## Installed Cron Jobs

### 1. Overnight 21M Sports Research ✅

**Schedule:** Daily at 2:00 AM

**Command:**
```bash
0 2 * * * /home/clawd/clawd/scripts/overnight-research-runner.sh
```

**What it does:**
- Searches for recent sports contracts (last 7-60 days)
- Prioritizes breaking news, recent contracts, notable deals
- Excludes Juan Soto, Shedeur Sanders, Shohei Ohtani
- Fetches BTC prices
- Saves research to `~/clawd/memory/21m-sports-verified-research.json`

**Logs:**
- Main log: `~/clawd/memory/research-logs/overnight-TIMESTAMP.log`
- Summary: `~/clawd/memory/research-logs/summary.log`

**Manual test:**
```bash
bash ~/clawd/scripts/overnight-research-runner.sh
```

---

### 2. Jett Health Monitor ✅

**Schedule:** Every 15 minutes

**Command:**
```bash
*/15 * * * * /home/clawd/clawd/scripts/jett-health-monitor.sh --fix >> /home/clawd/clawd/memory/health-monitor.log 2>&1
```

**What it checks:**
- Gateway running
- Slack plugin enabled
- No duplicate Slack bridges
- Enforcement hook active
- BOOT.md exists
- Context retention settings
- Recent activity
- Memory flush disabled

**Auto-fixes:**
- Enables Slack plugin if disabled
- Stops duplicate bridges
- Restarts gateway if needed

**Logs:**
- `~/clawd/memory/health-monitor.log`

**Manual test:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh
bash ~/clawd/scripts/jett-health-monitor.sh --fix  # with auto-fix
```

---

## View Active Cron Jobs

```bash
crontab -l
```

**Output:**
```
0 2 * * * /home/clawd/clawd/scripts/overnight-research-runner.sh
*/15 * * * * /home/clawd/clawd/scripts/jett-health-monitor.sh --fix >> /home/clawd/clawd/memory/health-monitor.log 2>&1
```

---

## Monitor Logs

### Overnight Research Logs

```bash
# View latest overnight run
ls -lt ~/clawd/memory/research-logs/ | head -5

# View specific log
tail -50 ~/clawd/memory/research-logs/overnight-20260208-020001.log

# View summary of all runs
cat ~/clawd/memory/research-logs/summary.log
```

### Health Monitor Logs

```bash
# View recent health checks
tail -50 ~/clawd/memory/health-monitor.log

# Follow live
tail -f ~/clawd/memory/health-monitor.log

# View only issues
grep "⚠\|✗" ~/clawd/memory/health-monitor.log
```

---

## What Happens Now

### Every 15 Minutes (Health Monitor)
```
Health check runs automatically
  ↓
Checks 8 critical systems
  ↓
IF issues found:
  → Auto-fixes (enables Slack, stops duplicates, etc.)
  → Logs the fix
  ↓
ELSE:
  → Logs "all healthy"
```

### Every Day at 2 AM (Overnight Research)
```
2:00 AM trigger
  ↓
Search breaking news (7 days)
  ↓
Search recent contracts (30 days)
  ↓
Search notable contracts (60 days)
  ↓
Select best contract
  ↓
Fetch BTC price
  ↓
Save research file
  ↓
Log results
```

---

## Expected Morning Workflow

### 1. Wake up

### 2. Check research results
```bash
cat ~/clawd/memory/21m-sports-verified-research.json
```

### 3. Review findings
- Selected contract
- Player, team, value
- BTC equivalent
- Sources

### 4. Validate if satisfied
```bash
node ~/clawd/automation/21m-sports-validator.js
```

### 5. Generate content
```bash
node ~/clawd/automation/21m-sports-verified-generator-v2.js
```

---

## Disable/Enable Cron Jobs

### Disable temporarily

```bash
crontab -e

# Add # at the beginning of line to comment out:
# 0 2 * * * /home/clawd/clawd/scripts/overnight-research-runner.sh
# */15 * * * * /home/clawd/clawd/scripts/jett-health-monitor.sh --fix >> /home/clawd/clawd/memory/health-monitor.log 2>&1
```

### Enable again

```bash
crontab -e

# Remove # from beginning of lines
```

### Remove completely

```bash
crontab -e

# Delete the entire line
```

---

## Troubleshooting

### Cron not running?

```bash
# Check cron service
ps aux | grep cron

# Start cron
sudo service cron start

# Check cron is enabled
sudo service cron status
```

### Jobs not executing?

```bash
# Check cron logs
grep CRON /var/log/syslog | tail -20

# Check script permissions
ls -la ~/clawd/scripts/jett-health-monitor.sh
ls -la ~/clawd/scripts/overnight-research-runner.sh

# Both should be executable (chmod +x)
```

### Research not working?

```bash
# Test manually
bash ~/clawd/scripts/overnight-research-runner.sh

# Check logs
tail -50 ~/clawd/memory/research-logs/overnight-*.log | tail -1
```

### Health monitor not fixing issues?

```bash
# Test manually
bash ~/clawd/scripts/jett-health-monitor.sh --fix

# Check logs
tail -50 ~/clawd/memory/health-monitor.log
```

---

## Current System Status

### Automation Active ✅
- Overnight research: Every day at 2 AM
- Health monitoring: Every 15 minutes with auto-fix

### Protections Active ✅
- Enforcement hook: Blocks fake 21M Sports content
- Context retention: 2 hours, 10 messages
- Memory flush: Disabled
- Identity enforcement: BOOT.md loaded every session

### Slack Integration ✅
- Plugin enabled
- Gateway running
- No duplicate bridges
- Jett responding

---

## Quick Commands Reference

```bash
# View cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Check health now
bash ~/clawd/scripts/jett-health-monitor.sh

# Auto-fix issues now
bash ~/clawd/scripts/jett-health-monitor.sh --fix

# Run research now (test)
bash ~/clawd/scripts/overnight-research-runner.sh

# View research logs
tail -20 ~/clawd/memory/research-logs/summary.log

# View health logs
tail -50 ~/clawd/memory/health-monitor.log

# Check Slack status
clawdbot status | grep -A 5 "Channels"

# Restart gateway
clawdbot gateway restart
```

---

## Summary

**Installed:**
1. ✅ Overnight research (2 AM daily)
2. ✅ Health monitoring (every 15 minutes)

**Benefits:**
- Fresh sports contract research every morning
- Automatic system health checks and repairs
- No more undetected Slack plugin issues
- No more stale data (Juan Soto references)
- Logs all activity for debugging

**Maintenance:**
- None required (runs automatically)
- Check logs occasionally if curious
- Manual override available anytime

**Result:**
- Jett stays healthy automatically
- Fresh research ready every morning
- Issues caught and fixed within 15 minutes

---

Last updated: 2026-02-07
Both cron jobs: ACTIVE
