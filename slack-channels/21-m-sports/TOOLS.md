# 21M Sports - Tools & Workflow

## Content Generator (Claude Code Built) ✅

**Location:** `/home/clawd/clawd/21m-sports-generator`

**Built:** Feb 1, 2026
**Status:** Production ready

### Quick Commands

```bash
cd ~/clawd/21m-sports-generator

# Generate everything (BEST for daily use)
npm run generate all

# Generate by content type
npm run generate contract    # Contract comparisons
npm run generate athlete     # Athlete stories
npm run generate quick       # Quick hits
npm run generate edu         # Educational

# Generate by weekly theme
npm run generate theme fiat-friday
npm run generate theme 21m-monday
npm run generate theme timechain-thursday
npm run generate theme sat-stacking-saturday
npm run generate theme sound-money-sunday

# See all themes
npm run generate themes
```

### What It Does

- Generates 3-5 ready-to-post tweets per category
- Fact-checked data with sources
- BTC price conversions
- Character count validation
- Multiple variations to choose from

### Output Example

Each generation gives you options like:
```
─── Option 1 ───
[Ready-to-post tweet text]
Characters: 207/280

─── Option 2 ───
[Another variation]
Characters: 186/280

📊 DATA & SOURCES
────────────────────────────────────────
[Fact-checked data with sources]
```

### Weekly Themes

- **21m-monday** - Breaking news in BTC terms
- **timechain-thursday** - Historical moments + BTC prices
- **fiat-friday** - Contract era comparisons (signature content!)
- **sat-stacking-saturday** - Educational content
- **sound-money-sunday** - Athlete wealth stories

## Workflow

### Daily (Automated by Jett)
1. **11 PM:** Jett runs generator for tomorrow's theme
2. **Saves to:** `nightly-content.md`
3. **Morning:** Fresh content waiting for Terry

### Manual (When Needed)
1. Run generator command
2. Pick favorite tweet
3. Copy & paste to X
4. Done! (30 seconds vs 30 minutes)

## Model Routing

- **Research tasks:** Grok-3 (X/Twitter specialist)
- **Content generation:** Built-in generator (faster, fact-checked)
- **Analysis:** Claude Sonnet 4.5 (default)

---

**Updated:** 2026-02-01
**Next:** Automate nightly generation + X research hybrid
