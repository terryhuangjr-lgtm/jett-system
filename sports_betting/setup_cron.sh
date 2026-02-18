#!/bin/bash
# Automated setup for nightly betting analysis cron job

echo "======================================"
echo "Sports Betting System - Cron Setup"
echo "======================================"
echo ""

# Check if logs directory exists
if [ ! -d ~/clawd/sports_betting/logs ]; then
    mkdir -p ~/clawd/sports_betting/logs
    echo "✅ Created logs directory"
fi

# Backup existing crontab
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null
echo "✅ Backed up existing crontab"

# Check if entry already exists
if crontab -l 2>/dev/null | grep -q "sports_betting/orchestrator.py"; then
    echo ""
    echo "⚠️  Cron job already exists!"
    echo ""
    echo "Current entry:"
    crontab -l | grep sports_betting
    echo ""
    read -p "Replace with new entry? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. No changes made."
        exit 0
    fi

    # Remove old entry
    crontab -l | grep -v "sports_betting/orchestrator.py" | crontab -
    echo "✅ Removed old entry"
fi

# Ask for schedule
echo ""
echo "When should the analysis run?"
echo "1) 6:00 PM (evening analysis for next day)"
echo "2) 6:00 AM (morning delivery)"
echo "3) Custom time"
echo ""
read -p "Select (1-3): " choice

case $choice in
    1)
        CRON_TIME="0 18 * * *"
        TIME_DESC="6:00 PM"
        ;;
    2)
        CRON_TIME="0 6 * * *"
        TIME_DESC="6:00 AM"
        ;;
    3)
        read -p "Enter hour (0-23): " hour
        read -p "Enter minute (0-59): " minute
        CRON_TIME="$minute $hour * * *"
        TIME_DESC="$hour:$(printf '%02d' $minute)"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create cron entry
CRON_CMD="cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/nightly_\$(date +\\%Y\\%m\\%d).log 2>&1"
CRON_ENTRY="$CRON_TIME $CRON_CMD"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo ""
echo "✅ Cron job installed!"
echo ""
echo "Schedule: Daily at $TIME_DESC"
echo "Command:  $CRON_CMD"
echo ""
echo "Logs will be saved to: ~/clawd/sports_betting/logs/"
echo ""

# Show current crontab
echo "Current crontab:"
crontab -l | grep sports_betting

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next run: $TIME_DESC tomorrow"
echo ""
echo "To test immediately:"
echo "  cd ~/clawd/sports_betting"
echo "  python3 orchestrator.py"
echo ""
echo "To view logs:"
echo "  tail -f ~/clawd/sports_betting/logs/nightly_\$(date +%Y%m%d).log"
echo ""
echo "To remove cron job:"
echo "  crontab -e"
echo "  (Delete the sports_betting line)"
echo ""
