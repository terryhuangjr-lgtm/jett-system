# System Hardening - Production Reliability Guide

**Date**: 2026-02-17
**Purpose**: Document all reliability improvements for Jett, Claude, and future AI models

---

## Overview

12 hardening steps were implemented to make the system resilient against failures, rate limits, cost overruns, and race conditions.

---

## 1. Automatic Restart on Failure

**File**: `/home/clawd/scripts/health-monitor.sh`
**Service**: `/home/clawd/.config/systemd/user/health-monitor.service`

- Monitors ports 3000, 5000, 5001
- Auto-restarts on failure (10-second delay)
- Sends Slack alerts
- Logs to `/home/clawd/logs/health-monitor.log`

**Status**: Running ✓

---

## 2. Log Rotation

**File**: `/home/clawd/scripts/log-rotate.sh`
**Schedule**: Daily at 3 AM (crontab)

- Compresses logs older than 1 day
- Stores in `/home/clawd/logs/archive/`
- Keeps 7 days of compressed logs

---

## 3. Notion API Rate Limiting

**File**: `/home/clawd/skills/notion-assistant/notion_client.py`

- Max 3 requests/second (Notion's limit)
- Applied to all `_request()` calls automatically

```python
MIN_INTERVAL = 1.0 / 3.0  # ~0.33 seconds between requests
```

---

## 4. Retry Logic with Exponential Backoff

**File**: `/home/clawd/skills/notion-assistant/notion_client.py`

- Uses `tenacity` library
- 3 attempts max
- Wait: 2-10 seconds (exponential)
- Retries on: `httpx.HTTPError`, `ConnectionError`, `TimeoutError`

---

## 5. Graceful Degradation

**File**: `/home/clawd/skills/notion-assistant/morning_brief.py`

- Each data fetch wrapped in try/except
- Returns empty list on failure (not crash)
- Logs warnings: `⚠️ Calendar unavailable: ...`
- Brief still generates even if parts fail

---

## 6. Performance Monitoring

**File**: `/home/clawd/scripts/performance_check.sh`
**Schedule**: Every 6 hours (crontab)

- Tracks CPU, Memory, Disk usage
- Logs to `/home/cl/performance.log`
awd/logs- Alerts when CPU > 80% or Memory > 85%

---

## 7. Backup System

**File**: `/home/clawd/scripts/backup.sh`
**Schedule**: Daily at 3 AM (crontab)

Backs up:
- eBay scans config
- Crontab
- Clawdbot cron jobs
- Systemd services
- Key scripts

**Location**: `/home/clawd/backups/`
**Retention**: 7 days

---

## 8. Input Validation

**File**: `/home/clawd/skills/notion-assistant/validators.py`

Functions:
- `parse_date()` - handles "today", "tomorrow", "next monday", ISO, etc.
- `validate_event_input()` - validates title (2-100 chars)
- `validate_shopping_input()` - validates item (2-50 chars)
- `validate_task_input()` - validates task (3-200 chars)
- `sanitize_slack_input()` - removes dangerous characters

---

## 9. Weekly Health Summary

**File**: `/home/clawd/scripts/weekly_summary.sh`
**Schedule**: Sundays at 8 PM

Reports:
- Errors this week
- Service restarts
- Cron jobs run
- Avg CPU %
- Avg Memory %

---

## 10. Cost Circuit Breaker

**File**: `/home/clawd/skills/notion-assistant/cost_tracker.py`

- Tracks daily API costs (default $2.00 limit)
- `add_tokens(input_tokens, output_tokens, model)` - auto-calculates
- `get_status()` - returns current cost, limit, percentage
- Slack alert when limit exceeded

```python
tracker = CostTracker(daily_limit=2.00)
tracker.add_tokens(1000, 500, "haiku")
status = tracker.get_status()
# {'today': '$0.15', 'limit': '$2.00', 'percent': '8%', 'over_limit': False}
```

---

## 11. Query Caching

**File**: `/home/clawd/skills/notion-assistant/notion_client.py`

- 5-minute TTL cache
- Cached functions:
  - `get_today_events()`
  - `get_upcoming_events()`
  - `get_shopping_list()`

---

## 12. Command Queue

**File**: `/home/clawd/skills/notion-assistant/notion_client.py`

- Thread-safe queue for Notion operations
- Prevents race conditions
- Processes commands one at a time

```python
from notion_client import get_command_queue
cmd_queue = get_command_queue()
cmd_queue.add_command(add_calendar_event, title="Party", date="2026-02-20")
```

---

## Cron Jobs Summary

```
# Log rotation (daily 3 AM)
0 3 * * * /home/clawd/scripts/log-rotate.sh

# Backup (daily 3 AM)
0 3 * * * /home/clawd/scripts/backup.sh >> /home/clawd/logs/backup.log 2>&1

# Performance check (every 6 hours)
0 */6 * * * /home/clawd/scripts/performance_check.sh

# Weekly summary (Sundays 8 PM)
0 20 * * 0 /home/clawd/scripts/weekly_summary.sh
```

---

## Key Files

| Purpose | File |
|---------|------|
| Health monitoring | `/home/clawd/scripts/health-monitor.sh` |
| Log rotation | `/home/clawd/scripts/log-rotate.sh` |
| Performance | `/home/clawd/scripts/performance_check.sh` |
| Backups | `/home/clawd/scripts/backup.sh` |
| Weekly summary | `/home/clawd/scripts/weekly_summary.sh` |
| Notion client | `/home/clawd/skills/notion-assistant/notion_client.py` |
| Validators | `/home/clawd/skills/notion-assistant/validators.py` |
| Cost tracker | `/home/clawd/skills/notion-assistant/cost_tracker.py` |
| Morning brief | `/home/clawd/skills/notion-assistant/morning_brief.py` |

---

## Lessons Learned (2026-02-16)

From PRINCIPLES.md regression log:

1. **Single scheduler** - Multiple schedulers (localhost:3000 + Clawdbot) caused hidden failures. Generators ran but deployments silently missed.
2. **Unified observability** - Clawdbot heartbeat runs every 30 min and can report all job executions. External schedulers are invisible to the broader system.
3. **Forced documentation** - When agents rollback, they're forced to document why. That creates the learning loop that survives context resets.
