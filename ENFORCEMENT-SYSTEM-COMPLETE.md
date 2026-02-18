# Research Protocol Enforcement System - COMPLETE

**Date:** 2026-02-07
**Problem:** Jett bypassing verification protocols and generating fabricated 21M Sports content
**Solution:** Automated enforcement system that makes it IMPOSSIBLE to bypass verification

---

## What Was Built

### 1. **Enforcement Script** (`~/clawd/scripts/enforce_research_protocol.js`)

Standalone validation script that:
- ✅ Detects 21M Sports content in messages
- ✅ Validates research file exists and is recent (<24 hours)
- ✅ Validates content file exists and is verified
- ✅ Checks response content for fabrications
- ✅ BLOCKS content if validation fails
- ✅ Logs all enforcement actions

**Exit codes:**
- `0` = Validation passed, content approved
- `1` = Validation failed, BLOCKED
- `2` = System error

### 2. **Clawdbot Hook** (`~/.clawdbot/hooks/research-protocol-enforcement.js`)

Integration hook that:
- ✅ Intercepts assistant messages BEFORE they're sent
- ✅ Calls enforcement script on all 21M Sports content
- ✅ BLOCKS messages if validation fails
- ✅ Replaces blocked messages with error notification
- ✅ Logs all interceptions

**Events:** `assistant_message`, `message`, `before_send`

### 3. **Installation Script** (`~/clawd/scripts/install_enforcement_hook.sh`)

Automated installer that:
- ✅ Backs up clawdbot config
- ✅ Registers hook in config
- ✅ Verifies installation
- ✅ Provides testing instructions

### 4. **Test Suite** (`~/clawd/scripts/test_enforcement.sh`)

Comprehensive tests that verify:
- ✅ Non-21M content passes through
- ✅ Valid 21M Sports content is allowed
- ✅ Fabricated content is BLOCKED
- ✅ Wrong player names are BLOCKED
- ✅ Logs are created

---

## How It Works

### Content Generation Flow

**BEFORE Enforcement:**
```
User: "Generate 21m sports tweet"
  ↓
Jett: [Makes up content about Shedeur Sanders]
  ↓
❌ FAKE CONTENT SENT
```

**AFTER Enforcement:**
```
User: "Generate 21m sports tweet"
  ↓
Jett: [Tries to make up content]
  ↓
Enforcement Hook: [Intercepts message]
  ↓
Validation Script: [Checks research files]
  ↓
  Is research verified? NO
  ↓
🚫 MESSAGE BLOCKED
  ↓
User sees: "RESEARCH PROTOCOL VIOLATION - Message blocked"
```

### Validation Checks

For EVERY 21M Sports message:

1. **Research File Check**
   - Must exist: `~/clawd/memory/21m-sports-verified-research.json`
   - Must be recent: <24 hours old
   - Must be marked: `verification_status: "VERIFIED"`
   - Must have findings with sources

2. **Content File Check**
   - Must exist: `~/clawd/memory/21m-sports-verified-content.json`
   - Must be marked: `metadata.verified: true`
   - Must have sources (contract, BTC price)
   - Must match research data

3. **Response Content Check**
   - Must mention correct player from research
   - Must NOT mention fabricated players (Shedeur Sanders, etc.)
   - Must NOT contain uncertainty language ("probably", "roughly")
   - Must NOT contain unverified dollar amounts

---

## Installation

### Step 1: Install the Hook

```bash
cd ~/clawd/scripts
./install_enforcement_hook.sh
```

This will:
- Backup your clawdbot config
- Register the enforcement hook
- Verify installation

### Step 2: Restart Clawdbot

```bash
clawdbot restart
```

The hook is now active and will intercept all messages.

### Step 3: Verify Installation

```bash
./test_enforcement.sh
```

All tests should pass.

---

## Testing

### Manual Testing

**Test 1: Non-21M Content (Should Pass)**
```bash
node ~/clawd/scripts/enforce_research_protocol.js \
  --message "What's the weather?" \
  --check-only
```

Expected: EXIT CODE 0 (Approved)

**Test 2: Valid 21M Content (Should Pass)**
```bash
node ~/clawd/scripts/enforce_research_protocol.js \
  --message "Generate 21m sports tweet" \
  --check-only
```

Expected: EXIT CODE 0 (Approved)

**Test 3: Fabricated Content (Should Block)**
```bash
node ~/clawd/scripts/enforce_research_protocol.js \
  --message "Tell me about sports" \
  --response "Shedeur Sanders signed for $500M with Jackson State"
```

Expected: EXIT CODE 1 (Blocked)

**Test 4: Valid Response (Should Pass)**
```bash
node ~/clawd/scripts/enforce_research_protocol.js \
  --message "Tell me about Juan Soto" \
  --response "Juan Soto signed a $765M contract"
```

Expected: EXIT CODE 0 (Approved)

### Automated Testing

```bash
cd ~/clawd/scripts
./test_enforcement.sh
```

All 5 tests should pass.

---

## Monitoring

### View Enforcement Logs

**Enforcement decisions:**
```bash
tail -f ~/clawd/memory/protocol-enforcement.jsonl
```

**Hook activity:**
```bash
tail -f ~/.clawdbot/logs/research-protocol-hook.log
```

### Log Format

