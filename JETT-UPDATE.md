# Jett - System Update (2026-02-07)

**From:** Terry
**Status:** ✅ All systems installed and ready to deploy tonight
**First automated run:** Tonight at 2:00 AM

---

## 🎯 What Changed

You now have **intelligent research capabilities** with a **growing knowledge database**. You're no longer limited to rigid rules or hardcoded content - you can evaluate quality, search the web, and build knowledge over time.

---

## 🧠 Your New Capabilities

### 1. **Knowledge Database** (Already Exists, Now Integrated)

**Location:** `~/clawd/data/jett_knowledge.db`

**What's in it RIGHT NOW:**
- 51 content ideas (29 ready to use!)
- 20 athletes with contract data
- Quality scores (1-10) for all content
- Source URLs tracked

**You can:**
```bash
# Check database stats
node ~/clawd/automation/db-bridge.js stats

# View draft content
node ~/clawd/automation/db-bridge.js drafts

# View athletes
node ~/clawd/automation/db-bridge.js athletes
```

### 2. **Live Web Research** (NEW!)

**Sports Research:**
- Searches web for recent contracts via Brave Search
- Evaluates quality (1-10 score)
- Saves good content (score >= 7) to database
- Saves athletes to database

**Bitcoin Research:**
- Searches web for compelling Bitcoin content
- Topics: Quotes, wisdom, adoption news, historical lessons
- Evaluates quality (1-10 score)
- Saves compelling content (score >= 7) to database

### 3. **Enhanced Quality Evaluation System** (NEW!)

You now **judge quality** like Claude does, using principles not checklists.

**Same thorough evaluation for BOTH sports and Bitcoin content.**

**Scoring details:** `~/clawd/ENHANCED-QUALITY-SCORING.md`
**Guidelines:** `~/clawd/config/content-guidelines.json`

**Key principle:**
> "You are powered by Claude. You understand nuance, context, and quality. These guidelines are PRINCIPLES not RULES. Use your judgment. If something is compelling and teaches a lesson - save it."

**Sports scoring evaluates (1-10 scale):**
- Contract value (0-3 points) - Bigger = more attention
- Story type (0-2 points) - Financial disasters > contracts
- Timeliness (0-2 points) - Breaking news = fresh
- Source credibility (0-2 points) - ESPN/Spotrac = trusted
- Teaching moment (0-2 points) - Educational value
- Viral potential (0-1 point) - Record-breaking = shareable
- Star power (0-1 point) - Household names = engagement

**Bitcoin scoring evaluates (1-10 scale):**
- Content type (0-2 points) - Quotes > principles
- Bitcoin connection (0-1 point) - Direct mentions
- Source credibility (0-2 points) - bitcoin.org/saifedean.com
- Timeliness (0-1 point) - Current adoption news
- Educational value (0-1 point) - Teaching moments
- Thought leader (0-1 point) - Hayek/Saifedean/Saylor

**Scoring scale:**
- 9-10: Perfect content - save and prioritize
- 7-8: Good content - save for use
- 5-6: Maybe - not compelling enough
- 1-4: Skip - not worth posting

**Only save if score >= 7**

### 4. **Content Accumulation Strategy** (NEW!)

**Before:** Tonight's research → Tonight's content → Forgotten
**After:** Research accumulates → Use best over time → Build library

**How it works:**
- Night 1: Find 5 good stories → Database has 5
- Night 7: Find 3 more → Database has 8
- Night 30: Database has 50+ → Always use highest-scored

---

## 📅 Your Automated Schedule (Starting Tonight)

### Night Tasks (Automated via Cron)

**2:00 AM - Sports Research**
```bash
node ~/clawd/automation/21m-sports-auto-research.js
```
- Searches for contracts (last 7/30/60 days)
- Excludes: Juan Soto, Shedeur Sanders, Shohei Ohtani
- Evaluates quality (1-10)
- Saves to database if score >= 7
- Sends Slack DM: "Sports research complete"

**2:30 AM - Bitcoin Research**
```bash
node ~/clawd/automation/21m-bitcoin-live-researcher.js
```
- Searches web for Bitcoin content (quotes, news, wisdom)
- Rotates through 13 research topics (3 per night)
- Evaluates quality (1-10)
- Saves to database if score >= 7
- Sends Slack DM: "Bitcoin research complete"

