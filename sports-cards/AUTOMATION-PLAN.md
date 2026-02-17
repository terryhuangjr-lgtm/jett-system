# Sports Card Business - Automation Plan

## What Automation Can Do (Once eBay API is live)

### Phase 1: Smart Scanner (Immediate)

**Auto-scan eBay 24/7 for:**
- Raw rookie cards (all 3 sports)
- On-card autographs
- Serial numbered cards (/500 or less)
- Parallels (especially gold /10)
- Michael Jordan cards
- Ken Griffey Jr cards
- Hot inserts (Downtown, Kabooms, Prizm Manga)

**Price range:** $10-$500 (normal), flag $500+ as "big purchase"

**Output:** Morning digest with top opportunities

### Phase 2: Grading Candidate Detector

**Analyze listings for grading potential:**
- Check photos for: corners, centering, surface
- Flag "likely 9+" vs "risky"
- Calculate potential profit (buy price → PSA 10 value)
- Compare to recent comps

**Output:** "High confidence grading candidates" list

### Phase 3: Market Intelligence

**Track trends:**
- What's hot right now? (players, inserts, parallels)
- Price movements over time
- Season timing alerts (pre-season load-up opportunities)
- Injury alerts (hold timing)

**Recent comps tracking:**
- Auto-pull sold listings for comparable cards
- Calculate market value in real-time
- Flag when listings are below market

### Phase 4: Arbitrage Finder

**Cross-platform monitoring:**
- eBay (US)
- Buyee (Japanese market)
- Compare prices across platforms
- Flag arbitrage opportunities

**Example:** Card sells for $50 on Buyee, $150 on eBay US

### Phase 5: Pipeline Management

**Track inventory:**
- Cards purchased (pending PSA submission)
- Cards in grading (with PSA)
- Cards returned (ready to list)
- Cards listed (pending sale)

**Submission scheduler:**
- Remind every 2 weeks: "Time for PSA batch"
- Track what's in grading, when it returns

**Output:** Dashboard showing entire pipeline

## Automation Workflow

**6:00 AM Daily:**
1. Scan eBay for overnight listings
2. Filter by criteria (sport, type, price, condition)
3. Compare to recent comps
4. Flag grading candidates
5. Calculate potential profit
6. Generate digest: "Top 10 opportunities"

**Throughout Day:**
- Monitor for new listings (hourly)
- Alert on hot deals (immediate)
- Track price movements

**Evening:**
- Daily summary: What was hot today
- Trend analysis: What's gaining momentum
- Pre-season alerts: Players to watch

## What You Get Every Morning

**Sports Card Digest (Slack #levelupcards channel):**

```
🏀 TOP OPPORTUNITIES - Feb 2, 2026

💎 BEST GRADING CANDIDATE
Card: 2024 Prizm Cooper Flagg Rookie /299
Price: $85
Est. PSA 10 Value: $300+ (3.5x)
Condition: Excellent (corners sharp, centered)
Link: [eBay]

📊 HOT FINDS (Under Market)
1. MJ 1997 Metal Universe /100 - $120 (comps at $180)
2. Ken Griffey Jr Refractor /250 - $45 (comps at $75)
3. Ja Morant Downtown Insert - $65 (trending up)

🔥 TRENDING UP
- Cooper Flagg rookies (+15% this week)
- Prizm Manga inserts (hot on social)
- Gold parallels /10 (always hot)

⚠️ ALERTS
- Baseball season starts in 6 weeks (load up on prospects)
- [Player] injured - hold cards for recovery timing
```

## Technical Implementation

**When eBay API comes through:**
1. Hand off criteria to Claude Code
2. He builds the scanner
3. Runs as scheduled task (Task Manager)
4. Outputs to Slack

**Search parameters:**
- Keywords: rookie, auto, autograph, /XXX (serial numbers), prizm, downtown, kaboom, manga, etc.
- Players: Michael Jordan, Ken Griffey Jr, Cooper Flagg, Derik Queen, etc.
- Conditions: "raw" or "ungraded" (not slabs)
- Price: $10-$500
- Listing type: Buy It Now + Auction (ending soon)

**Comparison engine:**
- Pull recent sold listings (comps)
- Calculate average market value
- Flag listings X% below market

**Grading analysis:**
- Photo analysis (AI or manual review)
- Condition keywords in description
- Seller history (do they grade accurately?)

## Questions to Refine This

**To make it perfect:**

1. **Specific players right now?**
   - Who are you watching this season?
   - Any rookies you're loading up on?

2. **Condition evaluation:**
   - How do you judge condition from eBay photos?
   - Corners, centering, surface - what's the checklist?
   - Any red flags in descriptions?

3. **Recent comps:**
   - Do you use 130point, Market Movers, or manual eBay sold listings?
   - How far back do you look? (30 days? 90 days?)

4. **Inventory tracking:**
   - Do you have a spreadsheet or database?
   - Track: purchase price, PSA submission date, return date, sale price?

5. **PSA grading:**
   - Current submission frequency?
   - Turnaround time?
   - Submission tiers (value, express, etc.)?

6. **Hot inserts:**
   - You mentioned Downtown, Kabooms, Prizm Manga
   - Any others to watch?
   - What makes them hot? (scarcity, design, influencer push?)

7. **Buyee/Chinese sites:**
   - Can we automate those too?
   - Or just eBay for now?

8. **Local stores/shows:**
   - When you scale, how does automation help there?
   - Digital inventory for quick comp checks?

---

**This automation can seriously scale your operation.** 

The gruntwork (browsing, comparing comps, tracking trends) becomes automatic. You just review the digest and buy the winners.

**Ready to build when eBay API comes through!** 🚀
