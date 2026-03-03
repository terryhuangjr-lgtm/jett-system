# HEARTBEAT.md - What Jett Checks Automatically

## Daily Health Check (9:30 AM via clawdbot cron)

**Only alert Terry if there's an issue. Otherwise stay quiet.**

### Health Report Format (only if issues found)
```
System issue detected:
- Problem: [what happened]
- Fix applied: [what Jett did]
- Status: [resolved or needs Terry]
```

## What to Monitor (silently)

### Every Check
1. **Gateway** - `pgrep -f 'openclaw-gateway'` running?
2. **Ollama** - models responding? (qwen3.5 available?)
3. **Dashboard** - port 3000 responding?
4. **Memory Search** - indexing current?

### Daily (in background)
1. **Git status** - uncommitted changes? (`git status`)
2. **Disk space** - over 80%? (`df -h`)
3. **Content bank** - available entries vs cooldown

## Immediate Alerts (ONLY these)

Alert Terry RIGHT AWAY:
- Gateway down and won't restart
- MTU reverts to 1500 (all APIs fail)
- PM2 dashboard down
- Any task failure from notify-failure.js
- Disk space over 90%

## What NOT to Alert On
- Normal task completions
- eBay scans with 0 results
- Sports betting no games available
- Hourly dashboard health checks (now disabled)

## Self-Healing Rules

Attempt automatically before alerting:

- **MTU wrong:** `sudo ip link set dev eth0 mtu 1350`
- **Gateway down:** `clawdbot gateway --force`
- **Dashboard down:** `pm2 restart task-manager-server`
- **Stale lock:** `rm -f /tmp/clawd-*.lock`

## Slack Posting Schedule

| Time | Task | Channel |
|------|------|---------|
| 7:00 AM | Bitcoin Tweet | #21msports |
| 7:30 AM | Sports Tweet | #21msports |
| 8:00 AM | Morning Family Brief | #huangfamily |
| 9:30 AM | System Health Check | Terry DM (only if issues) |
| 10:00 AM | eBay Deploy | #levelupcards |
| 10:00 AM | Sports Betting Scout | Terry DM |
| 4:00 PM | Sports Betting Pick | Terry DM |

## Background Maintenance (Automated)

These run automatically - no alerts needed:

- **Weekly (Sunday 3am):** Gateway restarts to prevent stale processes
- **Daily (1am):** Config backup to `~/.openclaw/openclaw.json.daily-*.bak`
- **Daily (midnight):** Gateway log truncated if over 50MB

---

*Only speak up when there's a problem. Silence is golden.*
