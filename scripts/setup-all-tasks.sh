#!/bin/bash
#
# Setup All Jett Tasks
#
# Installs comprehensive task schedule with automatic Slack notifications
# Tasks: Research, Content Generation, eBay Scans, Health Monitoring
#

set -e

echo "🤖 Setting Up All Jett Tasks"
echo "════════════════════════════════════════════"
echo ""

# Check if cron is running
if ! pgrep -x cron > /dev/null; then
    echo "⚠️  Cron service not running"
    echo "   Starting cron..."
    sudo service cron start || echo "   Note: May need to start cron manually"
    echo ""
fi

ORCHESTRATOR="$HOME/clawd/scripts/task-orchestrator.sh"

if [ ! -f "$ORCHESTRATOR" ]; then
    echo "❌ Task orchestrator not found: $ORCHESTRATOR"
    exit 1
fi

echo "📋 Proposed Task Schedule:"
echo ""
echo "┌─────────────┬──────────────────────────────────────────┐"
echo "│ Time        │ Task                                     │"
echo "├─────────────┼──────────────────────────────────────────┤"
echo "│ 2:00 AM     │ 21M Sports Research (breaking news)      │"
echo "│ 2:30 AM     │ 21M Bitcoin Research (curated knowledge) │"
echo "│ 3:00 AM     │ 21M Sports Content Generation            │"
echo "│ 3:30 AM     │ 21M Bitcoin Content Generation           │"
echo "│ 8:00 AM     │ eBay Daily Scan (different each day)     │"
echo "│ Every 15min │ Health Monitor (auto-fix issues)         │"
echo "└─────────────┴──────────────────────────────────────────┘"
echo ""
echo "All tasks notify you in Slack when complete or if errors occur"
echo ""

read -p "Install this schedule? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "📅 Installing cron jobs..."

# Get existing crontab (or empty if none)
EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

# Remove any old task orchestrator entries
CLEAN_CRON=$(echo "$EXISTING_CRON" | grep -v "task-orchestrator.sh" || echo "")

# Build new cron jobs
NEW_CRON="# Jett Task Schedule - Auto-generated $(date +%Y-%m-%d)

# Research Tasks (Night)
0 2 * * * $ORCHESTRATOR 21m-sports-research
30 2 * * * $ORCHESTRATOR 21m-bitcoin-research

# Content Generation (Early Morning)
0 3 * * * $ORCHESTRATOR 21m-sports-content
30 3 * * * $ORCHESTRATOR 21m-bitcoin-content

# eBay Scan (Morning)
0 8 * * * $ORCHESTRATOR ebay-scan

# Health Monitoring (Every 15 minutes)
*/15 * * * * $HOME/clawd/scripts/jett-health-monitor.sh --fix >> $HOME/clawd/memory/health-monitor.log 2>&1
"

# Combine and install
FINAL_CRON=$(echo "$CLEAN_CRON"; echo ""; echo "$NEW_CRON")
echo "$FINAL_CRON" | crontab -

echo "✅ Cron jobs installed successfully!"
echo ""

echo "📋 Installed Schedule:"
crontab -l | grep -A 20 "Jett Task Schedule"
echo ""

# Create log directories
mkdir -p "$HOME/clawd/memory/task-logs"
mkdir -p "$HOME/clawd/memory/research-logs"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL TASKS SETUP COMPLETE"
echo ""
echo "📅 Scheduled Tasks:"
echo "   • 2:00 AM - Sports Research (breaking news priority)"
echo "   • 2:30 AM - Bitcoin Research (curated knowledge)"
echo "   • 3:00 AM - Sports Content (auto-generated)"
echo "   • 3:30 AM - Bitcoin Content (auto-generated)"
echo "   • 8:00 AM - eBay Scan (daily rotation)"
echo "   • Every 15min - Health Monitor (auto-fix)"
echo ""
echo "📱 Slack Notifications:"
echo "   • ✅ Success: Notified when tasks complete"
echo "   • ❌ Errors: Notified immediately with details"
echo "   • ⚠️ Warnings: Notified if issues detected"
echo ""
echo "📂 Logs Saved To:"
echo "   • Task logs: ~/clawd/memory/task-logs/"
echo "   • Research logs: ~/clawd/memory/research-logs/"
echo "   • Health logs: ~/clawd/memory/health-monitor.log"
echo ""
echo "🧪 Test Tasks Manually:"
echo "   bash $ORCHESTRATOR 21m-sports-research"
echo "   bash $ORCHESTRATOR 21m-bitcoin-research"
echo "   bash $ORCHESTRATOR 21m-sports-content"
echo "   bash $ORCHESTRATOR 21m-bitcoin-content"
echo "   bash $ORCHESTRATOR ebay-scan"
echo ""
echo "📋 View Schedule:"
echo "   crontab -l"
echo ""
echo "📊 Check Logs:"
echo "   ls -lt ~/clawd/memory/task-logs/ | head"
echo "   tail -50 ~/clawd/memory/task-logs/[task-name]-*.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Your morning routine:"
echo "   1. Wake up"
echo "   2. Check Slack DM from Jett"
echo "   3. Review completed research/content"
echo "   4. Approve or adjust as needed"
echo ""
echo "If anything goes wrong, Jett will tell you!"
echo ""
