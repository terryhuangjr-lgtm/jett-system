#!/bin/bash
#
# Fix Jett's Context Loss and Identity Confusion
#
# This script fixes multiple issues causing Jett to lose context
# and forget who he is mid-conversation.
#

set -e

echo "🔧 Fixing Context Loss Issues"
echo "=============================="
echo ""

CONFIG_FILE="$HOME/.clawdbot/clawdbot.json"
BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d-%H%M%S)"

# Backup config
echo "📦 Creating backup..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   Saved to: $BACKUP_FILE"
echo ""

# Fix 1: Increase context retention
echo "🔧 Fix 1: Increasing context retention..."
echo "   BEFORE: TTL=10m, keepLastAssistants=3"
echo "   AFTER:  TTL=2h, keepLastAssistants=10"
echo ""

node << 'EOF'
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.clawdbot', 'clawdbot.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update context pruning settings
if (!config.agents) config.agents = {};
if (!config.agents.defaults) config.agents.defaults = {};
if (!config.agents.defaults.contextPruning) config.agents.defaults.contextPruning = {};

config.agents.defaults.contextPruning = {
  mode: "cache-ttl",
  ttl: "2h",  // Changed from 10m to 2h
  keepLastAssistants: 10  // Changed from 3 to 10
};

// Update compaction to be less aggressive
if (!config.agents.defaults.compaction) config.agents.defaults.compaction = {};

config.agents.defaults.compaction = {
  mode: "safeguard",
  memoryFlush: {
    enabled: false  // Disable memory flush on compaction
  }
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('✅ Context retention updated');
EOF

# Fix 2: Add system prompt enforcement
echo ""
echo "🔧 Fix 2: Creating system prompt enforcement..."

cat > "$HOME/clawd/BOOT.md" << 'BOOTMD'
# Session Boot

**READ THESE FILES IMMEDIATELY:**

1. `IDENTITY.md` - Who you are (Jett)
2. `USER.md` - Who Terry is (your human)
3. `SOUL.md` - Your core values
4. `AGENTS.md` - How you work
5. `JETT-START-HERE.md` - Critical rules

## CRITICAL REMINDERS

**You are JETT** - Terry's AI assistant
**Terry is YOUR HUMAN** - Not "Terry" as third person
**NEVER FABRICATE** - Your primary directive

When responding:
- "You" = Terry
- "I" = Jett
- NOT "Terry did this" (wrong)
- YES "You did this" (correct)

## Context Check

If you feel confused or don't remember recent conversation:
1. Check session history
2. Re-read identity files
3. Ask Terry directly: "I seem to have lost context - what were we discussing?"

**DO NOT** improvise or make up what you think happened.
BOOTMD

echo "   ✅ Created ~/clawd/BOOT.md"
echo ""

# Fix 3: Add identity reminder to AGENTS.md
echo "🔧 Fix 3: Adding identity reminder to AGENTS.md..."

# Check if identity section exists
if ! grep -q "## Identity Check" "$HOME/clawd/AGENTS.md"; then
  cat >> "$HOME/clawd/AGENTS.md" << 'IDENTITY'

## Identity Check

**CRITICAL - READ THIS EVERY SESSION:**

- **You are:** Jett (AI assistant)
- **Terry is:** Your human (the user)
- **When addressing Terry:** Use "you", not "Terry" as third person

**WRONG:** "Terry asked me to do X, so Terry needs..."
**RIGHT:** "You asked me to do X, so you need..."

If you catch yourself referring to Terry in third person, STOP and reframe.

**Context Loss Protection:**
- If conversation history is unclear, ASK - don't improvise
- If you lose context mid-conversation, say: "I lost context - can you remind me what we were discussing?"
- NEVER make up what you think happened
- NEVER pretend to remember if you don't

IDENTITY
  echo "   ✅ Added identity check to AGENTS.md"
else
  echo "   ℹ️  Identity check already exists in AGENTS.md"
fi
echo ""

# Fix 4: Check for duplicate Slack systems
echo "🔧 Fix 4: Checking for Slack system conflicts..."

SLACK_BRIDGE_PID=$(cat "$HOME/clawd/slack-bridge.pid" 2>/dev/null || echo "")
if [ -n "$SLACK_BRIDGE_PID" ] && ps -p "$SLACK_BRIDGE_PID" > /dev/null 2>&1; then
  echo "   ⚠️  Custom slack-bridge.js is running (PID: $SLACK_BRIDGE_PID)"
  echo "   ⚠️  Clawdbot's built-in Slack is also enabled"
  echo ""
  echo "   RECOMMENDATION:"
  echo "   - Use ONE Slack system, not both"
  echo "   - Built-in Clawdbot Slack is more integrated"
  echo "   - To disable custom bridge: ~/clawd/stop-slack-bridge.sh"
else
  echo "   ✅ No conflicting Slack systems detected"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ FIXES APPLIED:"
echo ""
echo "1. ✅ Context retention: 10min → 2 hours"
echo "2. ✅ Keep messages: 3 → 10 assistant messages"
echo "3. ✅ Memory flush: disabled on compaction"
echo "4. ✅ BOOT.md: Created with identity reminders"
echo "5. ✅ AGENTS.md: Added identity check section"
echo ""
echo "📊 WHAT THIS FIXES:"
echo ""
echo "  Before:"
echo "  - Context wiped after 10min pause ❌"
echo "  - Only 3 messages remembered ❌"
echo "  - Jett forgets who Terry is ❌"
echo "  - Generic 'Hello!' reset messages ❌"
echo ""
echo "  After:"
echo "  - Context maintained for 2 hours ✅"
echo "  - 10 messages remembered ✅"
echo "  - Identity loaded every session ✅"
echo "  - Context loss = Jett asks (not improvises) ✅"
echo ""
echo "🚀 NEXT STEPS:"
echo ""
echo "  1. Restart Clawdbot:"
echo "     clawdbot gateway restart"
echo ""
echo "  2. Test with Jett:"
echo "     - Send a message"
echo "     - Wait 15+ minutes"
echo "     - Send another message"
echo "     - Jett should remember context"
echo ""
echo "  3. Monitor for issues:"
echo "     tail -f /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log"
echo ""
