# CLAUDE.md - Jett System Standing Orders
Last Updated: 2026-04-04

READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.

---

## START HERE - File Hierarchy

**Every session, read files in this order:**

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `CLAUDE.md` | You are here. Primary rules and orders. |
| 2 | `IDENTITY.md` | Who I am (personality, values, communication) |
| 3 | `USER.md` | Who Terry is |
| 4 | `SKILLS.md` | What I can do (capability index) |
| 5 | `SYSTEMS.md` | Master index of all automation systems |
| 6 | `memory/YYYY-MM-DD.md` | Today's context (recent events) |
| 7 | `MEMORY.md` | Long-term memory (main sessions only) |

**Quick reference (read when needed):**
- `TOOLS.md` - Tools and model reference
- `HEARTBEAT.md` - What I check automatically
- Individual skill docs in `skills/*/SKILL.md`

---

## WHO YOU ARE
You are operating on Jett — Terry Huang's AI automation system running on an H1 Mini PC (Ubuntu 24, WSL). Your job is to execute tasks reliably, follow these rules exactly, and never create technical debt.

---

## DOCUMENTATION RULES (CRITICAL)

### File Responsibilities (Single Source of Truth)

| File | Owner | When to Update |
|------|-------|----------------|
| **`CLAUDE.md`** | All AI agents | Model routing changes, core rules, file hierarchy |
| **`SYSTEMS.md`** | All AI agents | System architecture, ports, cron schedules, services |
| **`IDENTITY.md`** | All AI agents | Personality/values changes (merged from SOUL) |
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

- ALL scheduled tasks run through OpenClaw's cron scheduler ONLY
- NEVER create crons via system crontab (crontab -e) — use openclaw cron create
- Before creating ANY new cron, run: openclaw cron list | grep [task-name]
- Jett owns: tweets, research, eBay, lead gen, morning brief, podcasts, sports betting
- Hermes owns: ALL Shopify tasks, Superare watchdogs, Shopify reports
- Jett must NEVER execute or manage Hermes crons, even if they appear in the shared gateway
- If Jett sees a Hermes cron firing, IGNORE it — do not kill, restart, or interact with it
- One cron per task. No duplicates. Check before creating.

---

## MODEL DISTRIBUTION (Single Source of Truth)

| Model | Purpose | When Used |
|-------|---------|-----------|
| **grok-4-1-fast** | DEFAULT for everything | Slack/Telegram, automation, research |
| **claude-haiku-4-5** | BACKUP if Grok down | Fallback when Grok unavailable |
| **claude-sonnet-4-5** | Content generation | 21M sports tweet generation ONLY |
| **kimi-k2.5:cloud** | Subagent / free cloud | Subagents via "spawn" command |

**Ollama:** kimi-k2.5:cloud installed (free cloud model). Main model for subagents.

---

## SYSTEM ARCHITECTURE

**Detailed Architecture:** See `SYSTEMS.md` for complete system diagram and documentation.
pm2 list                     # Check dashboard server status
crontab -l                  # View system cron (all jobs)
```

**Notes:** 
- Some jobs migrated from clawdbot cron to system crontab (zero token cost):
  - Gateway Ping (`*/10 * * * *`)
  - PM2 Monitor (`*/15 * * * *`)
  - Performance Check (`0 */6 * * *`)
  - Watchlist Monitor (`*/15 6-20 * * 1-5`) — deterministic, only alerts when threshold breaches
- Morning Brief stays in clawdbot (low frequency)
- Other automation stays in clawdbot cron (agent turns required)

pm2 list                    # check status
pm2 logs --lines 50         # recent logs
```

**PM2 Processes:**
- task-manager-server (port 3000) - dashboard only
- (task-manager-worker removed - scheduling via clawdbot cron)

**Independent:**
- clawdbot-gateway (manages itself, do NOT add to PM2)

