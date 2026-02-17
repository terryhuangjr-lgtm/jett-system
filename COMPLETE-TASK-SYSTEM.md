# Complete Jett Task System

**Date:** 2026-02-07
**Status:** ✅ Ready to install
**Approach:** Cron-based with automatic Slack notifications

---

## What You Asked For

> "I would like all of the tasks setup the best way and for jett to run these tasks consistently and on time. IF something goes wrong, I'd like to know WHAT went wrong. [...] he's an AI too and should be able to catch this stuff and comminucate right? We just set the RULES and give him the best system to execute!"

**Your vision:** research → create → scan → notify (simple!)

---

## What Was Built

### Task Orchestrator ✅

**File:** `/home/clawd/clawd/scripts/task-orchestrator.sh`

Central task runner that:
- ✅ Runs any task on demand
- ✅ Logs everything to files
- ✅ **Notifies you in Slack when done**
- ✅ **Notifies you in Slack if errors**
- ✅ Catches errors automatically
- ✅ Reports exactly what went wrong

**How it works:**
```bash
bash ~/clawd/scripts/task-orchestrator.sh 21m-sports-research
  ↓
Runs task with error handling
  ↓
IF success:
  ✅ Slack DM: "Sports research complete! Ready for review"
ELSE:
  ❌ Slack DM: "Task failed at line 42: Connection timeout"
  📋 Includes log file location
```

**No more digging for info - Jett tells you automatically!**

---

### Comprehensive Schedule ✅

**File:** `/home/clawd/clawd/scripts/setup-all-tasks.sh`

Installs complete daily schedule:

| Time | Task | Notifications |
|------|------|---------------|
| **2:00 AM** | 21M Sports Research | ✅ DM when complete |
| **2:30 AM** | 21M Bitcoin Research | ✅ DM when complete |
| **3:00 AM** | 21M Sports Content | ✅ DM when complete |
| **3:30 AM** | 21M Bitcoin Content | ✅ DM when complete |
| **8:00 AM** | eBay Daily Scan | ✅ Posted to #levelupcards |
| **Every 15min** | Health Monitor | ⚠️ Only if issues |

**Every task notifies you - success or failure!**

---

## Your Questions Answered

### Q: "Is there a cron job for BTC research task?"

**Before:** No
**Now:** Yes! Runs at 2:30 AM daily

### Q: "How about ebay scans?"

**Before:** No cron job
**Now:** Yes! Runs at 8:00 AM daily (different scan each day)

### Q: "Is cron job the way to go for all of them?"

**Answer:** Yes, because:
- ✅ Simple and reliable
- ✅ No dependencies (task manager was crashing)
- ✅ Built into Linux
- ✅ Easy to view/edit schedule
- ✅ Works with Slack notifications
- ✅ Logs everything

**What I did:** Disabled failing task-manager service (5888 crashes!), using clean cron approach instead.

### Q: "IF something goes wrong, I'd like to know WHAT went wrong"

**Answer:** Every task now has:

1. **Automatic error detection**
   ```bash
   trap 'error_handler $LINENO' ERR
   ```
   Catches ANY error in the script

2. **Slack notification with details**
   ```
   ❌ 21M Sports Research
   Task failed at line 87 (exit code: 1)

   Error: Brave API rate limit exceeded
   Location: ~/clawd/memory/task-logs/21m-sports-research-20260208.log
   ```

3. **Complete log files**
   - Every run logged
   - Timestamped
   - Full error messages
   - Easy to review

**You'll know immediately what went wrong, no digging required!**

### Q: "he's an AI too and should be able to catch this stuff and comminucate right?"

**Answer:** Exactly! Now he does:

**Before:**
- Task fails silently
- You have to ask Jett "what happened?"
- Jett says "I don't know, let me check logs"
- You send logs to me
- I diagnose the issue
- Very tiresome!

**After:**
- Task fails
- Jett **immediately sends you a Slack DM:**
  - ❌ What task failed
  - 🔍 What error occurred
  - 📍 Which line of code
  - 📋 Where to find full logs
- You know exactly what happened
- No back-and-forth needed

### Q: "I want the ability to change the criteria, or task at times"

**Answer:** Easy to customize:

**Change schedule:**
```bash
crontab -e

# Change from 2 AM to 3 AM:
0 3 * * * /home/clawd/clawd/scripts/task-orchestrator.sh 21m-sports-research
```

**Change task behavior:**
```bash
# Edit the automation scripts directly
nano ~/clawd/automation/21m-sports-auto-research.js

# Example: Change from last 7 days to last 14 days
const DAYS_AGO_7 = new Date(TODAY - 14 * 24 * 60 * 60 * 1000);
```

