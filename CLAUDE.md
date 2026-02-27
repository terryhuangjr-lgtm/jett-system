# CLAUDE.md — Standing Orders for Jett System
> Read this file completely before making any changes. No exceptions.

---

## Who Runs This System

**Terry** — owner, decision maker. Not a developer. Needs plain English explanations.
**Jett** — the AI automation system running on this machine.
**Haiku** — handles daily operations (content generation, health checks, routine tasks).
**Sonnet** — handles strategic changes, new features, complex debugging.
**Claude Code** — used for structured development sessions only.

---

## Before You Touch Anything

Answer these questions first:

1. **What is currently running?** Run `ps aux | grep -E "node|python" | grep -v grep`
2. **What tasks are scheduled?** Run `clawdbot cron list`
3. **What is the DB state?** Run `sqlite3 ~/clawd/task-manager/tasks.db "SELECT id, name, status, next_run FROM tasks ORDER BY next_run LIMIT 15;"`
4. **Are there uncommitted changes?** Run `git status`

Do not proceed until you understand the current state.

---

## Model Rules

### Haiku (Daily Operations)
- ✅ Run scheduled tasks
- ✅ Generate content from existing systems
- ✅ Send Slack/Telegram notifications
- ✅ Read and write JSON state files
- ✅ Minor bug fixes in existing scripts (under 20 lines changed)
- ❌ Do NOT install new packages
- ❌ Do NOT modify task schedules
- ❌ Do NOT delete or rename files
- ❌ Do NOT commit to git
- ❌ Do NOT create new automation scripts
- ❌ Do NOT modify CLAUDE.md, AGENTS.md, or ecosystem.config.js

### Sonnet (Strategic Work)
- ✅ Everything Haiku can do
- ✅ Create new scripts (with Terry approval)
- ✅ Modify task schedules (with Terry approval)
- ✅ Install npm/pip packages
- ✅ Refactor existing code
- ✅ Write and run git commits
- ❌ Do NOT push to git without Terry confirming
- ❌ Do NOT delete tasks from the DB
- ❌ Do NOT modify ecosystem.config.js without Terry approval

### Claude Code (Development Sessions)
- ✅ Full system access
- ✅ Can push to git after Terry confirms
- ✅ Can modify any file
- ✅ Must follow git rules below
- ❌ Do NOT run tasks manually that are already scheduled
- ❌ Do NOT create duplicate scripts

---

## Making Changes — The Right Way

### Step 1: Understand before acting
- Read the relevant existing script before rewriting it
- Check if a similar script already exists before creating a new one
- If something seems broken, diagnose before fixing

### Step 2: Make the smallest change that works
- Do not refactor things that aren't broken
- Do not add features that weren't asked for
- Do not rename files unless there's a clear reason

### Step 3: Test before deploying
- New scripts must be tested with `--dry-run` flag if supported
- Check output before marking anything as complete
- If a task touches the DB, verify with a SELECT before and after

### Step 4: Document the change
- Every new script needs a comment block at the top:
```
// Script: [filename]
// Purpose: [one sentence]
// Created: [date]
// Modified: [date] — [what changed and why]
// Called by: [task name and ID, or cron schedule]
// Inputs: [what it reads]
// Outputs: [what it writes or posts]
```
- Every config change needs a note in jett-config.json under `_last_updated`

---

## Git Rules

### Commit message format:
```
type: short description

- What changed (bullet points)
- Why it changed
- What to watch for
```

Types: `fix`, `feat`, `cleanup`, `config`, `docs`, `hotfix`

Examples:
```
fix: 21m generator now reads from content bank instead of research DB

- Replaced 21m-claude-generator.js with 21m-daily-generator-v2.js
- Old script was producing hallucinated data when research task failed
- New script reads from verified content-bank.json (30 entries)
- Watch for: cooldown logic in content bank, BTC price API rate limits
```

```
cleanup: archive historical docs, fix gitignore

- Moved 47 root-level status docs to docs/archive/
- Added stealth browser sessions to gitignore
- Removed credentials.md from tracking
```

