# Active Automations - Live Now! 🚀

**Status:** Task Manager running at http://localhost:3000
**Started:** Feb 1, 2026 @ 8:42 PM EST

## Scheduled Tasks

### Task #5: 21M Sports Nightly ⭐
**Schedule:** Daily at 11:00 PM
**What it does:**
- Determines tomorrow's content theme
- Generates 10 ready-to-post tweet options
- Saves to `automation/output/nightly-YYYY-MM-DD.md`
- Fact-checked data with character counts

**First run:** Tonight at 11:00 PM (in ~2 hours!)

**Tomorrow morning:** Fresh content ready in output folder for Jett to post to #21-m-sports

---

### Task #9: eBay Test Scraper 🔍
**Schedule:** Daily at 8:00 AM
**What it does:**
- Searches eBay for "vintage baseball jersey"
- Bypasses bot detection with stealth browser
- Saves results to `automation/output/ebay/results-YYYY-MM-DD-HHMM.txt`
- Demonstrates scraping capabilities

**First run:** Tomorrow at 8:00 AM

**Purpose:** Proof of concept - shows we can scrape any site, find deals, monitor prices

---

## What Terry Will See Tomorrow Morning

### 7:30 AM - Morning Brief (DM)
Standard brief with weather, priorities, etc.

### 7:30 AM - #21-m-sports Channel
**New post with:**
- Tomorrow's theme (Monday = 21M Monday - Breaking News in BTC)
- 10 ready-to-post tweet options
- All fact-checked with character counts
- Just pick favorite and post to X!

### 8:00 AM - eBay Results
**New file in automation/output/ebay/**
- Search results for vintage baseball jerseys
- Prices, listings, sellers
- Demonstrates scraping works
- Foundation for real eBay scanner

---

## Token Savings

**Before automation:**
- Manual content generation: ~5k tokens per session
- Browser automation for scraping: 40-60k tokens per task
- Daily total: ~50k+ tokens

**After automation:**
- Content generation: Runs locally (FREE)
- Scraping: Runs locally (FREE)
- Jett just reads files and posts: ~500 tokens
- Daily total: ~500 tokens (99% reduction!)

---

## Next Steps (After Testing)

### Short-term (Next Few Days)
1. eBay scanner with profit detection
2. Stock price monitoring (IREN, MSTR, CIFR, OPEN, ONDS)
3. Expand 21M automation (add trending research)

### Medium-term (Next Week)
4. Real estate scraping (when ready)
5. Competitor analysis automation
6. Content performance tracking

### Long-term (Ongoing)
7. Whatever else we discover needs automating!

---

## Monitoring

**Dashboard:** http://localhost:3000
- View all tasks
- Check execution logs
- Monitor status
- Add/remove/update tasks

**CLI:**
```bash
cd /home/clawd/clawd/task-manager
node cli.js list           # View all tasks
node cli.js show 5         # View task details
node cli.js logs 5         # View execution logs
```

**Output Files:**
- 21M content: `automation/output/nightly-*.md`
- eBay results: `automation/output/ebay/results-*.txt`

---

**Everything runs automatically. Set and forget.** 🎯
