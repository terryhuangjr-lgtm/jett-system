# TASK: Rebuild Jett's Complete Research & Content System

## The Goal
Build automated research pipeline that feeds database, generates ideas, creates content, and deploys - ALL with verification.

---

## Current State

**What Exists:**
- Database: `/home/clawd/clawd/data/jett_knowledge.db` (144KB)
- Tables: athletes, ebay_deals, research_log, content_ideas
- 21M Sports system works (verified generator + deploy)
- Task manager running
- Slack connected

**What's Missing:**
- Research automation (was Task 27 - deleted by mistake)
- Database isn't being populated
- No morning briefs
- Content ideas not being generated from research

---

## The Complete Workflow (What Needs to Happen)

### Phase 1: Nightly Research (Split into Two Tasks)

---

#### Task 5: Sports Research (3:00 AM)

**Script:** `/home/clawd/clawd/automation/jett-sports-research.js`

**Mission:** Find interesting/compelling sports stories that fit 21M Sports ethos

**What to Search For:**

1. **Recent Contract Agreements (ALL SPORTS)**
   - MLB, NBA, NFL, NHL, Premier League, MLS signings
   - Search: "player signs contract", "[sport] contract agreement", "extension deal"
   - Convert to BTC at signing date for comparison content
   - Look for: mega-deals, extensions, rookie contracts
   
2. **Athletes & Money Stories**
   - Players who went broke (bankruptcy, bad investments)
   - Financial advisor scandals (mismanagement, fraud)
   - Lifestyle inflation stories
   - Search: "athlete bankruptcy", "NFL player broke", "financial advisor lawsuit athlete"
   
3. **NIL Deals (College Athletes)**
   - Recent NIL agreements
   - Record-breaking deals
   - Search: "NIL deal", "college athlete endorsement", "Name Image Likeness"
   
4. **Historic Contracts (For Evergreen Content)**
   - Shaq's 1992 deal, Jordan's contracts, etc.
   - Compare historic BTC value vs today
   - Search: "largest contracts in [sport] history", "record deal [year]"

5. **Fiat Debasement Examples**
   - Salary cap increases over time
   - Franchise valuations then vs now
   - How contracts "look smaller" in BTC terms
   - Search: "salary cap history", "franchise sale", "team valuation"

**Search Methods:**
- `web_search`: ESPN, Spotrac, Athletic, Bleacher Report
- `bird search` (X): Real-time contract news, athlete reactions
- Grokipedia: Background on historic deals

**Example Queries:**
```bash
web_search "NBA contract signed February 2026"
web_search "athlete bankruptcy story 2024"
web_search "financial advisor mismanaged athlete money"
bird search "just signed contract" --count 50
bird search "NIL deal" --count 30
```

**Output Format:**
```markdown
# Sports Research - 2026-02-07 3:00 AM

## Recent Contracts

✅ **Ja Morant Extension - $193M/5yr (Grizzlies)**
- Source: https://spotrac.com/nba/memphis-grizzlies/ja-morant/
- Signed: May 2023
- BTC at signing: $27,000 = 7,148 BTC
- BTC today: $103,000 = 1,873 BTC
- Angle: Same contract "worth" 73% less in BTC terms
- Verified: 2026-02-07 3:15 AM

## Financial Disaster Stories

✅ **Allen Iverson Financial Troubles**
- Source: https://espn.com/nba/story/iverson-bankruptcy
- Earned: $200M+ career
- Filed bankruptcy 2012
- Angle: How AI lost it all despite Reebok trust fund
- Historic: Good evergreen content
- Verified: 2026-02-07 3:22 AM

## NIL Deals

✅ **Caitlin Clark - $28M Nike Deal**
- Source: https://espn.com/wnba/story/clark-nike-deal
- Announced: Feb 6, 2026
- BTC equivalent: 272 BTC @ $103K
- Angle: Largest WNBA endorsement, compare to men's deals
- Verified: 2026-02-07 3:28 AM
```

---

#### Task 6: Bitcoin Research (4:30 AM)