**Scheduling:** clawdbot cron (primary) — all tasks run through clawdbot gateway
**Dashboard:** Reads from clawdbot cron at http://localhost:3000
```
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

| Time | Task ID | Task | Output |
|------|---------|------|--------|
| 2:00AM Wed/Sat | — | Ecosystem Research Digest | email |
| 3:00AM Mon/Thu | — | Trending Research | content bank |
| 3:00AM Tue/Fri | — | Deep Research | content bank |
| 4:00AM | 75 | Podcast Processing | background |
| 6:00AM Mon | — | Lead Generator v3 (auto-rotating) | Google Sheets |
| 6:00AM Thu | — | Lead Generator v3 (auto-rotating) | Google Sheets |
| 7:00AM | 67 | Bitcoin Tweet Generation | email |
| 7:30AM | 60 | Sports Tweet Generation | email |
| 8:00AM | 78 | Morning Family Brief | Telegram |
| 9:00AM | varies | eBay Scan (daily rotation) | email |
| 9:30AM | 79 | System Health Check | Telegram |
| 10:00AM | 71 | Sports Betting Scout | Telegram |
| 4:00PM | 72 | Sports Betting Pick | Telegram |

---

## SLACK CHANNELS

| Channel | Purpose |
|---------|---------|
| #21msports | Bitcoin + sports tweets |
| #podcastsummary | Podcast summaries |
| #levelupcards | eBay scan results |
| 5867308866 | Terry's Telegram DM — all notifications |

**ALL messaging uses clawdbot — Telegram only:**
```bash
# Telegram (primary - Slack removed 2026-03-07)
clawdbot message send --channel telegram --target "5867308866" --message "text" --json
```

---

## ACTIVE SCRIPTS

| Script | Purpose |
|--------|---------|
| automation/21m-daily-generator-v2.js | 21M tweet generation + posting |
| automation/21m-content-bank.json | Verified content (58 entries) |
| automation/deploy-podcast-summary.js | Podcast deploy |
| automation/deploy-ebay-scans.js | eBay deploy (legacy - email via run-from-config) |
| automation/add-to-content-bank.js | CLI tool to add new content entries |
| automation/jett-ecosystem-research.js | Wed/Sat AI & tools digest (Brave + X search → email) |
| automation/jett-trending-research.js | Trending topics research (Mon/Thu) |
| automation/jett-daily-research.js | Deep research via Spotrac (Tue/Fri) |
| automation/jett-finance-monitor.js | BTC/ETF/AI/energy news (3x daily) |
| automation/jett-watchlist-check.js | Stock price alerts (deterministic) |
| automation/jett-community-pulse.js | On-demand Reddit + X intelligence |
| task-manager/server.js | Dashboard (port 3000) |
| task-manager/worker.js | Task scheduler |
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
- Tab sizing: 11-14px (small, compact)

**Files updated:**
- `task-manager/dashboard/mission-control.html` - Main hub with CSS injection for embedded tabs
- `level_up_cards/templates/base.html` - Level Up Cards styling
- `podcast-summary/templates/style.css` + `static/style.css` - Podcast styling

**Tabs in Mission Control:**
- System, Schedule, Tasks (native)
- eBay, Level Up, Podcast, Gemma (embedded via iframe with dark theme injection)

---

## DEPRECATED — DO NOT USE

- automation/21m-claude-generator.js (replaced by v2)
- automation/deploy-21m-tweet.js (tasks 61/68 disabled)

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
**Model:** claude-sonnet-4-5-20250929
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
- Slack: handled by clawdbot internally (DEPRECATED - migrating to Telegram)
- GWS (Google Workspace): jett.theassistant@gmail.com - credentials at ~/.config/gws/
- Other: /home/clawd/clawd/memory/credentials.md (gitignored)

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

**Check all PM2 processes:**
```bash
pm2 list
```

**Test Telegram messaging:**
```bash
clawdbot message send --channel telegram --target "5867308866" --message "test" --json
```

**PM2 daemon restarted (all processes down):**
```bash
pm2 resurrect
pm2 start /home/clawd/clawd/task-manager/worker.js --name task-manager-worker
pm2 save
```

**clawdbot message failing (JSON config error):**
```bash
# Check if config is valid
node -e "JSON.parse(require('fs').readFileSync('/home/clawd/.openclaw/openclaw.json'))"

# If broken, restore from backup
cp ~/.openclaw/openclaw.json.bak ~/.openclaw/openclaw.json

