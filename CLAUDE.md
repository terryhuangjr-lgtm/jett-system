# CLAUDE.md - Jett System Standing Orders
Last Updated: 2026-03-05

READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.

---
## WHO YOU ARE
You are operating on Jett — Terry Huang's AI automation system running on an H1 Mini PC (Ubuntu 24, WSL). Your job is to execute tasks reliably, follow these rules exactly, and never create technical debt.

---

## SYSTEM ARCHITECTURE (Single Source of Truth)

**Detailed Architecture:** See `SYSTEMS.md` for complete system diagram and documentation.

**Scheduling:**    clawdbot cron (all daily + weekly tasks run through clawdbot gateway)
**Process Mgmt:** PM2 (task-manager-server dashboard only — port 3000)
**Slack/Telegram:** clawdbot message send (via gateway)
**Watchdog:**     system crontab — restarts clawdbot-gateway if down (*/5 * * * *)
**Failure Alerts:** lib/notify-failure.js — Slack DM to Terry on any task failure
**Content:**      21m-daily-generator-v2.js → 21m-content-bank.json
**eBay:**         automation/deploy-ebay-scans.js
**Sports Betting:** sports_betting/orchestrator.py
**Config:**       config/jett-config.json
**Credentials:**  ~/.claude.json (API key)

**CRITICAL — Two clawdbot binaries exist. Only ONE is the real gateway:**
| Binary | Package | Config File | Status |
|--------|---------|-------------|--------|
| `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot` | `openclaw` | `~/.openclaw/openclaw.json` | ✅ ACTIVE — used by crontab |
| `/home/clawd/.npm-global/bin/clawdbot` | `clawdbot` (old) | n/a | ❌ ORPHANED — never called, config deleted |

**The only gateway config is `~/.openclaw/openclaw.json`. There is no other config file.**

**Commands:**
```
clawdbot cron list           # View all scheduled tasks
pm2 list                     # Check dashboard server status
crontab -l                  # View watchdog cron
```

**Notes:** Migrated from PM2 task-manager worker to clawdbot cron. Added failure notifications.
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

Changing the default model requires 4 steps. Skipping any will cause Jett to report the wrong model or use the wrong one.

1. **Edit `~/.openclaw/openclaw.json`** — update `agents.defaults.model.primary` and each agent entry in `agents.list` (slack + telegram)
2. **Archive all poisoned sessions** — old sessions cache the previous model in snapshots; if not cleared, Jett will report the old model even after config change:
   ```bash
   TS=$(date +%Y-%m-%dT%H-%M-%S)
   for f in /home/clawd/.openclaw/agents/slack/sessions/*.jsonl; do mv "$f" "${f}.deleted.${TS}"; done
   for f in /home/clawd/.openclaw/agents/telegram/sessions/*.jsonl; do mv "$f" "${f}.deleted.${TS}"; done
   ```
4. **Restart gateway:**
   ```bash
   pkill -f 'openclaw-gateway'; sleep 2
   nohup /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway >> /tmp/gateway.log 2>&1 &
   ```
5. **Verify:** Ask Jett "what model are you?" in a **new** Slack/Telegram message. Should match the new model.

---

## DAILY SCHEDULE

| Time | Task ID | Task | Output |
|------|---------|------|--------|
| 4:00AM | 75 | Podcast Processing | background |
| 7:00AM | 67 | Bitcoin Tweet Generation | email |
| 7:30AM | 60 | Sports Tweet Generation | email |
| 8:00AM | 78 | Morning Family Brief | #huangfamily |
| 9:00AM | varies | eBay Scan (daily rotation) | saved to results/ |
| 9:30AM | 79 | System Health Check | DM |
| 10:00AM | 38 | eBay Scans Deploy | email |
| 10:00AM | 71 | Sports Betting Scout | DM |
| 4:00PM | 72 | Sports Betting Pick | DM |

---

## SLACK CHANNELS

| Channel | Purpose |
|---------|---------|
| #21msports | Bitcoin + sports tweets |
| #podcastsummary | Podcast summaries |
| #levelupcards | eBay scan results |
| #huangfamily | Morning family brief |
| U0ABTP704QK | Terry's DM — errors, sports betting |

**ALL Slack posting uses clawdbot — never raw Slack API, never bot tokens:**
```bash
clawdbot message send --channel slack --target "#channel-name" --message "text" --json
clawdbot message send --channel slack --target "U0ABTP704QK" --message "text" --json
```

---

## ACTIVE SCRIPTS

