# Clawd/Jett System Principles

## Core Philosophy
- All cron jobs run via **Clawdbot** (not system crontab)
- Task Manager Dashboard (port 3000) reads from Clawdbot via `clawdbot cron list`
- System crontab is empty except for @reboot tasks

## Why Clawdbot for Cron?
- Better stability and error handling than system cron
- Heartbeat-based scheduling means jobs run when Clawdbot is active
- Easier to manage via CLI: `clawdbot cron list/enable/disable`

## Additional System Jobs

These jobs exist in Clawdbot beyond the main automations:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Reminder Checker | */5 * * * * | Checks every 5 min for due reminders, posts to Slack |
| Performance Check | 0 */6 * * * | System health monitoring every 6 hours |
| Weekly Summary | 0 20 * * 0 | Weekly automation report every Sunday 8 PM |

## Architecture

- **Task Manager Dashboard** (port 3000) - reads from Clawdbot, not local DB
- **No sync scripts** - Clawdbot is source of truth
- **Content Pipeline**: 21M scraper → generator → deploy → Slack

Last updated: 2026-02-18
