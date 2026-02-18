#!/bin/bash
#
# Jett Health Monitor
#
# Checks critical system health and auto-fixes common issues
# Run this periodically (cron) or manually when Jett seems unresponsive
#

set -e

ISSUES_FOUND=0
AUTO_FIXED=0

echo "🏥 Jett Health Monitor"
echo "═══════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function check_passed() {
    echo -e "${GREEN}✓${NC} $1"
}

function check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((ISSUES_FOUND++))
}

function check_failed() {
    echo -e "${RED}✗${NC} $1"
    ((ISSUES_FOUND++))
}

function auto_fixed() {
    echo -e "${GREEN}  → Auto-fixed: $1${NC}"
    ((AUTO_FIXED++))
}

# CHECK 1: Gateway running
echo "1. Checking gateway status..."
if pgrep -x clawdbot > /dev/null; then
    PID=$(pgrep -x clawdbot)
    check_passed "Gateway running (PID: $PID)"
else
    check_failed "Gateway NOT running"
    echo "  → Fix: clawdbot gateway restart"
fi
echo ""

# CHECK 2: Slack plugin enabled
echo "2. Checking Slack plugin configuration..."
SLACK_CHANNEL_ENABLED=$(grep -A 5 '"slack"' ~/.clawdbot/clawdbot.json | grep '"enabled"' | head -1 | grep -o 'true\|false')
SLACK_PLUGIN_ENABLED=$(grep -A 15 '"plugins"' ~/.clawdbot/clawdbot.json | grep -A 3 '"slack"' | grep '"enabled"' | grep -o 'true\|false')

if [ "$SLACK_CHANNEL_ENABLED" = "true" ] && [ "$SLACK_PLUGIN_ENABLED" = "true" ]; then
    check_passed "Slack plugin properly enabled"
elif [ "$SLACK_CHANNEL_ENABLED" = "true" ] && [ "$SLACK_PLUGIN_ENABLED" = "false" ]; then
    check_failed "Slack channel enabled BUT plugin disabled"
    echo "  → This causes Jett to not respond in Slack"

    # Auto-fix
    if [ "$1" = "--fix" ]; then
        echo "  → Attempting auto-fix..."
        sed -i 's/"slack": {[[:space:]]*"enabled": false/"slack": {\n        "enabled": true/' ~/.clawdbot/clawdbot.json
        clawdbot gateway restart > /dev/null 2>&1
        auto_fixed "Enabled Slack plugin and restarted gateway"
    else
        echo "  → Run with --fix to auto-repair"
    fi
else
    check_warning "Slack disabled (channel: $SLACK_CHANNEL_ENABLED, plugin: $SLACK_PLUGIN_ENABLED)"
fi
echo ""

# CHECK 3: Custom Slack bridge NOT running
echo "3. Checking for duplicate Slack bridges..."
if pgrep -f "slack-bridge.js" > /dev/null; then
    BRIDGE_PID=$(pgrep -f "slack-bridge.js")
    check_warning "Custom slack-bridge.js still running (PID: $BRIDGE_PID)"
    echo "  → This can cause duplication and conflicts"

    if [ "$1" = "--fix" ]; then
        echo "  → Attempting auto-fix..."
        kill "$BRIDGE_PID" 2>/dev/null || true
        sleep 1
        if ! pgrep -f "slack-bridge.js" > /dev/null; then
            auto_fixed "Stopped custom slack-bridge.js"
        else
            echo "  → Failed to stop bridge, try: kill $BRIDGE_PID"
        fi
    else
        echo "  → Run with --fix to stop it"
    fi
else
    check_passed "No duplicate Slack bridges running"
fi
echo ""

# CHECK 4: Enforcement hook enabled
echo "4. Checking enforcement hook..."
if clawdbot hooks check 2>/dev/null | grep -q "research-protocol-enforcement.*enabled"; then
    check_passed "Enforcement hook active"
else
    check_warning "Enforcement hook not found or disabled"
    echo "  → Content verification may not be enforced"
fi
echo ""

# CHECK 5: BOOT.md exists
echo "5. Checking identity enforcement..."
if [ -f ~/clawd/BOOT.md ]; then
    check_passed "BOOT.md exists (identity enforcement)"
else
    check_warning "BOOT.md missing"
    echo "  → Identity confusion may occur"
fi
echo ""

# CHECK 6: Context retention settings
echo "6. Checking context retention..."
TTL=$(grep -A 5 '"contextPruning"' ~/.clawdbot/clawdbot.json | grep '"ttl"' | grep -o '"[^"]*"' | tail -1 | tr -d '"')
if [ "$TTL" = "2h" ] || [ "$TTL" = "1h" ]; then
    check_passed "Context TTL: $TTL (good)"
else
    check_warning "Context TTL: $TTL (may be too short)"
    echo "  → Recommended: 2h for stable conversations"
fi
echo ""

# CHECK 7: Recent activity
echo "7. Checking recent activity..."
if [ -f /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log ]; then
    RECENT_ACTIVITY=$(tail -50 /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log | grep -c "sessionId=slack" || echo "0")
    if [ "$RECENT_ACTIVITY" -gt 0 ]; then
        check_passed "Recent Slack activity detected ($RECENT_ACTIVITY events)"
    else
        check_warning "No recent Slack activity in logs"
        echo "  → Jett may not be receiving messages"
    fi
else
    check_warning "Log file not found for today"
fi
echo ""

# CHECK 8: Memory flush disabled
echo "8. Checking memory flush setting..."
MEMORY_FLUSH=$(grep -A 10 '"compaction"' ~/.clawdbot/clawdbot.json | grep -A 3 '"memoryFlush"' | grep '"enabled"' | grep -o 'true\|false')
if [ "$MEMORY_FLUSH" = "false" ]; then
    check_passed "Memory flush disabled (good)"
else
    check_warning "Memory flush enabled (may cause context loss)"
fi
echo ""

# SUMMARY
echo "═══════════════════════════════════════════"
echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "Jett's system is healthy"
else
    echo -e "${YELLOW}⚠️  FOUND $ISSUES_FOUND ISSUE(S)${NC}"
    if [ $AUTO_FIXED -gt 0 ]; then
        echo -e "${GREEN}🔧 Auto-fixed $AUTO_FIXED issue(s)${NC}"
    fi
    if [ "$1" != "--fix" ]; then
        echo ""
        echo "Run with --fix to attempt automatic repairs:"
        echo "  bash $0 --fix"
    fi
fi
echo ""

# Exit with number of issues found
exit $ISSUES_FOUND