| Script | Purpose |
|--------|---------|
| automation/21m-daily-generator-v2.js | 21M tweet generation + posting |
| automation/21m-content-bank.json | Verified content (58 entries) |
| automation/deploy-podcast-summary.js | Podcast deploy |
| automation/deploy-ebay-scans.js | eBay deploy |
| automation/add-to-content-bank.js | CLI tool to add new content entries |
| task-manager/server.js | Dashboard (port 3000) |
| task-manager/worker.js | Task scheduler |
| skills/podcast-summary/app.py | Podcast processor |
| sports_betting/orchestrator.py | Sports betting |
| sports_betting/notifiers/clawdbot_notifier.py | Sports betting Slack |
| skills/notion-assistant/morning_brief.py | Family brief |
| skills/notion-assistant/notion_client.py | Notion API client |
| ebay-scanner/run-from-config.js | eBay scanner |

**Note:** notion-assistant lives at /home/clawd/skills/notion-assistant/ NOT /home/clawd/clawd/skills/

---

## DEPRECATED — DO NOT USE

- automation/21m-claude-generator.js (replaced by v2)
- automation/deploy-21m-tweet.js (tasks 61/68 disabled)
- sports_betting/notifiers/slack_notifier_bot.py (broken token)
- sports_betting/notifiers/slack_notifier.py (empty webhook)

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
- Notion token: hardcoded in /home/clawd/skills/notion-assistant/notion_client.py
- Slack: handled by clawdbot internally
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

**Test Slack posting:**
```bash
clawdbot message send --channel slack --target "U0ABTP704QK" --message "test" --json
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

**WSL2 Auto-Start Configuration:**

Systemd is not available in WSL2 by default. Using crontab for auto-start instead:

```bash
# Current crontab (crontab -l):
@reboot /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway >> /tmp/gateway.log 2>&1
@reboot sleep 30 && cd /home/clawd/clawd && pm2 resurrect >> /tmp/pm2.log 2>&1
@reboot ollama serve
@reboot cd /home/clawd/level_up_cards && python3 app.py >> /home/clawd/level_up_cards/logs/server.log 2>&1

# Health check every 2 hours - restart gateway if down (NO --force, just let it restart naturally)
0 */2 * * * pgrep -f 'openclaw-gateway' > /dev/null || /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway >> /tmp/gateway.log 2>&1

# Health check every 5 min - restart Level Up Cards if down
*/5 * * * * curl -s http://localhost:5000 > /dev/null || cd /home/clawd/level_up_cards && python3 app.py >> /home/clawd/level_up_cards/logs/server.log 2>&1

# Daily config backup (1am)
0 1 * * * cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.daily-$(date +\%Y\%m\%d).bak

# Log rotation for gateway (truncate if over 50MB)
0 0 * * * find /tmp/gateway.log -size +50M -exec truncate -s 20M {} \; 2>/dev/null || true
```

To enable systemd in WSL2 (alternative):
```bash
# Add to /etc/wsl.conf:
[boot]
systemd=true
# Then run: wsl --shutdown (from PowerShell)
```

**Subagent Configuration:**
- Default subagent model: xai/grok-4-1-fast
- Fallback: ollama/llama3.1:8b (last resort only)
- Config location: `~/.openclaw/openclaw.json` → `agents.defaults.subagents`

**To spawn a subagent for coding tasks:**
```
spawn a subagent to [describe task]
```

**Example prompts:**
- "spawn a subagent to fix the bug in automation.js"
- "spawn a subagent to build a new script that does X"
- "spawn a subagent to review this code and suggest improvements"

**How it works:**
- Subagents run in parallel with reduced context
- Uses Haiku by default, falls back to llama3.1:8b if unavailable
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

### 3. Hook Configuration Fixed
**Problem:** Hook loader error: "Handler 'default' from research-protocol-enforcement is not a function"
**Solution:** Created `/home/clawd/clawd/hooks/research-protocol-enforcement.js` with proper exports (module.exports + module.exports.default).
**Status:** ✅ Hook loads successfully, protocol enforcement active.

### 4. Ollama Service Restored
**Problem:** Ollama process was not running; model discovery failing intermittently.
**Solution:** Restarted Ollama service (`pkill -f ollama; ollama serve &`).
**Verification:** API responding, 2 models available (llama3.1:8b, minimax-m2.5:cloud).
**Status:** ✅ Ollama operational.

---

## MODEL DISTRIBUTION (Post-Fix)

| Task | Model | Notes |
|------|-------|-------|
| Default (all automation) | xai/grok-4-1-fast | Cheaper than Haiku, same performance |
| Tweet generation (Bitcoin/Sports) | claude-sonnet-4-5 | Hardcoded in 21m-daily-generator-v2.js |
| Overnight research | ollama/llama3.1:8b | Local model - qwen3.5 was too slow on CPU |
| Slack/Telegram responses | xai/grok-4-1-fast | Agent default |
| Subagents | ollama/llama3.1:8b | Local model for subtasks |

---

## EBAY SCANNER FIXES - 2026-03-03

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

