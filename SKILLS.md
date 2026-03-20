# SKILLS.md - What Jett Can Do

Last Updated: 2026-03-12

This file is Jett's capability index. Read it when you need to know what tools and skills are available, or when deciding how to approach a task.

**Skills repo:** `/home/clawd/skills/` (git: jett-skills)
**Automation scripts:** `/home/clawd/clawd/automation/`
**Quick reference for tools/APIs:** See `TOOLS.md`

---

## SKILLS (Active — `/home/clawd/skills/`)

These are self-contained capability modules. Each has a `SKILL.md` with full details.

---

### 1. 21M Sports Content Generation
**Location:** `/home/clawd/skills/21m-sports-generation/`
**Read:** `SKILL.md` before generating any content
**Purpose:** Generate verified Bitcoin/sports tweets for @21MSports

**What it does:**
- Pulls from content bank (58+ verified entries)
- Generates tweet using Sonnet 4.5 (hardcoded — do NOT change)
- Validates facts before output
- Tracks 90-day sports / 60-day bitcoin cooldowns

**Invoke via:**
```bash
node /home/clawd/clawd/automation/21m-daily-generator-v2.js
```

**⚠️ ZERO TOLERANCE FOR UNVERIFIED CONTENT.** Always run validator:
```bash
node /home/clawd/clawd/automation/21m-sports-validator.js
```

**Cron:** 7:00 AM (Bitcoin Tweet), 7:30 AM (Sports Tweet)

---

### 2. eBay Scanner
**Location:** `/home/clawd/skills/ebay-scan/`
**Read:** `SKILL.md` for filter config details
**Purpose:** Scan eBay for underpriced sports cards for Level Up Cards business

**What it does:**
- Searches eBay for raw cards matching config
- Filters out graded cards (PSA/BGS in title)
- Emails results to terryhuangjr@gmail.com
- Rotates through day-specific search configs

**Invoke via:**
```bash
cd /home/clawd/clawd/ebay-scanner && node run-from-config.js [monday|tuesday|wednesday|thursday|friday|saturday|sunday]
```

**Config:** `/home/clawd/clawd/task-manager/ebay-scans-config.json`
**Cron:** 9:00 AM daily (day-specific rotation Mon–Sun)

---

### 3. Morning Brief
**Location:** `/home/clawd/skills/morning-brief/`
**Purpose:** Daily family brief using Google Calendar only (Notion removed)

**What it does:**
- Morning brief: pulls Google Calendar events → sends to Telegram
- Removed: Notion shopping list, tasks, reminders (March 2025)

**Primary scripts:**
- `morning_brief.py` — daily 8 AM family brief
- `gcal_client.py` — Google Calendar integration (GWS)

**Invoke via:**
```bash
python3 /home/clawd/skills/morning-brief/morning_brief.py
python3 /home/clawd/skills/morning-brief/morning_brief.py --post  # posts to Telegram
python3 /home/clawd/skills/morning-brief/morning_brief.py --dry-run  # prints without posting
```

**Cron:** 8:00 AM (Morning Brief) — via clawdbot

---

### 4. Podcast Summary
**Location:** `/home/clawd/skills/podcast-summary/`
**Read:** `SKILL.md`, `SYSTEM.md`
**Purpose:** Transcribe and summarize podcasts, email results to Terry

**What it does:**
- Accepts direct MP3 URLs (preferred), RSS feeds
- Transcribes with Whisper (tiny model)
- Summarizes with Grok 4.1 Fast
- Emails summary to terryhuangjr@gmail.com
- Dashboard at http://localhost:5001

**How to add a podcast:**
```bash
cd /home/clawd/skills/podcast-summary
python3 manage_queue.py add "MP3_URL" "Episode Title - Guest Name"
```

**Invoke via:**
```bash
cd /home/clawd/skills/podcast-summary && python3 process_queue_nightly.py
```

**Cron:** 4:00 AM daily (processes one from queue)
**Cleanup:** Sundays — audio files older than 7 days deleted

---

## AUTOMATION PIPELINES (`/home/clawd/clawd/automation/`)

These are scripts, not modular skills — they run via cron or manually.

---

### 6. Research System
**Scripts:**
- `jett-trending-research.js` — Trending topics via Grok + Brave Search
- `jett-daily-research.js` — Deep research via Spotrac (historic contracts)
- `brave-search.js` — Brave Search API wrapper
- `jett-scraper.py` — Spotrac data fetcher

