# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## Email

- **My email:** jett.theassistant@gmail.com
- **Terry's email:** terryhuangjr@gmail.com
- **Access:** Browser-controlled Gmail (headless, always available)

## Models

- **Default:** Claude Sonnet 4.5 (anthropic/claude-sonnet-4-5) - NEVER change this
- **Grok-3:** xai/grok-3 - Use for specific tasks only via model override

### When to Use Grok-3:
- X/Twitter news searches and trends
- Morning briefs (especially sports/tech news)
- Real-time social media content
- **Method:** Spawn sub-agent with `model: xai/grok-3` parameter

### When to Use Claude (Default):
- Everything else
- General tasks, file work, coding
- Main session always stays on Claude

**Rule:** Default model = Claude. Task-specific overrides = OK. Never touch core config.

## 21M Sports Content Generator

**Location:** `/home/clawd/clawd/21m-sports-generator`

**What it does:** Generates ready-to-post tweets for @21MSports (Bitcoin-denominated sports content)

**⚠️ CRITICAL: READ `21M-SPORTS-RULES.md` BEFORE GENERATING CONTENT**

### Mandatory Fact-Checking Process

**NEVER use generator output directly without verification.**

**Process:**
1. **Research real news** (web_search for recent sports contracts/stories)
2. **Verify all facts** (contracts, dates, BTC prices, sources)
3. **Use generator for structure** (templates + format)
4. **Fill templates with verified facts only**
5. **Include sources** with every option

**Quick commands:**
```bash
cd ~/clawd/21m-sports-generator

# Generate all content types (templates only - YOU verify facts)
npm run generate all

# Generate specific types
npm run generate contract    # Contract comparisons in BTC terms
npm run generate athlete     # Athlete wealth stories
npm run generate quick       # Quick hit content
npm run generate edu         # Educational content

# Generate by weekly theme
npm run generate theme fiat-friday
npm run generate themes      # List all themes
```

**Output structure:** 3-5 tweet templates with:
- Format/structure
- Character count validation
- Template placeholders

**YOU must fill with:**
- Verified real contracts/stories
- Accurate BTC price data
- Sources for all claims

**Weekly themes:**
- `21m-monday` - Breaking news in BTC terms
- `timechain-thursday` - Historical moments
- `fiat-friday` - Contract era comparisons (signature content!)
- `sat-stacking-saturday` - Educational
- `sound-money-sunday` - Athlete wealth stories

**Files:**
- `21M-SPORTS-RULES.md` - **READ THIS FIRST** (mandatory fact-checking rules)
- `QUICK-START.md` - Full usage guide
- `README.md` - Project overview
- Templates in `/templates` directory
- Contract database in `/modules/sports-data.js`

**Rule:** Generator = structure. Research = content. Never post unverified claims.

---

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