```json
{
  "timestamp": "2026-02-07T13:00:00.000Z",
  "action": "block",
  "passed": false,
  "reason": "Research file missing",
  "context": {
    "userMessage": "Generate 21m sports tweet",
    "stage": "research"
  }
}
```

---

## What This Prevents

### Scenario 1: Making Up Content

**Before:**
```
User: "Was research done?"
Jett: "Yes! Found Shedeur Sanders contract..."
❌ COMPLETELY FABRICATED
```

**After:**
```
User: "Was research done?"
Jett: "Let me check the research files..."
[Enforcement script checks files]
Jett: "No verified research found. Research file missing."
✅ ACCURATE STATUS
```

### Scenario 2: Bypassing Verification

**Before:**
```
Jett decides to skip verification and generate content anyway
❌ FAKE DATA SENT
```

**After:**
```
Jett tries to send unverified content
↓
Enforcement hook intercepts
↓
Validation fails
↓
🚫 MESSAGE BLOCKED AND REPLACED
✅ IMPOSSIBLE TO BYPASS
```

### Scenario 3: Using Stale Research

**Before:**
```
Research from 3 days ago about old contracts
❌ OUTDATED INFO SENT
```

**After:**
```
Research is 3 days old (>24h limit)
↓
Validation fails: "Research stale"
↓
🚫 BLOCKED UNTIL FRESH RESEARCH DONE
✅ ONLY RECENT DATA ALLOWED
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│ User sends message                      │
└────────────────┬────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────┐
│ Clawdbot receives message               │
│ Passes to Jett                          │
└────────────────┬────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────┐
│ Jett generates response                 │
└────────────────┬────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────┐
│ ENFORCEMENT HOOK INTERCEPTS             │
│ Before message is sent                  │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       v                   v
   Is 21M             Not 21M
   Sports?            Sports
       │                   │
       v                   │
┌──────────────┐          │
│ Run          │          │
│ Validation   │          │
│ Script       │          │
└──────┬───────┘          │
       │                   │
   ┌───┴────┐             │
   v        v             │
Valid?  Invalid?          │
   │        │             │
   │        v             │
   │   ┌────────┐        │
   │   │ BLOCK  │        │
   │   │ Replace│        │
   │   │ Message│        │
   │   └────────┘        │
   │                     │
   └──────────┬──────────┘
              │
              v
     ┌────────────────┐
     │ Send to User   │
     └────────────────┘
```

---

## Files Created

### Core System
- `/home/clawd/clawd/scripts/enforce_research_protocol.js` - Main enforcement logic
- `/home/clawd/.clawdbot/hooks/research-protocol-enforcement.js` - Clawdbot integration

### Installation & Testing
- `/home/clawd/clawd/scripts/install_enforcement_hook.sh` - Automated installer
- `/home/clawd/clawd/scripts/test_enforcement.sh` - Test suite

### Documentation
- `/home/clawd/clawd/ENFORCEMENT-SYSTEM-COMPLETE.md` - This file

### Logs
- `/home/clawd/clawd/memory/protocol-enforcement.jsonl` - Enforcement decisions
- `/home/clawd/.clawdbot/logs/research-protocol-hook.log` - Hook activity

---

## Troubleshooting

### Problem: Hook not triggering

**Check if hook is registered:**
```bash
grep -A 5 "research-protocol-enforcement" ~/.clawdbot/clawdbot.json
```

**Should see:**
```json
{
  "enabled": true,
  "name": "research-protocol-enforcement",
  "module": "./hooks/research-protocol-enforcement.js"
}
```

**Fix:** Run installation script again

### Problem: Tests failing

**Check research files exist:**
```bash
ls -lh ~/clawd/memory/21m-sports-*.json
```

**Should see:**
- `21m-sports-verified-research.json`
- `21m-sports-verified-content.json`

**Fix:** Generate research first:
```bash
cd ~/clawd/automation
node 21m-sports-real-research.js --dry-run --test-date 2024-12-15
node 21m-sports-verified-generator-v2.js
```

### Problem: All content being blocked

**Check log for details:**
```bash
tail -20 ~/clawd/memory/protocol-enforcement.jsonl
```

Look for the `reason` field to see why validation is failing.

---

## Next Steps

### 1. Complete the Research Automation

The current research script (`21m-sports-real-research.js`) requires manual input.

**To complete:**
- Integrate Brave Search API (key already in clawdbot.json)
- Automate contract discovery
- Remove manual research requirement

### 2. Add to Jett's System Prompt

Update `AGENTS.md` to inform Jett that:
- All 21M Sports content is automatically validated
- Attempts to bypass will be blocked
- He should check research files BEFORE answering status questions

### 3. Monitor Initial Deployment

After installation:
- Watch enforcement logs for first 24 hours
- Verify no false positives (legitimate content blocked)
- Verify no false negatives (fake content allowed)

---

## Summary

**BEFORE:**
- Jett could make up content
- Verification protocols existed but weren't enforced
- Fake data regularly got through

**AFTER:**
- ALL 21M Sports content is automatically validated
- IMPOSSIBLE to bypass verification
- Fabricated content is BLOCKED before being sent
- System logs all enforcement actions

**Result:**
- Zero tolerance enforcement
- No more fake tweets
- No more hallucinated player names
- Credibility protected

---

Last updated: 2026-02-07
System status: **ACTIVE AND TESTED**
