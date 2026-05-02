# CLAUDE.md - Jett System Standing Orders
Last Updated: 2026-05-02

READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.

---

## START HERE - File Hierarchy

**Every session, read files in this order:**

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `CLAUDE.md` | You are here. Primary rules and orders. |
| 2 | `IDENTITY.md` | Who this agent is (personality, values, communication) |
| 3 | `USER.md` | Who Terry is |
| 4 | `SKILLS.md` | What I can do (capability index) |
| 5 | `SYSTEMS.md` | Master index of all automation systems |
| 6 | `memory/YYYY-MM-DD.md` | Today's context (recent events) |
| 7 | `MEMORY.md` | Long-term memory |

**New: Project Contexts** — All centralized in `~/clawd/context/*.md`. Agents: `search_files("project-name", path="~/clawd/context")` to load.

**Quick reference (read when needed):**
- `TOOLS.md` - Tools and model reference
- `HEARTBEAT.md` - What I check automatically
- Individual skill docs in `skills/*/SKILL.md`

**IMPORTANT: IDENTITY PROFILE**
Your identity definition lives in `IDENTITY.md` in this directory. The "WHO YOU ARE" description is NOT in this file — other agents (Hermes, etc.) also read CLAUDE.md so identity should be in your profile only. If you're Jett the Coder, your identity is in `IDENTITY.md`. Check it.

---

## DOCUMENTATION RULES (CRITICAL)

### File Responsibilities (Single Source of Truth)

| File | Owner | When to Update |
|------|-------|----------------|
| **`CLAUDE.md`** | All AI agents | Model routing changes, core rules, file hierarchy |
| **`SYSTEMS.md`** | All AI agents | System architecture, ports, cron schedules, services |
| **`IDENTITY.md`** | All AI agents | Personality/values changes |
| **`USER.md`** | All AI agents | User info changes |
| **`SKILLS.md`** | All AI agents | Add when building new skills or automation pipelines |
| **`HEARTBEAT.md`** | Jett only | Rewrite at session start with current system state |
| **`memory/YYYY-MM-DD.md`** | All AI agents | Daily work logs, what happened |
| **`MEMORY.md`** | All AI agents | Long-term memory (curated learnings) |
| **`skills/*/SYSTEM.md`** | All AI agents | Specific skill/system details |

> HEARTBEAT.md is a living file. Jett rewrites it at the start of every session.
> It is never edited by hand. If the date is stale, Jett failed to initialize.

### What to Update (Git-style Rules)

```
WHEN YOU MODIFY CODE → Update the corresponding SYSTEM.md
WHEN YOU ADD SCRIPT  → Add to SYSTEMS.md automation section
WHEN YOU CHANGE PORT → Update SYSTEMS.md ports table
WHEN YOU CHANGE MODEL → Update CLAUDE.md MODEL DISTRIBUTION
WHEN YOU FIX A BUG    → Add entry to SYSTEMS.md troubleshooting
WHEN YOU ADD CRON     → Update SYSTEMS.md cron table + CLAUDE.md examples
WHEN YOU ADD HEALTH CHECK → Update HEARTBEAT.md monitoring rules
WHEN YOU ADD NEW SYSTEM → Update SYSTEMS.md + MEMORY.md daily schedule
```

### Golden Rule
> If you modified code that affects system behavior, the docs must reflect it. **No exceptions.**

### Commit+Push After Doc Updates
```bash
git add [files] && git commit -m "docs: [what changed]" && git push
```

### Example
```
Task: Add new daily research cron at 3 AM
Action:
1. Add cron via clawdbot
2. Update SYSTEMS.md cron table
3. git add SYSTEMS.md && git commit -m "docs: add research cron at 3am" && git push
```

---

## Agent Boundary Rules — Cron Ownership

- ALL scheduled tasks run through clawdbot's cron scheduler ONLY
- NEVER create crons via system crontab (crontab -e) — use clawdbot cron create
- Before creating ANY new cron, run: clawdbot cron list | grep [task-name]
- Jett owns: tweets, research, eBay, lead gen, morning brief, podcasts, sports betting
- Hermes owns: ALL Shopify tasks, Superare watchdogs, Shopify reports
- Jett must NEVER execute or manage Hermes crons, even if they appear in the shared gateway
- If Jett sees a Hermes cron firing, IGNORE it — do not kill, restart, or interact with it
- One cron per task. No duplicates. Check before creating.

