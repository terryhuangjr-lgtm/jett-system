# Jett System Architecture

Last Updated: 2026-03-06

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JETT SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │  Telegram   │     │    Gmail    │     │  Dashboard  │                  │
│  │  (Primary)  │     │   (GWS)     │     │  (:3000)    │                  │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             ▼                                               │
│                  ┌─────────────────────┐                                   │
│                  │  Clawdbot Gateway   │                                   │
│                  │   (Port 18789)      │                                   │
│                  │  - Message handling │                                   │
│                  │  - Cron scheduler   │                                   │
│                  │  - Telegram only    │                                   │
│                  └──────────┬────────────┘                                   │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│  │   PM2       │    │   Scripts   │    │   Skills    │                    │
│  │  (Server)   │    │ (Automation)│    │ (External)  │                    │
│  │  :3000      │    │             │    │             │                    │
│  └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐                                        │
│  │   GWS CLI   │    │ Notion API  │                                        │
│  │ (Email/Cal) │    │ (Lists)     │                                        │
│  └─────────────┘    └─────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. Clawdbot Gateway (Primary Controller)

| Attribute | Value |
|-----------|-------|
| Process | `openclaw-gateway` |
| Port | 18789 (WS), 18791 (canvas), 18792 (browser) |
| PID | 680 |
| Auto-start | Via crontab @reboot |
| Health check | `*/10 * * * *` (clawdbot cron) + `0 */2 * * *` (crontab) |

**Responsibilities:**
- Message routing (Telegram → Jett)
- Cron job scheduling and execution
- Agent session management
- Health monitoring

**Logs:** `/tmp/openclaw/openclaw-YYYY-MM-DD.log`

---

### 2. Task Manager Dashboard (Port 3000)

| Attribute | Value |
|-----------|-------|
| Process | `task-manager-server` (PM2) |
| Port | 3000 |
| PID | 445 |
| Auto-start | Via `pm2 resurrect` on reboot |

**Responsibilities:**
- Web dashboard showing cron jobs
- Reads from clawdbot cron API
- Health check display

**API Endpoints:**
- `GET /api/tasks` - List all cron jobs (from clawdbot)
- `GET /` - Dashboard UI

---

### 3. Ollama (Local LLM)

| Attribute | Value |
|-----------|-------|
| Process | `ollama serve` |
| Auto-start | Via crontab @reboot |
| Models | nomic-embed-text (embeddings), minimax-m2.5:cloud |

**Note:** Ollama runs for memory search embeddings + minimax. All other tasks use Grok/Haiku.

---

## Scheduling Systems

### Primary: Clawdbot Cron

**Command:** `clawdbot cron list`

| Task ID | Name | Schedule | Status |
|---------|------|----------|--------|
| e9b801b1 | Gateway Ping | */10 * * * * | idle |
| 99986221 | PM2 Monitor | */15 * * * * | idle |
| 2e634eff | Reminder Checker | */5 * * * * | ok |
| c5087e50 | Performance Check | 0 */6 * * * | ok |
| 5b2e8a15 | Bitcoin Tweet | 0 7 * * * | ok |
| 8caf62e2 | Sports Tweet | 30 7 * * * | ok |
| de3f5203 | Morning Family Brief | 0 8 * * * | ok |
| 7da794a0 | Podcast Queue Nightly | 0 4 * * * | ok |
| 34f4d211 | eBay Scan Monday | 0 9 * * 1 | ok |
| cb846aad | eBay Scan Tuesday | 0 9 * * 2 | ok |
| cf2665e4 | eBay Scan Wednesday | 0 9 * * 3 | idle |
| ccedb5e5 | eBay Scan Thursday | 0 9 * * 4 | idle |
| 07ceb4b8 | eBay Scan Friday | 0 9 * * 5 | ok |
| 9b58aa01 | eBay Scan Saturday | 0 9 * * 6 | idle |
| 6e1b794f | eBay Scan Sunday | 0 9 * * 0 | idle |

---

## Automation Pipelines

### 1. 21M Content System (Tweets)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ 21m-content-     │────▶│ 21m-daily-       │────▶│   Slack          │
│ bank.json        │     │ generator-v2.js  │     │   #21msports     │
│ (58 entries)     │     │ (Sonnet 4-5)     │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Scripts:**
- `automation/21m-daily-generator-v2.js` - Generates tweets
- `automation/21m-content-bank.json` - Verified content pool
- Cooldowns: 90 days (sports), 60 days (bitcoin)

---

### 2. eBay Scanner

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ task-manager/   │────▶│ ebay-scanner/    │────▶│   Slack          │
│ ebay-scans-     │     │ run-from-config  │     │   #levelupcards  │
│ config.json     │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Scripts:**
- `ebay-scanner/run-from-config.js` - Runs scans from config
- `automation/deploy-ebay-scans.js` - Posts results to Slack

**Config:** `task-manager/ebay-scans-config.json`

---

