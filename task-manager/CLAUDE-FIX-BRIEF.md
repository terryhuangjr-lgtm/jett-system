# Task Manager Worker Fix - Brief for Claude

## What to Fix
The task-manager worker keeps getting stuck and requires manual intervention daily. Need permanent solution with automatic recovery.

## Problem Details
See `WORKER-STUCK-ISSUE.md` for full analysis.

**TL;DR:**
- Worker process hangs but stays "alive"
- PID lock prevents new workers from starting
- No health monitoring or auto-recovery
- Scheduled tasks don't run until manual intervention

## Your Mission
Implement a robust worker management system that:

1. **Detects stuck workers** - Health checks every 60s
2. **Auto-recovers** - Kills and restarts hung processes
3. **Cleans up stale PIDs** - Validates PID files before blocking
4. **Monitors task execution** - Detects tasks running too long
5. **Logs everything** - Debug info for future issues

## Implementation Approach

### Option A: Enhanced Worker (Recommended)
- Add health check heartbeat to worker.js
- Implement stale PID detection and cleanup
- Add task execution timeouts
- Better error handling and recovery

### Option B: External Watchdog
- Create separate watchdog process
- Monitor worker health from outside
- Kill and restart on failure
- More complex but more robust

### Option C: Systemd + Health Checks
- Configure systemd for better restarts
- Add health check endpoint
- Let systemd handle recovery
- Simplest but less fine-grained control

**Choose the best approach or combine them.**

## Files to Modify

### Core Files
```
~/clawd/task-manager/worker.js          # Main worker process
~/clawd/task-manager/server.js          # API server
~/clawd/task-manager/lib/               # Helper modules
```

### New Files to Create
```
~/clawd/task-manager/lib/health-check.js    # Health monitoring
~/clawd/task-manager/lib/pid-manager.js     # PID file management
~/clawd/task-manager/watchdog.js            # Optional: external watchdog
```

### Config Files
```
~/clawd/task-manager/task-manager-worker.service  # Systemd service
```

## Testing Requirements

1. **Simulate stuck worker** - Freeze process, verify auto-recovery
2. **Stale PID test** - Leave old PID file, verify cleanup
3. **Task timeout test** - Run long task, verify timeout kill
4. **Continuous operation** - Run 24 hours without intervention

## Success Criteria
- ✅ Worker auto-recovers from hangs within 2 minutes
- ✅ Stale PIDs cleaned up automatically
- ✅ All scheduled tasks run on time
- ✅ Zero manual interventions for 7 days
- ✅ Detailed logging for debugging

## Current Behavior (Baseline)
```bash
# Stuck worker from yesterday
ps aux | grep worker
# clawd  5188  0.0  0.4  ...  Feb12  0:02  node worker.js

# Worker logs show failure
tail ~/clawd/task-manager/logs/worker.log
# Another worker is running (PID 5188), exiting...
# [repeated infinitely]

# Tasks not executing
node cli.js list | grep "Sports Tweet Generation"
# [60] Sports Tweet Generation - PENDING [next: 2/14/2026, 5:00:00 AM]
# Should have run at 5:00 AM today but didn't
```

## Deliverables

1. **Fixed worker.js** - Health checks, stale PID cleanup, task timeouts
2. **Health monitoring** - New health-check.js module
3. **Better systemd config** - Restart policies, health checks
4. **Documentation** - Updated README with monitoring/recovery info
5. **Testing script** - Verify fixes work (test-worker-recovery.js)

## Timeline
**Priority: HIGH** - This is blocking daily operations.

Start ASAP. Test thoroughly. Deploy when confident.

---
Contact: Terry (via Jett)
Created: 2026-02-13 07:15 AM