**Run manually anytime:**
```bash
bash ~/clawd/scripts/task-orchestrator.sh 21m-sports-research
```

---

## The Complete Flow

### Daily Automation (Your "Meat and Potatoes")

**Night (2:00 AM - 3:30 AM):**
```
2:00 AM → Sports Research runs
        ↓
        Searches breaking news (Brave API)
        Prioritizes recent contracts
        Excludes old players (Juan Soto, etc.)
        ↓
        ✅ Slack DM: "Fresh contract research complete!"

2:30 AM → Bitcoin Research runs
        ↓
        Curates Bitcoin knowledge
        Gets current BTC price
        ↓
        ✅ Slack DM: "Bitcoin research complete!"

3:00 AM → Sports Content Generation
        ↓
        Validates research
        Generates tweets
        Calculates BTC equivalents
        ↓
        ✅ Slack DM: "Sports content ready for review!"

3:30 AM → Bitcoin Content Generation
        ↓
        Generates educational content
        Formats for Twitter
        ↓
        ✅ Slack DM: "Bitcoin content ready for review!"
```

**Morning (8:00 AM):**
```
8:00 AM → eBay Scan runs
        ↓
        Monday: MJ Topps Finest 1993-1999
        Tuesday: Griffey Jr Refractors
        Wednesday: 1989 Griffey Rookies
        Thursday: MJ Upper Deck Serial #'d
        Friday: Kobe/Duncan/Dirk/Wade Multi-Search
        Saturday: MJ Base 1994-1999
        Sunday: 2025 Cam Ward
        ↓
        ✅ Posted to #levelupcards
        ✅ Slack DM: "eBay scan complete!"
```

**Continuous (Every 15 minutes):**
```
Health Monitor runs
        ↓
        Checks: Gateway, Slack, Hooks, Context, etc.
        ↓
        IF issues found:
          → Auto-fixes
          → ⚠️ Slack DM: "Fixed: Slack plugin was disabled"
        ELSE:
          → Silent (no spam)
```

---

## Your Morning Routine

**Wake up** → **Check Slack DM from Jett**

You'll see:
```
✅ 21M Sports Research
Fresh contract research complete! Ready for review.
Location: ~/clawd/memory/21m-sports-verified-research.json

✅ 21M Bitcoin Research
Bitcoin knowledge research complete! Ready for content generation.
Location: ~/clawd/memory/21m-bitcoin-research.md

✅ 21M Sports Content
Content generated! Ready for review and posting.
Location: ~/clawd/memory/21m-sports-verified-content.json

✅ 21M Bitcoin Content
Bitcoin content generated! Ready for review and posting.
Location: ~/clawd/memory/21m-bitcoin-verified-content.json

✅ eBay Scan
Today's eBay scan complete! Results posted to #levelupcards
```

**If anything failed:**
```
❌ 21M Sports Research
Task failed at line 127 (exit code: 1)

Error: Brave API rate limit exceeded. Will retry tomorrow.
Check logs: ~/clawd/memory/task-logs/21m-sports-research-20260208-020001.log
```

**Simple, clear, automatic!**

---

## Installation

**Install everything:**
```bash
bash ~/clawd/scripts/setup-all-tasks.sh
```

This installs:
- ✅ All 6 scheduled tasks
- ✅ Task orchestrator with error handling
- ✅ Slack notifications for everything
- ✅ Automatic logging
- ✅ Health monitoring

**Takes 30 seconds, runs forever.**

---

## Manual Testing

Before the scheduled runs kick in, test each task:

```bash
# Test sports research
bash ~/clawd/scripts/task-orchestrator.sh 21m-sports-research

# Test bitcoin research
bash ~/clawd/scripts/task-orchestrator.sh 21m-bitcoin-research

# Test sports content
bash ~/clawd/scripts/task-orchestrator.sh 21m-sports-content

# Test bitcoin content
bash ~/clawd/scripts/task-orchestrator.sh 21m-bitcoin-content

# Test eBay scan
bash ~/clawd/scripts/task-orchestrator.sh ebay-scan

# Check health
bash ~/clawd/scripts/task-orchestrator.sh health-check
```

**Each one will:**
1. Run the task
2. Send you a Slack DM when done
3. Log everything to file

---

## Monitoring & Logs

### View All Task Logs
```bash
# List recent task runs
ls -lt ~/clawd/memory/task-logs/ | head -20

# View specific task
tail -50 ~/clawd/memory/task-logs/21m-sports-research-20260208-020001.log

# Check health monitor
tail -50 ~/clawd/memory/health-monitor.log
```

### View Current Schedule
```bash
crontab -l
```

### Check What's Running
```bash
# View active cron jobs
ps aux | grep cron

# Check gateway status
clawdbot status
```

