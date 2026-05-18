# Migration: Clawdbot/System Cron → Hermes Cron

## Status: COMPLETED 2026-05-12

All previously PM2-managed crons have been migrated to **Hermes Agent's built-in cron scheduler**.

## What Changed

| Before | After |
|--------|-------|
| PM2 cron (content calendar, lead gen) | Hermes cron (LLM-driven per profile) |
| Clawdbot cron (21M, eBay, health) | OpenClaw continues to manage these — no change |
| All jobs in one `jobs.json` | Profile-specific cron files: `~/.hermes/profiles/<profile>/cron/jobs.json` |
| `/api/crons` reads from `clawdbot cron list --json` | Reads from profile-specific `jobs.json` |

## Current Cron Jobs by Profile

### Root (`~/.hermes/cron/jobs.json`)
- Superare morning brief (daily 8AM)
- Shopify weekly PDF (Mon 9AM)
- EOD summary (daily 6PM)
- Monthly sales report (1st of month 9AM)

### Coder Profile
- MaggiePM daily report (daily 8AM) — script sends its own Telegram message

### Leads Profile
- Web Design Leads (Mon 8AM)
- Voice Agent Leads (Wed 8AM)
- Shopify StoreIQ Leads (Fri 8AM)
- Content Calendar (Sun 9AM)

### Superare Profile
- StoreIQ Auto-Sync (every 30m)

### Finance Profile
- Morning brief (weekdays 9AM)
- Intraday scan (weekdays 10:30/12:30/14:30/16:30)

## Shell Wrappers (legacy — now LLM-driven, no wrappers)
Previously each cron had a shell wrapper at `~/.hermes/profiles/coder/scripts/*.sh`. As of May 2026, lead gen crons operate as **LLM-driven** (no shell wrappers). The cron agent runs the commands directly.

## Environment Variables — Infisical
All secrets have been migrated to Infisical Cloud (jett-infra project). Local `.env` files are locked to `chmod 000`. See `SYSTEMS.md` → Secrets Management for details.

## Data Sources by Profile

| Profile | Cron File |
|---------|-----------|
| Root | `~/.hermes/cron/jobs.json` |
| Coder | `~/.hermes/profiles/coder/cron/jobs.json` |
| Leads | `~/.hermes/profiles/leads/cron/jobs.json` |
| Superare | `~/.hermes/profiles/superare/cron/jobs.json` |
| Finance | `~/.hermes/profiles/finance/cron/jobs.json` |

## Dashboard Schedule Tab

Mission Control's Schedule tab (`/api/crons`) shows **root-level Hermes cron jobs only** (Superare crons). Profile-level crons are managed independently by their respective gateways.

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
