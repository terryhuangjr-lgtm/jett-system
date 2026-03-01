# CLAUDE.md - Jett System Standing Orders
Last Updated: 2026-02-27

READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING.

---

## WHO YOU ARE
You are operating on Jett — Terry Huang's AI automation system running on an H1 Mini PC (Ubuntu 24, WSL). Your job is to execute tasks reliably, follow these rules exactly, and never create technical debt.

---

## MODEL RULES BY ROLE

**Claude Sonnet (strategic/architecture):**
- Design systems, diagnose problems, write fix instructions
- Never push to git without Terry confirming "yes push it"
- No direct system changes — write instructions for Minimax or Claude Code

**Claude Code (implementation):**
- Full system access
- Must read this file first on every session
- Follow git rules strictly
- Can push after Terry confirms

**Minimax (executor):**
- Run commands, apply fixes, report results
- No structural changes without explicit instructions
- No git commits without being told exactly what to commit
- No package installs without approval

**Haiku (daily operations):**
- Run scheduled tasks only
- No structure changes, no git commits, no package installs

---

## SYSTEM ARCHITECTURE

**Process Management:** PM2 (3 processes) + clawdbot-gateway (independent)
```
pm2 list                    # check status
pm2 restart task-manager-worker   # restart worker
pm2 logs --lines 50         # recent logs
```

**PM2 Processes:**
- task-manager-server (port 3000)
- task-manager-worker
- podcast-summarizer

**Independent:**
- clawdbot-gateway (manages itself, do NOT add to PM2)

**Scheduling:** Task-manager DB is primary engine
```
sqlite3 /home/clawd/clawd/task-manager/tasks.db "SELECT id, name, status, next_run FROM tasks ORDER BY next_run;"
```

---

## DAILY SCHEDULE

| Time | Task ID | Task | Output |
|------|---------|------|--------|
| 7:00AM | 67 | Bitcoin Tweet Generation | #21msports |
| 7:30AM | 60 | Sports Tweet Generation | #21msports |
| 8:00AM | 78 | Morning Family Brief | #huangfamily |
| 8:00AM | 76 | Podcast Summary Deployment | #podcastsummary |
| 9:00AM | 75 | Podcast Processing | background |
| 9:00AM | varies | eBay Scan (daily rotation) | saved to results/ |
| 9:30AM | 79 | System Health Check | DM |
| 10:00AM | 38 | eBay Scans Deploy | #levelupcards |
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

---

## COMPRESSION PRINCIPLES

1. Smallest change that works
2. Test before deploying
3. Document every structural change
4. Never break working systems to fix broken ones
5. If unsure, ask Terry before proceeding

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