**Output:** Adds verified entries to content bank (SQLite DB)
**Cron:** Mon/Thu 3 AM (Trending), Tue/Fri 3 AM (Deep)

---

### 7. Finance Monitor
**Script:** `jett-finance-monitor.js`
**Purpose:** Track BTC, ETFs, AI/tech, energy, real estate news
**Output:** Telegram DM with relevant headlines + price moves
**Watchlist:** `memory/jett-finance-watchlist.json`
**Cron:** 6 AM, 12 PM, 6 PM daily
**Model:** Kimi K2.5 (free via Ollama) - falls back to Grok on failure

---

### 8. Lead Generator (Level Up Digital)
**Location:** `/home/clawd/clawd/lead-generator/lead_generator.py`
**Purpose:** Find local business leads for Level Up Digital outreach

**What it does:**
- Searches Google Places API for Nassau County businesses
- Filters: 5–500 reviews, 4.0+ rating, no/outdated website
- Brave Search for social media (FB/IG) on qualified leads
- Writes to Google Sheets (shared with Terry)

**Invoke via:**
```bash
cd /home/clawd/clawd/lead-generator && python3 lead_generator.py [tier] [num_towns]
```

**State file:** `/home/clawd/.lead-gen-state.json` (tracks rotation)
**Spreadsheet:** https://docs.google.com/spreadsheets/d/1Dl0VF4yASbUSXcuyS1km-Uo1fa6fZVfAYlRFl7h38gc
**Cron:** Mon 6 AM (Tier 1: pressure washing, painter, handyman), Thu 6 AM (Tier 2: landscaper, lawn care, roofing)

---

### 9. Community Pulse
**Script:** `jett-community-pulse.js`
**Purpose:** On-demand community intelligence - Reddit + X search with Grok synthesis

**What it does:**
- Searches Reddit and X/Twitter via Brave Search
- Synthesizes results into a pulse report with Grok
- Sends to Terry via Telegram DM
- Saves .md report to `~/pulse-reports/`

**Invoke via:**
```bash
cd /home/clawd/clawd/automation && node jett-community-pulse.js "NIL deals college football"
```

**Examples:**
- `node jett-community-pulse.js "PSA 10 sports card market"`
- `node jett-community-pulse.js "AI automation real estate agents"`

**Manual use only** - not on cron

---

## GWS CAPABILITIES (Google Workspace)

Jett has full GWS access via `gws` CLI as jett.theassistant@gmail.com.

| Capability | Command |
|------------|---------|
| Send email | `node /home/clawd/clawd/lib/send-email.js --to "x" --subject "x" --body "x"` |
| Read email | `gws gmail users messages list --params '{"q":"..."}'` |
| Read calendar | `gws calendar events list --params '{"calendarId":"primary",...}'` |
| Write to Sheets | `gws sheets spreadsheets values append ...` |
| Read Drive | `gws drive files list` |

**All output emails go to:** terryhuangjr@gmail.com
**Sent from:** jett.theassistant@gmail.com
**Credentials:** `~/.config/gws/credentials.enc`

---

## CAPABILITY DECISION GUIDE

```
Need to generate a tweet?        → 21m-sports-generation skill
Need to scan eBay?               → ebay-scan skill
Need to send a message to Terry? → Telegram (clawdbot) — see TOOLS.md
Need to send an email?           → lib/send-email.js (GWS Gmail)
Need to check the calendar?      → gws calendar OR notion-assistant/gcal_client.py
Need to summarize a podcast?     → podcast-summary skill
Need to find leads?              → lead-generator/lead_generator.py
Need to research a sports topic? → automation/jett-daily-research.js
Need to check BTC/finance news?  → automation/jett-finance-monitor.js
Need to log something?           → Write to memory/YYYY-MM-DD.md
Need to add to content bank?     → node automation/add-to-content-bank.js
```

---

## ADDING NEW SKILLS

When a new capability is built, do ALL of the following:

1. Create folder at `/home/clawd/skills/[skill-name]/`
2. Write a `SKILL.md` with: purpose, what it does, how to invoke, config location, cron schedule if any
3. Add entry to this file (SKILLS.md) under the appropriate section
4. Add to `SYSTEMS.md` skills table
5. Add cron job via clawdbot if needed
6. Commit both repos:
   ```bash
   cd /home/clawd/skills && git add . && git commit -m "feat: add [skill-name] skill" && git push
   cd /home/clawd/clawd && git add SKILLS.md SYSTEMS.md && git commit -m "docs: add [skill-name] to skill index" && git push
   ```
