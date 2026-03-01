# Migration Plan: Task Manager → Cron

## Status
User wants to wait and test tonight's fixes. May migrate tomorrow if failures continue.

## Why Consider Migration
- Task manager keeps jamming after WSL reboots
- Over-engineered for 7 daily fixed-time tasks
- Cron is more resilient (OS-level, survives reboots better)

## Tasks to Migrate (if needed)
| Time | Task | Cron Command |
|------|------|--------------|
| 7:00 AM | Bitcoin Tweet (67) | `0 7 * * *` |
| 7:30 AM | Sports Tweet (60) | `30 7 * * *` |
| 8:00 AM | Family Brief (78) | `0 8 * * *` |
| 9:30 AM | Health Check (79) | `30 9 * * *` |
| 10:00 AM | eBay Deploy (38) | `0 10 * * *` |
| 10:00 AM | Sports Scout (71) | `0 10 * * *` |
| 4:00 PM | Sports Pick (72) | `0 16 * * *` |

## Hybrid Approach (Alternative)
Keep BOTH systems:
- **Cron**: Daily fixed-schedule tasks (the 7 above)
- **Task Manager**: One-off tasks, conditional logic, on-demand tasks

This gives:
- Reliability of cron for daily ops
- Flexibility of task manager for ad-hoc work
- Best of both worlds

## Commands to Migrate (when ready)
```
clawdbot cron add "0 7 * * *" --command "node /home/clawd/clawd/automation/21m-daily-generator-v2.js --type bitcoin" --name "Bitcoin Tweet"
# ... etc for each task
```
