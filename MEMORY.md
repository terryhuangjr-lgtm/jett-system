# MEMORY.md - Long-Term Memory

## Genesis (2026-01-25)

Born today. First conversation with Terry. He brought me online to be his 24/7 assistant — Jett.

**Key Context:**
- Terry is 41, Chinese American from NYC, family man (wife Donna, daughters Sia and Evie)
- Sports fanatic: Yankees, Knicks, Raiders
- Fitness-focused, plays pickup basketball and competitive softball
- Entrepreneur — main focus is Level Up Digital (AI automation agency) and @21MSports (Twitter/X)
- Bitcoin maximalist, doesn't trust fiat or government systems
- Into tech but doesn't code (that's my job)
- Active stock market investor
- Values directness, no BS, results over fluff

**My Role:**
Help with automation, find opportunities, handle tech/code, stay on top of sports/BTC/investing, and generally be his right hand.

---

## Daily Routine (MUST FOLLOW)

1. **Read CLAUDE.md first** — always check for system changes, updates, and standing orders before starting any task
2. **Read SOUL.md** — know who you are
3. **Read USER.md** — know who Terry is
4. **Read memory/YYYY-MM-DD.md** for today and yesterday

---

## System Architecture (Check CLAUDE.md for latest)

- **Scheduling:** clawdbot cron - ALL tasks run through clawdbot gateway
- **Process Mgmt:** PM2 - task-manager-server ONLY (dashboard on port 3000)
- **Slack:** clawdbot message send via gateway
- **Watchdog:** system crontab restarts clawdbot-gateway every 5min if down
- **Failure Alerts:** lib/notify-failure.js - Slack DM to Terry on any failure
- **Git:** https://github.com/terryhuangjr-lgtm/jett-system.git
- **Memory Search:** Ollama + nomic-embed-text (enabled March 2026)
- **Config Protection:** /home/clawd/.local/bin/config-protector.sh

## Key File Locations

- `/home/clawd/clawd/CLAUDE.md` - Standing orders, read first always
- `/home/clawd/clawd/SOUL.md` - Who you are
- `/home/clawd/clawd/USER.md` - Who Terry is
- `/home/clawd/clawd/automation/21m-daily-generator-v2.js` - Tweet generator (uses Sonnet)
- `/home/clawd/clawd/automation/21m-content-bank.json` - 58 verified entries
- `/home/clawd/clawd/automation/deploy-ebay-scans.js` - eBay deployment
- `/home/clawd/skills/notion-assistant/morning_brief.py` - Family brief (NOT in automation/)
- `/home/clawd/clawd/task-manager/server.js` - Dashboard (port 3000)
- `/home/clawd/clawd/sports_betting/orchestrator.py` - Sports betting
- `/home/clawd/clawd/lib/notify-failure.js` - Failure notifications
- `/home/clawd/.openclaw/openclaw.json` - OpenClaw config

## Model Usage

- **Haiku:** Default for all operations
- **Sonnet:** ONLY for 21M Sports content generation (manually called)
- **Ollama qwen3.5:** For subagents and research tasks

## Daily Task Schedule (from clawdbot cron list)

| Time | Task | Target |
|------|------|--------|
| 7:00 AM | Bitcoin Tweet | #21msports |
| 7:30 AM | Sports Tweet | #21msports |
| 8:00 AM | Morning Family Brief | #huangfamily |
| 8:30 AM | System Health Check | Terry DM |
| 9:00 AM | System Health Check | Terry DM |
| 9:00 AM | eBay Scan (rotation) | - |
| 10:00 AM | eBay Scans Deploy | #levelupcards |
| 10:00 AM | Sports Betting Scout | Terry DM |
| 4:00 PM | Sports Betting Pick | Terry DM |
| 3:00 AM | BTC and Sports Research | (every 2 days) |

## Known Issues and Fixes Applied

- **MTU fix:** WSL2 needs `sudo ip link set dev eth0 mtu 1350` - runs on startup
- **Gateway:** Managed via crontab (not systemd) with watchdog every 5min
- **Port 3000:** PM2 task-manager-server only
- **Channel fix:** Use `--target "#channel"` not `--target #channel`
- **Config corruption:** Use `config-protector.sh` before running openclaw commands
- **Weekly restart:** Gateway restarts every Sunday 3am to prevent stale processes
- **Daily backup:** Config backed up daily at 1am to `~/.openclaw/openclaw.json.daily-*.bak`
- **Log rotation:** Gateway log truncated if over 50MB

## Crontab (crontab -l)

```
@reboot gateway + pm2 + ollama
*/5 * * * * gateway watchdog
0 3 * * 0 weekly gateway restart
0 1 * * * daily config backup
0 0 * * * log rotation
```

## How to Check System State

```bash
clawdbot cron list           # What is scheduled
pm2 list                    # Dashboard status
curl -s localhost:3000/api/health  # Health API
ip link show eth0 | grep mtu  # MTU check (should be 1350)
ls ~/.config/systemd/user/   # Systemd services
crontab -l                  # All cron jobs
```

---

## Recent Updates (March 2026)

- **March 3, 2026:** Memory Search enabled with Ollama + nomic-embed-text
- **March 3, 2026:** Config protection script created
- **March 3, 2026:** OpenClaw upgraded to v2026.3.2
- **March 2, 2026:** Migrated from PM2 task-manager worker to clawdbot cron
