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
2. **Read IDENTITY.md** — know who you are (SOUL.md is deprecated, merged into IDENTITY.md on 2026-03-06)
3. **Read USER.md** — know who Terry is
4. **Read SKILLS.md** — know what you can do
5. **Read memory/YYYY-MM-DD.md** for today and yesterday

---

## System Architecture (Check CLAUDE.md + SYSTEMS.md for latest)

- **Scheduling:** clawdbot cron — ALL tasks run through clawdbot gateway
- **Process Mgmt:** PM2 — task-manager-server ONLY (dashboard on port 3000)
- **Messaging:** Telegram only — clawdbot message send (Slack fully removed 2026-03-07)
- **Email:** GWS Gmail via lib/send-email.js — all cron outputs + alerts go here
- **Watchdog:** system crontab + self-heal.sh (every 5 min) restarts gateway, PM2, Ollama
- **Failure Alerts:** lib/notify-failure.js → Telegram DM to Terry
- **Git:** https://github.com/terryhuangjr-lgtm/jett-system.git
- **Skills Git:** https://github.com/terryhuangjr-lgtm/jett-skills.git
- **Config Protection:** /home/clawd/.local/bin/config-protector.sh

## Key File Locations

- `/home/clawd/clawd/CLAUDE.md` - Standing orders, read first always
- `/home/clawd/clawd/IDENTITY.md` - Who you are (replaces SOUL.md)
- `/home/clawd/clawd/USER.md` - Who Terry is
- `/home/clawd/clawd/SKILLS.md` - What you can do (all capabilities indexed)
- `/home/clawd/clawd/SYSTEMS.md` - Full system architecture
- `/home/clawd/clawd/TOOLS.md` - APIs, models, tool reference
- `/home/clawd/clawd/HEARTBEAT.md` - Health monitoring rules
- `/home/clawd/clawd/automation/21m-daily-generator-v2.js` - Tweet generator (uses Sonnet)
- `/home/clawd/clawd/automation/21m-content-bank.json` - 58+ verified entries
- `/home/clawd/clawd/automation/deploy-ebay-scans.js` - eBay deployment
- `/home/clawd/skills/morning-brief/morning_brief.py` - Family brief (Google Calendar only)
- `/home/clawd/clawd/task-manager/server.js` - Dashboard (port 3000)
- `/home/clawd/clawd/lib/notify-failure.js` - Failure notifications → Telegram
- `/home/clawd/clawd/lib/send-email.js` - Send email via GWS Gmail
- `/home/clawd/.openclaw/openclaw.json` - OpenClaw config

## Model Usage

- **Grok 4.1 Fast:** DEFAULT for everything (Telegram, automation, research, subagents)
- **Haiku 4.5:** BACKUP if Grok down
- **Sonnet 4.5:** ONLY for 21M Sports content generation (hardcoded in generator)
- **Ollama:** nomic-embed-text (embeddings) + minimax-m2.5:cloud (memory search) only

## Daily Task Schedule (from clawdbot cron list)

| Time | Task | Output |
|------|------|--------|
| 3:00 AM Mon/Thu | Trending Research | Content Bank |
| 3:00 AM Tue/Fri | Deep Research | Content Bank |
| 4:00 AM | Podcast Processing | background |
| 6:00 AM | Finance Monitor | Telegram DM |
| 6:00 AM Mon | Lead Generator (Tier 1) | Google Sheets |
| 6:00 AM Thu | Lead Generator (Tier 2) | Google Sheets |
| 7:00 AM | Bitcoin Tweet | Email → terryhuangjr@gmail.com |
| 7:30 AM | Sports Tweet | Email → terryhuangjr@gmail.com |
| 8:00 AM | Morning Family Brief | Telegram DM |
| 9:00 AM | eBay Scan (rotation) | Email → terryhuangjr@gmail.com |
| 9:30 AM | System Health Check | Telegram DM |
| 10:00 AM | Sports Betting Scout | Telegram DM |
| 12:00 PM | Finance Monitor | Telegram DM |
| 4:00 PM | Sports Betting Pick | Telegram DM |
| 6:00 PM | Finance Monitor | Telegram DM |

**On-Demand (manual trigger):**
- Community Pulse | `node automation/jett-community-pulse.js "topic"` | Telegram DM + ~/pulse-reports/

## Known Issues and Fixes Applied

- **MTU fix:** WSL2 needs `sudo ip link set dev eth0 mtu 1350` — runs on startup via self-heal.sh
- **Gateway:** Managed via systemd (clawdbot-gateway.service) with openclaw-patch.service on boot
- **Health monitor disabled:** `channelHealthCheckMinutes: 0` in openclaw.json + library patched directly
- **Kilo processes:** NEVER kill kilo/bun/minimax processes without Terry confirming — see CLAUDE.md
- **execFileSync pattern:** Always use array args for clawdbot calls, never string interpolation
- **Config corruption:** Use config-protector.sh before running openclaw commands
- **Daily backup:** Config backed up at 1am to `~/.openclaw/openclaw.json.daily-*.bak`
- **Patched library:** Health monitor force-disabled in openclaw dist files — lost on update

## CRON "run bash:" Rule (IMPORTANT - March 5, 2026)

When you receive a prompt starting with "run bash: <command>":
1. **IMMEDIATELY exec the full command** (workdir=/home/clawd/clawd if automation)
2. Do NOT use tools/memory_search first — exec the command
3. On success → reply NO_REPLY (no chat response needed)
4. On failure → DM Terry via Telegram: "Cron fail: <cmd> error: <stdout/stderr>"

This is critical — cron tasks depend on this to work.

## How to Check System State

```bash
clawdbot cron list           # What is scheduled
pm2 list                     # Dashboard status
curl -s localhost:3000/api/health  # Health API
ip link show eth0 | grep mtu # MTU check (should be 1350)
crontab -l                   # All system cron jobs
cat /tmp/self-heal.log       # Self-heal watchdog log
```

---

## Recent Updates (March 2026)

- **March 12, 2026:** SKILLS.md created — full capability index for all skills + automation
- **March 12, 2026:** MEMORY.md updated — removed stale Slack refs, corrected SOUL→IDENTITY
- **March 11, 2026:** SYSTEMS.md updated to latest architecture
- **March 8, 2026:** Self-heal watchdog deployed (/home/clawd/scripts/self-heal.sh)
- **March 7, 2026:** Slack fully removed — Telegram only
- **March 6, 2026:** GWS migration complete (Gmail + Google Calendar + Sheets)
- **March 6, 2026:** IDENTITY.md created (merged from SOUL.md)
- **March 5, 2026:** Health monitor disabled via config + library patch
- **March 3, 2026:** Config protection script created
- **March 2, 2026:** Migrated from PM2 task-manager worker to clawdbot cron

---

## Subagent Prompt Engineering Rules (Permanent)

When spawning or acting as a subagent (especially with kimi-k2.5:cloud):
1. **Always use Chain-of-Thought:** think step-by-step before answering.
2. **After initial answer, self-reflect:** "Is this complete? Any mistakes? Better way?"
3. **Output final answer only after reflection.**
4. **For research/lead gen/podcast/21M:** list sources, check contradictions, cite reasoning.
5. **For eBay tasks:** double-check filters, vision score, relevance before finalizing.
