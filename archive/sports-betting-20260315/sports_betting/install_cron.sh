#!/bin/bash
# Install cron jobs for two-stage betting analysis

echo "Installing cron jobs for Sports Betting System..."
echo ""

# Backup existing crontab
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null
echo "✅ Backed up existing crontab"

# Remove any old betting system entries
crontab -l 2>/dev/null | grep -v "sports_betting/orchestrator.py" | crontab -
echo "✅ Removed old entries"

# Add new two-stage entries
(crontab -l 2>/dev/null; echo "# Sports Betting System - Scout Mode (1 AM)") | crontab -
(crontab -l 2>/dev/null; echo "0 1 * * * cd /home/clawd/clawd/sports_betting && /usr/bin/python3 orchestrator.py --mode scout >> /home/clawd/clawd/logs/betting_scout.log 2>&1") | crontab -

(crontab -l 2>/dev/null; echo "") | crontab -
(crontab -l 2>/dev/null; echo "# Sports Betting System - Final Mode (4 PM)") | crontab -
(crontab -l 2>/dev/null; echo "0 16 * * * cd /home/clawd/clawd/sports_betting && /usr/bin/python3 orchestrator.py --mode final >> /home/clawd/clawd/logs/betting_final.log 2>&1") | crontab -

echo "✅ Installed new cron jobs"
echo ""
echo "Cron jobs installed:"
echo "  • Scout Mode: 1:00 AM daily"
echo "  • Final Mode: 4:00 PM daily"
echo ""
echo "View with: crontab -l"
echo "Edit with: crontab -e"
echo ""
echo "Logs will be in:"
echo "  ~/clawd/logs/betting_scout.log"
echo "  ~/clawd/logs/betting_final.log"
