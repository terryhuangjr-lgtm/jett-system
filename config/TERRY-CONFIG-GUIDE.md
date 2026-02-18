# Terry's Configuration Guide

**Your central config file:** `/home/clawd/clawd/config/jett-config.json`

---

## When You Want To Change Something

### Simple Changes (Ask Jett)

**eBay Scans:**
```
You: "Change Monday's scan to look for Kobe refractors under $1000"
Jett: [Updates config, validates, confirms]
```

**Sports Research:**
```
You: "Don't use Patrick Mahomes anymore"
Jett: [Adds to excluded list, validates, confirms]
```

**Bitcoin Research:**
```
You: "Add Lightning Network to research topics"
Jett: [Updates topics, validates, confirms]
```

**Price Filters:**
```
You: "Set max price to $2000 for Friday's multi-search"
Jett: [Updates filter, validates, confirms]
```

### Complex Changes (Ask Claude)

**Schedule Timing:**
```
You: "Run sports research at 1 AM instead of 2 AM"
→ Ask Claude (requires cron update)
```

**New Tasks:**
```
You: "Add a new daily scan for vintage jerseys"
→ Ask Claude (requires new automation script)
```

**New Features:**
```
You: "Add automatic Instagram posting"
→ Ask Claude (major new feature)
```

**Major Refactors:**
```
You: "Change how content generation works"
→ Ask Claude (affects multiple systems)
```

---

## Quick Decision Guide

**Ask Jett if:**
- Changing what to search for
- Adding/removing excluded players
- Adjusting price filters
- Adding research topics
- Changing date ranges

**Ask Claude if:**
- Changing when tasks run
- Adding new daily tasks
- New automation features
- Breaking changes
- System redesign

**Rule of thumb:** If it's IN the config file → Jett. If it's ABOUT the system → Claude.

---

## How It Works

### 1. You Ask Jett
```
You: "Change Wednesday's eBay scan to 1989 Jordan rookies"
```

### 2. Jett Updates Config
```bash
# Jett edits: ~/clawd/config/jett-config.json
"wednesday": {
  "name": "1989 Jordan Rookies",
  "search_terms": ["Michael Jordan", "1989", "Rookie"],
  ...
}
```

### 3. Jett Validates
```bash
node ~/clawd/scripts/validate-config.js
✅ VALIDATION PASSED
```

### 4. Jett Confirms
```
Jett: "✅ Updated Wednesday's eBay scan to 1989 Jordan Rookies.
       Changes take effect Wednesday at 8:00 AM."
```

### 5. It Just Works
```
Next Wednesday at 8 AM:
→ Scan runs with new criteria
→ Posts to #levelupcards
→ DM notification sent
```

---

## What's In The Config File

### 1. Sports Research
- Excluded players (don't reuse)
- Date ranges (breaking/recent/notable)
- Priority levels

### 2. Bitcoin Research
- Topics to cover
- Sources to cite
- Knowledge areas

### 3. eBay Scans (7 days)
- Monday: MJ Topps Finest
- Tuesday: Griffey Refractors
- Wednesday: Griffey Rookies
- Thursday: MJ Upper Deck
- Friday: Multi-search
- Saturday: MJ Base
- Sunday: Cam Ward

**Each day has:**
- Name (display)
- Search terms
- Price filters (min/max)
- Condition filter

### 4. Slack Channels
- Where tweets go (#21msports)
- Where eBay scans go (#levelupcards)
- Where DMs go (you)

### 5. Schedules (cron)
- When each task runs
- **Don't change without Claude!**

---

## Example Conversations

### Change eBay Criteria

**You:**
```
Monday's scan isn't finding what I want. Change it to:
- Search for: Kobe Bryant Chrome Refractors
- Price range: $50 to $1500
- Any condition
```

**Jett:**
```
✅ Updated Monday's eBay scan

Name: Kobe Bryant Chrome Refractors
Search terms: ["Kobe Bryant", "Chrome", "Refractor"]
Price range: $50 - $1500
Condition: New OR Used

Changes take effect Monday at 8:00 AM.
```

### Exclude a Player

**You:**
```
Stop using Mike Trout in sports research
```

**Jett:**
```
✅ Added Mike Trout to excluded players list

Current excluded players:
- Juan Soto
- Shedeur Sanders
- Shohei Ohtani
- Mike Trout

Sports research will skip these from now on.
```

### Add Research Topic

**You:**
```
Add "Bitcoin mining difficulty" to Bitcoin research topics
```

**Jett:**
```
✅ Added 'Bitcoin mining difficulty' to research topics

Updated topics (7 total):
- Bitcoin Standard principles
- 21 million supply cap
- Hard money vs fiat
- Historical inflation examples
- Bitcoin adoption milestones
- Bitcoin mining difficulty (new)

Will be included in tonight's research at 2:30 AM.
```

---

## Checking Current Config

**View entire config:**
```bash
cat ~/clawd/config/jett-config.json
```

**Or ask Jett:**
```
You: "What's Monday's eBay scan searching for?"
Jett: [Reads config, tells you]
```

---

## Validation

**Jett always validates** after making changes:
```bash
node ~/clawd/scripts/validate-config.js
```

If validation fails, Jett will tell you why and suggest fixes.

---

## When Changes Take Effect

**Research tasks:** Next scheduled run (tonight at 2 AM / 2:30 AM)
**Content generation:** Next scheduled run (tonight at 3 AM / 3:30 AM)
**eBay scans:** Next morning at 8 AM
**Health monitor:** Already running, picks up changes

**No restart needed!** Changes apply on next scheduled run.

---

## Workflow Summary

```
You → Jett → Config File → Validation → Confirmation → Next Run
```

**Simple as:**
1. Tell Jett what you want
2. Jett updates and validates
3. Jett confirms it's done
4. Change takes effect on next scheduled run

---

## Emergency: Manual Config Edit

If you need to edit manually:

```bash
nano ~/clawd/config/jett-config.json
```

**After editing, ALWAYS validate:**
```bash
node ~/clawd/scripts/validate-config.js
```

**If validation fails, fix errors or ask Jett/Claude for help.**

---

## Best Practices

**Do:**
- ✅ Ask Jett for config changes
- ✅ Test one change at a time
- ✅ Check #levelupcards after eBay scan changes
- ✅ Verify excluded players list stays current

**Don't:**
- ❌ Edit multiple sections at once
- ❌ Change schedules without Claude
- ❌ Skip validation
- ❌ Test in production only (ask Jett to validate first)

---

## Summary

**You have full control** via the config file.

**Simple changes:** Tell Jett, he updates it
**Complex changes:** Ask Claude

**Config location:** `~/clawd/config/jett-config.json`
**Validator:** `node ~/clawd/scripts/validate-config.js`

**You, Jett, and Claude working together - sympatico!** 🤝
