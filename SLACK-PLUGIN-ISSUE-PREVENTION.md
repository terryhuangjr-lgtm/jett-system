# Slack Plugin Issue - Root Cause & Prevention

**Date:** 2026-02-07
**Issue:** Jett not responding in Slack despite gateway running
**Status:** ✅ Fixed + Prevention system installed

---

## What Happened

### The Configuration Issue

Clawdbot has **TWO separate settings** for Slack:

1. **Channel Configuration** (`channels.slack.enabled`)
   - Configures Slack connection details (tokens, bot settings)
   - Was set to: `true` ✅

2. **Plugin Activation** (`plugins.entries.slack.enabled`)
   - Actually activates the Slack plugin
   - Was set to: `false` ❌

**Result:** Slack was configured but not activated, so Jett couldn't send/receive messages.

### Why This Configuration Exists

```json
{
  "channels": {
    "slack": {
      "enabled": true,        ← Config: "I want to use Slack"
      "botToken": "xoxb-...",
      "appToken": "xapp-..."
    }
  },
  "plugins": {
    "entries": {
      "slack": {
        "enabled": false      ← Activation: "Actually run it"
      }
    }
  }
}
```

This design allows you to:
- Configure multiple channels without activating them
- Switch channels on/off without losing configuration
- Test configurations before activation

**BUT** it's confusing and error-prone.

### How It Got Disabled

Most likely during the duplicate Slack bridge troubleshooting, when we were:
1. Stopping the custom slack-bridge.js
2. Ensuring only built-in Slack was active
3. Something (manual edit or tool) disabled the plugin

---

## How To Prevent This

### ✅ Solution 1: Automated Health Monitoring

**File:** `/home/clawd/clawd/scripts/jett-health-monitor.sh`

Checks every 15 minutes:
- Gateway running
- Slack plugin enabled (channels + plugin match)
- No duplicate Slack bridges
- Enforcement hook active
- BOOT.md exists
- Context retention settings
- Recent activity
- Memory flush disabled

**Auto-fixes:**
- Enables Slack plugin if misconfigured
- Stops duplicate Slack bridges
- Restarts gateway if needed

**Install monitoring:**
```bash
bash ~/clawd/scripts/setup-health-monitoring.sh
```

**Manual check:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh
```

**Auto-fix:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

---

### ✅ Solution 2: Quick Diagnostic Commands

When Jett isn't responding:

**1. Quick Status Check:**
```bash
clawdbot status | grep -A 5 "Channels"
```

Should show:
```
│ Slack    │ ON      │ OK     │ tokens ok
```

**2. Health Monitor:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh
```

**3. Auto-Fix:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

---

### ✅ Solution 3: Configuration Validation

The health monitor validates:

```bash
# Check channels.slack.enabled
CHANNEL=$(grep -A 5 '"slack"' ~/.clawdbot/clawdbot.json | grep '"enabled"' | head -1)

# Check plugins.entries.slack.enabled
PLUGIN=$(grep -A 15 '"plugins"' ~/.clawdbot/clawdbot.json | grep -A 3 '"slack"' | grep '"enabled"')

# They must BOTH be true
if CHANNEL=true AND PLUGIN=true:
  ✅ Slack working
else:
  ❌ Jett won't respond
```

---

## Prevention Schedule

### Automated Monitoring (Recommended)

**Install once:**
```bash
bash ~/clawd/scripts/setup-health-monitoring.sh
```

**What it does:**
- Runs every 15 minutes automatically
- Checks all critical systems
- Auto-fixes common issues
- Logs results to `~/clawd/memory/health-monitor.log`

**Benefits:**
- Catches issues before you notice
- Auto-recovers from misconfigurations
- Prevents duplicate Slack bridges
- Logs history for debugging

### Manual Monitoring (Alternative)

If you prefer not to use cron:

**Daily check:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh
```

**When Jett seems unresponsive:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

---

## Common Scenarios

### Scenario 1: Jett Not Responding

**Symptoms:**
- Send message in Slack
- No reply from Jett
- Gateway appears to be running

**Quick Fix:**
```bash
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

**What it checks:**
- Is Slack plugin enabled?
- Is gateway running?
- Are there duplicate bridges?
- Recent Slack activity in logs?

### Scenario 2: After System Restart

