# Migration: Clawdbot/System Cron → Hermes Cron

## Status: COMPLETED 2026-05-12

All previously PM2-managed crons have been migrated to **Hermes Agent's built-in cron scheduler**.

## What Changed

| Before | After |
|--------|-------|
| PM2 cron (content calendar, lead gen) | Hermes cron (`no_agent=true` shell wrappers) |
| Clawdbot cron (21M, eBay, health) | OpenClaw continues to manage these — no change |
| `/api/crons` reads from `clawdbot cron list --json` | Reads from `~/.hermes/profiles/coder/cron/jobs.json` |
| `/api/tasks` reads from `clawdbot cron list --json` | Reads from `~/.hermes/profiles/coder/cron/jobs.json` |

## Migrated Jobs

| Job | Schedule | Script | Enrichment |
|-----|----------|--------|-----------|
| Content Calendar | Sun 9AM | `content-calendar-ai.js` | Sonnet (Claude) |
| Web Design Leads | Mon 8AM | `web-design-leads.js` | Grok (xAI) |
| Voice Agent Leads | Wed 8AM | `voice-agent-leads.js` | Grok (xAI) |
| Shopify StoreIQ Leads | Fri 8AM | `shopify-leads.js` | Grok (xAI) |
| StoreIQ Auto-Sync | Every 30m | Hermes agent | DeepSeek |

## Shell Wrappers

Each cron has a shell wrapper at `~/.hermes/profiles/coder/scripts/*.sh`:
- `content-calendar-ai.sh`
- `web-design-leads.sh`
- `voice-agent-leads.sh`
- `shopify-leads.sh`

These use explicit Node v22 path to avoid shebang resolution issues.

## Data Source

The dashboard reads from `~/.hermes/profiles/coder/cron/jobs.json`

## Dashboard Schedule Tab

Mission Control's Schedule tab (`/api/crons`) now shows Hermes cron jobs.
Old OpenClaw/PM2 cron jobs no longer appear there — that's intentional.

## Cost Optimization

- **Grok** (`grok-4-1-fast-reasoning`) replaced Sonnet for lead enrichment → 90% cost reduction
- **No email drafting** — removed `draftMessages()` from voice-agent and shopify scripts
- **Sonnet retained** for Content Calendar (quality matters for public content)

## Remaining OpenClaw Crons (NOT migrated)

These still run via OpenClaw and are NOT affected by this migration:
- 21M Sports/Bitcoin tweets
- eBay scans
- Morning family brief
- Podcast queue
- Health checks

## Troubleshooting

```bash
hermes cron list              # View all Hermes cron jobs
hermes cron run <job_id>      # Manually trigger a job
journalctl --user -u jett-task-manager.service -n 50 --no-pager  # Check dashboard
```

If `/api/crons` returns empty: check `~/.hermes/profiles/coder/cron/jobs.json` exists and is valid JSON.