### 3. Podcast Summary

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User shares      │────▶│ podcast-summary/ │────▶│   Slack          │
│ YouTube URL      │     │ summarize.py     │     │   #podcastsummary│
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Skill:** `/home/clawd/skills/podcast-summary/`

---

### 4. Sports Betting

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Orchestrator     │────▶│ Scout (9AM)      │────▶│   Slack DM       │
│ sports_betting/  │     │ Pick (4PM)       │     │   (Terry)        │
│ orchestrator.py  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Scripts:**
- `sports_betting/orchestrator.py` - Main runner
- `skills/sports-betting/notifiers/clawdbot_notifier.py` - Slack alerts

---

### 5. Morning Family Brief

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cron 8AM         │────▶│ notion-assistant/│────▶│   Slack          │
│                  │     │ morning_brief.py  │     │   #huangfamily   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Skill:** `/home/clawd/skills/notion-assistant/`

---

## Skills (External)

| Skill | Location | Purpose |
|-------|----------|---------|
| 21m-sports-generation | /home/clawd/skills/21m-sports-generation/ | Sports content validation |
| ebay-scan | /home/clawd/skills/ebay-scan/ | eBay scanning |
| notion-assistant | /home/clawd/skills/notion-assistant/ | Notion API, family brief |
| podcast-summary | /home/clawd/skills/podcast-summary/ | Podcast transcription/summary |
| sports-betting | /home/clawd/skills/sports-betting/ | Sports betting picks |

---

## Message Delivery

### Primary Channel: Telegram

| Target | Purpose |
|--------|---------|
| 5867308866 | Terry's DM (system alerts, failures, direct messages) |

### Command Pattern

**ALWAYS use execFileSync with array args:**
```javascript
execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
  'message', 'send', '--channel', 'telegram',
  '--target', '5867308866',
  '--message', message
], { timeout: 15000, stdio: 'pipe' });
```

### Legacy: Slack (DEPRECATED)

Slack is being phased out. Currently:
- All cron job outputs → Email (Gmail)
- System alerts → Telegram DM
- Morning brief → Telegram DM

See: `docs/MIGRATION-ROADMAP.md`

---

## Data Storage

| Type | Location |
|------|----------|
| Config | `~/clawd/config/jett-config.json` |
| Memory | `~/clawd/clawd/memory/` |
| Research | `~/clawd/clawd/memory/21m-*-verified-research.json` |
| Logs | `/tmp/openclaw/`, `/tmp/gateway.log` |
| Backups | `~/.openclaw/openclaw.json.daily-*.bak` |

---

## Git Repos

| Repo | Path | Remote |
|------|------|--------|
| jett-system | /home/clawd/clawd | https://github.com/terryhuangjr-lgtm/jett-system.git |
| jett-skills | /home/clawd/skills | https://github.com/terryhuangjr-lgtm/jett-skills.git |

---

## Process Management

### PM2 (Dashboard Only)
```
pm2 list                     # Check status
pm2 logs task-manager-server # View logs
pm2 restart task-manager-server
```

### Crontab
```
crontab -l                  # View watchdog cron
*/5 * * * *                 # Gateway health check
@reboot                     # Auto-start on boot
```

---

## Failure Handling

| Failure | Handler |
|---------|---------|
| Gateway down | Crontab watchdog restarts it |
| Task failure | `lib/notify-failure.js` → Telegram DM to Terry |
| Config corruption | Restore from `~/.openclaw/openclaw.json.daily-*.bak` |
| GWS auth issues | `gws auth status` to check, `gws auth logout && gws auth login` to re-auth |

---

## Google Workspace (GWS)

| Component | Account | Status |
|-----------|---------|--------|
| Gmail | jett.theassistant@gmail.com | ✅ Active |
| Google Calendar | jett.theassistant@gmail.com | ✅ Active |
| Google Drive | jett.theassistant@gmail.com | ✅ Active |
| Google Sheets | jett.theassistant@gmail.com | ✅ Active |

**CLI:** `gws` (installed via npm)

**Commands:**
```bash
gws auth status                    # Check authentication
gws gmail users messages list      # List emails
gws gmail users messages send      # Send email
gws calendar events list           # List calendar events
gws drive files list               # List Drive files
gws sheets spreadsheets list       # List spreadsheets
```

**Credentials:** `~/.config/gws/credentials.enc`

---

## Model Distribution

**Single source of truth:** See `CLAUDE.md` → MODEL DISTRIBUTION section.

---

## Troubleshooting

| Issue | Command |
|-------|---------|
| Gateway down | `clawdbot gateway --force &` |
| PM2 processes down | `pm2 resurrect` |
| Task stuck | `sqlite3 tasks.db "UPDATE tasks SET status='pending'..."` |
| Port 3000 down | `pm2 start task-manager/server.js --name task-manager-server` |
| Test Telegram | `clawdbot message send --channel telegram --target "5867308866" --message "test" --json` |
| Test GWS Email | `node lib/send-email.js --to "terryhuangjr@gmail.com" --subject "Test" --body "Message"` |
