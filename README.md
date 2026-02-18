# jett-system
My personal AI automation system 
# Jett AI System

My personal AI automation system running on H1 Mini.

## What This Is

Jett is an OpenClaw-based AI agent that handles:
- **Morning briefs** - Posted to #huangfamily Slack at 7 AM daily
- **Notion integration** - Family calendar, shopping list, tasks
- **Health monitoring** - System checks every hour
- **Sports content** - Bitcoin and sports posts for @21MSports

## Current Setup

- **Hardware**: H1 Mini PC (Ubuntu 24)
- **Platform**: OpenClaw 2026.2.26
- **Primary Model**: Claude Haiku 4.5 (cost optimization)
- **Local Models**: Llama 3.3 70B via Ollama (overnight tasks)
- **Integrations**: Slack, Notion, Telegram

## Structure
jett-system/
├── skills/           # OpenClaw skills and capabilities
├── scripts/          # Automation and maintenance scripts
├── config/           # Configuration templates (no secrets!)
├── logs/             # System logs (not tracked in Git)
└── docs/             # Additional documentation

## Key Components

### Notion Integration
- Family calendar with events
- Shopping list (shared with wife)
- Family tasks tracker
- Morning brief generation

### Automation
- Cron jobs (no task workers - simplified!)
- Health checks every hour
- Automatic backups at 3 AM

### AI Models
- **Haiku 4.5**: Default for all Slack interactions (~$1/month)
- **Llama 3.3 70B**: Overnight research and content generation ($0 - local)
- **Sonnet 4.5**: Only when explicitly requested or via Claude Code

## Status

Last updated: February 18, 2026
Current state: **STABILIZING** (Week 1 of 7-day stability test)

## Important Notes

- All secrets are in `.gitignore` - never committed to this repo
- Config templates only (no real API keys here)
- Backup configs stored in `~/clawd/backups/`
- This repo is the single source of truth for all agents

## For AI Agents

Before making any changes:
1. Run `git pull` to get latest code
2. Read this README for context
3. Check CHANGELOG.md for recent changes
4. Review AGENTS.md for workflow rules

After making changes:
1. Test that changes work
2. Commit with clear message
3. Update CHANGELOG.md
4. Push to GitHub
