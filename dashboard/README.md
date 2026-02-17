# API Usage Dashboard

## Overview

Tracks and visualizes API usage across:
- **Clawdbot (Jett)** - Claude Sonnet 4.5 calls
- **Claude Code** - Separate Claude instance for coding tasks
- **Sub-agents** - Spawned tasks (including Grok-3)

## Goals

1. **Daily spend tracking** - How much $ per day across all agents
2. **Cost per project/task** - Break down spending by topic (batting cage, investing, etc.)
3. **Usage trends** - Patterns over time, busiest hours/days
4. **Budget alerts** - Slack notifications when hitting thresholds

## Structure

```
dashboard/
├── README.md              (this file)
├── HANDOFF.md            (instructions for Claude Code)
├── data/
│   ├── token-usage.json  (unified usage log - all agents)
│   └── archives/         (monthly archives)
├── scripts/
│   ├── parse-clawdbot.js (extract Clawdbot session data)
│   ├── parse-claude-code.js (extract Claude Code logs)
│   └── aggregate.js      (combine all sources)
├── public/
│   ├── index.html        (dashboard UI)
│   ├── styles.css
│   └── app.js
└── config.json           (budget thresholds, alert settings)
```

## Data Format

See `data/token-usage.json` - each entry contains:
- Timestamp
- Agent (jett/claude-code/subagent)
- Model used
- Tokens (input/output/cache)
- Cost breakdown
- Project/task tag (if available)
- Session ID

## Status

**Phase 1 (In Progress):** Data collection and parsing  
**Phase 2 (Next):** Dashboard UI with Claude Code  
**Phase 3 (Future):** Automation and alerts

Built by: Jett + Claude Code  
Started: 2026-01-30