**Script:** `/home/clawd/clawd/automation/jett-bitcoin-research.js`

**Mission:** Gather Bitcoin OG knowledge, quotes, history, and principles

**What to Search For:**

1. **Bitcoin Book Quotes & Principles**
   - The Bitcoin Standard (Saifedean Ammous)
   - The Fiat Standard
   - Broken Money (Lyn Alden)
   - Search: "bitcoin standard quotes", "hard money principle", "sound money quote"

2. **Bitcoin History & Milestones**
   - Bitcoin whitepaper anniversary
   - Historic price moments
   - Halving events, adoption milestones
   - Search: "bitcoin history", "first bitcoin transaction", "bitcoin pizza day"

3. **Bitcoin OG Wisdom**
   - Satoshi quotes
   - Hal Finney, Nick Szabo, Michael Saylor quotes
   - Laser eyes community wisdom
   - Search: "Michael Saylor bitcoin quote", "Satoshi Nakamoto quote", "bitcoin og"

4. **Fiat System Critiques**
   - Money printing examples
   - Inflation data
   - Currency debasement history
   - Search: "money supply increase", "inflation statistics", "currency debasement"

5. **21M Supply Math & Scarcity**
   - Fixed supply vs unlimited fiat
   - Percentage calculations (X BTC = Y% of 21M)
   - Scarcity comparisons
   - Search: "bitcoin fixed supply", "21 million bitcoin", "digital scarcity"

6. **Current BTC News (If Relevant)**
   - Major price movements
   - Institutional adoption news
   - Regulatory updates
   - Search: "bitcoin news today", "institutional bitcoin", "bitcoin ETF"

**Search Methods:**
- `web_search`: Bitcoin Magazine, Coindesk, Twitter Spaces transcripts
- `bird search` (X): Bitcoin OG accounts, #bitcoin hashtag
- Grokipedia: Bitcoin history, key figures
- Book databases: Quotes from key Bitcoin books

**Example Queries:**
```bash
web_search "Saifedean Ammous hard money quote"
web_search "Michael Saylor bitcoin interview 2024"
web_search "bitcoin halving history"
bird search "sound money" --count 30
bird search "21 million bitcoin" --count 30
```

**Output Format:**
```markdown
# Bitcoin Research - 2026-02-07 4:30 AM

## Bitcoin OG Quotes

✅ **Saifedean Ammous - The Bitcoin Standard**
> "Hard money is money that it is costly to produce relative to existing supply."
- Source: The Bitcoin Standard, Chapter 1
- Context: Defining sound money principles
- Content angle: Use for educational posts
- Verified: 2026-02-07 4:35 AM

✅ **Michael Saylor - Feb 2026 Interview**
> "Bitcoin is the apex property of the human race. Everything else is just renting."
- Source: https://youtube.com/saylor-interview-feb-2026
- Date: Feb 3, 2026
- Content angle: Strong store of value narrative
- Verified: 2026-02-07 4:42 AM

## Bitcoin History

✅ **Bitcoin Pizza Day - May 22, 2010**
- Laszlo Hanyecz paid 10,000 BTC for 2 pizzas
- BTC price then: ~$0.0025 each
- Those BTC today: $1.03 billion
- Source: https://bitcoin.org/en/bitcoin-history
- Content angle: Ultimate fiat debasement story
- Verified: 2026-02-07 4:48 AM

## Fiat Critique

✅ **M2 Money Supply 2020-2024**
- Increased from $15.4T to $21.1T (37% growth)
- Source: https://fred.stlouisfed.org/series/M2SL
- BTC supply: 0% change (19.8M → 19.8M)
- Content angle: Money printer vs fixed supply
- Verified: 2026-02-07 4:55 AM
```

---

#### eBay Research (Integrated into Sports Research)

**During Sports Research phase, also scan:**
- Existing eBay scanner results
- Log best deals to `ebay_deals` table
- Save to research markdown

