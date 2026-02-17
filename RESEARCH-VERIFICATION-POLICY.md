# Universal Research Verification Policy

**Created:** 2026-02-04
**Applies to:** ALL research logged to memory, ALL content generation, ALL briefs

---

## Core Rule

**IF YOU WRITE IT DOWN, IT MUST BE VERIFIED.**

This applies to:
- ✅ Memory files (`memory/*.md`)
- ✅ Research logs (`*-research.md`)
- ✅ Morning briefs
- ✅ Content ideas
- ✅ News summaries
- ✅ Database entries
- ✅ ANY factual claim written to disk

---

## The Problem

**What was happening:**
- Jett logged "research" to memory with made-up facts
- Morning briefs included unverified claims
- 21M Sports research had fabricated statistics
- Memory files became polluted with fake data
- This fake data then got used for content generation

**Example from memory/21m-sports-research.md:**
```
Connor McDavid lost $100MM to bad advisors...
Shohei Ohtani's contract bought 81 houses in Miami...
```
❌ Both completely fabricated, no sources, never verified.

---

## New Requirements

### Requirement 1: ALL Facts Must Have Sources

Every factual claim you write to memory MUST include:
- ✅ **Source URL** where you found it
- ✅ **Date accessed** (when you verified it)
- ✅ **Verification method** (web_search, X search, API query)

**Format:**
```markdown
## Research Finding - [Topic]

**Claim:** [The factual statement]

**Source:** [URL]
**Verified:** [Date/Time]
**Method:** web_search / X search / API

**Context:** [Additional verified details]
```

### Requirement 2: Use Verification Tools BEFORE Logging

Before writing ANY research to memory:

```bash
# For 21M Sports research
node ~/clawd/automation/21m-sports-validator.js \
  --sources "url1,url2" \
  --content "your finding"

# For general research (new script)
node ~/clawd/automation/research-verifier.js \
  --sources "url1,url2" \
  --claim "your factual statement"
```

If validation fails → DO NOT log it to memory.

### Requirement 3: Mark Unverified vs Verified

When logging to memory, use clear markers:

**✅ VERIFIED:**
```markdown
## Macro News - 2026-02-04

✅ **BTC trading around $100K**
- Source: https://coingecko.com/en/coins/bitcoin
- Verified: 2026-02-04 10:30 AM via API

✅ **Fed holding rates steady**
- Source: https://federalreserve.gov/newsevents/
- Verified: 2026-02-04 10:35 AM via web_search
```

**⚠️ UNVERIFIED (Placeholder):**
```markdown
## Content Ideas (Unverified Drafts)

⚠️ **DRAFT - NOT VERIFIED**
These are brainstorming ideas, NOT facts:
- Explore athlete bankruptcy stories (NEEDS RESEARCH)
- Compare 2000s vs 2020s contracts (NEEDS DATA)
```

### Requirement 4: Never Log from Memory/Assumptions

❌ **DON'T:**
- "I remember reading that..."
- "Athletes probably..."
- "It's common knowledge that..."
- "Based on typical patterns..."

✅ **DO:**
- "According to [source URL]..."
- "Web search on [date] found..."
- "X search returned verified post: [URL]..."
- "API query confirmed..."

---

## Research Workflow

### Step 1: Search (X or Web)
```bash
# X search for trending topics
bird search "topic" --count 20

# Web search for verification
# Use web_search tool to find sources
```

### Step 2: Verify Sources
- Check multiple sources (minimum 2)
- Verify dates, numbers, names
- Confirm URLs work
- Read full articles, not just headlines

### Step 3: Validate Before Logging
```bash
# Run verification (blocks if unverified)
node ~/clawd/automation/research-verifier.js \
  --sources "url1,url2" \
  --claim "Your factual statement"
```

### Step 4: Log with Sources
```markdown
## Research Session - 2026-02-04

✅ **Kyle Tucker signs $300M contract with Cubs**
- Source: https://spotrac.com/mlb/chicago-cubs/kyle-tucker
- Verified: 2026-02-04 via web_search
- Notes: 10-year deal, signed Dec 2024

✅ **BTC price on signing date: $85,200**
- Source: https://coingecko.com/en/coins/bitcoin/historical_data
- Verified: 2026-02-04 via API
- Calculation: $300M ÷ $85,200 = 3,521 BTC
```

---

## Specific Research Types

### 21M Sports Research
- MUST use `21m-sports-validator.js` before logging
- MUST include Spotrac/contract database URLs
- MUST include BTC price sources with dates
- See `21M-SPORTS-ENFORCEMENT.md` for full requirements

### Macro/Market News
- MUST cite financial news sources (Bloomberg, Reuters, Fed)
- MUST include dates (when data was published)
- MUST distinguish between facts and analysis

### Content Ideas / Brainstorming
- MARK AS UNVERIFIED if just ideas
- When ideas become content → VERIFY FIRST
- Never mix verified facts with unverified ideas

