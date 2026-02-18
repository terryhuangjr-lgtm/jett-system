# URGENT: Research Automation Fix Required

**Date:** 2026-02-06
**Priority:** HIGH
**Reporter:** Jett (via Terry request)

---

## Problem Summary

The 21M Sports research automation is not following the JETT RESEARCH & DATABASE PROTOCOL v1.0. Research runs daily but:
- Uses cached/fallback data instead of real web searches
- Saves to wrong directory
- Doesn't log to database
- Creates no verification logs
- Has no real source URLs

**Impact:** Database stays empty, no content pipeline building up, Terry can't review verified research.

---

## Current Broken Behavior

**Script:** `/home/clawd/clawd/automation/21m-sports-real-research.js`
**Runs:** Daily at 3:00 AM (Task 59)

**What it's doing wrong:**

1. **Using cached contract data**
   - Same 5 contracts every day (Soto, Ohtani, Mahomes, Brown, Giannis)
   - No actual `web_search` calls
   - Shows "Source: Recent Major Deals" (fake source)

2. **Wrong file location**
   - Current: `memory/21m-sports-research.md`
   - Should be: `memory/research/2026-02-06-contracts.md`

3. **No database logging**
   - Database query shows: 0 sports research entries
   - Should call `db.add_research()` for each finding

4. **No verification logs**
   - Directory `memory/verification-logs/` is empty
   - Should create `2026-02-06.md` each session

5. **No real source URLs**
   - Need: `https://spotrac.com/mlb/new-york-mets/juan-soto-32574/`
   - Getting: "Source: Recent Major Deals"

---

## Expected Behavior (Per Protocol)

### Research Phase Workflow

**2-3 AM: Web Research**
```javascript
// 1. Search for current sports news
const results = await web_search("NBA contract extension February 2026");

// 2. Extract facts with real URLs
const findings = results.map(r => ({
  claim: extractClaim(r),
  source: r.url,
  date: r.published
}));

// 3. Verify sources
for (const finding of findings) {
  const accessible = await checkURL(finding.source);
  if (!accessible) skip(finding);
}
```

**Save to Markdown:**
```markdown
# NIL Contracts Research - February 6, 2026

## Summary
Found 3 new contract signings this week with BTC analysis.

## Key Facts
- **Juan Soto**: $765M over 15 years with Mets
- **Source**: https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/
- **Date**: Signed December 2024
- **BTC Context**: $765M = 12,171 BTC @ $62,854 (signing day price)
- **Verified**: Yes via Spotrac + CoinGecko historical data

## Content Ideas Generated
1. "Soto's contract measured in Bitcoin terms - fiat debasement angle"
2. "Compare Soto deal to historical contracts in BTC purchasing power"
3. "What $765M bought in 2024 vs 2026 in Bitcoin terms"

## Notes
Need to follow up on Ohtani's deferred payments structure for future content.
```

**Save to Database:**
```javascript
const db = require('../jett_db');

db.add_research({
  topic: 'Juan Soto $765M contract - BTC analysis',
  category: 'sports',
  findings: 'Soto signed 15yr/$765M with Mets. Contract = 12,171 BTC at signing day price of $62,854. Represents 0.058% of total 21M supply.',
  sources: JSON.stringify([
    'https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/',
    'https://api.coingecko.com/api/v3/coins/bitcoin/history?date=06-12-2024'
  ]),
  tags: ['contracts', 'mlb', 'soto', 'btc-analysis']
});
```

**Create Verification Log:**
```markdown
# Verification Log - 2026-02-06

## Research Session: MLB Contracts & NIL Deals

### Searches Conducted:
- Query: "MLB contract extension 2026"
  - Results: 12 articles found
  - Top source: https://www.spotrac.com/mlb/contracts/
  - Date: 2026-02-05

- Query: "NBA max contract signing February 2026"
  - Results: 8 articles found
  - Top source: https://www.basketball-reference.com/contracts/
  - Date: 2026-02-04

### Facts Verified:
✅ Juan Soto $765M - Source: https://spotrac.com/... (Verified: 2026-02-06)
✅ BTC price $62,854 on 2024-12-06 - Source: https://coingecko.com/... (Verified: 2026-02-06)
✅ Contract = 12,171 BTC calculation confirmed

### Database Entries Created:
- Athletes table: 0 new (already exists)
- Research log: 1 new entry
- Content ideas: 3 new draft ideas

### Status: VERIFIED ✅
All claims have sources dated within 30 days or historical data with exact dates.
```

