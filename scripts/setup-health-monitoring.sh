#!/bin/bash
#
# Setup Jett Health Monitoring
#
# Installs cron job to check Jett's health every 15 minutes
# Auto-fixes common issues like disabled Slack plugin
#

set -e

echo "🏥 Setting Up Jett Health Monitoring"
echo "════════════════════════════════════════════"
echo ""

# Check if cron is running
if ! pgrep -x cron > /dev/null; then
    echo "⚠️  Cron service not running"
    echo "   Starting cron..."
    sudo service cron start || echo "   Note: May need to start cron manually"
fi

HEALTH_SCRIPT="$HOME/clawd/scripts/jett-health-monitor.sh"

if [ ! -f "$HEALTH_SCRIPT" ]; then
    echo "❌ Health monitor script not found: $HEALTH_SCRIPT"
    exit 1
fi

echo "📋 Checking existing crontab..."
EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

if echo "$EXISTING_CRON" | grep -q "jett-health-monitor.sh"; then
    echo "⚠️  Health monitoring cron job already exists"
    echo ""
    echo "Existing entry:"
    echo "$EXISTING_CRON" | grep "jett-health-monitor.sh"
    echo ""
    read -p "Replace existing cron job? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing entry
    EXISTING_CRON=$(echo "$EXISTING_CRON" | grep -v "jett-health-monitor.sh")
fi

# Add new cron job (runs every 15 minutes with auto-fix)
CRON_ENTRY="*/15 * * * * $HEALTH_SCRIPT --fix >> $HOME/clawd/memory/health-monitor.log 2>&1"

echo "📅 Installing cron job..."
echo "   Schedule: Every 15 minutes"
echo "   Command: $HEALTH_SCRIPT --fix"
echo "   Log: ~/clawd/memory/health-monitor.log"
echo ""

# Install cron job
(echo "$EXISTING_CRON"; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job installed successfully!"
echo ""

# Show current crontab
echo "📋 Current crontab:"
crontab -l | tail -5
echo ""

# Create initial log file
mkdir -p "$HOME/clawd/memory"
touch "$HOME/clawd/memory/health-monitor.log"

# Run initial health check
echo "🧪 Running initial health check..."
echo ""
bash "$HEALTH_SCRIPT" --fix
HEALTH_STATUS=$?
echo ""

if [ $HEALTH_STATUS -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ HEALTH MONITORING SETUP COMPLETE"
    echo ""
    echo "📅 Checks will run: Every 15 minutes"
    echo "🔧 Auto-fix enabled: Yes"
    echo "📝 Logs saved to: ~/clawd/memory/health-monitor.log"
    echo ""
    echo "🏥 System Status: Healthy"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  HEALTH MONITORING SETUP COMPLETE"
    echo ""
    echo "📅 Checks will run: Every 15 minutes"
    echo "🔧 Auto-fix enabled: Yes"
    echo "📝 Logs saved to: ~/clawd/memory/health-monitor.log"
    echo ""
    echo "⚠️  System Status: Issues detected (see above)"
    echo "   Monitor will attempt auto-fix every 15 minutes"
fi
echo ""

echo "📋 Manual Commands:"
echo "   Check health: bash $HEALTH_SCRIPT"
echo "   Auto-fix: bash $HEALTH_SCRIPT --fix"
echo "   View logs: tail -50 ~/clawd/memory/health-monitor.log"
echo "   View cron: crontab -l"
echo ""
