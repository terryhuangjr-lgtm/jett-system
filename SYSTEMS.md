# Jett System Architecture

Last Updated: 2026-05-12

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
│                  └──────────┬──────────┘                                   │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │   Systemd   │    │   Scripts   │    │   Skills    │                   │
│  │  (Server)   │    │ (Automation)│    │ (External)  │                   │
│  │  :3000      │    │             │    │             │                   │
│  └─────────────┘    └─────────────┘    └─────────────┘                   │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐                                        │
│  │   GWS CLI   │    │ Notion API  │                                        │
│  │(Email/Cal)  │    │(Lists only) │                                        │
│  └─────────────┘    └─────────────┘                                        │
│                                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  PARALLEL AGENT (independent process, different domain)                    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  Hermes Agent (Nous Research) — Shopify / Personal Assistant   │        │
│  │  Profiles: default (~/.hermes/), personal, coder, doctor, finance, leads │
│  │  Service: hermes-gateway-personal.service (systemd)            │        │
│  │  Default model: DeepSeek V4 Flash  |  Fallback: Grok 4.1-fast │        │
│  │  Cron owner: Supergel watchdog, Low Stock, Shopify reports     │        │
│  └────────────────────────────────────────────────────────────────┘        │
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
| Process | `server.js` |
| Port | 3000 |
| Auto-start | **Via systemd service (jett-task-manager.service)** |
| Service location | `~/.config/systemd/user/jett-task-manager.service` |

**Responsibilities:**
- Web dashboard showing cron jobs
- Reads from Hermes cron jobs.json (`~/.hermes/profiles/coder/cron/jobs.json`)
- Schedule tab now shows Hermes-managed crons (Content Calendar, Lead Gen, StoreIQ Auto-Sync)
- Health check display
- Sienna Lesson Launcher (AI learning for kids)

**Commands:**
```bash
systemctl --user status jett-task-manager.service
systemctl --user restart jett-task-manager.service
```

**NOTE:** Service was created 2026-04-21 after system moved to new house. Previously had no systemd service for auto-start.

**API Endpoints:**
- `GET /api/tasks` - List all cron jobs (from Hermes jobs.json)
- `GET /api/crons` - List all cron jobs with full details (from Hermes jobs.json)
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

### 4. Hermes Agent — Shopify / Personal Gateway