### Database Entries
- MUST verify athlete names, teams, positions
- MUST verify contract amounts before inserting
- MUST include source URL in database record

---

## Morning Brief Requirements

When generating morning briefs:

**Weather:**
✅ OK to use API without additional verification (wttr.in)

**Macro News:**
❌ Can't use "Markets steady" placeholder
✅ MUST pull from verified `memory/macro-news.md` with sources
✅ OR state "No verified macro updates available"

**Active Projects:**
✅ OK to list current projects (factual state of work)

**Tasks:**
✅ OK to pull from task manager (internal system)

---

## What Gets Verified vs Not

**MUST VERIFY (External Facts):**
- ✅ Sports contracts, athlete data
- ✅ Market prices, economic data
- ✅ News events, announcements
- ✅ Historical data, statistics
- ✅ Quotes, statements from people
- ✅ Business deals, sales, transactions

**NO VERIFICATION NEEDED (Internal State):**
- ✅ Task list status
- ✅ File system state
- ✅ Automation script results
- ✅ Database query results (from your own DB)
- ✅ Personal observations about Terry's requests

---

## Examples

### ❌ BAD (Unverified Research)
```markdown
## 21M Sports Research

Jayson Tatum lost $314M to bad advisors. This is a common story.
In 2015, Blue Jays roster cost less BTC than Bichette's current deal.
78% of NFL players go broke within 5 years.
```
**Problems:**
- No sources
- Made-up statistics
- Unverified claims
- Would fail validation

### ✅ GOOD (Verified Research)
```markdown
## 21M Sports Research - 2026-02-04

✅ **Allen Iverson Bankruptcy (Verified Story)**
- Source: https://espn.com/nba/story/_/id/12345/iverson-bankruptcy
- Verified: 2026-02-04 via web_search
- Facts: Earned $200M+ career, filed bankruptcy 2012
- Documented: ESPN 30 for 30, court filings

✅ **Kyle Tucker Contract**
- Source: https://spotrac.com/mlb/chicago-cubs/kyle-tucker
- Amount: $300M over 10 years
- Signed: December 2024
- BTC equivalent: 3,521 BTC @ $85,200 (Dec 2024 price)
- BTC price source: https://coingecko.com/coins/bitcoin/historical_data
```

### ❌ BAD (Unverified Macro News)
```markdown
# Macro News

- BTC consolidating around $100K
- Fed likely to cut rates soon
- Inflation cooling down
- Tech sector looking strong
```
**Problems:**
- No sources
- Vague claims
- "Likely" = speculation
- Would fail validation

### ✅ GOOD (Verified Macro News)
```markdown
# Macro News - 2026-02-04

✅ **BTC Price: $98,452**
- Source: https://api.coinbase.com/v2/prices/BTC-USD/spot
- Verified: 2026-02-04 10:30 AM via API

✅ **Fed Holds Rates at 5.25-5.5%**
- Source: https://federalreserve.gov/newsevents/pressreleases/2026
- Date: Jan 31, 2026 FOMC meeting
- Verified: 2026-02-04 via web_search

✅ **CPI Report: Inflation at 2.9% YoY**
- Source: https://bls.gov/news.release/cpi.nr0.htm
- Date: Released Feb 1, 2026
- Verified: 2026-02-04 via web_search
```

---

## Enforcement

### For Scripts
All research scripts MUST:
1. Call verification tools before writing to memory
2. Include source URLs in output
3. Mark unverified content clearly
4. Exit with error if verification fails

### For Manual Research
When Jett does research manually:
1. Use web_search or X search tools
2. Run verification before logging
3. Include sources in markdown format
4. Never log from memory/assumptions

### Audit Trail
All research validation is logged to:
`~/clawd/memory/verification-log.jsonl`

Review this file to check compliance.

---

## Updated AGENTS.md Section

This replaces the old instructions with:

**"Before writing ANY factual claim to memory or files:**
1. **Verify with sources** (X search, web_search, API)
2. **Run verification tool** (blocks if unverified)
3. **Include source URLs** in your log entry
4. **Mark unverified content** with ⚠️ warnings

Your memory is your research database. Pollute it with fake data → pollute your future work."

---

## Summary

**Old way:**
1. Think of something → Write it to memory → Use it later
2. Result: Fake data in memory → Fake content generated

**New way:**
1. Search for it → Verify with sources → Validate → Then log with URLs
2. Result: Only verified data in memory → Only verified content generated

**The rule:** Memory = verified facts + sources. No exceptions.

---

**Next Steps:**
1. Create `research-verifier.js` for general research validation
2. Update `21m-sports-researcher.js` to enforce sources
3. Update AGENTS.md with universal verification requirement
4. Audit existing memory files and mark unverified content

---

Last updated: 2026-02-04
