# Jett Migration Roadmap
## Google Workspace CLI + Telegram Migration

**Created:** 2026-03-06
**Status:** Planned (not started)
**Estimated Time:** 1 weekend

---

## Why This Migration

**Current State:**
- Slack for messaging (to be removed)
- AgentMail for email
- Notion Calendar for scheduling
- Multiple fragmented integrations

**Target State:**
- Telegram for all messaging
- Gmail (via gws) for all email
- Google Calendar for scheduling
- Google Sheets for lead gen data
- Notion for lists/reminders only

---

## Prerequisites

### Required Before Starting
1. ✅ Gmail account recovered (DONE)
2. ⏳ System stability for a few days
3. ⏳ Weekend availability

### What You Need
- Google Cloud project (gws auth setup creates this)
- Telegram account (already set up in OpenClaw)
- Share Google Calendar with Jett's Google account

---

## Phase 1: Install Google Workspace CLI

### Step 1.1: Install gws
```bash
npm install -g @googleworkspace/cli
```

### Step 1.2: Authenticate
```bash
gws auth setup
```
This will:
- Create a Google Cloud project
- Enable all Workspace APIs
- Open browser for OAuth login
- Store encrypted credentials

### Step 1.3: Verify
```bash
gws drive files list --params '{"pageSize": 5}'
gws gmail users messages list --params '{"maxResults": 5}'
```

---

## Phase 2: Migrate Email (AgentMail → Gmail)

### Current
- `lib/send-email.js` uses AgentMail API
- Sends via jett@agentmail.to

### Target
- Use `gws gmail messages send` directly
- Send from your Gmail

### Steps
1. Create backup: `cp lib/send-email.js lib/send-email.js.agentmail`
2. Rewrite `send-email.js` to use `gws gmail messages send`
3. Test: Send email to yourself
4. Update all crons that send email to use new script

### Test Command
```bash
gws gmail users messages create \
  --json '{"payload":{"header":[{"name":"Subject","value":"Test"},{"name":"To","value":"your@email.com"}],"body":{"data":"SGVsbG8gV29ybGQ="}}}' \
  --raw
```

---

## Phase 3: Migrate Calendar (Notion → Google)

### Current
- `skills/notion-assistant/morning_brief.py` reads Notion calendar

### Target
- Use `gws calendar events list` to read your shared calendar
- Still post to Slack #huangfamily or Telegram

### Steps
1. Share your Google Calendar with Jett's Gmail account
2. Update `morning_brief.py` to use gws calendar
3. Test: List today's events
4. Keep Notion for: reminders, lists, family planning

### Test Command
```bash
gws calendar events list \
  --params '{"timeMin":"2026-01-01T00:00:00Z","timeMax":"2026-12-31T23:59:59Z","maxResults":10}'
```

### Keep in Notion
- Family lists
- Reminders
- Planning docs

---

## Phase 4: Migrate Messaging (Slack → Telegram)

### Current
- All automation posts to Slack channels
- #21msports, #levelupcards, #huangfamily, etc.

### Target
- Telegram only for Jett communication
- No Slack at all

### Steps
1. Verify Telegram is working in OpenClaw
2. Update all crons to post to Telegram instead of Slack
3. Test each automation:
   - Bitcoin tweet
   - Sports tweet
   - Family brief
   - eBay results
   - Podcast summaries
4. Once verified working, remove Slack from OpenClaw

### Telegram Commands (already exist)
- Direct message Jett
- /help, /status, /tasks

---

## Phase 5: Remove Slack Completely

### After Migration Verified
1. Remove Slack credentials from OpenClaw
2. Delete Slack channels from dashboard
3. Remove `slack-bridge*` files
4. Update docs

---

## Phase 6: Future - Lead Gen to Sheets

### The Vision
Overnight research for lead generation → data populates shared Google Sheet

### Implementation
```bash
# Create sheet
gws sheets spreadsheets create --json '{"properties":{"title":"Lead Gen 2026"}}'

# Append row
gws sheets spreadsheets values append \
  --params '{"spreadsheetId":"ID","range":"Sheet1!A1"}' \
  --json '{"values":[["Company","Contact","Email","Notes"]]}'
```

### Use Cases
- Research leads from overnight automation
- Track content performance
- eBay scanner results

---

## Migration Checklist

- [ ] Phase 1: Install gws + authenticate
- [ ] Phase 2: Migrate email to Gmail
- [ ] Phase 3: Migrate calendar to Google
- [ ] Phase 4: Migrate messaging to Telegram
- [ ] Phase 5: Remove Slack completely
- [ ] Phase 6: Future - Lead gen to Sheets

---

## Rollback Plan

If something breaks:
1. Email: Revert to `lib/send-email.js.agentmail`
2. Calendar: Revert to Notion script
3. Messaging: Re-enable Slack in OpenClaw

---

## Commands Reference

### Email
```bash
gws gmail users messages send --json '{...}'
gws gmail users messages list --params '{"maxResults":10}'
```

### Calendar
```bash
gws calendar events list --params '{"timeMin":"...","timeMax":"..."}'
gws calendar events create --json '{...}'
```

### Sheets
```bash
gws sheets spreadsheets create --json '{"properties":{"title":"Name"}}'
gws sheets spreadsheets values append --params '{"spreadsheetId":"ID","range":"Sheet1!A1"}' --json '{"values":[[...]]}'
gws sheets spreadsheets values get --params '{"spreadsheetId":"ID","range":"Sheet1!A1:B10"}'
```

### Drive
```bash
gws drive files list --params '{"pageSize":10}'
gws drive files create --json '{"name":"file.txt"}' --upload ./file.txt
```

---

## After Migration - Final State

| Component | Tool |
|----------|------|
| Messaging | Telegram |
| Email | Gmail (gws) |
| Calendar | Google Calendar |
| Lists/Reminders | Notion |
| Content | 21M system |
| eBay | eBay Scanner |
| Future Lead Gen | Google Sheets |

**Clean. Simple. Powerful.**