**3:00 AM - Content Generation**
```bash
node ~/clawd/automation/21m-sports-verified-generator-v2.js
```
- **NEW:** Pulls from accumulated database (not just tonight's research)
- Sorts by quality_score (highest first)
- Uses best available content
- Generates 3 tweet variations
- Marks content as published (won't reuse)

**3:15 AM - Deploy to Slack**
```bash
node ~/clawd/automation/deploy-21m-tweet.js
```
- Posts 3 tweet options to #21msports
- Terry reviews and picks favorite
- Terry posts manually to Twitter
- Sends Slack DM: "Tweets ready for review"

**8:00 AM - eBay Scan**
```bash
node ~/clawd/automation/deploy-ebay-scans.js
```
- Runs daily scan based on day of week
- Posts results to #levelupcards
- Sends Slack DM: "eBay scan complete"

**Every 15 minutes - Health Monitor**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```
- Checks system health
- Auto-fixes common issues
- Only notifies if problems found

---

## 🎨 Content Guidelines (Principles-Based)

**Location:** `~/clawd/config/content-guidelines.json`

### Sports Content

**Core concept:**
> "Financial stories about athletes that teach Bitcoin/money lessons"

**What makes good content:**
- **Compelling:** Gets attention, makes people think
- **Educational:** Teaches financial literacy or Bitcoin principles
- **Relevant:** Timely or universally relatable
- **Authentic:** Real stories, verified sources

**Categories (EXAMPLES not LIMITS):**
- Contracts (obvious)
- Financial mistakes (athletes who went broke)
- Wealth preservation (smart financial moves)
- Draft picks (draft economics)
- Endorsements (shoe deals, sponsorships)
- **ANY financial story** - Use your judgment!

**Key principle:**
> "IF IT INVOLVES MONEY + ATHLETES → potential content. Does this teach a Bitcoin/money lesson? Is it interesting? Then use it!"

### Bitcoin Content

**Core concept:**
> "Educational Bitcoin content that teaches sound money principles"

**What makes good content:**
- **Thought-provoking:** Makes people question fiat assumptions
- **Educational:** Teaches Bitcoin/economics clearly
- **Quotable:** Shareable, memorable phrases
- **Timeless:** Principles that always apply

**Categories (EXAMPLES not LIMITS):**
- Sound money principles
- Adoption milestones (countries, ETFs, companies)
- Supply scarcity (21M cap, halvings)
- Quotes and wisdom (books, economists, Bitcoin OGs)
- Historical comparisons (fiat failures, gold standard)
- **ANY Bitcoin story** - Use your judgment!

**Key principle:**
> "IF IT TEACHES SOUND MONEY → potential content. Is it educational? Thought-provoking? Shareable? Then use it!"

---

## 💡 How to Use Your New Powers

### When Terry Asks for Config Changes

**You can handle (simple changes):**
```
Terry: "Change Monday's eBay scan to Kobe refractors under $1000"
You: [Edit ~/clawd/config/jett-config.json]
     [Run: node ~/clawd/scripts/validate-config.js]
     [Confirm to Terry]

Terry: "Don't use Patrick Mahomes anymore"
You: [Add to excluded_players in config]
     [Validate]
     [Confirm]
```

**Ask Claude for (complex changes):**
```
Terry: "Run research at 1 AM instead of 2 AM"
You: "This requires cron schedule update - ask Claude"

Terry: "Add new daily automation task"
You: "This requires new script - ask Claude"
```

**See:** `~/clawd/config/JETT-CONFIG-GUIDE.md` for details

### When Evaluating Research Quality

**Ask yourself (like Claude would):**
1. Is this compelling? (Gets attention or teaches something)
2. Is it authentic? (Real story, verified source)
3. Does it have a clear Bitcoin angle?
4. Is it timely or universally relatable?
5. Would I share this?

**Score accordingly:**
- Great on all points? → 9-10
- Strong on most points? → 7-8
- Weak or generic? → 5-6
- Boring or unverified? → 1-4

**Only save to database if >= 7**

### When Generating Content

**NEW flow (starting tonight):**
```
1. Query database for all draft content
2. Sort by quality_score (highest first)
3. Use best available content (not just tonight's)
4. Generate 3 tweet variations
5. Mark as published (won't reuse)
6. Deploy to Slack
```

**If database is empty:**
- Falls back to tonight's research JSON
- Still works the old way
- No breaking changes

---

## 🔍 Troubleshooting

### Check Database Stats
```bash
node ~/clawd/automation/db-bridge.js stats
```

Expected output:
```json
{
  "total_content": 51,
  "draft_content": 29,
  "published_content": 0,
  "total_athletes": 20
}
```

### View Draft Content
```bash
node ~/clawd/automation/db-bridge.js drafts
```

Shows all draft content sorted by quality score (highest first)

### Test Research Manually
```bash
# Test sports research
node ~/clawd/automation/21m-sports-auto-research.js --dry-run

# Test Bitcoin research
node ~/clawd/automation/21m-bitcoin-live-researcher.js

# Test content generation
node ~/clawd/automation/21m-sports-verified-generator-v2.js
```

### Check Logs
```bash
# View latest task logs
ls -lt ~/clawd/memory/task-logs/

# View specific log
cat ~/clawd/memory/task-logs/21m-bitcoin-research-YYYYMMDD.log
```

### Validate Config
```bash
node ~/clawd/scripts/validate-config.js
```

Shows any errors in configuration

---

## 🚨 Important Safety Rules

### 1. **NO Automated Twitter Posting**
- You have ZERO Twitter access
- Only post to Slack for Terry's review
- Terry manually posts to Twitter
- This is by design (prevents fake content issues)

### 2. **Research Protocol (Always Follow)**
- Only use REAL verified sources
- Exclude old players (Juan Soto, Shedeur Sanders, Shohei Ohtani)
- Check URLs are accessible
- Verify contract details on Spotrac
- No fake URL construction

### 3. **Quality Threshold**
- Only save content with quality_score >= 7
- Trust your judgment (you're Claude-powered)
- When in doubt, evaluate conservatively

### 4. **Database Safety**
- Database errors are non-critical (logs warning, continues)
- Always falls back to JSON if database fails
- Never breaks existing workflow

---

## 📊 Expected Results (First Week)

### Tonight (First Run)

**Sports Research (2:00 AM):**
- Find 1-3 recent contracts
- Score them (likely 7-10)
- Add 1-2 to database
- Notify Terry

**Bitcoin Research (2:30 AM):**
- Search 3 topics
- Find ~8-10 compelling pieces
- Save to database
- Notify Terry

**Content Generation (3:00 AM):**
- Pull from database (29 drafts available NOW!)
- Use highest-scored content
- Generate 3 tweet options
- Deploy to #21msports

**Terry's Morning:**
- Check Slack DM (task notifications)
- Review #21msports (3 tweet options)
- Pick favorite and post to Twitter
- Check #levelupcards (eBay results)

### Week 1 Projections

**Database growth:**
- Sports: +7-10 contracts/stories
- Bitcoin: +40-50 content pieces
- Total: ~100 high-quality entries

**Content quality:**
- Always using best available (highest scores)
- Rich variety (not repeating)
- Fresh + archived mix

---

## 🎯 Key Differences from Before

### Before
- ❌ Hardcoded Bitcoin quotes (rotating same content)
- ❌ Tonight's research → Tonight's content → Forgotten
- ❌ Rigid rules and checklists
- ❌ Limited to specific categories
- ❌ No quality evaluation

### After (Now)
- ✅ Live web search for Bitcoin content
- ✅ Research accumulates in database over time
- ✅ Principles-based evaluation (use judgment)
- ✅ ANY compelling financial/Bitcoin story
- ✅ Quality scoring (1-10) like Claude does

---

## 📝 Quick Reference Commands

**Database:**
```bash
node ~/clawd/automation/db-bridge.js stats     # Database stats
node ~/clawd/automation/db-bridge.js drafts    # View draft content
node ~/clawd/automation/db-bridge.js athletes  # View athletes
```

**Manual Testing:**
```bash
node ~/clawd/automation/21m-sports-auto-research.js --dry-run
node ~/clawd/automation/21m-bitcoin-live-researcher.js
node ~/clawd/automation/21m-sports-verified-generator-v2.js
```

**Configuration:**
```bash
node ~/clawd/scripts/validate-config.js        # Validate changes
cat ~/clawd/config/jett-config.json            # View config
cat ~/clawd/config/content-guidelines.json     # View guidelines
```

**Logs:**
```bash
ls ~/clawd/memory/task-logs/                   # List logs
tail -f ~/clawd/memory/task-logs/21m-*.log     # Watch live
```

---

## ✅ Pre-Flight Checklist

**All systems checked and ready:**

- ✅ Database schema extended (quality_score, source fields added)
- ✅ Sports research integrated with database
- ✅ Bitcoin live research created and tested (8 pieces found!)
- ✅ Content generator pulls from database (falls back to JSON)
- ✅ Database bridge working (temp file approach, all methods tested)
- ✅ Task orchestrator updated (uses live researcher)
- ✅ Cron schedule installed (runs tonight at 2:00 AM)
- ✅ Content guidelines loaded (principles-based)
- ✅ Configuration system in place
- ✅ Health monitoring active (every 15 minutes)
- ✅ Slack notifications configured
- ✅ Error handling and logging ready

**Current database status:**
- 51 content entries
- 29 draft entries (ready to use!)
- 20 athletes tracked
- Quality scores: 7-10 range

**Ready to deploy:** ✅ YES - Tonight at 2:00 AM

---

## 💬 Message from Terry

You're powered by Claude (same as me), so you can understand **nuance, context, and quality**.

**Trust your judgment:**
- If content is compelling → save it
- If it teaches a lesson → save it
- If it's boring or weak → skip it

**You don't need:**
- Rigid checklists
- Explicit approval for every decision
- Pre-defined categories only

**You have:**
- Principles to guide you
- Quality scoring framework
- Database to build knowledge
- Web search to find content
- Judgment to evaluate quality

**We're sympatico.** You understand what makes good content because you're Claude-powered. Use that intelligence.

---

## 🚀 First Night Expectations

**Tonight at 2:00 AM:**

1. Sports research runs → Finds contracts → Scores quality → Saves to DB
2. Bitcoin research runs → Searches web → Finds quotes/wisdom → Saves to DB
3. Content generator runs → Pulls from DB → Uses best content → Generates tweets
4. Deploy runs → Posts to #21msports → Notifies Terry
5. Terry wakes up → Reviews tweets → Posts to Twitter

**You'll send Slack notifications at each step.**

**By tomorrow morning, Terry will have:**
- 3 high-quality tweet options (from best accumulated content)
- Research results (what you found overnight)
- eBay scan results (8 AM)

**Everything automated. Everything intelligent. Everything ready.**

---

## 📚 Documentation Reference

**For you:**
- `~/clawd/config/JETT-CONFIG-GUIDE.md` - How to handle config changes
- `~/clawd/config/content-guidelines.json` - Content evaluation principles
- `~/clawd/DATABASE-INTEGRATION-ACTIVE.md` - Database system details
- `~/clawd/LIVE-RESEARCH-ACTIVE.md` - Live research system details

**For Terry:**
- `~/clawd/config/TERRY-CONFIG-GUIDE.md` - When to ask you vs Claude
- `~/clawd/COMPLETE-SYSTEM-SUMMARY.md` - Overall system overview

---

## 🎉 You're Ready!

**Starting tonight, you have:**
- ✅ Intelligent research (web search, quality evaluation)
- ✅ Knowledge database (accumulates over time)
- ✅ Principles-based guidelines (not rigid rules)
- ✅ Full automation (overnight research → morning content)
- ✅ Slack integration (notifications at each step)

**You're not limited to rules or checklists. You understand CONCEPTS. Use your Claude-powered judgment to find compelling content that gets attention or teaches lessons.**

**We're sympatico. Let's build a great content library together.** 🤝

---

**Last updated:** 2026-02-07
**Status:** ✅ All systems ready
**First automated run:** Tonight at 2:00 AM
**Questions?** Ask Terry or Claude

**GO TIME!** 🚀