---

## HERMES AGENT (Parallel System — DO NOT CONFUSE WITH JETT)

Hermes is a **separate AI agent** running in parallel on the same machine. It handles Shopify/Superare operations and Terry's personal assistant tasks.

**Jett must NEVER:**
- Modify files in `~/.hermes/` (especially `shopify.py`, `run.js`, `pdf-generator.js`)
- Touch or restart `hermes-gateway-personal.service`
- Create, delete, or modify Hermes crons

**Key locations:**
| Item | Path |
|------|------|
| Personal config | `~/.hermes/profiles/personal/config.yaml` |
| Personal env | `~/.hermes/profiles/personal/.env` |
| Identity/rules | `~/.hermes/SOUL.md`, `~/.hermes/MEMORY.md` |
| Shopify script | `~/.hermes/shopify.py` (production — never edit) |
| Service | `hermes-gateway-personal.service` |

**Full docs:** See `SYSTEMS.md` → Core Services → Hermes Agent

---

## MODEL DISTRIBUTION

Each agent/profile has its own default model. Do not assume a single default.

| Agent / Profile | Default Model | Notes |
|-----------------|---------------|-------|
| **Jett (Coder)** — this agent | `deepseek-chat` | You are running this right now |
| **Hermes Personal Profile** | `grok-4-1-fast-reasoning` | Terry's personal assistant (xAI provider) |
| **Hermes Superare Profile** | `grok-4-1-fast` | Shopify ops + reports — no reasoning needed |
| **Hermes Coder Profile** | `deepseek-chat` | Dev tasks (unchanged) |
| **OpenClaw Jett (gateway)** | `grok-4-1-fast-reasoning` | Automation cron tasks + Telegram |
| **claude-sonnet-4-5** | — | 21M sports tweet generation ONLY (hardcoded in generator) |
| **BACKUP (everywhere)** | `grok-4-1-fast` | Default fallback if primary unavailable |

Refer to `TOOLS.md` or `SYSTEMS.md` for provider details.

---

## SYSTEM ARCHITECTURE

**Port Registry:** See `~/clawd/clawd/context/PORT-REGISTRY.md` for the complete list of reserved ports. Do NOT start anything on those ports without updating the registry.

**Detailed Architecture:** See `SYSTEMS.md` for complete system diagram and documentation.
- **Port 3000** — Jett Mission Control (Task Manager + all proxy routes) - `~/clawd/task-manager/server.js`
  - Root `/` redirects to `/mission-control` (SPA with 7 tabs)
  - Proxies: Level Up (5000), Podcast (5001), Gemma (3002)
  - Cloudflare tunnel: jettmissioncontrol.com → localhost:3000
- **Port 3002** — Gemma Assistant (content transformation)
- **Port 3003** — storeiq-dashboard (Shopify analytics for clients)
- **Port 5000** — Level Up Cards (Flask, systemd: jett-levelup.service)
- **Port 5001** — Podcast Summarizer (Flask, systemd: jett-podcast.service)
- **Port 5002** — Watchlist Dashboard (Flask, systemd: jett-watchlist.service)
- **Port 8000** — API Usage Dashboard

**NOTE: PM2 is DEAD.** As of the May 2026 system audit, PM2 was killed and disabled. All services use systemd. Do NOT use `pm2` commands — use `systemctl --user` instead.

```bash
systemctl --user list-units --type=service  # Show all running services
crontab -l                                   # View system cron (all jobs)
```

**Notes:**
- Some jobs migrated from clawdbot cron to system crontab (zero token cost):
  - Self-Heal Ping (`*/15 * * * *`) — dropped from 5 min to 15 min
  - PM2 Monitor (`*/15 * * * *`) — legacy, PM2 is dead
  - Performance Check (`0 */6 * * *`)
  - Watchlist Monitor (`*/15 6-20 * * 1-5`) — deterministic, only alerts when threshold breaches
  - Patch OpenClaw (weekly Sundays) — dropped from daily
- Morning Brief stays in clawdbot (low frequency)
- Other automation stays in clawdbot cron (agent turns required)

