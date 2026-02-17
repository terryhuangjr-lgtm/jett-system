# Task Manager Worker - Recurring Stuck Process Issue

## Problem Statement
The task-manager worker process frequently gets stuck/hung, preventing scheduled tasks from running. This requires manual intervention daily.

## Current Architecture Issues

### 1. Worker Gets Stuck
- Worker process (PID 5188) started Feb 12, still "running" Feb 13
- Process exists but not executing scheduled tasks
- 5 AM sports content generation didn't run today
- No automatic detection or recovery

### 2. PID Lock Creates Deadlock
- Worker uses PID file (.worker.pid) to prevent multiple instances
- When worker hangs, PID file remains locked
- New worker attempts see existing PID and exit immediately
- System is dead until manual intervention

### 3. No Health Monitoring
- No way to detect if worker is actually working
- Process can be "alive" but not processing tasks
- No heartbeat/health check mechanism
- No automatic restart on failure

## Evidence

**Stuck worker logs (Feb 13 7:10 AM):**
```
Another worker is running (PID 5188), exiting...
Another worker is running (PID 5188), exiting...
Another worker is running (PID 5188), exiting...
[repeated 30+ times]
```

**Process still exists from yesterday:**
```
clawd  5188  0.0  0.4  1316368 72256  ?  Sl  Feb12  0:02  /usr/bin/node worker.js
```

**Scheduled tasks not running:**
- Task #60 (Sports Tweet Generation) scheduled 5:00 AM - DIDN'T RUN
- Task #67 (Bitcoin Tweet Generation) scheduled 4:00 AM - DIDN'T RUN
- System dead until manual intervention at 7:10 AM

## What Needs Fixing

### Short-term (Band-aid)
- Restart worker process manually
- Delete stale PID files

### Long-term (Permanent Fix)
1. **Health Check Mechanism**
   - Worker should ping health endpoint every 60 seconds
   - If no ping for 2 minutes, consider worker dead
   - Auto-restart on health check failure

2. **Stale PID Detection**
   - Check if PID file is from > 5 minutes ago with no recent activity
   - Validate that PID actually corresponds to worker process
   - Clean up stale PIDs automatically

3. **Worker Watchdog**
   - Separate watchdog process that monitors worker health
   - Kills and restarts hung workers
   - Logs incidents for debugging

4. **Better Process Management**
   - Use systemd properly (restart=always, restart-sec=10)
   - Or implement custom supervisor with health checks
   - Add timeout detection for task execution

5. **Task Execution Monitoring**
   - Log when tasks start/complete
   - Detect if task has been "running" for > reasonable time
   - Kill and retry stuck tasks

## Files to Fix

**Primary:**
- `~/clawd/task-manager/worker.js` - Add health checks, stale PID detection
- `~/clawd/task-manager/server.js` - Add worker health monitoring
- `~/clawd/task-manager/lib/worker-health.js` - NEW: Health check system
- `~/clawd/task-manager/lib/watchdog.js` - NEW: Worker watchdog

**Systemd:**
- `~/clawd/task-manager/task-manager-worker.service` - Better restart policy

## Success Criteria
- Worker automatically recovers from hangs without manual intervention
- Stale PIDs cleaned up automatically
- Health monitoring detects and fixes issues within 2 minutes
- Zero missed scheduled tasks due to worker issues
- System runs 24/7 without human intervention

## Timeline
This needs to be fixed ASAP - it's affecting daily operations and requires manual intervention every morning.

---
Created: 2026-02-13 07:15 AM
Reported by: Terry
Issue frequency: Daily
Impact: High (missed scheduled content)
