# Dashboard Handoff - For Claude Code

## Context

Jett (main Clawdbot agent) has built the data collection layer. You're building the UI/visualization layer.

**Goal:** Create a beautiful, functional dashboard to track API usage and costs across all agents.

## What's Already Done ✅

1. **Data Collection Script** (`scripts/parse-clawdbot.js`)
   - Parses all Clawdbot session files
   - Extracts usage data (tokens, costs, timestamps)
   - Outputs to `data/token-usage.json`

2. **Data Format** (`data/token-usage.json`)
   - 1,478 entries already extracted ($88.61 historical cost)
   - Each entry has:
     ```json
     {
       "timestamp": "2026-01-30T...",
       "agent": "jett|subagent|subagent-grok|cron",
       "model": "claude-sonnet-4-5|grok-3",
       "tokens": {
         "input": 10,
         "output": 327,
         "cacheRead": 14366,
         "cacheWrite": 1766,
         "total": 16473
       },
       "cost": {
         "input": 0.000042,
         "output": 0.00490,
         "cacheRead": 0.00431,
         "cacheWrite": 0.00662,
         "total": 0.0158
       },
       "sessionId": "abc123...",
       "project": "21m-sports|batting-cage|investing|morning-brief|general"
     }
     ```

3. **Folder Structure**
   ```
   dashboard/
   ├── data/token-usage.json     (your data source)
   ├── scripts/                  (parsers - already built)
   ├── public/                   (build your UI here)
   └── config.json              (you'll create this)
   ```

## What You Need to Build 🛠️

### 1. **Dashboard UI** (`public/index.html`)

**Requirements:**
- Clean, modern design
- Responsive (works on mobile)
- Dark mode (Terry likes dark themes)

**Sections to include:**

#### A. Overview Cards (Top of page)
- Total spend (all time)
- This month spend
- This week spend
- Today spend
- Average cost per day

#### B. Daily Spend Chart
- Line chart showing cost per day over time
- X-axis: dates
- Y-axis: $ spent
- Color-coded by agent type (Jett vs subagents vs cron)

#### C. Project Breakdown
- Pie chart or bar chart showing:
  - 21M Sports: $X
  - Batting Cage: $X
  - Investing: $X
  - Morning Brief: $X
  - General: $X

#### D. Agent Breakdown
- Show cost split between:
  - Jett (main agent)
  - Subagents
  - Grok-3 subagents
  - Cron jobs

#### E. Token Usage
- Chart showing token consumption over time
- Break down by type (input/output/cache read/cache write)

#### F. Recent Activity Table
- Last 20-30 API calls
- Columns: Timestamp | Agent | Project | Tokens | Cost
- Sortable/filterable

#### G. Filters (sidebar or top)
- Date range picker
- Agent filter (all/jett/subagents/cron)
- Project filter (all/21m/batting-cage/etc)
- Model filter (Claude/Grok-3)

### 2. **Config File** (`config.json`)

Create budget thresholds and alert settings:

```json
{
  "budgets": {
    "daily": 5.00,
    "weekly": 30.00,
    "monthly": 120.00
  },
  "alerts": {
    "enabled": true,
    "slackChannel": "#alerts",
    "thresholds": [0.8, 0.9, 1.0]
  },
  "refresh": {
    "autoRefresh": true,
    "intervalMinutes": 15
  }
}
```

### 3. **Budget Alert System** (`scripts/check-budget.js`)

Create a script that:
- Reads `data/token-usage.json`
- Calculates current spend (daily/weekly/monthly)
- Compares to thresholds in `config.json`
- Sends Slack alerts when hitting 80%, 90%, 100% of budget

**Slack alert format:**
```
⚠️ BUDGET ALERT
Daily spend: $4.20 / $5.00 (84%)
Current pace: $29.40/week
Action: Review high-cost projects
```

### 4. **Weekly Summary Generator** (`scripts/weekly-summary.js`)

Create a script that generates:
```
📊 WEEKLY API USAGE SUMMARY (Jan 24-30)

💰 Total Spend: $31.45
📈 Change: +12% vs last week

🏆 Top Projects:
1. 21M Sports: $12.30 (39%)
2. Morning Briefs: $8.50 (27%)
3. General: $6.20 (20%)

🤖 Agent Breakdown:
- Jett: $24.10 (77%)
- Subagents: $5.20 (17%)
- Grok-3: $2.15 (6%)

🔥 Busiest Day: Thursday ($7.80)
💡 Insight: Morning briefs using heavy cache writes - consider optimization
```

## Technical Recommendations

**Frontend:**
- Plain HTML/CSS/JS (keep it simple, no build step needed)
- Use Chart.js for visualizations (CDN link)
- Fetch data from `../data/token-usage.json`
- LocalStorage for user preferences (dark mode, filters)

**Styling:**
- Use a CSS framework if you want (Tailwind CDN, Bootstrap, or custom)
- Make it look professional but not over-designed
- Terry values function > form, but it should still look good

**Data Processing:**
- All calculations client-side (JavaScript)
- Group entries by day/week/month
- Cache calculations to avoid re-computing

## Integration Points

**When complete, Terry will:**
1. Open `public/index.html` in browser to view dashboard
2. Set up cron job to run `parse-clawdbot.js` daily (refreshes data)
3. Set up cron job to run `check-budget.js` every hour (alerts)
4. Set up cron job to run `weekly-summary.js` on Sundays (reports)

**Claude Code logging (future):**
- We'll need to figure out where Claude Code logs its usage
- Then create `scripts/parse-claude-code.js` to extract that data
- Merge into the same `token-usage.json` format
- For now, just build for Clawdbot data

## Files to Create

Must create:
- [ ] `public/index.html` - Main dashboard UI
- [ ] `public/styles.css` - Styling
- [ ] `public/app.js` - Data loading and chart rendering
- [ ] `config.json` - Budget and alert config
- [ ] `scripts/check-budget.js` - Budget monitoring
- [ ] `scripts/weekly-summary.js` - Weekly report generator

Nice to have:
- [ ] `scripts/aggregate.js` - Combine multiple data sources (future)
- [ ] `public/favicon.ico` - Dashboard icon
- [ ] `README-DASHBOARD.md` - User guide for Terry

## Questions?

If anything is unclear:
1. Check the existing `data/token-usage.json` to see actual data structure
2. Run `node scripts/parse-clawdbot.js` to regenerate data
3. Ask Terry for clarification

## Success Criteria

Dashboard is done when:
- ✅ Shows all key metrics (spend, trends, breakdowns)
- ✅ Has working filters and date range selection
- ✅ Budget alerts work and send to Slack
- ✅ Weekly summary generates and looks good
- ✅ Terry can open it and immediately understand his API usage

---

**Ready?** Start with `public/index.html` and build from there. Make it awesome! 🚀

Built by: Jett  
Handed off: 2026-01-30  
Data source: `data/token-usage.json` (1,478 entries, $88.61 historical)