# OR use config protector to fix safely
config-protector protect openclaw doctor --fix
```

**Slack posts failing with "argument missing":**
- Check for extra quotes in --target (use #channel, NOT "#channel")

---

## WSL2 Auto-Start Configuration (Updated March 2026 - Simplified Systemd)

Systemd is enabled.

Active services:
- clawdbot-gateway.service     (main AI gateway)
- jett-task-manager.service  (dashboard :3000)
- openclaw-patch.service       (safety patch on boot)

Check status anytime with:
```bash
systemctl --user status clawdbot-gateway.service
systemctl --user status jett-task-manager.service
```

Level-up-cards and watchlist-dashboard are started via their own startup scripts (kept simple).

---

**Subagent Configuration:**
- Default subagent model: ollama/kimi-k2.5:cloud (free, reasoning)
- Note: openclaw v2026.2.26 doesn't support default model config. Specify model at spawn time.
- To use gemma: spawn with `model: "ollama/gemma4:e2b"` in the sessions_spawn call
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

**Example prompts:**
- "spawn agent 'kimi' to fix the bug in automation.js"
- "spawn a subagent to build a new script that does X"
- "spawn a subagent to review this code and suggest improvements"

**How it works:**
- Subagents run in parallel with reduced context
- Uses Kimi K2.5:cloud (free via Ollama) by default, falls back to Grok if unavailable
- Results return to main conversation when complete

---

## COMPRESSION PRINCIPLES

1. Smallest change that works
2. Test before deploying
3. Document every structural change
4. Never break working systems to fix broken ones
5. If unsure, ask Terry before proceeding

---

## KILO PROCESS RULES — DO NOT VIOLATE

**NEVER kill any `kilo`, `bun`, or `kilo --model` process without explicit confirmation from Terry.**

- `kilo --model minimax*` processes are Terry's active coding sessions — killing them corrupts the TUI mid-session and causes a garbage output loop
- High CPU from kilo/minimax is **NORMAL USER ACTIVITY**, not a hung zombie
- If you detect high CPU from kilo: **REPORT it to Terry via Slack and ASK before doing anything**
- The correct message: "I see kilo/minimax using X% CPU — do you want me to kill it? (y/n)"
- **Never autonomously kill kilo processes** — this has broken sessions repeatedly

**Root cause history:** Jett detected `kilo --model minimax-m2.1:free` at 25% CPU, killed it autonomously (PID 2613), corrupted Terry's active kilo session, causing a garbage-output doom loop that required a full restart.

---

## CRITICAL PATTERN: CLAWDBOT CALLS

**ALWAYS use execFileSync with array args — NEVER string interpolation:**
```javascript
// ✅ CORRECT
const { execFileSync } = require('child_process');
execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
  'message', 'send', '--channel', 'slack',
  '--target', '#21msports',
  '--message', message
], { timeout: 15000, stdio: 'pipe' });