| Attribute | Value |
|-----------|-------|
| Framework | Nous Research Hermes Agent (Python venv) |
| Default profile | `~/.hermes/` (Superare/Shopify ops) |
| Personal profile | `~/.hermes/profiles/personal/` | ✅ Personal Gateway |
| Personal service | `hermes-gateway-personal.service` (systemd) | |
| **Coder profile** | **`~/.hermes/profiles/coder/`** | **✅ Main Coding Bot** |
| **Coder service** | **`hermes-gateway-coder.service` (systemd)** | |
| **Leads profile** | **`~/.hermes/profiles/leads/`** | **✅ Lead Gen Gateway** |
| **Leads service** | **`hermes-gateway-leads.service` (systemd)** | |
| **Doctor profile** | **`~/.hermes/profiles/doctor/`** | **✅ Health Monitor** |
| **Doctor service** | **`hermes-gateway-doctor.service` (systemd)** | |
| **Finance profile** | **`~/.hermes/profiles/finance/`** | **✅ Finance/Trading** |
| **Finance service** | **`hermes-gateway-finance.service` (systemd)** | |
| Platform | Telegram (separate bot from Jett's) |

**Responsibilities:**
- default (Superare): ALL Shopify operations for Superare (inventory, costs, draft orders, PDFs), Superare low-stock watchdog
- personal: Terry's personal assistant (coding, general queries, Gemini/Sonnet/Grok switching)
- coder: Main coding bot — dev work, system maintenance, utility tasks (deepseek-chat default)
- doctor: System health monitor every 30min — silence = healthy
- finance: Yahoo Finance stock/crypto price checks, Finnhub news, morning briefs, signal scans (Grok 4.1)
- leads: Lead generation — web design, voice agent, Shopify StoreIQ leads (Grok 4.1)

**Default model (personal profile):** `deepseek-v4-flash` via `custom:deepseek`
**Fallback model:** `grok-4-1-fast-reasoning` via `custom:api.x.ai`

**Model switching (Telegram):**
```bash
/model deepseek-v4-flash --provider custom:deepseek --global
/model grok-4-1-fast-reasoning --provider custom:api.x.ai --global
```

**Key files:**
- `~/.hermes/profiles/personal/config.yaml` — personal gateway config
- `~/.hermes/profiles/personal/.env` — Telegram bot token + allowed users
- `~/.hermes/SOUL.md` — Hermes identity (Superare ops agent)
- `~/.hermes/MEMORY.md` — Shopify hard rules + toolkit reference
- `~/.hermes/PRODUCTS.md` — Superare product/variant ID reference
- `~/.hermes/shopify.py` — All Shopify operations (DO NOT MODIFY without Terry approval)

**Commands:**
```bash
personal gateway status
personal gateway restart
journalctl --user -u hermes-gateway-personal.service -n 50 --no-pager
```

**Cron ownership (via OpenClaw scheduler):**
- Supergel V Watchdog: `fa206808-174a-4e73-9603-d457105443ac` (every 2hrs)
- Update Cron Cache: `fe6d7c10-ced5-4260-b280-aac7a3a20af3` (every 5min)
- Low Stock General: (every 2hrs)

**CRITICAL:** Jett must NEVER touch Hermes crons. Hermes is an independent agent.

---

### 4b. Doctor Agent (Hermes Profile)

| Attribute | Value |
|-----------|-------|
| Profile | `~/.hermes/profiles/doctor/` |
| Service | `hermes-gateway-doctor.service` (systemd user) |
| Telegram | @JettHermesDoctorBot |
| Model | grok-4-1-fast |
| Cron trigger | Doctor Health Check (5f1cfbfc) — `*/30 * * * *` |
| Trigger script | `~/.hermes/cron/doctor-health-check.py` |

**Checks:**
- 10 systemd services (active)
- 5 local endpoints (HTTP 200 on ports)
- Resource thresholds (RAM >85%, Disk >90%)
- Clawdbot cron errors (≥3 consecutive)
- **Ollama** process + required models (nomic-embed-text, minimax-m2.5:cloud)
- **Cloudflare tunnel** (jettmissioncontrol.com → HTTP 200 + "Mission Control")

**Rules:** NEVER auto-fixes. NEVER kills kilo/bun. Silence = healthy.
---

### 4c. Finance Agent (Hermes Profile)

| Attribute | Value |
|-----------|-------|
| Profile | `~/.hermes/profiles/finance/` |
| Service | `hermes-gateway-finance.service` (systemd user) |
| Telegram | @JettFinanceBot |
| Model | grok-4-1-fast-reasoning |
| Cron | `morning-brief` weekdays 7AM ET, `signal-scan` every 2h |

**Capabilities:**
- Yahoo Finance: stock/crypto price lookups, chart data
- Finnhub: news headlines for watchlist tickers
- Watchlist: `/home/clawd/dashboard/data/finance/watchlist.json`
- Full Terry financial context via SOUL.md

---

### 5. Gemma Assistant (Port 3002)

| Attribute | Value |
|-----------|-------|
| Process | `systemctl --user start jett-gemma.service` |
| Port | 3002 |
| Auto-start | Systemd (jett-gemma.service) |
| Model | Ollama gemma4:e2b |

**Purpose:** AI content transformation tool with preset prompts for:
- Article summarization (summary, bullets, takeaways)
- Email writing (professional, casual)
- Tweet generation (single, 21M-style, threads)
- Article analysis

**Endpoints:**
- `GET /` - Web UI
- `POST /api/process` - Process text with specified output type

**Usage:** Access via Mission Control → Gemma tab or directly at http://localhost:3001

**Added:** 2026-04-04

---

### 6. Remote Access (Cloudflare Tunnel)

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
| `/sienna` | Port 3000 | Sienna Lesson Launcher (AI learning for kids) |
| `/webhooks/shopify` | Port 3000 | Shopify webhook receiver (POST) — triggers StoreIQ sync |

**Local ports:**
|| Port | Service | systemd Unit | Restart |
||------|---------|-------------|---------|
|| 5000 | Level Up Cards (Python/Flask) | jett-levelup.service | always |
|| 5001 | Podcast Summarizer (Python/Flask) | jett-podcast.service | always |
|| 5002 | Watchlist Dashboard (Python/Flask) | jett-watchlist.service | always |

---

## Scheduling Systems

### Hermes Cron (primary scheduler)

All scheduled automation now runs via **Hermes Agent's built-in cron scheduler**.

**Management:**
```bash
hermes cron list              # View all jobs
hermes cron run <job_id>      # Run a job immediately
```

**Data source:** `~/.hermes/profiles/coder/cron/jobs.json`

**Active Jobs (Hermes Cron):**

| Name | Schedule | Type | Script |
|------|----------|------|--------|
| **Content Calendar** | Sun 9AM | `no_agent` | `content-calendar-ai.js` (Sonnet) |
| **Web Design Leads** | Mon 8AM | `no_agent` | `web-design-leads.js` (Grok) |
| **Voice Agent Leads** | Wed 8AM | `no_agent` | `voice-agent-leads.js` (Grok) |
| **Shopify StoreIQ Leads** | Fri 8AM | `no_agent` | `shopify-leads.js` (Grok) |
| **StoreIQ Auto-Sync** | Every 30m | Agent | Shopify→Supabase sync (kept as fallback) |
| **StoreIQ Webhook** | On Shopify event | Webhook | Instant sync via /webhooks/shopify |

**Migration status:** All lead gen crons migrated from PM2→Hermes. Content calendar rebuilt for 3 weekly posts (Mon Education, Wed Proof, Fri Pain Point). No OpenClaw/PM2 dependency for these jobs.

**Shell wrappers:** `~/.hermes/profiles/coder/scripts/*.sh` — each cron's no_agent entrypoint, using explicit Node v22 path.

### System Crontab (token-free, runs directly):
- Gateway Ping, PM2 Monitor, Watchlist Monitor
- Finance Monitor (AM/Midday/PM weekdays)
- Performance Check, Patch OpenClaw

**Clawdbot Cron** (uses LLM tokens):
- eBay Scans (all 7 days)
- Bitcoin Tweet, Sports Tweet
- Morning Family Brief, Weekly Summary
- Backup, Log Rotate
- Lead Generator, Podcast Queue, Research

### Clawdbot Cron (legacy — diminishing)

**Command:** `clawdbot cron list`

Tasks below still run via OpenClaw's embedded cron scheduler (LLM-based, higher cost):

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
| 34f4d211 | eBay Scan Monday | 0 9 * * 1 | node run-from-config.js monday |
| cb846aad | eBay Scan Tuesday | 0 9 * * 2 | node run-from-config.js tuesday |
| cf2665e4 | eBay Scan Wednesday | 0 9 * * 3 | node run-from-config.js wednesday |
| ccedb5e5 | eBay Scan Thursday | 0 9 * * 4 | node run-from-config.js thursday |
| 07ceb4b8 | eBay Scan Friday | 0 9 * * 5 | node run-from-config.js friday |
| 9b58aa01 | eBay Scan Saturday | 0 9 * * 6 | node run-from-config.js saturday |
| 6e1b794f | eBay Scan Sunday | 0 9 * * 0 | node run-from-config.js sunday |

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
| **Ecosystem** | Wed/Sat 2AM | `jett-ecosystem-research.js` | AI tools & skills digest (Brave + X search → email) |
| **Trending** | Mon/Thu 3AM | `jett-trending-research.js` | Current topics via Grok + Brave Search |
| **Deep** | Tue/Fri 3AM | `jett-daily-research.js` | Historic contracts via Spotrac |

### 2a. Ecosystem Research Digest

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cron Wed/Sat     │────▶│ Brave + Grok     │────▶│ HTML Email       │
│ 2AM              │     │ X Search         │     │ (terryhuangjr)   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Script:** `automation/jett-ecosystem-research.js`

**6 Topic Areas:**
1. OpenClaw & Agent Tools (ClawHub, MCP, Hermes)
2. Content Generation & Social (X automation, AI tools)
3. Sports Cards & Collecting (pricing APIs, grading tools)
4. Lead Generation (Google Maps scraping, outreach tools)
5. Web Scraping & Data (new scrapers, browser automation)
6. Local LLM & AI Updates (Ollama models, GPU inference)

**Flow per topic:**
1. 2 Brave web searches (3 results each → 6 web results)
2. 1 Grok X search via `/v1/responses` with `x_search` tool (past week)
3. Grok synthesis combining web + X sources into actionable findings

**Budget:** 12 Brave calls + 6 X searches per run (well under 40 cap)

**Crons:**
- `Ecosystem Research Wed` (e86a1cd9) — Wed 2 AM ET
- `Ecosystem Research Sat` (ebb75f36) — Sat 2 AM ET

**Scripts:**
- `automation/jett-trending-research.js` - Finds trending topics (Mon/Thu)
- `automation/jett-daily-research.js` - Deep research (Tue/Fri)
- `automation/jett-ecosystem-research.js` - Ecosystem digest (Wed/Sat)
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
- Per-scan settings: card_condition (raw/graded/both), listing_type (bin/auction/both)
- Each scan configured independently via Mission Control dashboard
- Dynamic output filenames: `{search-term}-{YYYY-MM-DD}.json` (e.g., `luka-doncic-psa-2026-03-22.json`)
- HTML email template: `templates/ebay-scan-email.html`
- Email uses most recent scan file regardless of day

**Email Template:** `templates/ebay-scan-email.html`
- White background, dark navy header (#0f1923)
- Table format: # | Card | Price | Score | Trust | Age | PSA 9 | PSA 10 | Time | Link
- Score badges: green (8.0+), amber (7.0+), red (<7.0)
- Trust column: Trusted (98%+ & 500+ sales), OK (95%+ or 100+ sales), Caution (below)
- Mobile responsive (hides Trust, Age, PSA, Time columns on small screens)
- No emojis in HTML - causes rendering issues in some email clients
- AUC/BIN badges per row, capture time for auctions

**Auction Features (March 2026):**
- eBay Browse API DOES return current bid prices for auctions (corrected!)
- Shows current bid, bid count, time remaining with color coding
- Capture time shown per auction row: "at 6:02am"
- Disclaimer note in summary bar for auction scans

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

### 6. Lead Generator (Level Up Digital) — 3 Hermes Cron Jobs

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Hermes Cron      │────▶│ Node.js Scripts  │────▶│ Google Sheets    │
│ (Sun/Mon/Wed/Fri)│     │ (Grok enrichment)│     │ (Level Up Leads) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Location:** `/home/clawd/skills/web-design-leads/` (all 3 scripts)

**Cron Entrypoints:** `~/.hermes/profiles/coder/scripts/*.sh`

**Data:** Google Sheets (Level Up Content + per-category lead sheets)

| # | Name | Schedule | Script | Enrichment Model |
|---|------|----------|--------|-----------------|
| 1 | **Web Design Leads** | Mon 8AM | `web-design-leads.js` | Grok (xAI) |
| 2 | **Voice Agent Leads** | Wed 8AM | `voice-agent-leads.js` | Grok (xAI) |
| 3 | **Shopify StoreIQ Leads** | Fri 8AM | `shopify-leads.js` | Grok (xAI) |

**Key differences from old system:**
- All 3 scripts use **Grok** (`grok-4-1-fast-reasoning`) for enrichment — 90% cost reduction vs Sonnet
- ~~No per-lead email drafting~~ → **1 Sonnet template draft per run** (generated from best lead, ~$0.03/call)
- Falls back to Anthropic Sonnet if `XAI_API_KEY` not set
- Env vars from `~/.hermes/profiles/leads/.env`

**What each script does:**
- **Web Design:** Google Places API → filter no-website businesses → Grok score (1-10) + inline draft → qualified leads (score ≥5 + phone) → Sheet + **1 Sonnet template draft**
- **Voice Agent:** Google Places API → service businesses → Grok enrichment (revenue estimates, fit) → Sheet + **1 Sonnet template draft (email + DM)**
- **Shopify/StoreIQ:** Playwright + Bing Search → find Shopify stores → Grok enrichment → Sheet + **1 Sonnet template draft (email + DM + LinkedIn)**

---

### 7. Content Calendar (Level Up Digital) — 3 Weekly Posts

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Hermes Cron      │────▶│ content-calendar- │────▶│ Google Sheets    │
│ (Sun 9AM)        │     │ ai.js (Sonnet)   │     │ (Level Up Leads) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Script:** `~/clawd/automation/content-calendar-ai.js` (Sonnet `claude-sonnet-4-6`)

**Strategy:** 3 high-quality posts/week > 7 mediocre ones. Focus on authentic content from real work.

| Day | Pillar | Focus | Platforms |
|-----|--------|-------|-----------|
| Monday | **Education** | Teach something useful with a cited stat. Screenshot idea from StoreIQ dashboard. | LinkedIn + X |
| Wednesday | **Demo/Proof** | Building in public. Raw screenshots of real tools — Hermes, Shopify, Telegram alerts. This is the most authentic content. | LinkedIn + X |
| Friday | **Pain Point** | Name a problem your audience has. No pitch. Let them come to you. | LinkedIn + X |

**Key rule:** Best content comes from actual work — not AI-generated images. Every post should suggest a real screenshot Terry can capture from his actual tools.

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

### Systemd (Primary)
```
systemctl --user status jett-task-manager.service
systemctl --user restart jett-task-manager.service
journalctl --user -u jett-task-manager.service -f
```

### Legacy: PM2 (Removed)
PM2 was previously used for task-manager-server but is no longer needed. Dashboard now runs via systemd.

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

|| Issue | Command |
||-------|---------|
|| Gateway down | `clawdbot gateway --force &` |
|| Task stuck | `sqlite3 tasks.db "UPDATE tasks SET status='pending'..."` |
|| Port 3000 down | `systemctl --user restart jett-task-manager.service` |
|| Test Telegram | `clawdbot message send --channel telegram --target "5867308866" --message "test" --json` |
|| Test GWS Email | `node lib/send-email.js --to "terryhuangjr@gmail.com" --subject "Test" --body "Message"` |

---

## System Audit 📋

Completed 2026-05-02. Results:

### Services — 0 Failed
All 10 systemd services running clean. Salon voice agent (salon-voice-agent.service) added 2026-05-05 — system-level (not --user), monitored by keepalive timer.

### Security — 2 HIGH Fixes Applied
- `.env` files hardened: `chmod 600` across all env files and GWS token cache
- CLI history redirected: `ln -sf /dev/null ~/.bash_history` (prevents credential leaks via terminal history)
- PM2 daemon killed: was using 177MB RAM idle with zero managed processes

### Performance — PM2 Eliminated
- PM2 removed from system. All services migrated to systemd.
- npm cache cleaned: 8.5GB freed
- RAM usage: 1.8GB of 27GB (6.6%)
- Storage: 893GB free on `/`

### Cron Optimization
- self-heal.sh: every 5 min → every 15 min (288→96 runs/day)
- patch-openclaw.sh: daily → weekly (Sundays)
- PM2 monitor cron: kept as legacy (PM2 is dead, no-weight task)

### Dependencies
- npm: 26 vulns fixed (1 critical, 16 high) → 9 remaining (all safe dev deps)
- `@anthropic-ai/sdk` updated to 0.92.0

### Git History Purge
- `memory/credentials.md` (Gmail password) and `ebay-scanner/credentials.json` (eBay app creds) scrubbed from entire history
- Repo: 97MB → 80MB
- Force-pushed to `master`
- `main` branch deleted

### Windows Resiliency
- `C:\Users\Jett\.wslconfig` with `shutdownOnDetach=false` — WSL survives terminal closure
- Windows Startup script launches WSL 60s after boot
