# Claude Code Management Guide

## Problem Fixed: Multiple Claude Instances

**Issue:** Two Claude Code instances were running simultaneously, both responding to Slack messages, causing duplicate/contradictory responses.

**Root Cause:** Manually starting Claude Code multiple times without checking if it's already running.

**Solution:** Use the helper scripts below to manage Claude Code safely.

---

## Safe Start/Stop Scripts

### Start Claude Code
```bash
cd ~/clawd
./start-claude.sh
```

**What it does:**
- ✅ Checks if Claude is already running
- ✅ Prevents starting duplicate instances
- ✅ Saves PID for tracking
- ✅ Logs to `/tmp/claude-output.log`

### Stop Claude Code
```bash
cd ~/clawd
./stop-claude.sh
```

**What it does:**
- ✅ Gracefully stops running Claude
- ✅ Cleans up PID file
- ✅ Force kills if needed
- ✅ Warns about orphaned processes

---

## Architecture

```
User (Slack)
    ↓
slack-bridge.js (PID file: slack-bridge.pid)
    ↓
clawdbot-gateway:18789
    ↓
Claude Code (PID file: claude-code.pid)
```

**Key Points:**
- Only ONE Claude Code instance should run at a time
- The gateway forwards all Slack messages to Claude
- Multiple Claude instances = duplicate responses

---

## Checking Status

### See all running processes
```bash
ps aux | grep -E "(claude|slack-bridge|clawdbot)" | grep -v grep
```

### Check Claude Code specifically
```bash
if [ -f ~/clawd/claude-code.pid ]; then
  PID=$(cat ~/clawd/claude-code.pid)
  ps -p $PID -o pid,cmd
else
  echo "No Claude PID file found"
fi
```

### Check what's listening on gateway port
```bash
lsof -i :18789
```

---

## Common Issues

### "Getting duplicate responses in Slack"
**Cause:** Multiple Claude instances running
**Fix:**
```bash
./stop-claude.sh  # Kill all Claude processes
./start-claude.sh # Start fresh single instance
```

### "Claude not responding"
**Cause:** Claude stopped but PID file still exists
**Fix:**
```bash
./stop-claude.sh  # Clean up stale PID
./start-claude.sh # Start fresh
```

### "Can't start Claude - already running"
**Cause:** Another Claude session is active
**Options:**
1. Use existing session (don't start another)
2. Stop and restart: `./stop-claude.sh && ./start-claude.sh`

---

## Manual Commands (If Scripts Fail)

### Find all Claude processes
```bash
ps aux | grep -E "^\S+\s+[0-9]+.*claude$" | grep -v grep
```

### Kill all Claude processes
```bash
pkill -9 -f "^claude$"
```

### Remove PID file
```bash
rm ~/clawd/claude-code.pid
```

---

## Prevention Tips

1. **Always use `./start-claude.sh`** instead of running `claude` directly
2. **Check if Claude is running** before starting a new session
3. **Use `./stop-claude.sh`** before starting if you're unsure
4. **Never run `claude` in multiple terminals** - use ONE session

---

## Current State (Fixed)

✅ Old Claude process (PID 1680) - KILLED
✅ Current Claude process (PID 25157) - RUNNING
✅ PID file created: `~/clawd/claude-code.pid`
✅ Helper scripts created: `start-claude.sh`, `stop-claude.sh`

**You should only get ONE response per message now!**

---

Last updated: 2026-02-05