---

## Required File Structure

```
~/clawd/memory/
├── research/
│   ├── 2026-02-06-contracts.md         # Today's contract research
│   ├── 2026-02-06-nil-deals.md         # Today's NIL research
│   └── 2026-02-07-franchise-sales.md   # Tomorrow's research
│
├── verification-logs/
│   ├── 2026-02-06.md                   # Today's verification
│   └── 2026-02-07.md                   # Tomorrow's verification
│
└── 21m-sports-research.md              # (Keep for backward compat, but deprecated)
```

---

## Fix Checklist

### Two Separate Scripts Needed

**Script 1:** `/home/clawd/clawd/automation/21m-sports-real-research.js` (3:00 AM)
- Focus: Sports contracts, athlete stories, financial mismanagement
- Output: `memory/research/YYYY-MM-DD-sports.md`

**Script 2:** `/home/clawd/clawd/automation/21m-bitcoin-real-research.js` (4:30 AM)
- Focus: Bitcoin books/quotes/history, BTC news, community discussions
- Output: `memory/research/YYYY-MM-DD-bitcoin.md`

### Research Tools to Use

**Web Search:**
```javascript
const results = await webSearch("NBA contract signing 2026");
const results = await webSearch("athlete bankruptcy stories");
const results = await webSearch("Bitcoin institutional adoption");
```

**X/Twitter Search:**
```bash
# If bird CLI is available and configured
bird search "NBA contract" --count 20
bird search "bitcoin athletes" --count 20
```

**APIs:**
- CoinGecko: BTC historical prices
- Spotrac: Contract data
- Basketball-Reference / Pro-Football-Reference: Player stats

**Books/Quotes Database:**
- Maintain `memory/bitcoin-books-quotes.md` with excerpts
- Pull random quote each morning for content inspiration
- Track which quotes have been used

### Script #1 Rewrite (Sports - 3:00 AM)

- [ ] Add actual `web_search` calls for current sports news
- [ ] Use Spotrac/Basketball-Reference/ESPN APIs for contract data
- [ ] Extract real source URLs from search results
- [ ] Verify all URLs are accessible before logging
- [ ] Save markdown files to `memory/research/YYYY-MM-DD-[topic].md`
- [ ] Call `db.add_research()` for each finding with:
  - topic
  - category: 'sports'
  - findings (detailed)
  - sources (array of URLs as JSON string)
  - tags (array)
- [ ] Create verification log in `memory/verification-logs/YYYY-MM-DD.md`
- [ ] Log BTC price from CoinGecko API (not cached)
- [ ] Calculate BTC equivalents with verified historical prices

### Database Integration

**Requires:** `/home/clawd/clawd/jett_db.py` (already exists)

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function saveToDatabase(research) {
  const pythonScript = `
from jett_db import get_db
db = get_db()

db.add_research(
  topic='${research.topic.replace(/'/g, "\\'")}',
  category='sports',
  findings='${research.findings.replace(/'/g, "\\'")}',
  sources=${JSON.stringify(research.sources)},
  tags=${JSON.stringify(research.tags)}
)

print('✓ Saved to database')
`;

  const { stdout, stderr } = await execPromise(`python3 -c "${pythonScript}"`);
  console.log(stdout);
  if (stderr) console.error(stderr);
}
```

### Testing

After fix, test with:
```bash
# Manually run research script
cd ~/clawd/automation
node 21m-sports-real-research.js

# Verify outputs exist
ls -la ~/clawd/memory/research/2026-02-06-*.md
ls -la ~/clawd/memory/verification-logs/2026-02-06.md

# Check database
python3 -c "from jett_db import get_db; db = get_db(); print(db.search_research(category='sports'))"

