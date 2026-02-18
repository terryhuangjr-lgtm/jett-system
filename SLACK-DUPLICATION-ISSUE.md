# Slack System Duplication Issue

**Status:** ⚠️ Two Slack systems running simultaneously
**Impact:** Possible message handling conflicts, context confusion

---

## The Problem

You have **TWO** Slack integration systems running:

### 1. Custom Slack Bridge (External Process)
- **File:** `/home/clawd/clawd/slack-bridge.js`
- **PID:** 19455 (running since Feb 6)
- **Control:**
  - Start: `~/clawd/start-slack-bridge.sh`
  - Stop: `~/clawd/stop-slack-bridge.sh`
- **Log:** `~/clawd/slack-bridge.log`

### 2. Built-in Clawdbot Slack (Integrated)
- **Config:** `~/.clawdbot/clawdbot.json` → `channels.slack.enabled: true`
- **Mode:** Socket mode
- **Status:** Enabled and running

---

## Why This Might Cause Issues

### Context Loss
- Both systems may handle the same message
- Messages could be processed twice with different context
- Session state may conflict between the two

### Identity Confusion
- One system might load Jett's identity files
- The other might not
- Leads to "Hello! How can I assist you?" generic responses

### Message Handling
- Race conditions: which system responds first?
- Duplicate responses possible
- Timestamp tracking conflicts

---

## The Solution

**Pick ONE system and disable the other.**

### Option A: Use Built-in Clawdbot Slack (RECOMMENDED)

**Pros:**
- ✅ Better integration with Clawdbot
- ✅ Consistent session management
- ✅ Uses Clawdbot's hooks system
- ✅ Enforcement hook works properly
- ✅ Proper context management

**How to switch:**
```bash
# Stop custom bridge
~/clawd/stop-slack-bridge.sh

# Verify it's stopped
ps aux | grep slack-bridge

# Built-in Clawdbot Slack is already enabled - no action needed
```

### Option B: Use Custom Slack Bridge

**Pros:**
- ✅ More control over message handling
- ✅ Custom logic if needed
- ✅ Separate process (doesn't restart with Clawdbot)

**Cons:**
- ❌ Doesn't integrate with Clawdbot hooks
- ❌ Enforcement hook won't work
- ❌ Separate context management needed

**How to switch:**
```bash
# Disable built-in Slack in config
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(process.env.HOME + '/.clawdbot/clawdbot.json', 'utf8'));
config.channels.slack.enabled = false;
fs.writeFileSync(process.env.HOME + '/.clawdbot/clawdbot.json', JSON.stringify(config, null, 2));
console.log('Disabled built-in Slack');
"

# Restart gateway
clawdbot gateway restart

# Custom bridge continues running
```

---

## My Recommendation

**Use Option A: Built-in Clawdbot Slack**

Why:
1. The enforcement hook we just built works with Clawdbot's message system
2. Context management is better integrated
3. Identity files load properly
4. Session state is consistent

The custom bridge was probably built before Clawdbot had good Slack support. Now that it does, the built-in version is better.

---

## Quick Test

After choosing one system, test it:

```bash
# Send Jett a message in Slack
# Then check which system handled it:

# Check custom bridge log
tail -20 ~/clawd/slack-bridge.log

# Check Clawdbot log
tail -20 /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log

# Only ONE should show the message
```

---

## To Disable Custom Bridge (Recommended)

```bash
# Stop the bridge
~/clawd/stop-slack-bridge.sh

# Verify it's stopped
ps aux | grep slack-bridge
# Should show NO results (except the grep itself)

# Test with Jett
# Messages should still work via built-in Clawdbot Slack
```

---

Last updated: 2026-02-07
Issue found during: Context loss debugging
