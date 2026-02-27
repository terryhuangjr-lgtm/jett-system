# Task Manager - Your Single Source of Truth

## ✅ What Just Changed

**BEFORE:**
- Cron jobs running 21m tasks at various times
- Task Manager dashboard (localhost:3000) showing different schedule
- Nothing synced, total chaos

**NOW:**
- ✅ **Task Manager is the ONLY scheduler** for all automated tasks
- ✅ Cron only runs health monitoring (simple, non-conflicting)
- ✅ One place to see and manage everything: http://localhost:3000

## 🎯 Task Manager Dashboard

**Access:** http://localhost:3000

**Current Schedule:**
```
02:00 AM - Sports Quick Scan (daily)
03:00 AM - Bitcoin Quick Scan (daily)
04:00 AM - Bitcoin Tweet Generation (daily)
05:00 AM - Sports Tweet Generation - Morning (daily)
06:00 AM - Bitcoin Tweet Deployment (daily)
07:30 AM - Sports Tweet Deployment - Morning (daily)
08:30 AM - eBay Deployment Summary (daily)
11:00 AM - Sports Tweet Generation - Midday (daily)
12:00 PM - Sports Tweet Deployment - Midday (daily) ← YOUR NOON POST!

Plus: Weekly eBay scans (various days at 4 AM)
```

## 📝 How to Add/Edit Tasks

**Via Dashboard:** http://localhost:3000
1. Click the "+" button (bottom right)
2. Fill in task details
3. Schedule examples:
   - `daily at 14:00`
   - `weekly on Monday at 09:00`
   - `every 30 minutes`
   - `hourly`

**Via CLI:**
```bash
cd ~/clawd/task-manager
node cli.js add "Task Name" "command to run" "schedule"
node cli.js list
node cli.js disable <task-id>
node cli.js enable <task-id>
```

## 🔧 Services Running

**Task Manager Web UI:** `task-manager.service`
- Dashboard at localhost:3000
- Auto-starts on boot

**Task Manager Worker:** `task-manager-worker.service`
- Executes scheduled tasks
- Auto-starts on boot

**Check Status:**
```bash
systemctl --user status task-manager.service
systemctl --user status task-manager-worker.service
```

**Restart if Needed:**
```bash
systemctl --user restart task-manager.service
systemctl --user restart task-manager-worker.service
```

## 📊 Monitoring

**Dashboard Metrics:**
- http://localhost:3000 shows next runs, last runs, success/failure
- LLM usage stats (Ollama vs Claude)

**Logs:**
- Task logs: `~/clawd/memory/task-logs/`
- Worker logs: `~/clawd/task-manager/logs/`

## 🎉 Benefits

✅ **Single Source of Truth** - Dashboard shows what actually runs
✅ **Web UI** - Easy to add/edit/disable tasks without SSH
✅ **Persistent** - Tasks survive reboots (systemd services)
✅ **Monitoring** - See what ran, when, and if it succeeded
✅ **No More Conflicts** - One scheduler, no duplicate runs

## 🔙 Rollback (If Needed)

Cron backup saved at: `/tmp/crontab-backup-*.txt`

To restore old cron:
```bash
crontab /tmp/crontab-backup-*.txt
```

But you won't need to - Task Manager is better! 🚀
