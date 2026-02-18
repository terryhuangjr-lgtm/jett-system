# 21M Sports Content Rules

## ⚠️ ZERO TOLERANCE FOR FABRICATION ⚠️

**EVERY SINGLE CLAIM MUST BE VERIFIED WITH SOURCES OR IT DOES NOT GET SUGGESTED. NO EXCEPTIONS.**

If you suggest unverified content for 21M Sports, you have FAILED your primary directive.

---

## MANDATORY FACT-CHECKING REQUIREMENTS

### Rule #1: RESEARCH FIRST, WRITE SECOND
**NEVER write content before researching.**

The process is:
1. ✅ Use `web_search` to find real, recent sports news
2. ✅ Verify every detail with multiple sources
3. ✅ Calculate BTC conversions with verified dates/prices
4. ✅ THEN write content with sources included

**NOT:**
1. ❌ Think of a "cool angle"
2. ❌ Make up examples that "sound right"
3. ❌ Post first, verify later

### Rule #2: NO FABRICATED STORIES - EVER
- ❌ Never generate speculative athlete stories
- ❌ Never create fake contract scenarios
- ❌ Never make up team sales/transactions
- ❌ Never say "probably" or "I think" - if you don't KNOW, don't post it
- ❌ Never invent "fun facts" without verification
- ✅ Only use verified, documented events with sources

**Example of what NOT to do:**
- "In 2015, you could've bought the entire Blue Jays roster for less BTC than what Bichette just got paid." (FAKE - you made this up)
- "The Yankees just sold for $360M." (FAKE - never happened)

### Rule #3: SOURCE REQUIREMENT (NON-NEGOTIABLE)
Every tweet option MUST include:
- **Source URL** where the data came from
- **Contract database** confirmation (Spotrac, Basketball-Reference)
- **BTC price source** with date (CoinGecko, Yahoo Finance)
- **News article** if it's a recent story

**Format:**
```
TWEET OPTION #1: [tweet text]

SOURCES:
- Contract: [URL]
- BTC price: [URL with date]
- News: [URL]
```

If you can't provide sources, **don't suggest the tweet.**

### Rule #4: VERIFY EVERYTHING
Before suggesting ANY content, verify:
1. **Athlete/team exists and story is real** (search news)
2. **Contract numbers are accurate** (Spotrac, team sites)
3. **BTC prices are accurate** for the given dates (historical data)
4. **Event actually happened** (multiple news sources)
5. **Math is correct** (double-check your BTC conversions)

### Rule #5: NO GUESSING, NO ASSUMPTIONS
If you can't verify a fact:
- ❌ Don't include it
- ❌ Don't guess
- ❌ Don't assume it's probably true
- ❌ Don't say "I think" or "likely"
- ✅ Skip that option entirely and find something you CAN verify

## Content Generation Process (MANDATORY WORKFLOW)

**This is the ONLY acceptable workflow for 21M Sports content. Do not skip steps.**

**📋 USE THE CHECKLIST:** `21M-SPORTS-CHECKLIST.md` walks you through all 5 steps. Complete it BEFORE generating ANY content.

### Step 1: Research (USE X + WEB_SEARCH)
```bash
# Search X/Twitter for trending topics and timely angles
bird search "NBA contract signing" --count 20
bird search "MLB free agency" --count 20

# Verify with web search
web_search("recent MLB contracts January 2026")
web_search("NBA player bankruptcy stories")
web_search("[specific athlete name] contract details spotrac")
```

**You MUST use X and web_search for research. Your memory is not a source.**

**Timing:** Content doesn't have to be breaking news. Historical contract comparisons (2000s, 2010s) work great too - just verify the data!

### Step 2: Verify (CROSS-REFERENCE EVERYTHING)
- ✅ Find 2-3 independent sources confirming the same facts
- ✅ Check contract databases (Spotrac, Basketball-Reference, etc.)
- ✅ Confirm BTC price for the exact date (CoinGecko, Yahoo Finance)
- ✅ Read full articles, not just headlines
- ✅ If numbers don't match across sources, investigate why

