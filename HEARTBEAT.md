# HEARTBEAT.md - Health Monitoring & Auto-Healing

**Single source of truth for all system health monitoring.**

---

## System Watchdogs (System Crontab)

These run automatically at OS level - no alerts needed unless they fail repeatedly.

| Job | Schedule | What It Does | If Fails |
|-----|----------|--------------|----------|
| Gateway Watchdog | `0 */2 * * *` (every 2h) | Checks gateway running, restarts if not | Alert Terry |
| PM2 Resurrect | @reboot | Restarts PM2 processes on boot | Manual check |
| Ollama | @reboot | Starts Ollama on boot | Alert Terry |
| Level Up Cards | @reboot + */5min | Starts/restarts web app on port 5000 | Alert Terry |
| Config Backup | `0 1 * * *` (daily 1am) | Backup openclaw.json | No alert |
| Log Truncate | `0 0 * * *` (midnight) | Truncate gateway.log if >50MB | No alert |

---

## Clawdbot Health Crons

These run via Clawdbot gateway (alerts to main session on failure):

| Job | Schedule | What It Does |
|-----|----------|--------------|
| Gateway Ping | `*/10 * * * *` | Pings gateway health endpoint, alerts if down |
| PM2 Monitor | `*/15 * * * *` | Checks task-manager-server running, alerts if down |
| Reminder Checker | `*/5 * * * *` | Check for due reminders, post to Slack |
| Performance Check | `0 */6 * * *` | System health every 6 hours |

---

## Jett's Heartbeat Checks

When receiving heartbeat polls, check these silently:

### Every Check
1. **Gateway** - `pgrep -f 'openclaw-gateway'` running?
2. **Ollama** - responding? (`curl -s http://localhost:11434/api/tags`)
3. **Dashboard (3000)** - port responding?
4. **Level Up (5000)** - port responding?
5. **Podcast (5001)** - port responding?

### Hourly
1. **Git status** - uncommitted changes?
2. **Disk space** - over 80%?

### Daily (Background)
1. **Content bank** - available entries vs cooldown
2. **Memory search** - indexing working?

---

## Immediate Alerts (Alert Terry RIGHT AWAY)

- Gateway down AND won't restart
- MTU reverts to 1500 (all APIs fail)
- PM2 processes all down
- Any task failure from notify-failure.js
- Disk space over 90%

---

## Self-Healing Rules

**Attempt automatically before alerting:**

| Issue | Fix Command |
|-------|-------------|
| MTU wrong | `sudo ip link set dev eth0 mtu 1350` |
| Gateway down | `nohup /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway >> /tmp/gateway.log 2>&1 &` |
| Dashboard down | `pm2 restart task-manager-server` |
| Level Up down | `cd /home/clawd/level_up_cards && python3 app.py &` |
| Stale lock | `rm -f /tmp/clawd-*.lock` |

---

## What NOT to Alert On

- Normal task completions
- eBay scans with 0 results
- Sports betting no games available
- One-time service restarts that recover

---

## Quick Health Check Command

```bash
# Run this to check everything
echo "=== Gateway ===" && pgrep -f 'openclaw-gateway' && echo "=== PM2 ===" && pm2 list && echo "=== Ollama ===" && curl -s http://localhost:11434/api/tags | head -5 && echo "=== Ports ===" && ss -tlnp | grep -E '3000|5000|5001|8080'
```

---

*Only speak up when there's a problem. Silence is golden.*
