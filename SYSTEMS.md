# Jett System Architecture

Last Updated: 2026-03-13

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
│  │   GWS CLI    │    │ Notion API  │                                        │
│  │(Email/Cal)   │    │(Lists only) │                                        │
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

### 4. Remote Access (Cloudflare Tunnel)

| Attribute | Value |
|-----------|-------|
| Domain | jettmissioncontrol.com |
| Tunnel | Cloudflare (via `cloudflared`) |
| Public Port | 3000 → jettmissioncontrol.com |

**How it works:**
- Task Manager Dashboard (port 3000) is exposed via Cloudflare tunnel
- All Level Up Cards and Podcast routes are proxied through port 3000
- Access remotely at: https://jettmissioncontrol.com

**Proxied Routes (via task-manager-server):**

| Path | Destination | Description |
|------|-------------|-------------|
| `/` | Dashboard UI | Main mission control |
| `/levelup/*` | Port 5000 | Level Up Cards app |
| `/inventory` | Port 5000 | Level Up inventory |
| `/customers` | Port 5000 | Level Up customers |
| `/orders` | Port 5000 | Level Up orders |
| `/invoices` | Port 5000 | Level Up invoices |
| `/marketplace` | Port 5000 | Level Up marketplace |
| `/analytics` | Port 5000 | Level Up analytics |
| `/card/*` | Port 5000 | Card detail pages |
| `/podcast` | Port 5001 | Podcast summarizer |
| `/watchlist` | Port 5002 | Watchlist dashboard |

**Local ports:**
| Port | Service |
|------|---------|
| 5000 | Level Up Cards (Python/Flask) |
| 5001 | Podcast Summarizer (Python/Flask) |
| 5002 | Watchlist Dashboard (Python/Flask) |

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

### 2. Research System (Content Growth)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Grok + Brave     │────▶│ jett-daily-     │────▶│ Content Bank     │
│ Search           │     │ research.js     │     │ (SQLite DB)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Research Types:**

| Type | Schedule | Script | Description |
|------|----------|--------|-------------|
| **Trending** | Mon/Thu 3AM | `jett-trending-research.js` | Current topics via Grok + Brave Search |
| **Deep** | Tue/Fri 3AM | `jett-daily-research.js` | Historic contracts via Spotrac |

**Scripts:**
- `automation/jett-trending-research.js` - Finds trending topics (Mon/Thu)
- `automation/jett-daily-research.js` - Deep research (Tue/Fri)
- `automation/jett-scraper.py` - Spotrac data fetcher
- `automation/brave-search.js` - Web search for research

**On-Demand:**
- `automation/jett-community-pulse.js` - Community intelligence on any topic (Reddit + X)

**Usage:**
```bash
node automation/jett-community-pulse.js "NIL deals college football"
```

---

### 3. eBay Scanner

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

### 4. Finance Monitor (Personal)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Brave Search     │────▶│ jett-finance-    │────▶│   Telegram        │
│ + Grok           │     │ monitor.js       │     │   (Personal)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Schedule:** 3x daily (6 AM, 12 PM, 6 PM)

**Focus Areas:**
- Bitcoin & ETFs (IBIT, MicroStrategy, corporate treasuries)
- AI & Tech (NVDA, earnings, chip news)
- Energy (nuclear, solar, oil/gas)
- Real Estate (REITs, mortgage rates)

**Scripts:**
- `automation/jett-finance-monitor.js` - Finance news monitor

**Watchlist:** `memory/jett-finance-watchlist.json`

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

### 6. Lead Generator (Level Up Digital)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cron Mon/Thu     │────▶│ lead-generator/  │────▶│ Google Sheets    │
│ 6AM              │     │ lead_generator.py│     │ (Leads)         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Location:** `/home/clawd/clawd/lead-generator/`

**What it does:**
- Searches Google Places API for local service businesses in Nassau County
- Filters: 5-150 reviews, 4.0+ rating, no/outdated website
- Brave Search for social media (FB/IG) on qualified leads
- Writes to Google Sheets (shared with Terry + Jett)

**Cron Jobs:**
- `Lead Generator Monday` - 6 AM Monday (Tier 1: pressure washing, painter, handyman)
- `Lead Generator Thursday` - 6 AM Thursday (Tier 2: landscaper, lawn care, roofing)

**Rotation:**
- Towns: Cycles through 25 Nassau County towns (3 per run)
- Industries: Tier 1 → Tier 2 → Tier 3 → repeat
- State: `/home/clawd/.lead-gen-state.json`

**Spreadsheet:** https://docs.google.com/spreadsheets/d/1Dl0VF4yASbUSXcuyS1km-Uo1fa6fZVfAYlRFl7h38gc

**API Keys:**
- Brave Search API: BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi
- Google Places API: AIzaSyAgmfVMDHDCbQdq06pCDiMCEeN-0lx-_d4

---

### 5. Jett Watchlist Monitor

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cron every 15min │────▶│ jett-watchlist-  │────▶│ Telegram Alerts  │
│ 6AM-8PM M-F      │     │ monitor.js       │     │ (Tiered)         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Scripts:**
- `automation/jett-watchlist-monitor.js` — Watchlist polling engine, fetches Yahoo Finance price/volume data + NewsAPI headlines for all tickers, fires tiered Telegram alerts (🟡 Watch, 🔴 Alert, 🚨 Urgent) on threshold crossings
- `automation/jett-watchlist-config.yaml` — Watchlist config: tickers, alert thresholds, cooldowns, global news keywords. Edit this file to add/remove tickers.
- `automation/jett-watchlist-state.json` — Auto-created at runtime, tracks cooldowns and seen news to prevent duplicate alerts
- `automation/watchlist-dashboard.py` — Flask web dashboard (port 5002) for managing tickers. Access via Mission Control > Watchlist tab or directly at `/watchlist`
- **Dashboard:** http://localhost:5002 (local) or http://jettmissioncontrol.com/watchlist (tunnel)

### 6. Morning Family Brief

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
| notion-assistant | /home/clawd/skills/notion-assistant/ | Google Calendar, Notion (lists/tasks/reminders) |
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
*/5 * * * *                 # Self-heal watchdog (gateway, PM2, Ollama)
@reboot                     # Auto-start on boot
```

**Self-Heal Watchdog** (`/home/clawd/scripts/self-heal.sh`):
- Runs every 5 minutes via crontab
- Completely independent of clawdbot
- Checks and restarts:
  - Gateway (openclaw-gateway)
  - PM2 dashboard (task-manager-server)
  - Ollama (local LLM)
  - Watchlist Dashboard (port 5002)
- Fixes MTU on eth0
- Emails Terry via Gmail if services fail to restart
- Log: `/tmp/self-heal.log`

---

## Failure Handling

| Failure | Handler |
|---------|---------|
| Gateway down | Self-heal watchdog restarts + emails Terry |
| PM2 dashboard down | Self-heal watchdog restarts + emails Terry |
| Ollama down | Self-heal watchdog restarts |
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
