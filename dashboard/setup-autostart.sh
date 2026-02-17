#!/bin/bash
# Alternative setup: Use cron to start dashboard on reboot
# This works better than systemd in some WSL2 environments

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Setting up dashboard to start automatically..."

# Check if entry already exists
if crontab -l 2>/dev/null | grep -q "start-dashboard.sh"; then
    echo "⚠️  Autostart already configured in crontab"
    exit 0
fi

# Add cron job
(crontab -l 2>/dev/null; echo "@reboot sleep 10 && $SCRIPT_DIR/start-dashboard.sh") | crontab -

echo ""
echo "✅ Dashboard will now start automatically on reboot!"
echo ""
echo "📋 To remove autostart:"
echo "   crontab -e"
echo "   (Then delete the line with 'start-dashboard.sh')"
echo ""
echo "📍 Dashboard URL: http://localhost:8000"
echo "🔄 To start now: $SCRIPT_DIR/start-dashboard.sh"