---

## Error Handling

### What Happens When Things Go Wrong

**Scenario 1: API Rate Limit**
```
Task fails at line 87
  ↓
Error handler catches it
  ↓
Slack notification sent:
  ❌ Task failed: Brave API rate limit exceeded
  ↓
Log file saved with full details
  ↓
Task exits cleanly
```

**Scenario 2: Network Timeout**
```
Task fails connecting to API
  ↓
Error handler catches it
  ↓
Slack notification sent:
  ❌ Task failed: Connection timeout after 30s
  ↓
Will retry tomorrow (cron)
```

**Scenario 3: File Not Found**
```
Task can't find research file
  ↓
Error handler catches it
  ↓
Slack notification sent:
  ❌ Task failed: Research file missing
  📋 Expected: ~/clawd/memory/21m-sports-verified-research.json
  ↓
You know exactly what's wrong
```

**Every error is caught and reported - no silent failures!**

---

## Customization

### Change Task Timing

```bash
crontab -e

# Example: Run sports research at 1 AM instead of 2 AM
0 1 * * * /home/clawd/clawd/scripts/task-orchestrator.sh 21m-sports-research
```

### Change Task Behavior

Edit automation scripts directly:
```bash
# Change sports research date range
nano ~/clawd/automation/21m-sports-auto-research.js

# Change eBay scan criteria
nano ~/clawd/automation/deploy-ebay-scans.js

# Change content generation format
nano ~/clawd/automation/21m-sports-verified-generator-v2.js
```

### Add New Tasks

```bash
# Add to orchestrator
nano ~/clawd/scripts/task-orchestrator.sh

# Add case for new task
"my-new-task")
    echo "Running my new task..."
    node ~/clawd/automation/my-new-task.js
    notify_slack "success" "My New Task" "Task complete!"
    ;;

# Add to crontab
crontab -e
0 9 * * * /home/clawd/clawd/scripts/task-orchestrator.sh my-new-task
```

---

## Troubleshooting

### Tasks Not Running?

```bash
# Check cron is running
ps aux | grep cron

# Start if needed
sudo service cron start

# Check cron logs
grep CRON /var/log/syslog | tail -20
```

### Not Getting Slack Notifications?

```bash
# Test Slack connection
echo "Test notification" | clawdbot send slack:dm:U0ABTP704QK

# Check gateway status
clawdbot status | grep Slack

# Should show: Slack │ ON │ OK
```

### Task Failing?

```bash
# Run manually to see error
bash ~/clawd/scripts/task-orchestrator.sh 21m-sports-research

# Check logs
tail -50 ~/clawd/memory/task-logs/21m-sports-research-*.log

# Error will be in log file
```

---

## Comparison: Before vs After

### Before

**Research:**
- ❌ No automation
- ❌ Manual execution
- ❌ Juan Soto data reused
- ❌ No notifications
- ❌ Silent failures

**When things broke:**
1. You: "Jett, what happened?"
2. Jett: "Let me check logs..."
3. You: Send logs to me
4. Me: Diagnose issue
5. You: Frustrated

### After

**Research:**
- ✅ Runs nightly at 2 AM
- ✅ Fresh data every day
- ✅ Excludes old players
- ✅ Slack notification when done
- ✅ Error notification if fails

**When things break:**
1. Slack DM from Jett: "❌ Task failed: API rate limit"
2. You: Check log file path provided
3. You: Know exactly what happened
4. Done - simple!

---

## Summary

### What You Get

**Automation:**
- ✅ Sports research (nightly)
- ✅ Bitcoin research (nightly)
- ✅ Sports content (nightly)
- ✅ Bitcoin content (nightly)
- ✅ eBay scans (morning)
- ✅ Health monitoring (continuous)

**Communication:**
- ✅ Slack DM when tasks complete
- ✅ Slack DM when tasks fail
- ✅ Detailed error messages
- ✅ Log file locations
- ✅ No more digging for info

**Reliability:**
- ✅ Cron-based (simple, stable)
- ✅ Error handling on every task
- ✅ Automatic logging
- ✅ Health monitoring
- ✅ No more silent failures

**Simplicity:**
- ✅ One command to install all
- ✅ One command to test any task
- ✅ Easy to view schedule
- ✅ Easy to customize
- ✅ Just works!

---

## Installation Command

```bash
bash ~/clawd/scripts/setup-all-tasks.sh
```

**That's it.** Everything else is automatic.

---

**Your vision realized:**
> "content research, content creation, ebay scans - deploy to slack (me) when they're done. seems kind of simple!"

**It IS simple now!** ✅

---

Last updated: 2026-02-07
System: Ready to install