// ❌ WRONG - breaks on apostrophes, quotes, special chars
execSync(`clawdbot message send --target "#21msports" --message "${message}"`);
```

String interpolation causes `--target <dest> argument missing` errors when
message contains apostrophes or quotes. execFileSync array args bypass shell
entirely. This has been fixed in: worker.js, 21m-daily-generator-v2.js,
post-health-to-slack.js. Apply this pattern to ALL new clawdbot calls.

---

## GIT REPOS

| Repo | Path | Remote |
|------|------|--------|
| jett-system | /home/clawd/clawd | https://github.com/terryhuangjr-lgtm/jett-system.git |
| jett-skills | /home/clawd/skills | https://github.com/terryhuangjr-lgtm/jett-skills.git |
| ebay-scanner | /home/clawd/clawd/ebay-scanner | separate repo |

IMPORTANT: Skills live at /home/clawd/skills/ (NOT /home/clawd/clawd/skills/)
notion_client.py is gitignored due to hardcoded NOTION_TOKEN - back up manually
When modifying skills, cd to /home/clawd/skills and commit there, NOT jett-system

---

## SYSTEM STABILITY FIXES - 2026-03-03

**Issue:** System down March 3 morning - gateway not responding.
**Root Cause:** Config file corruption from `openclaw doctor --fix` command.

### 1. Config Protection Script Created
**Problem:** `openclaw doctor --fix` corrupted openclaw.json (5994 bytes → 560 bytes on March 2).
**Solution:** Created `/home/clawd/.local/bin/config-protector.sh` with these commands:
```bash
config-protector backup     # Backup before changes
config-protector validate   # Check if config is valid
config-protector protect <cmd>  # Run command safely with validation
config-protector restore    # Restore from latest backup
```
**Usage:** Before running any openclaw command that modifies config:
```bash
# Instead of: openclaw doctor --fix
# Use:
config-protector protect openclaw doctor --fix
```
**Or manually backup:** `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak`

### 2. Memory Search Enabled
**Problem:** Memory search was enabled but no embedding provider configured.
**Solution:** Configured local Ollama embeddings:
- Model: `nomic-embed-text` (installed 274MB)
- Provider: `ollama` (local)
- Config: `agents.defaults.memorySearch` in openclaw.json
- Added to crontab: `@reboot ollama serve`

**Status:**
```
Memory Search (telegram)
Provider: ollama
Model: nomic-embed-text
Vector: ready ✅
```

**What this enables:** Semantic search across memory files and sessions - ask "what did we discuss about Bitcoin?" and Jett finds it.

### 3. OpenClaw Downgraded to v2026.2.26 (from v2026.3.2)
**When:** 2026-03-04
**Problem:** v2026.3.2 health-monitor was aggressively restarting Slack/Telegram providers every ~30 min due to "stale-socket", eventually crashing the gateway overnight.
**Solution:** Downgraded to v2026.2.26 (previous stable).
**Impact:** Health-monitor is less aggressive, system more stable.
**Note:** memorySearch disabled (not supported in 2026.2.26).

### 4. Health-Monitor Disabled via Config (2026-03-05)
**Problem:** Even with v2026.2.26, health-monitor was killing the gateway every ~7-9 minutes. It was detecting Slack/Telegram as unhealthy and restarting the entire gateway.
**Solution:** Added `"channelHealthCheckMinutes": 0` to `gateway` section in openclaw.json.
**Config location:** `~/.openclaw/openclaw.json` → `gateway.channelHealthCheckMinutes`
**Impact:** Health-monitor no longer starts. Gateway stays stable.
**Note:** Also removed --force flag from gateway startup commands to prevent kill loops.

### 5. Health-Monitor Bug - Patched Library (2026-03-05)
**Problem:** Despite `channelHealthCheckMinutes: 0` in config, the health-monitor STILL started with 5-min interval and killed the gateway. This was a bug in openclaw 2026.2.26 - the config value was being ignored.
**Root Cause:** The code checked `healthCheckMinutes === 0` but the health-monitor still started anyway.
**Solution:** Patched the openclaw library directly to force-disable health-monitor:
- `/home/clawd/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/dist/gateway-cli-BSPSAjqx.js`
- `/home/clawd/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/dist/gateway-cli-CD7BHA7a.js`
**Fix:** Changed line ~21297 from:
  `const channelHealthMonitor = healthCheckMinutes === 0 ? null : startChannelHealthMonitor({`
  To:
  `const channelHealthMonitor = null; // FORCE DISABLED`
**Status:** ✅ Gateway now stays up (tested 11+ minutes without crash)
**Warning:** This patch will be lost if openclaw is reinstalled/updated.

### 6. Cron "run bash:" Not Executing (2026-03-05)
**Problem:** Bitcoin (7AM), Sports (7:30AM), Family Brief (8AM) crons fired OK but didn't post to Slack.
**Root Cause:** Grok 4.1-fast is smarter than previous models. When cron injects "run bash: <cmd>", Grok "reasons" about it instead of blindly executing - calls tools like cron list to investigate.
**Solution:** Added to MEMORY.md - prime agent to ALWAYS exec "run bash:" commands immediately:
```
## CRON "run bash:" Rule
When you receive a prompt starting with "run bash: <command>":
1. IMMEDIATELY exec the full command
2. Do NOT use tools/memory_search first
3. On success → reply NO_REPLY
4. On failure → DM Terry with error
```
**Files updated:** MEMORY.md, memory/2026-03-05.md
**Status:** ✅ VERIFIED WORKING - Cron posts via email instead of Slack (March 6)

### 7. Email via AgentMail (2026-03-06)
**Setup:** AgentMail account jett@agentmail.to for sending emails
**Script:** `lib/send-email.js` - sends via AgentMail API
**Usage:** `node lib/send-email.js --to "email" --subject "Subject" --body "Message"`
**Cron updates:** All tweet/eBay deploy crons now use `--email` flag to send via email instead of Slack
**Config:** `.env` contains `AGENTMAIL_API_KEY` and `AGENTMAIL_INBOX`

### 8. Podcast Summarizer - Direct MP3 + Email (2026-03-06)
**Overview:** Podcast dashboard now supports direct MP3 URLs and emails summaries
**Location:** `/home/clawd/skills/podcast-summary/`
**Dashboard:** http://localhost:5001
**Features:**
- Accepts direct MP3 URLs (best), RSS feeds, or YouTube (deprecated)
- Uses Grok 4.1 Fast for summarization
- Emails summary to terryhuangjr@gmail.com on completion
**Cron:** 4 AM daily - processes one podcast from queue
**Config:** `config.py` - Whisper model (tiny), Ollama model, etc

**How to add podcasts (BEST METHOD):**
1. Go to Podcast Index (podcastindex.org)
2. Find episode → Click download button
3. Copy the direct .mp3 URL
4. Add to queue: `python3 manage_queue.py add "MP3_URL" "Episode Title - Guest Name"`

**Weekly cleanup:** Sundays - deletes audio files older than 7 days

### 9. Research Script - Grok Only, No Ollama (2026-03-06)
**Problem:** Research script (`jett-daily-research.js`) had Ollama fallbacks that would trigger when Grok failed, causing unnecessary load and errors.
**Solution:** Removed ALL Ollama code paths - now uses ONLY Grok 4.1-fast via xAI API.
- `getJettResponse()`: Now fails cleanly if xAI unavailable (no fallback)
- `extractStructuredFact()`: Now uses Grok for JSON extraction (no Ollama)
**Email reports:** Now includes what was added to each content bank (Sports vs Bitcoin entries)
**Status:** ✅ Tested with dry-run - working correctly

### 10. Dual Gateway Conflict Resolved (2026-03-06)
**Problem:** System experiencing service flaps and instability due to dual gateway conflict.
- Old systemd service `clawdbot-gateway.service` was still registered and interfering
- New gateway started via cron `@reboot` was running fine
- Both fighting for port/state causing intermittent failures

**Solution:** Removed old systemd service:
```bash
systemctl --user stop clawdbot-gateway.service
systemctl --user disable clawdbot-gateway.service
rm ~/.config/systemd/user/clawdbot-gateway.service
openclaw doctor --repair
```
**Status:** ✅ Single gateway (cron-launched) now running cleanly

### 11. Health Checks Added (2026-03-06)
Added proactive monitoring via clawdbot cron:
- **Gateway Ping** (every 10 min): Pings health endpoint, alerts if down
- **PM2 Monitor** (every 15 min): Checks task-manager-server running, alerts if down
- **Dashboard Health** (port 3000): Updated to check Level Up Cards + Podcast
- **Ollama**: Now shows specific models (nomic-embed + minimax-m2.5)

### 12. Self-Heal Watchdog Added (2026-03-08)
Added independent watchdog script that runs every 5 minutes via system crontab:
- **Script:** `/home/clawd/scripts/self-heal.sh`
- **Checks:** Gateway, PM2 dashboard, Ollama
- **Fixes:** MTU, restarts dead services
- **Alerts:** Emails Terry via Gmail if services fail to restart
- **Log:** `/tmp/self-heal.log`

See `HEARTBEAT.md` for full monitoring documentation.

**Status:** ✅ All health checks operational

---

## SYSTEM STABILITY FIXES - 2026-03-02

**Issue:** System experiencing overnight crashes, config corruption, and cascading failures.
**Root Causes Identified & Fixed:**

### 1. Default Model Changed: Ollama → Haiku → Grok
**Problem:** Default model was `ollama/llama3.1:8b` (local). When Ollama crashed overnight, ALL automation tasks failed (tweets, eBay scans, sports betting, health checks).
**Solution:** Changed default to `anthropic/claude-haiku-4-5` in `openclaw.json` → `agents.defaults.model.primary` (later changed to xai/grok-4-1-fast for 5x cost savings)
**Impact:** Now if Ollama goes down, only the research task fails (isolated). Everything else uses Grok.
**Cost:** Grok 4.1-fast is ~5x cheaper than Haiku with similar performance.

### 2. Task Manager Worker Lock Fixed
**Problem:** Stale lock file (PID 22442) blocking task-manager restarts, preventing task scheduler from restarting.
**Solution:** Killed orphaned PID, cleared /tmp/task-manager.lock and /tmp/task-manager.pid, restarted PM2 task manager.
**Status:** ✅ Verified worker running cleanly, no deadlock errors.
**Note:** This doesn't block cron jobs (they're independent), but it prevented manual task execution.

### 3. Hook Configuration Fixed (then Removed)
**Problem:** Hook loader error: "Handler 'default' from research-protocol-enforcement is not a function"
**Original Fix:** Created hook with proper exports.
**2026-03-07 Update:** Removed hook entirely - it was a redundant second layer of verification. The content pipeline already has verification (21m-sports-validator.js) at the source. No need for a second gate.
**Status:** ✅ Removed permanently. Content verification happens in the pipeline, not at message send time.

### 4. Ollama Service Restored
**Problem:** Ollama process was not running; model discovery failing intermittently.
**Solution:** Restarted Ollama service (`pkill -f ollama; ollama serve &`).
**Verification:** API responding, 2 models available (llama3.1:8b, minimax-m2.5:cloud).
**Status:** ✅ Ollama operational.

---

## MODEL DISTRIBUTION

| Model | Purpose | When Used |
|-------|---------|-----------|
| **grok-4-1-fast** | DEFAULT for everything | Slack/Telegram responses, automation, subagents, research |
| **claude-haiku-4-5** | BACKUP if Grok down | Fallback when Grok unavailable |
| **claude-sonnet-4-5** | Content generation | 21M sports tweet generation ONLY (hardcoded) |

**Ollama models:** nomic-embed-text (embeddings), minimax-m2.5:cloud (memory search)

---

## EBAY SCANNER FIXES - 2026-03-17

### 1. Raw Card Filter Bug Fixed
**Problem:** Cards with "PSA 10" in title were slipping through because filter checked condition field first.
**Solution:** Reordered filter logic in `ebay-scanner/raw-card-filter.js` to check title for graded keywords FIRST.
**Status:** ✅ Tested - PSA/BGS now filtered regardless of condition field.

### 2. Global Rules Save Fixed
**Problem:** Dashboard saved global filters as nested `global_filters.global_filters`.
**Solution:** Fixed server.js API to unwrap correctly, fixed config structure.
**Status:** ✅ Global rules now save properly.

### 3. Dashboard UI Simplified
**Problem:** Redundant buttons and messy display.
**Solution:** Removed duplicate "Global Rules" button, simplified "Filter Rules" card with green border.
**Status:** ✅ Cleaner UI.

### 4. Vision Filter Added (Claude Haiku)
**Problem:** Needed to analyze card images for condition (centering, corners, surface).
**Solution:** Created `ebay-scanner/vision-filter.js` using Claude Haiku vision.
**Usage:** `node run-from-config.js [day] --vision`
**Status:** ✅ Working - analyzes card images and scores condition.

### 5. Run Scan Now Button
**Problem:** No way to trigger scans on-demand from dashboard.
**Solution:** Added "Run Scan Now" button to Mission Control eBay tab.
**API:** `POST /api/ebay/scan/:day`
**Status:** ✅ Working - triggers scan immediately and emails results.

### 6. Global Toggles Added
**Problem:** Needed to filter by listing type and card type globally.
**Solution:** Added toggles to Mission Control:
- **listing_type**: BIN, Auction, Both
- **card_type**: Raw, Graded, Both
**Status:** ✅ Working - saved to config and applied to all scans.

### 7. Email Direct from Scanner
**Problem:** Double emails (run-from-config.js + deploy-ebay-scans.js both sending).
**Solution:** Removed `deploy-ebay-scans.js --email` from cron commands. `run-from-config.js` now sends HTML email directly.
**Status:** ✅ Single email per scan.

### 8. GitIgnore Results
**Problem:** Large JSON result files bloating repo (2.3M lines).
**Solution:** Added `ebay-scanner/results/` to `.gitignore`.
**Status:** ✅ Results no longer committed.

### 9. Deterministic Cron Commands
**Problem:** eBay crons were using agentTurn (LLM) instead of systemEvent.
**Solution:** Verified all 7 eBay cron jobs use `systemEvent` with deterministic node commands.
**Commands:** `cd /home/clawd/clawd/ebay-scanner && node run-from-config.js [day]`
**Status:** ✅ Zero LLM token burn on eBay scans.

### 10. Listing Freshness Expanded to 60 Days
**Date:** 2026-03-19
**Problem:** Default listing age was 7-25 days, missing older overlooked auctions.
**Solution:** Increased `listing_age_max_days` to 60 in `task-manager/ebay-scans-config.json` and default in `raw-card-filter.js`.
**Status:** ✅ Now scans 60 days of listings to catch more overlooked raw cards.

### 11. Lowered Seller Feedback Threshold
**Date:** 2026-03-19
**Problem:** 98% minimum was too strict, filtering out legitimate sellers.
**Solution:** Lowered `seller_feedback_min` to 97% in config and raw-card-filter.js.
**Status:** ✅ Now includes more sellers with 97-98% feedback.

### Next Step: Boost Title Accuracy Weighting
- Increase player/year/brand match weighting in scoring algorithm
- Better differentiate perfect matches from near-misses

### 12. Hybrid Scoring Tweak (Mar 2026)
**Problem:** Exact player+year+brand matches weren't ranking high enough
**Solution:** 
- Increased searchRelevance weight to 45% (from 40%)
- Decreased listingFreshness to 10% (from 15%)
- Added perfect-match bonus (+5 pts) for player + year + brand/set
- Stronger wrong-year penalty (-2 no year, -4 wrong year)
**File:** `ebay-scanner/deal-scorer-v2.js`
**Status:** ✅ Deployed

### 13. Vision Override for Soft Rejects (Mar 2026)
**Problem:** Cards with "graded" in title (but not PSA/BGS) were being filtered out
**Solution:**
- Added soft-reject detection in raw-card-filter.js (keywords: "graded", "authenticated", "certified")
- Modified multi-search.js to run vision on soft-rejects
- If vision score >= 7.5 and confidence not low, override and keep as raw
**Files:** `raw-card-filter.js`, `multi-search.js`
**Status:** ✅ Deployed (currently 0 soft-rejects because eBay search already filters "graded")

### 14. Tighten Search Query & Excludes (Mar 2026)
**Problem:** Too many junk items (mystery, pack, lot) in results
**Solution:**
- Added comprehensive exclude words to config: mystery, pack, packs, lot, lots, box, sealed, break, bundle, hobby, retail, reprint, blaster, fat pack, mega box
- Modified ebay-browse-api.js to include custom excludes in eBay query URL (not just post-filter)
- Excludes now applied at query level for better filtering
**Files:** `task-manager/ebay-scans-config.json`, `ebay-browse-api.js`
**Results:** Junk items: 12 → 0

### 15. Further Title Accuracy Boost (Mar 2026)
**Problem:** Exact player+year+brand matches needed more weight
**Solution:**
- Increased perfect-match bonus: 5 → 6 points
- Added premium set bonus: +2 for Finest, Prizm, Optic, Select, Chrome, Update
- Results now show "Premium set: finest" in relevance matches
**File:** `deal-scorer-v2.js`

### 16. Vision Score Weighting (Mar 2026)
**Problem:** Image condition wasn't directly impacting final ranking
**Solution:**
- Added 10% weight for visionScore in deal scorer
- Weights now: Seller 20%, Quality 20%, Relevance 40%, Freshness 10%, Vision 10%
- Cards with better vision scores (corners, centering, surface) now rank higher
**File:** `deal-scorer-v2.js`

### 17. Vision Focus - Corners & Centering Only (Mar 2026)
**Problem:** Surface is impossible to assess reliably from card images
**Solution:**
- Removed surface from vision scoring entirely
- Vision now ONLY scores corners (50%) and centering (50%)
- Added heavy penalty for bad corners/centering (< 6 = 30% off)
- 27 cards passed vision vs 53 before (much stricter)
**File:** `vision-filter.js`

---

## WHAT TO MONITOR

1. **Ollama stability overnight** — If it keeps dying, add health check cron job
2. **Config corruption** — If happens again, add validation check to health monitor
3. **Task manager worker** — Should stay "online" in `pm2 list`

If any fails again, refer to TROUBLESHOOTING section.

---

## HEALTH MONITOR DISABLED - 2026-03-02

**Why:** Task-manager-worker was disabled (migrated to clawdbot cron). Health monitor was checking for its lock file every 15 minutes and sending false "Task Worker DOWN" alerts.

**Action Taken:**
- Removed cron job: `*/15 * * * * jett-health-monitor.sh`
- Kept health-monitor.js file (not needed but harmless)
- System Health Check still runs daily @ 9:30 AM via clawdbot cron

**Result:** No more false hourly alerts. System stays quiet unless there's an actual problem.

---

## GOOGLE WORKSPACE MIGRATION - 2026-03-06

**Overview:** Migrated from AgentMail + Notion Calendar + Slack to Google Workspace (Gmail + Google Calendar + Telegram).

### What Changed

| Component | Before | After |
|----------|--------|-------|
| Email | AgentMail (jett@agentmail.to) | Gmail (jett.theassistant@gmail.com) via gws |
| Calendar | Notion Calendar DB | Google Calendar via gws |
| Messaging | Slack (DM to #huangfamily) | Telegram (DM to 5867308866) |
| System Alerts | Slack DM | Telegram DM |

### Implementation Details

**1. GWS CLI Installation & Auth**
- Installed: `npm install -g @googleworkspace/cli`
- Auth: `gws auth login -s drive,gmail,sheets,calendar`
- Account: jett.theassistant@gmail.com
- Credentials: `~/.config/gws/credentials.enc`

**2. Email Migration**
- Script: `lib/send-email.js` - rewritten to use gws gmail
- Usage: `node lib/send-email.js --to "email" --subject "Subject" --body "Message"`
- All cron jobs that send email now use this script

**3. Calendar Migration**
- Created: `skills/notion-assistant/gcal_client.py` - Google Calendar API via gws
- Updated: `morning_brief.py` - now reads from Google Calendar instead of Notion
- Still uses Notion for: shopping list, tasks, reminders

**4. Messaging Migration**
- Updated: `task-manager/health-monitor.js` - Telegram only
- Updated: `lib/notify-failure.js` - Telegram only
- Updated: `skills/notion-assistant/morning_brief.py` - Telegram only
- Removed all Slack posting code

### Commands Reference

```bash
# Test email
node lib/send-email.js --to "test@example.com" --subject "Test" --body "Message"

# Test Telegram
clawdbot message send --channel telegram --target "5867308866" --message "test" --json

# GWS Status
gws auth status

# List calendar events
gws calendar events list --params '{"calendarId": "primary", "timeMin": "2026-03-06T00:00:00Z", "timeMax": "2026-03-06T23:59:59Z"}'
```

### Files Modified

- `lib/send-email.js` - Email via GWS Gmail
- `skills/notion-assistant/gcal_client.py` - NEW - Google Calendar client
- `skills/notion-assistant/morning_brief.py` - Uses gcal_client.py
- `task-manager/health-monitor.js` - Telegram only
- `lib/notify-failure.js` - Telegram only

### Rollback (if needed)

- Email: Restore `lib/send-email.js.agentmail`
- Calendar: Revert morning_brief.py to use notion_client.get_today_events()
- Messaging: Add Slack back in health-monitor.js and notify-failure.js

### Status

- ✅ Phase 1: gws + authenticate
- ✅ Phase 2: Email → Gmail
- ✅ Phase 3: Calendar → Google
- ✅ Phase 4: Messaging → Telegram
- ⏳ Phase 5: Remove Slack (deferred to tomorrow)
- ⏳ Phase 6: Lead gen to Sheets (future)

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
- API key loaded from `/home/clawd/clawd/.env` via `SIENNA_API_KEY` block at top of `server.js`

**Generates 4 activities per session:**
1. Story — read-aloud themed story with a question at the end
2. Letters — phonics/letter recognition game, no writing needed
3. Numbers — counting game using household objects, numbers 1-10
4. Create — drawing or imaginative play with crayons and paper

**Session history** is saved automatically to `sienna-sessions.json` (last 50 sessions).
Recent themes are passed back to the API to avoid repeating content.

**Process management note:**
`server.js` is managed by `systemd` (jett-task-manager.service) only.
PM2 previously had a conflicting `task-manager-server` process — this was deleted on 2026-03-22.
Do NOT add server.js back to PM2. If server won't start, check `pm2 list` for ghost processes.

**To restart manually:**
`sudo systemctl restart jett-task-manager`

**To check logs:**
`tail -f /home/clawd/clawd/task-manager/logs/server.log`


## CRITICAL: Any Node.js script touching Shopify MUST start with:
require('dotenv').config({ path: '/home/clawd/.env', override: true });
## Without this line the script will get 401 errors every time.
## This applies to ANY script Jett writes, not just Shopify skills.

## MANDATORY — EVERY SHOPIFY SCRIPT
Every single Node.js script MUST have this as line 1:
require('dotenv').config({ path: '/home/clawd/.env', override: true });

Without this line the script gets 401 every time.
This is non-negotiable. No exceptions.

## Shopify API Rule
Always use REST API not GraphQL for Shopify operations.
REST endpoints are simpler and more reliable.
When in doubt use the wrapper:
bash /home/clawd/clawd/shopify-run.sh "<command>"

## Shopify API Rule
Always use REST API not GraphQL for Shopify operations.
REST endpoints are simpler and more reliable.
When in doubt use the wrapper:
bash /home/clawd/clawd/shopify-run.sh "<command>"
