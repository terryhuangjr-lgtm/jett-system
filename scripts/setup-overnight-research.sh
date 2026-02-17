#!/bin/bash
#
# Setup Overnight 21M Sports Research
#
# Installs cron job to run automated research at 2 AM daily
# Results saved to ~/clawd/memory/21m-sports-verified-research.json
#

set -e

echo "🌙 Setting Up Overnight 21M Sports Research"
echo "════════════════════════════════════════════"
echo ""

# Check if cron is running
if ! pgrep -x cron > /dev/null; then
    echo "⚠️  Cron service not running"
    echo "   Starting cron..."
    sudo service cron start || echo "   Note: May need to start cron manually"
fi

# Create research wrapper script
WRAPPER_SCRIPT="$HOME/clawd/scripts/overnight-research-runner.sh"
echo "📝 Creating wrapper script: $WRAPPER_SCRIPT"

cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
#
# Overnight Research Runner
# Executes automated 21M Sports research and logs results
#

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$HOME/clawd/memory/research-logs/overnight-$TIMESTAMP.log"

mkdir -p "$HOME/clawd/memory/research-logs"

echo "🌙 Starting overnight research at $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

cd "$HOME/clawd/automation"

# Run automated research
node 21m-sports-auto-research.js >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "" >> "$LOG_FILE"
echo "✅ Research completed at $(date) with exit code: $EXIT_CODE" >> "$LOG_FILE"

# If successful, log to summary
if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date +%Y-%m-%d) - Success - Research saved" >> "$HOME/clawd/memory/research-logs/summary.log"
else
    echo "$(date +%Y-%m-%d) - Failed - Exit code $EXIT_CODE" >> "$HOME/clawd/memory/research-logs/summary.log"
fi

exit $EXIT_CODE
EOF

chmod +x "$WRAPPER_SCRIPT"
echo "✓ Wrapper script created"
echo ""

# Check existing crontab
echo "📋 Checking existing crontab..."
EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")

if echo "$EXISTING_CRON" | grep -q "overnight-research-runner.sh"; then
    echo "⚠️  Cron job already exists"
    echo ""
    echo "Existing entry:"
    echo "$EXISTING_CRON" | grep "overnight-research-runner.sh"
    echo ""
    read -p "Replace existing cron job? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing entry
    EXISTING_CRON=$(echo "$EXISTING_CRON" | grep -v "overnight-research-runner.sh")
fi

# Add new cron job (runs at 2 AM daily)
CRON_ENTRY="0 2 * * * $WRAPPER_SCRIPT"

echo "📅 Installing cron job..."
echo "   Schedule: Daily at 2:00 AM"
echo "   Command: $WRAPPER_SCRIPT"
echo ""

# Install cron job
(echo "$EXISTING_CRON"; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job installed successfully!"
echo ""

# Show current crontab
echo "📋 Current crontab:"
crontab -l | tail -5
echo ""

# Create log directory
mkdir -p "$HOME/clawd/memory/research-logs"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ OVERNIGHT RESEARCH SETUP COMPLETE"
echo ""
echo "📅 Research will run: Daily at 2:00 AM"
echo "📂 Results saved to: ~/clawd/memory/21m-sports-verified-research.json"
echo "📝 Logs saved to: ~/clawd/memory/research-logs/"
echo ""
echo "🧪 Test manually with:"
echo "   bash $WRAPPER_SCRIPT"
echo ""
echo "📋 View cron jobs:"
echo "   crontab -l"
echo ""
echo "🗑️  Remove cron job:"
echo "   crontab -e  # Then delete the line"
echo ""