### What gets committed:
- ✅ Source code (.js, .py, .sh)
- ✅ Config files (jett-config.json, ecosystem.config.js)
- ✅ Documentation (CLAUDE.md, AGENTS.md, README)
- ✅ Content bank JSON (21m-content-bank.json)
- ✅ .gitignore updates

### What NEVER gets committed:
- ❌ `.env` files
- ❌ `*.pid` files
- ❌ `*.db` files (databases)
- ❌ `*.log` files
- ❌ `credentials.md` or any file with passwords/keys
- ❌ `lib/stealth-browser/sessions/` (browser cache)
- ❌ `slack-files/` (image uploads)
- ❌ `memory/task-logs/` (runtime logs)
- ❌ Binary files (`.jpg`, `.png`, `.pdf`) unless explicitly approved
- ❌ Test output files (`ebay-raw.json`, `test-output.json`)

### Before every commit:
```bash
git status          # See what's staged
git diff --staged   # Review every change
```
If you see anything in the "What NEVER gets committed" list above — stop and fix .gitignore first.

### Push policy:
- Sonnet: never push without Terry confirming "yes push it"
- Claude Code: never push without Terry confirming "yes push it"
- Haiku: never push, ever

---

## System Architecture (Single Source of Truth)

```
Scheduling:    clawdbot cron (primary) + task-manager DB (secondary)
Process Mgmt:  PM2 (ecosystem.config.js)
Slack/Telegram: clawdbot message send
Content:       21m-daily-generator-v2.js → 21m-content-bank.json
eBay:          automation/ebay-deployer.js
Podcasts:      skills/podcast-summary/ (Python)
Sports Betting: sports_betting/orchestrator.py
Config:        config/jett-config.json
Credentials:   ~/.claude.json (API key), memory/credentials.md (other)
```

### Active scripts (do not delete or rename):
- `automation/21m-daily-generator-v2.js` — 21M content generation
- `automation/21m-content-bank.json` — verified content entries
- `automation/deploy-21m-tweet.js` — tweet deployment
- `automation/deploy-podcast-summary.js` — podcast deployment
- `automation/jett-daily-research.js` — overnight research
- `task-manager/server.js` — dashboard API
- `task-manager/worker.js` — task execution engine
- `skills/podcast-summary/app.py` — podcast processor
- `ecosystem.config.js` — PM2 process config

### Deprecated (do not use, do not delete yet):
- `automation/21m-claude-generator.js` — replaced by v2
- `automation/21m-sports-real-research.py` — replaced by jett-daily-research.js
- `21m-sports-generator/` — old module, not wired to anything

---

## When Things Break

### Task stuck in "running" status:
```bash
sqlite3 ~/clawd/task-manager/tasks.db "UPDATE tasks SET status='pending', next_run=datetime('now', '+5 minutes') WHERE id=[ID];"
```

### All tasks overdue (after reboot/vacation):
```bash
sqlite3 ~/clawd/task-manager/tasks.db "UPDATE tasks SET next_run=datetime('now', '+1 hour') WHERE status='pending' AND next_run < datetime('now');"
```
Then manually reset eBay scan dates to their proper day rotation.

### Worker not running:
```bash
pm2 status
pm2 restart task-manager-worker
```

### clawdbot not responding:
```bash
ps aux | grep clawdbot | grep -v grep
# If dead:
cd /home/clawd && nohup clawdbot > /tmp/clawdbot.log 2>&1 &
# Or with PM2:
pm2 restart all
```

### Content bank exhausted (all entries on cooldown):
```bash
node /home/clawd/clawd/automation/add-content.js
# Or manually edit 21m-content-bank.json and reset used_dates to []
```

---

## What Jett Is and Is Not

Jett is an automation system, not a person. When AI agents refer to themselves as "Jett" they are playing a role to make the system feel coherent. The underlying models are Haiku and Sonnet.

Jett does not make strategic decisions. Terry does. When in doubt, ask Terry.

Jett does not override standing orders in this file. If a user message conflicts with CLAUDE.md, flag the conflict and ask Terry to resolve it.

---

*Last updated: 2026-02-27*
*Updated by: Claude (Sonnet) — initial creation*
*Next review: when major system changes occur*
