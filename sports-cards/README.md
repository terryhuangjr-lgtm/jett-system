# Sports Card Business - Automation Project

## Overview

Terry + his brother run an active sports card business (currently hobby level, plan to scale in 2026).

**Core Model:** Buy raw cards → Grade with PSA → Sell graded cards  
**Key Insight:** PSA 10 = 3x+ value, PSA 9 = 20-30% profit

---

## Project Files

### **BUSINESS-MODEL.md**
Complete breakdown of their operation:
- Buy → Grade → Sell strategy
- Market dynamics and timing
- Product focus (rookies, autos, serial numbered, etc.)
- Current workflow and scale plan
- Profit model and success factors

**Read this first** to understand the business.

### **EBAY-SEARCH-CRITERIA.md**
Detailed eBay API search configuration:
- 7 different search types (rookies, serial numbered, hot inserts, etc.)
- Advanced filtering logic (grading potential assessment)
- Comp analysis and profit calculation
- Deal scoring system (1-10 scale)
- Alert priorities and output format

**Technical spec** for Claude Code to implement.

---

## Current Status

**Waiting on:** eBay API approval (~1 day)

**Once API arrives:**
1. Claude Code builds API client
2. Implement 7 search types
3. Add comp analysis (graded vs raw pricing)
4. Deploy deal scoring system
5. Set up Slack alerts

**ETA:** Feb 4-5, 2026

---

## Why This Matters

**Not hobby exploration** - this is infrastructure for an ACTIVE business.

**Revenue potential:**
- Find 1 extra good deal/week = $2.6-10.4K/year
- Eliminate 5 hours/week research = priceless
- Scale 2x with automation = double revenue

---

## Key Challenges Automation Solves

1. **Manual browsing is time-intensive**
   - Solution: Automated 6-7 AM daily scans

2. **Comp research takes forever**
   - Solution: Auto-pull sold listings, calculate profit

3. **Miss time-sensitive deals**
   - Solution: Alert on ending soon + high EV

4. **Hard to track trends**
   - Solution: Monitor hot inserts, player performance

5. **Cards tied up in grading** (workflow bottleneck)
   - Solution: Inventory tracking (future phase)

---

## Success Metrics

**Phase 1 (eBay API):**
- Find 5-10 viable deals/day
- Automate comp research (save 1 hour/day)
- Alert on 🔥 hot deals (Score 8-10)

**Phase 2 (Scale):**
- Integrate Buyee (Japanese eBay)
- Add inventory tracking (PSA pipeline)
- Market trend monitoring
- Player performance alerts

**Phase 3 (Professional):**
- Multi-platform dashboard
- Automated listing (sell side)
- Portfolio analytics
- Full business intelligence

---

## What Makes This Complex

**Not simple "find MJ cards under $X"**

**This is sophisticated:**
- ✅ Identify grading potential (centering, corners, surface)
- ✅ Calculate profit based on expected grade
- ✅ Market timing (seasons, injuries, trends)
- ✅ Trend awareness (hot inserts change monthly)
- ✅ Multi-platform sourcing (eBay, Buyee, Chinese sites)
- ✅ Volume game (lots of small wins add up)

**The automation needs to be SMART, not just fast.**

---

## Next Steps

**Feb 3:** eBay API key arrives  
**Feb 3-4:** Claude Code builds API client  
**Feb 4:** Deploy and test first searches  
**Feb 5:** First automated deal alerts 🎴

---

**This is real business infrastructure for an active revenue stream.**

**Let's build it right.** 🚀

---

Created: Feb 3, 2026  
Partner: Terry + Brother  
Status: Waiting on eBay API approval