**Requirements:**
- Use `web_search` tool for all research
- MUST include source URLs
- Save to markdown: `memory/research/nightly-YYYY-MM-DD.md`
- Insert into database tables
- Create verification log: `memory/verification-logs/research-YYYY-MM-DD.jsonl`

**Output Example:**
```markdown
# Nightly Research - 2026-02-07

## eBay Deals

✅ **1997 Kobe Topps Chrome Refractor - $450**
- Source: https://ebay.com/itm/12345
- Comps: $600-800 on Spotrac
- Profit potential: $150-350
- Verified: 2026-02-07 2:45 AM

## Sports News

✅ **Caitlin Clark Signs $28M Nike Deal**
- Source: https://espn.com/wnba/story/clark-nike
- Date: Feb 6, 2026
- NIL context: Largest WNBA endorsement
- Verified: 2026-02-07 3:10 AM
```

---

### Phase 2: Content Ideas Generation (3:30-4:00 AM)

**Script:** `/home/clawd/clawd/automation/jett-content-generator.js`

**What It Does:**
- Reads overnight research from markdown + database
- Generates content ideas (21M Sports angles, comparisons, stories)
- Saves to `content_ideas` table + `memory/content-drafts/ideas-YYYY-MM-DD.md`

**Content Pillars (Based on Research):**

1. **Contract Analysis** (from Sports Research)
   - Recent signing → BTC equivalent
   - Historic deal → BTC then vs now
   - Salary cap growth → fiat debasement proof

2. **Cautionary Tales** (from Sports Research)
   - Athletes who went broke
   - Bad financial advisors
   - Lifestyle inflation warnings

3. **Bitcoin Standard** (from Bitcoin Research)
   - Hard money principles
   - 21M supply math
   - OG quotes and wisdom

4. **Fiat Debasement** (from both)
   - Money printing examples
   - Purchasing power erosion
   - Why contracts "shrink" in BTC terms

5. **Educational** (from Bitcoin Research)
   - Bitcoin history lessons
   - Sound money education
   - Scarcity vs abundance

6. **Side Hustle** (from eBay scans)
   - Card arbitrage opportunities
   - Building wealth in BTC terms

**Output Example:**
```markdown
# Content Ideas - 2026-02-07

## Idea 1: Caitlin Clark Nike Deal in BTC
**Hook:** $28M Nike deal = X BTC at today's price
**Angle:** Compare to Shaq's 1992 Reebok deal in BTC terms
**Pillar:** Fiat debasement
**Sources:** ESPN article + CoinGecko price data
**Status:** Ready for verification

## Idea 2: eBay Card Arbitrage Story
**Hook:** Found $450 Kobe card worth $800 - profit in minutes
**Angle:** Side hustle potential with sports cards
**Pillar:** Educational
**Sources:** eBay listing + Beckett pricing
**Status:** Ready for content
```

---

### Phase 3: Content Verification & Creation (4:00-5:00 AM)

**Use Existing System:**
- `21m-sports-real-research.js` (already working)
- `21m-sports-verified-generator-v2.js` (already working)
- `21m-sports-validator.js` (already working)

**New Addition:**
Pull from `content_ideas` table to feed the verified generator with richer source material.

---

### Phase 4: Morning Brief (6:00 AM)

**Script:** `/home/clawd/clawd/automation/jett-morning-brief.js`

**What It Includes:**
1. Weather (Long Island)
2. Overnight research summary (top 3 findings)
3. Content ready for review (links to generated tweets)
4. eBay deals found (top 3 opportunities)
5. Database stats (new entries added overnight)

**Deploy To:** Slack DM to Terry

**Output Example:**
```
☀️ Good morning! Feb 7, 2026

🌤️ Weather: 45°F, Partly Cloudy

📊 Overnight Research:
• Caitlin Clark $28M Nike deal (WNBA record)
• Found 3 undervalued Kobe cards on eBay
• BTC holding steady at $103K

📝 Content Ready:
• 6 new tweet options in #21msports
• 2 eBay deal highlights ready to post

💾 Database Update:
• 1 new athlete entry
• 3 eBay deals logged
• 2 content ideas generated

Dashboard: http://localhost:3000
```

