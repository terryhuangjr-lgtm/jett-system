# eBay Scraper Build - Feb 2, 2026

## Goal
Build eBay scraper that finds profitable flips while Terry sleeps

## Why This Could Be a Game Changer
- Runs 24/7 on always-on machine
- Finds deals before others
- Filters by profit margin, sell-through rate, competition
- Morning digest of best opportunities
- Passive income stream

## Build Approach: Claude Code

**This is a Claude Code job** (complex API integration + data processing)

### What We Need

**1. eBay API Access**
- Developer account signup
- API keys (browsing, finding, shopping)
- Rate limits to respect

**2. Search Criteria (From Terry)**
- Categories to focus on?
- Price range?
- Profit margin target? (e.g., 30%+)
- Sell-through rate? (how fast items move)
- Avoid bulky/heavy items?
- Location preferences?

**3. What Defines a "Gem"**
- Underpriced vs market value
- High demand (sold listings vs active)
- Low competition
- Fast shipping potential
- Easy to photograph/list

### Output Format
Daily digest to Slack:
```
🔍 eBay Gems - [Date]

💎 TOP FIND
Item: [Title]
Current: $50
Market: $150
Profit: $100 (67%)
Sold last 30d: 45 units
Competition: Low
Link: [eBay URL]

📊 Runner-ups:
1. [Item] - $X profit
2. [Item] - $X profit
3. [Item] - $X profit
```

### Tech Stack (Claude Code Will Decide)
- eBay API SDK
- Database for tracking (SQLite?)
- Scheduler for continuous monitoring
- Profit calculator
- Market analysis

### What Jett Does
- Hands off requirements to Claude Code
- Tests the tool once built
- Runs it nightly
- Delivers results to Slack

## Questions for Terry (Before Building)

1. **Categories:** Electronics? Sports cards? What do you know/enjoy?
2. **Budget:** Max price per item you want to flip?
3. **Profit target:** Minimum $ profit to flag?
4. **Time commitment:** How much time can you spend listing/shipping per week?
5. **Storage:** How much space do you have for inventory?

## Timeline
- Tomorrow: Get answers from Terry
- Hand off to Claude Code with clear requirements
- Build + test
- Launch nightly runs

---

**Status:** Waiting for Terry's answers
**Next:** Collect criteria, hand off to Claude Code
