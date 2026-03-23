# Jett System Architecture

Last Updated: 2026-03-17

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
| Auto-start | Via systemd (clawdbot-gateway.service) |
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
| Process | `server.js` via `start.sh` |
| Port | 3000 |
| Auto-start | Via systemd service or `./start.sh` |
| **CRITICAL** | Must export PATH with NVM node - see `start.sh` |

**Responsibilities:**
- Web dashboard showing cron jobs
- Reads from clawdbot cron API
- Health check display

**Start command:**
```bash
cd /home/clawd/clawd/task-manager && ./start.sh
```

**NOTE:** The `start.sh` script exports PATH to include NVM node. This is required for clawdbot cron commands to work properly (requires Node v22+).

**API Endpoints:**
- `GET /api/tasks` - List all cron jobs (from clawdbot)
- `GET /` - Dashboard UI

---

### 3. Ollama (Local LLM)

| Attribute | Value |
|-----------|-------|
| Process | `ollama serve` |
| Auto-start | Via systemd (clawdbot-gateway.service) |
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
| `/sienna` | Port 3000 | Sienna Lesson Launcher (AI learning for kids) |

**Local ports:**
| Port | Service |
|------|---------|
| 5000 | Level Up Cards (Python/Flask) |
| 5001 | Podcast Summarizer (Python/Flask) |
| 5002 | Watchlist Dashboard (Python/Flask) |

---

## Scheduling Systems

**System Crontab** (token-free, runs directly):
- Gateway Ping, PM2 Monitor, Watchlist Monitor
- Finance Monitor (AM/Midday/PM weekdays)
- Performance Check, Patch OpenClaw

**Clawdbot Cron** (uses LLM tokens):
- eBay Scans (all 7 days)
- Bitcoin Tweet, Sports Tweet
- Morning Family Brief, Weekly Summary
- Backup, Log Rotate
- Lead Generator, Podcast Queue, Research

### Primary: Clawdbot Cron

**Command:** `clawdbot cron list`

| Task ID | Name | Schedule | Command |
|---------|------|----------|---------|
| e9b801b1 | Gateway Ping | */10 * * * * | - |
| 99986221 | PM2 Monitor | */15 * * * * | - |
| 2e634eff | Reminder Checker | */5 * * * * | - |
| c5087e50 | Performance Check | 0 */6 * * * | - |
| 5b2e8a15 | Bitcoin Tweet | 0 7 * * * | node 21m-daily-generator-v2.js --type bitcoin --email |
| 8caf62e2 | Sports Tweet | 30 7 * * * | node 21m-daily-generator-v2.js --type sports --email |
| de3f5203 | Morning Family Brief | 0 8 * * * | python3 morning_brief.py --post |
| 7da794a0 | Podcast Queue Nightly | 0 4 * * * | python3 process_queue_nightly.py |
| 34f4d211 | eBay Scan Monday | 0 9 * * 1 | run bash: node run-from-config.js monday |
| cb846aad | eBay Scan Tuesday | 0 9 * * 2 | run bash: node run-from-config.js tuesday |
| cf2665e4 | eBay Scan Wednesday | 0 9 * * 3 | run bash: node run-from-config.js wednesday |
| ccedb5e5 | eBay Scan Thursday | 0 9 * * 4 | run bash: node run-from-config.js thursday |
| 07ceb4b8 | eBay Scan Friday | 0 9 * * 5 | run bash: node run-from-config.js friday |
| 9b58aa01 | eBay Scan Saturday | 0 9 * * 6 | run bash: node run-from-config.js saturday |
| 6e1b794f | eBay Scan Sunday | 0 9 * * 0 | run bash: node run-from-config.js sunday |

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
│ task-manager/   │────▶│ ebay-scanner/    │────▶│   Email          │
│ ebay-scans-     │     │ run-from-config  │     │   terryhuangjr   │
│ config.json     │     │ (with vision)    │     │   @gmail.com     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
       │                         │
       │                   ┌─────▼─────┐
       │                   │ Vision     │
       │                   │ Filter     │
       │                   │ (Haiku)    │
       │                   └───────────┘
       │
       ▼
┌──────────────────┐
│ Mission Control  │
│ (:3000/ebay)    │
│ - Run Scan Now  │
│ - Global Toggles│
└──────────────────┘
```

**Scripts:**
- `ebay-scanner/run-from-config.js` - Runs scans from config, sends HTML email
- `ebay-scanner/vision-filter.js` - Claude Haiku vision for card condition analysis
- `automation/deploy-ebay-scans.js` - Emails latest scan results (finds most recent file automatically)

**Config:** `task-manager/ebay-scans-config.json`

**Features:**
- Vision scanning for card condition (using Claude Haiku)
- Global filters: listing_type (fixed_price/auction), card_mode (raw/graded)
- Run Scan Now button in Mission Control dashboard
- Dynamic output filenames: `{search-term}-{YYYY-MM-DD}.json` (e.g., `luka-doncic-psa-2026-03-22.json`)
- HTML email template: `templates/ebay-scan-email.html`
- Email uses most recent scan file regardless of day

**Email Template:** `templates/ebay-scan-email.html`
- White background, navy header (#1e3a5f)
- Table format: # | Card | Price | Score | Seller | Age | PSA 9 | PSA 10 | View
- Score badges: green (7.0+), navy (8.0+), red (9.0+)
- Mobile responsive (hides Age, PSA columns on small screens)
- Note: No emojis in HTML - causes rendering issues in some email clients

**Known Limitations:**
- **Auction prices are stale:** eBay Browse API only returns starting bid, not real-time current bids. Auction prices shown are from scan time. (March 2026)

**Cron (deterministic - no LLM):**
```bash
cd /home/clawd/clawd/ebay-scanner && node run-from-config.js [day]
```

---

### 4. Finance Monitor (Personal)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Brave Search     │────▶│ jett-finance-    │────▶│   Telegram        │
│ + Kimi K2.5     │     │ monitor.js       │     │   (Personal)     │
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
- Filters: 5-500 reviews, 4.0+ rating, no/outdated website
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
- `automation/jett-watchlist-check.js` — Deterministic price checker. Runs via crontab every 15 min (6AM-8PM M-F). Fetches live Yahoo Finance prices, compares to previous close, fires Telegram alert ONLY when thresholds breach. Zero token cost unless alert fires. Falls back to email if Telegram fails.
- `automation/watchlist-dashboard.py` — Flask web dashboard (port 5002) for managing tickers. Access via Mission Control > Watchlist tab or directly at `/watchlist`
- **Dashboard:** http://localhost:5002 (local) or http://jettmissioncontrol.com/watchlist (tunnel)
- **Cron:** System crontab (not clawdbot) — `*/15 6-20 * * 1-5`

### 6. Morning Family Brief

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cron 8AM         │────▶│ morning-brief/   │────▶│   Telegram       │
│                  │     │ morning_brief.py │     │   #huangfamily   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Location:** `/home/clawd/skills/morning-brief/`

**Note:** Removed Notion dependency (shopping list + tasks). Now uses Google Calendar only.

---

## Skills (External)

| Skill | Location | Purpose |
|-------|----------|---------|
| 21m-sports-generation | /home/clawd/skills/21m-sports-generation/ | Sports content validation |
| ebay-scan | /home/clawd/skills/ebay-scan/ | eBay scanning |
| morning-brief | /home/clawd/skills/morning-brief/ | Family brief (Google Calendar only) |
| podcast-summary | /home/clawd/skills/podcast-summary/ | Podcast transcription/summary |

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
# @reboot removed - now via systemd
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