---

### Phase 5: Tweet Deployment (7:30 AM, 12:00 PM)

**Use Existing System:**
- Tasks 61 & 63 already deploy verified content
- Just need to feed them richer content from research database

---

## Database Schema Requirements

**Check existing tables, ensure they have:**

### `athletes` table:
- name, team, position, contract_value, contract_date
- btc_equivalent, btc_price_on_date
- source_url, verified_date

### `ebay_deals` table:
- item_title, price, estimated_value, profit_potential
- ebay_url, condition, seller_rating
- found_date, verified

### `research_log` table:
- date, topic, summary, key_findings
- source_urls (JSON array)
- verified, added_to_content_queue

### `content_ideas` table:
- title, hook, angle, pillar
- source_data (JSON - links to research)
- status (draft/verified/posted)
- created_date, tweet_text (if generated)

---

## Task Manager Integration

**Create these tasks:**

1. **Task 5: Sports Research**
   - Schedule: Daily at 3:00 AM
   - Command: `node /home/clawd/clawd/automation/jett-sports-research.js`
   - Priority: 9
   - Duration: ~25 minutes
   - Output: Contracts, athlete stories, NIL deals

2. **Task 6: Bitcoin Research**
   - Schedule: Daily at 4:30 AM
   - Command: `node /home/clawd/clawd/automation/jett-bitcoin-research.js`
   - Priority: 9
   - Duration: ~25 minutes
   - Output: OG quotes, history, fiat critiques

3. **Task: Content Ideas Generation**
   - Schedule: Daily at 5:15 AM
   - Command: `node /home/clawd/clawd/automation/jett-content-generator.js`
   - Priority: 9
   - Duration: ~10 minutes
   - Input: Reads both research outputs

4. **Task: Morning Brief**
   - Schedule: Daily at 6:00 AM
   - Command: `node /home/clawd/clawd/automation/jett-morning-brief.js`
   - Priority: 10
   - Duration: ~5 minutes
   - Output: Summary to Slack DM

---

## Verification Requirements

**Every fact must:**
1. Come from web_search or verified source
2. Include source URL
3. Pass validation before database insert
4. Be logged to verification-logs/

**Scripts must exit with error if:**
- web_search fails
- Source URLs missing
- Verification fails
- Database insert fails

---

## Testing & Validation

**Build test script:** `/home/clawd/clawd/automation/test-research-system.sh`

Tests:
1. Database connection works
2. Research script can query and insert
3. Content generator reads from database
4. Morning brief formats correctly
5. All verification logs created
6. Slack posting works

---

## Success Criteria

✅ Nightly research runs and populates database
✅ Database grows with verified data
✅ Content ideas generated from research
✅ Morning brief shows overnight findings
✅ Terry wakes up to research summary + content options
✅ All data includes source URLs
✅ System runs automatically every night

---

## File Locations

**Scripts to create:**
- `/home/clawd/clawd/automation/jett-nightly-research.js`
- `/home/clawd/clawd/automation/jett-content-generator.js`
- `/home/clawd/clawd/automation/jett-morning-brief.js`
- `/home/clawd/clawd/automation/test-research-system.sh`

**Database:**
- `/home/clawd/clawd/data/jett_knowledge.db`

**Output directories (already exist):**
- `/home/clawd/clawd/memory/research/`
- `/home/clawd/clawd/memory/verification-logs/`
- `/home/clawd/clawd/memory/content-drafts/`

**Task manager:**
- `/home/clawd/clawd/task-manager/`

---

## Implementation Notes

- Use Node.js (v22)
- Use existing patterns from 21M scripts
- Integrate with existing eBay scanner logic
- Use `web_search` tool (already available)
- Follow verification policy strictly
- Keep scripts modular and testable

---

**Build this system so Terry's database fills with knowledge, content ideas flow, and mornings start with a summary of cool shit discovered overnight.**
