# 21M Sports Generator Integration

## Location
`/home/clawd/clawd/21m-sports-generator/`

## What It Does
Production-ready content generator built by Claude Code (Feb 1, 2026)

Outputs 3-5 ready-to-post tweet options across all content categories:
- Contract comparisons (BTC terms)
- Athlete stories (bankruptcy/success)
- Quick hits (punchy stats)
- Educational content (sound money lessons)

## Quick Commands

### Daily Use (Best)
```bash
cd ~/clawd/21m-sports-generator
npm run generate all
```
→ 40+ tweet options covering all themes

### By Theme
```bash
npm run generate theme fiat-friday
npm run generate theme 21m-monday
npm run generate theme sound-money-sunday
npm run generate theme sat-stacking-saturday
npm run generate theme timechain-thursday
```

### By Content Type
```bash
npm run generate contract    # Contract comparisons
npm run generate athlete     # Athlete stories
npm run generate quick       # Quick hits
npm run generate edu         # Educational
```

### List All Themes
```bash
npm run generate themes
```

## Output Format
Each option includes:
- Tweet text (pre-formatted)
- Character count (auto-filtered <280)
- Fact-checked data + sources
- BTC conversions (historically accurate)
- Multiple variations

## Integration with Jett's Workflow

### Morning/Midday/Evening Reminders
When firing 21M reminders (9am, 12pm, 7pm):
1. Run generator for today's theme
2. Pick top 3 options
3. Send to #21-m-sports channel
4. Terry picks favorite and posts

### On-Demand Content
When Terry asks for 21M content:
1. Run appropriate generator command
2. Send options immediately
3. No research needed - instant output

### Research Cache
All generated content saved to:
`/home/clawd/clawd/21m-research/generated-archive/`

Build historical database, never repeat research.

## Time Savings
**Before:** 30-45 min per post (research + writing)
**After:** 30 seconds (pick from generated options)
**90x efficiency improvement**

## Status
✅ Production ready
✅ Integrated into workflow
✅ Used daily for 21M content

Built: Feb 1, 2026 by Claude Code