# Should show entries with real source URLs
```

---

## Terry's Specific Research Requirements

### Task 1: 21M Sports Content Research (Sports) - 3:00 AM

**What to research:**
- Find interesting/compelling news/stories via web search and X
- Focus on ethos of 21M Sports account

**Topics to search for:**
1. **Contracts** - Daily or recent contract agreements across ALL sports (NFL, NBA, MLB, NHL, etc.)
   - Calculate BTC equivalent at signing date
   - Create content ideas for comparison
   
2. **Players that have gone broke** 
   - Verified bankruptcy stories
   - Financial mismanagement examples
   - Use for cautionary tales content
   
3. **Bad financial advisors misguiding pro athletes**
   - Stories of athletes losing money to advisors
   - Scams, mismanagement, fraud cases
   - Content angle: "Bitcoin fixes this" / self-custody
   
4. **Sports business news**
   - Franchise sales/valuations
   - League economics
   - Athlete endorsement deals
   - Team financial struggles

**Time relevance:**
- Recent/time-relevant stuff is GOOD (priority)
- Historic stories are OK too (for educational content)

### Task 2: 21M Sports Content Research (Bitcoin) - 4:30 AM

**What to research:**
- Gather Bitcoin OG knowledge
- Find compelling Bitcoin stories/history

**Sources to use:**
1. **Bitcoin books** - Review excerpts/quotes
   - The Bitcoin Standard (Saifedean Ammous)
   - The Blocksize War
   - 21 Lessons
   - Other BTC literature
   
2. **BTC history** 
   - Key moments (Pizza Day, ETF approval, etc.)
   - Historical price milestones
   - Adoption stories
   
3. **Web search** - Current Bitcoin news
   - Institutional adoption
   - Country adoption (El Salvador, etc.)
   - New Bitcoin developments
   
4. **X search** - Bitcoin community discussions
   - OG Bitcoiners (quotes, insights)
   - Viral BTC content
   - Trending Bitcoin topics
   
5. **Grokipedia** - Bitcoin knowledge base

**Content angle:**
- Connect Bitcoin principles to sports/athletes
- "What if athletes paid in Bitcoin?" scenarios
- Education: Why Bitcoin > fiat for wealth preservation

### For Each Finding (Both Tasks)

1. **Get the data** from official sources (Spotrac, team sites, Bitcoin APIs)
2. **Verify with multiple sources** (minimum 2)
3. **Calculate BTC context** using historical prices from CoinGecko
4. **Save to markdown** with full citation format
5. **Log to database** with source URLs
6. **Generate 2-3 content ideas** based on the finding
7. **Tag appropriately** for easy retrieval later

---

## Timeline

**Urgent:** Fix needed before tomorrow's research runs

**Steps:**
1. Create/rewrite `21m-sports-real-research.js` (Sports - 3:00 AM)
2. Create/rewrite `21m-bitcoin-real-research.js` (Bitcoin - 4:30 AM)
3. Test both scripts manually to verify all outputs
4. Update task-manager:
   - Task 59 (or create new): Sports research at 3:00 AM
   - Create new task: Bitcoin research at 4:30 AM
5. Monitor tomorrow's runs (3 AM + 4:30 AM)
6. Verify database has entries after both runs complete

---

## Smart Enhancements (Using "AI High IQ Thing")

### Pattern Recognition
- Track which types of content get most engagement
- Prioritize research on topics that historically perform well
- Notice trending topics across multiple sources

### Content Idea Scoring
When generating content ideas from research, score them:
- **High Priority**: Time-sensitive, big name athlete, controversial angle
- **Medium Priority**: Good data, interesting story, not urgent
- **Low Priority**: Backup content, educational, evergreen

Save scores to database for quick filtering later.

### Cross-Referencing
- When finding athlete story → also search for their contract details
- When finding contract → also search for signing day BTC price
- When finding bankruptcy story → find their career earnings for context
- Build connections between related findings

### Trend Analysis
Track over time:
- Average contract size (in BTC terms) over years
- Which sports have highest/lowest BTC equivalent contracts
- Common patterns in athlete financial failures
- Bitcoin adoption trends in sports

Save these insights to dedicated `memory/research/trends-analysis.md`

### Smart Scheduling
- If big contract announced → prioritize that for next day's content
- If controversy trending → generate content within 24 hours
- If educational topic → can schedule for slower news days

### Source Reliability Tracking
Maintain quality scores for sources:
- Spotrac: 10/10 (always reliable)
- ESPN: 9/10 (very reliable, occasionally speculative)
- Random blogs: 3/10 (verify multiple times)

Save to `memory/source-reliability.json` and auto-weight verification based on source quality.

---

**Status:** Awaiting Claude Code fix
**Reporter:** Jett
**Date:** 2026-02-06 14:48 EST