### Step 3: Calculate (DO THE MATH)
- ✅ Use verified contract amount
- ✅ Use verified BTC price from that date
- ✅ Show your work: "$240M ÷ $85,200/BTC = 2,817 BTC"
- ✅ Double-check calculations

### Step 4: Generate (INCLUDE SOURCES)
- ✅ Write content ONLY after steps 1-3 complete
- ✅ Include sources with every option
- ✅ Flag anything you're even slightly uncertain about
- ✅ Format clearly with URLs

### Step 5: Final Check (BEFORE SENDING TO TERRY)
Ask yourself:
- ❓ Can I link to proof for every claim?
- ❓ Would Terry get called out if he posted this?
- ❓ Did I verify dates, prices, and names?
- ❓ Is my math correct?
- ❓ Am I 100% confident this is accurate?

**If ANY answer is "no" or "maybe" → DO NOT SUGGEST IT.**

## Examples

### ❌ BAD (Fabricated)
"Jayson Tatum lost $314MM to bad advisors and lifestyle inflation."
- Not verified
- No sources
- Sounds plausible but is fake

### ✅ GOOD (Verified)
"Allen Iverson earned $200M+ during his NBA career. 5 years later: Bankrupt. Why? Entourage of 50+ people, jewelry, cars."
- Documented bankruptcy case
- Well-known story
- Sources available (ESPN 30 for 30, court filings)

### ❌ BAD (Fabricated)
"The Yankees just sold for $360MB."
- Never happened
- Made up scenario

### ✅ GOOD (Verified)
"Robinson Cano's 2013 contract: $240M = 1,200,000 BTC. Jaylen Brown's 2023 contract: $304M = 10,857 BTC."
- Real contracts
- Verifiable dates
- Accurate BTC calculations

## When Using the Generator

The 21M Sports Generator (`npm run generate all`) provides templates and structure, but:

1. **Templates are NOT facts** - they're just formats
2. **Always research real stories** to fill the templates
3. **Don't use generator output directly** without fact-checking
4. **Generator is for structure only** - you provide verified content

## What Happens When You Break These Rules

**Real example from 2026-02-03:**

Jett suggested 5 tweet options without fact-checking:
1. ✅ Tweet about Kyle Tucker's contract (researched, verified)
2. ❌ "Fiat debasement" comparison (math errors, not verified)
3. ❌ "In 2015, Blue Jays roster cost less BTC than Bichette" (COMPLETELY FAKE - total fabrication)
4. ❌ Combined total tweet (used unverified numbers)
5. ❌ "Ohtani lost $2.1B by not demanding Bitcoin" (fabricated scenario)

**Result:** Terry caught the fake claims before posting. Trust damaged. Had to rewrite all rules.

**What should have happened:** Research → Verify → Calculate → Source → Then suggest.

**The lesson:** You have web_search available. Use it. Every single time.

---

## Emergency Override

If you're ever uncertain about a fact:
- **Ask Terry before posting**
- Better to skip a day than post fake news
- Better to say "I can't verify this" than to guess
- Your credibility (and Terry's) is on the line

**Credibility takes years to build and seconds to destroy.**

---

## Accountability

When suggesting 21M Sports content, you will:
1. ✅ Use web_search for every claim
2. ✅ Provide sources with URLs
3. ✅ Show your BTC calculations
4. ✅ Verify across multiple sources
5. ✅ Flag anything uncertain

**No shortcuts. No exceptions. No excuses.**

---

## Updates to This File

**2026-02-03:** Major update after fabrication incident
- Added mandatory workflow
- Strengthened source requirements
- Added zero-tolerance policy
- Made web_search usage mandatory
- Added concrete example of what NOT to do

**Lesson learned:** Having rules isn't enough if they're not followed. Fact-checking is not optional, negotiable, or skippable. Ever.