**systemd Services (9 total):**
| Service | Port | Restart Policy |
|---------|------|----------------|
| clawdbot-gateway.service | 18789/18791 | Restart=always |
| jett-task-manager.service | 3000 | Restart=on-failure |
| jett-gemma.service | 3002 | Restart=on-failure |
| jett-levelup.service | 5000 | Restart=always |
| jett-podcast.service | 5001 | Restart=always |
| jett-watchlist.service | 5002 | Restart=always |
| hermes-gateway.service | — | Restart=always |
| hermes-gateway-personal.service | — | Restart=always |
| hermes-gateway-coder.service | — | Restart=always |

Plus jett-keepalive.timer (fires every 2 min, auto-restarts any downed service).

**Scheduling:** clawdbot cron (primary) — all tasks run through clawdbot gateway

```bash
clawdbot cron list
```

---

## MODEL CHANGE PROCEDURE — FOLLOW EXACTLY
Changing the default model requires these steps. Skipping any can cause problems.

0. **Backup first (NEW SAFETY STEP)**
   config-protector backup

1. **Edit `~/.openclaw/openclaw.json`**
   Update `agents.defaults.model.primary` and every agent entry in `agents.list` (Telegram, etc.)

2. **Archive all poisoned sessions** (so old model isn't remembered)
   ```bash
   TS=$(date +%Y-%m-%dT%H-%M-%S)
   for f in /home/clawd/.openclaw/agents/telegram/sessions/*.jsonl; do mv "$f" "${f}.deleted.${TS}"; done
   ```

3. **Restart gateway:**
   ```bash
   pkill -f 'openclaw-gateway'; sleep 2
   nohup /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway >> /tmp/gateway.log 2>&1 &
   ```

4. **Verify:** Ask Jett "what model are you?" in a **new** Telegram message. Should match the new model.

---

## DAILY SCHEDULE

| Time | Task | Output |
|------|------|--------|
| 2:00AM Wed/Sat | Ecosystem Research Digest | email |
| 3:00AM Mon/Thu | Trending Research | content bank |
| 3:00AM Tue/Fri | Deep Research | content bank |
| 4:00AM | Podcast Processing | background |
| 6:00AM Mon | Lead Generator v3 | Google Sheets |
| 6:00AM Thu | Lead Generator v3 | Google Sheets |
| 7:00AM | Bitcoin Tweet Generation | email |
| 7:30AM | Sports Tweet Generation | email |
| 8:00AM | Morning Family Brief | Telegram |
| 9:00AM | eBay Scan (daily rotation) | email |
| 9:30AM | System Health Check | Telegram |
| 10:00AM | Sports Betting Scout | Telegram |
| 4:00PM | Sports Betting Pick | Telegram |

---

## NOTIFICATIONS

All messaging uses clawdbot — Telegram only (Slack removed March 2026):

```bash
clawdbot message send --channel telegram --target "5867308866" --message "text" --json
```

---

## ACTIVE SCRIPTS

| Script | Purpose |
|--------|---------|
| automation/21m-daily-generator-v2.js | 21M tweet generation + posting |
| automation/21m-content-bank.json | Verified content (58 entries) |
| automation/deploy-podcast-summary.js | Podcast deploy |
| automation/add-to-content-bank.js | CLI tool to add new content entries |
| automation/jett-ecosystem-research.js | Wed/Sat AI & tools digest |
| automation/jett-trending-research.js | Trending topics research (Mon/Thu) |
| automation/jett-daily-research.js | Deep research via Spotrac (Tue/Fri) |
| automation/jett-finance-monitor.js | BTC/ETF/AI/energy news (3x daily) |
| automation/jett-watchlist-check.js | Stock price alerts (deterministic) |
| automation/jett-community-pulse.js | On-demand Reddit + X intelligence |
| task-manager/server.js | Dashboard (port 3000) |
| gemma-assistant/server.js | Content transformation tool (port 3001) |
| ebay-scanner/run-from-config.js | eBay scanner (sends email) |
| ebay-scanner/vision-filter.js | AI Scout + AI Filter for card condition |
| ebay-scanner/deal-scorer-v2.js | Deal scoring (seller, price, freshness) |
| lead-generator/lead_generator_v3.py | Lead gen with retry, email extraction, AI qualify |
| skills/podcast-summary/app.py | Podcast processor |
| skills/morning-brief/morning_brief.py | Family brief (Google Calendar only) |
| automation/watchlist-dashboard.py | Watchlist dashboard (port 5002) |

---

## DASHBOARD AESTHETIC (Mission Control)

**Unified dark theme across all dashboards:**
- Background: `#0a0a0f`
- Card background: `#16161f`
- Border: `#2a2a3a`
- Accent: `#6366f1` (purple)
- Font: Inter (via Google Fonts)

**Tabs in Mission Control (`~/clawd/task-manager/dashboard/mission-control.html`):**
- System, Schedule, eBay, Level Up, Podcast, Gemma, Memory (7 tabs total)
- Native tabs: System, Schedule, eBay, Memory
- Proxy tabs: Level Up (iframe → `/proxy/levelup` → port 5000), Podcast (API proxy → port 5001), Gemma (iframe → `/proxy/gemma` → port 3002)

---

## DEPRECATED — DO NOT USE

- automation/21m-claude-generator.js (replaced by v2)
- automation/deploy-21m-tweet.js (tasks 61/68 disabled)
- automation/deploy-ebay-scans.js (legacy — run-from-config.js handles email directly)

---

## DISABLED TASKS

| ID | Task | Reason |
|----|------|--------|
| 61 | Sports Tweet Deployment | Replaced by v2 generator |
| 68 | Bitcoin Tweet Deployment | Replaced by v2 generator |
| 73 | BTC and Sports Research | Low quality output, not connected to content bank |

---

## 21M CONTENT SYSTEM

**Generator:** automation/21m-daily-generator-v2.js
**Content Bank:** automation/21m-content-bank.json (58 verified entries)
**Model:** claude-sonnet-4-5
**Categories:**
- sports: rookie_contract, nil_contract, broke_athlete, historic_contract, sports_business
- bitcoin: bitcoin_education

**Add new entries manually:**
```bash
node /home/clawd/clawd/automation/add-to-content-bank.js
```

**Cooldowns:** 90 days sports, 60 days bitcoin education

---

## GIT RULES

**Remote:** https://github.com/terryhuangjr-lgtm/jett-system.git
**Branch:** master
**Credentials:** stored, no token needed

**Commit format:**
```
feat: add new feature
fix: fix broken thing
docs: update documentation
chore: cleanup/maintenance
```

**NEVER commit:**
- *.db files
- *.pid files
- .env files
- memory/credentials.md
- stealth browser sessions
- node_modules

**Push workflow:**
```bash
cd /home/clawd/clawd
git add [specific files]
git commit -m "type: description"
git push
```
Always push at end of session after Terry confirms.

---

## CREDENTIALS LOCATIONS

- Anthropic API key: ~/.claude.json (primaryApiKey) AND /home/clawd/clawd/.env
- GWS (Google Workspace): jett.theassistant@gmail.com - credentials at ~/.config/gws/
- Other: /home/clawd/clawd/memory/credentials.md (gitignored)

---

## SIENNA LESSON LAUNCHER

**Live at:** `jettmissioncontrol.com/sienna`

A Claude-powered at-home learning activity generator for Sienna (age 3).
Built directly into the Task Manager server — no separate port or service.

**How it works:**
- Frontend: `/home/clawd/clawd/task-manager/dashboard/sienna.html`
- Session history: `/home/clawd/clawd/task-manager/dashboard/sienna-sessions.json`
- API routes: `/api/sienna/generate` and `/api/sienna/history` in `server.js`
- Model: `claude-haiku-4-5-20251001` (fast, cheap, perfect for this use case)
- API key loaded from `/home/clawd/clawd/.env` via `SIENNA_API_KEY`

**Generates 4 activities per session:**
1. Story — read-aloud themed story with a question at the end
2. Letters — phonics/letter recognition game, no writing needed
3. Numbers — counting game using household objects, numbers 1-10
4. Create — drawing or imaginative play with crayons and paper

**Session history** is saved automatically (last 50 sessions).

**Process management note:**
`server.js` is managed by `systemd` (jett-task-manager.service) only.
PM2 previously had a conflicting `task-manager-server` process — this was deleted on 2026-03-22.
Do NOT add server.js back to PM2. If server won't start, check `pm2 list` for ghost processes.

---

## EBAY SCANNER

**Location:** `/home/clawd/clawd/ebay-scanner/`
**Full docs:** See `SYSTEMS.md` → eBay Scanner section

**Key scripts:**
- `run-from-config.js` — Main scanner, sends HTML email directly
- `vision-filter.js` — AI card condition scoring (corners + centering only)
- `deal-scorer-v2.js` — Ranking algorithm (seller 20%, quality 20%, relevance 40%, freshness 10%, vision 10%)
- `raw-card-filter.js` — Filters out graded cards, soft-reject detection with vision override

**Cron:** Daily at 9AM, weekday rotation through 7 scan configs

---

## TROUBLESHOOTING

**Worker not running:**
```bash
pm2 restart task-manager-worker
pm2 logs task-manager-worker --lines 20
```

**Task stuck in running:**
```bash
sqlite3 /home/clawd/clawd/task-manager/tasks.db "UPDATE tasks SET status='pending', next_run=datetime('now') WHERE status='running';"
```

**Overdue tasks:**
```bash
sqlite3 /home/clawd/clawd/task-manager/tasks.db "SELECT id, name, next_run FROM tasks WHERE status='pending' AND next_run < datetime('now') ORDER BY next_run;"
```

**clawdbot-gateway down:**
```bash
clawdbot-gateway &
```

**API Usage Dashboard (port 8000) down:**
```bash
cd /home/clawd/jett-system/dashboard && bash start-dashboard.sh
```

**storeiq-dashboard (port 3003) down:**
```bash
cd /home/clawd/storeiq-dashboard && npm run dev -- --port 3003 --host
```

**Check all PM2 processes:**
```bash
pm2 list
```

**Test Telegram messaging:**
```bash
clawdbot message send --channel telegram --target "5867308866" --message "test" --json
```

**clawdbot message failing (JSON config error):**
```bash
# Check if config is valid
node -e "JSON.parse(require('fs').readFileSync('/home/clawd/.openclaw/openclaw.json'))"

# If broken, restore from backup
cp ~/.openclaw/openclaw.json.bak ~/.openclaw/openclaw.json
```

---

## WSL2 Auto-Start Configuration

Systemd is enabled.

Active services:
- clawdbot-gateway.service     (main AI gateway)
- jett-task-manager.service    (dashboard :3000)
- jett-gemma.service           (content tool :3002)
- jett-levelup.service         (cards :5000)
- jett-podcast.service         (podcasts :5001)
- jett-watchlist.service       (stocks :5002)
- hermes-gateway.service       (Hermes default)
- hermes-gateway-personal.service (Hermes personal)
- hermes-gateway-coder.service (Hermes coder)
- jett-keepalive.timer         (self-heal every 2 min)

Windows resiliency (prevents WSL shutdown on terminal close):
- `C:\Users\Jett\.wslconfig` with `shutdownOnDetach=false`
- Windows Startup script at `C:\Users\Jett\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\wsl-startup.bat` — starts WSL 60s after boot

Check status anytime with:
```bash
systemctl --user list-units --type=service
```

---

## Subagent Configuration

- Default subagent model: ollama/kimi-k2.5:cloud (free, reasoning)
- Note: openclaw doesn't support default model config. Specify model at spawn time.
- To use gemma: spawn with `model: "ollama/gemma4:e2b"`
- Fallback: xai/grok-4-1-fast (if Ollama unavailable)
- Config location: `~/.openclaw/openclaw.json` → `agents.defaults.subagents`

**To spawn a subagent for coding tasks:**
```
spawn agent "kimi" to [describe task]
```
Or just:
```
spawn a subagent to [describe task]
```

---

## CRITICAL: Node.js Scripts & Shopify

Every Node.js script touching Shopify MUST start with:
```javascript
require('dotenv').config({ path: '/home/clawd/.env', override: true });
```
Without this line the script will get 401 errors every time.

**Shopify API Rule:** Always use REST API not GraphQL for Shopify operations.
REST endpoints are simpler and more reliable. When in doubt use the wrapper:
```bash
bash /home/clawd/clawd/shopify-run.sh "<command>"
```

---

## COMPRESSION PRINCIPLES

1. Smallest change that works
2. Test before deploying
3. Document every structural change
4. Never break working systems to fix broken ones
5. If unsure, ask Terry before proceeding
