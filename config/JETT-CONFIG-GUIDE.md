# Jett Configuration Guide

**For:** Jett (AI Assistant)
**Purpose:** How to update automation config when Terry requests changes
**File:** `/home/clawd/clawd/config/jett-config.json`

---

## When Terry Asks You To Change Something

### Example Requests You Can Handle

**eBay Scans:**
- "Change Monday's scan to look for Kobe refractors instead"
- "Add a price filter to Wednesday's scan - max $500"
- "Search for LeBron rookies on Friday"

**Sports Research:**
- "Don't use Patrick Mahomes anymore, add him to excluded list"
- "Look for contracts from last 14 days instead of 7"

**Bitcoin Research:**
- "Add 'Bitcoin mining' to the topics list"
- "Focus on adoption stories this week"

### What You Do

1. **Read current config:**
   ```bash
   cat ~/clawd/config/jett-config.json
   ```

2. **Use Edit tool to update the specific field**
   - Find the right section (ebay_scans, sports_research, etc.)
   - Update the value
   - Don't change other sections

3. **Validate your changes:**
   ```bash
   node ~/clawd/scripts/validate-config.js
   ```

4. **If validation passes, tell Terry:**
   ```
   ✅ Updated [what changed]
   Changes will take effect on next scheduled run
   [Show the specific change you made]
   ```

5. **If validation fails, tell Terry:**
   ```
   ❌ Config validation failed: [error message]
   [Explain what went wrong]
   [Ask if they want to try different values]
   ```

---

## Config File Structure

### Sports Research Section
```json
"sports_research": {
  "priorities": {
    "breaking_news_days": 7,      ← How recent = "breaking"
    "recent_contracts_days": 30,   ← How recent = "recent"
    "notable_contracts_days": 60   ← How recent = "notable"
  },
  "excluded_players": [            ← Players to never use again
    "Juan Soto",
    "Shedeur Sanders"
  ]
}
```

**What you can change:**
- Number of days for each priority level
- Add/remove players from excluded list

### eBay Scans Section
```json
"ebay_scans": {
  "schedule": {
    "monday": {
      "name": "MJ Topps Finest 1993-1999",
      "search_terms": ["Michael Jordan", "Topps Finest", "1993-1999"],
      "filters": {
        "min_price": 10,
        "max_price": 5000,
        "condition": "Used"
      }
    }
  }
}
```

**What you can change:**
- name: Display name for the scan
- search_terms: What to search for on eBay
- filters.min_price: Minimum price filter
- filters.max_price: Maximum price filter
- filters.condition: "New", "Used", or "New OR Used"

### Bitcoin Research Section
```json
"bitcoin_research": {
  "topics": [                      ← What to research
    "Bitcoin Standard principles",
    "21 million supply cap"
  ],
  "sources": [                     ← Which books/sources to cite
    "The Bitcoin Standard (Saifedean Ammous)"
  ]
}
```

**What you can change:**
- Add/remove topics
- Add/remove sources

---

## Examples: Handling Terry's Requests

### Example 1: Change eBay Scan

**Terry says:** "Change Monday's scan to look for Kobe Bryant refractors, max price $1000"

**Your steps:**

1. Edit config:
   ```json
   "monday": {
     "name": "Kobe Bryant Refractors",
     "search_terms": ["Kobe Bryant", "Refractor"],
     "filters": {
       "min_price": 20,
       "max_price": 1000,
       "condition": "Used"
     }
   }
   ```

2. Validate:
   ```bash
   node ~/clawd/scripts/validate-config.js
   ```

3. Respond:
   ```
   ✅ Updated Monday's eBay scan

   Changed from: MJ Topps Finest 1993-1999
   Changed to: Kobe Bryant Refractors

   New search terms: ["Kobe Bryant", "Refractor"]
   Max price: $1000

   This will take effect on Monday's scan at 8:00 AM.
   ```

### Example 2: Exclude a Player

**Terry says:** "Stop using Bryce Harper in sports research"

**Your steps:**

1. Edit config:
   ```json
   "excluded_players": [
     "Juan Soto",
     "Shedeur Sanders",
     "Shohei Ohtani",
     "Bryce Harper"
   ]
   ```

2. Validate:
   ```bash
   node ~/clawd/scripts/validate-config.js
   ```

3. Respond:
   ```
   ✅ Added Bryce Harper to excluded players list

   Current excluded players:
   - Juan Soto
   - Shedeur Sanders
   - Shohei Ohtani
   - Bryce Harper (new)

   Sports research will skip these players from now on.
   ```

### Example 3: Add Bitcoin Topic

**Terry says:** "Add 'Bitcoin ETF adoption' to Bitcoin research topics"

**Your steps:**

1. Edit config:
   ```json
   "topics": [
     "Bitcoin Standard principles",
     "21 million supply cap",
     "Hard money vs fiat",
     "Historical inflation examples",
     "Bitcoin adoption milestones",
     "Bitcoin ETF adoption"
   ]
   ```

2. Validate:
   ```bash
   node ~/clawd/scripts/validate-config.js
   ```

3. Respond:
   ```
   ✅ Added 'Bitcoin ETF adoption' to research topics

   Updated topics list (6 total):
   - Bitcoin Standard principles
   - 21 million supply cap
   - Hard money vs fiat
   - Historical inflation examples
   - Bitcoin adoption milestones
   - Bitcoin ETF adoption (new)

   Will be included in tonight's Bitcoin research.
   ```

---

## What NOT To Change (Ask Claude!)

**Schedule changes:**
- Don't change `schedules` section
- Requires cron update
- Have Terry ask Claude

**New tasks:**
- Don't add new task types
- Requires new automation scripts
- Have Terry ask Claude

**Major refactors:**
- Don't restructure the JSON
- Don't rename sections
- Have Terry ask Claude

**When in doubt:**
Tell Terry: "This change requires Claude's help. It involves [schedules/new tasks/major changes]."

---

## Validation Errors

**Common errors and fixes:**

**Error: "sports_research.excluded_players must be an array"**
- Fix: Make sure it's `["name1", "name2"]` not `"name1, name2"`

**Error: "Invalid cron format"**
- Fix: Don't touch schedules section, ask Claude

**Error: "Missing eBay scan for monday"**
- Fix: Make sure day name is lowercase and spelled correctly

**Error: "Failed to parse JSON"**
- Fix: Check for:
  - Missing commas between items
  - Missing quotes around strings
  - Extra commas at end of lists
  - Mismatched brackets

---

## Testing Changes

After validation passes:

**For eBay scans:**
- Test will happen at 8 AM tomorrow
- Check #levelupcards for results

**For sports research:**
- Test will happen at 2 AM tomorrow
- Check Terry's DM for completion notification

**For Bitcoin research:**
- Test will happen at 2:30 AM tomorrow
- Check Terry's DM for completion notification

---

## Summary

**You handle (simple config changes):**
- ✅ eBay search terms
- ✅ Price filters
- ✅ Excluded players
- ✅ Research topics
- ✅ Research date ranges

**Claude handles (complex changes):**
- 🔧 Schedule timing
- 🔧 New task types
- 🔧 New automation scripts
- 🔧 Major refactors

**Always validate before confirming!**

---

**Remember:** Terry trusts you to make simple config changes. When unsure, validate first. If validation fails or it's complex, recommend Claude.