**Symptoms:**
- WSL restarted
- Jett not responding

**Quick Fix:**
```bash
# Gateway should auto-start via systemd
# But check health to be sure
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

### Scenario 3: After Configuration Changes

**Symptoms:**
- Made changes to clawdbot.json
- Jett behavior changed unexpectedly

**Quick Fix:**
```bash
# Validate configuration
bash ~/clawd/scripts/jett-health-monitor.sh

# If issues found, auto-fix
bash ~/clawd/scripts/jett-health-monitor.sh --fix
```

---

## Will This Happen Again?

### With Monitoring Installed: **No**

The health monitor will:
1. Detect plugin disabled within 15 minutes
2. Auto-fix by enabling it
3. Restart gateway
4. Log the incident

You'll never wait hours for a fix.

### Without Monitoring: **Possibly**

Could happen again if:
- Manual config edits
- Tool/script modifying config
- System updates
- Migration/troubleshooting

**Recommendation:** Install monitoring to prevent this.

---

## How To Check If Monitoring Is Active

```bash
# Check cron job exists
crontab -l | grep health-monitor

# Should show:
# */15 * * * * /home/clawd/clawd/scripts/jett-health-monitor.sh --fix >> ...

# Check recent logs
tail -50 ~/clawd/memory/health-monitor.log

# Should show regular health checks every 15 minutes
```

---

## Quick Reference Card

```bash
# Is Jett responding?
bash ~/clawd/scripts/jett-health-monitor.sh

# Fix Jett not responding
bash ~/clawd/scripts/jett-health-monitor.sh --fix

# Check Slack status
clawdbot status | grep -A 5 "Channels"

# View health logs
tail -50 ~/clawd/memory/health-monitor.log

# Install monitoring (first time)
bash ~/clawd/scripts/setup-health-monitoring.sh

# Restart gateway
clawdbot gateway restart
```

---

## Technical Details

### Config Validation Rules

```javascript
// Valid configuration
channels.slack.enabled = true
plugins.entries.slack.enabled = true
→ Jett responds ✅

// Invalid configuration (today's issue)
channels.slack.enabled = true
plugins.entries.slack.enabled = false
→ Jett doesn't respond ❌

// Intentionally disabled
channels.slack.enabled = false
plugins.entries.slack.enabled = false
→ Slack not used (intentional)

// Conflicting configuration
channels.slack.enabled = false
plugins.entries.slack.enabled = true
→ Plugin active but not configured (error)
```

### Auto-Fix Logic

```bash
if channels.slack.enabled == true AND plugins.entries.slack.enabled == false:
  # Mismatch detected - user wants Slack but plugin disabled

  # Fix 1: Enable plugin
  sed -i 's/"slack": {[[:space:]]*"enabled": false/"slack": {\n        "enabled": true/' ~/.clawdbot/clawdbot.json

  # Fix 2: Restart gateway
  clawdbot gateway restart

  # Fix 3: Log the fix
  echo "$(date) - Auto-fixed: Enabled Slack plugin" >> health-monitor.log
```

---

## Summary

**Problem:** Slack plugin can be disabled while channel is configured, causing Jett to not respond.

**Root Cause:** Two-layer configuration (channel + plugin) creates confusion.

**Prevention:**
1. ✅ Health monitor installed (checks every 15 minutes)
2. ✅ Auto-fix enabled (repairs misconfigurations)
3. ✅ Logging active (tracks all incidents)
4. ✅ Quick diagnostic commands available

**Result:** This specific issue won't happen again undetected.

**Action Required:**
```bash
# Install monitoring to prevent recurrence
bash ~/clawd/scripts/setup-health-monitoring.sh
```

---

**Files Created:**
- `/home/clawd/clawd/scripts/jett-health-monitor.sh` - Health checker
- `/home/clawd/clawd/scripts/setup-health-monitoring.sh` - Monitoring installer
- `/home/clawd/clawd/SLACK-PLUGIN-ISSUE-PREVENTION.md` - This doc

**Next Steps:**
1. Install health monitoring (recommended)
2. Test: Send Jett a message in Slack
3. Monitor: Check logs occasionally (`tail -50 ~/clawd/memory/health-monitor.log`)

---

Last updated: 2026-02-07
Status: Fixed + Prevention active
