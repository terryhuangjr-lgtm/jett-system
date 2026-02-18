#!/bin/bash
#
# Jett Task Orchestrator
#
# Runs daily tasks with automatic error reporting to Slack
# Tasks: Sports research, Bitcoin research, eBay scans
# Notifies you when done or if something goes wrong
#

set -e

TASK_NAME="$1"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"  # Set via environment or will use clawdbot

# Slack notification function
notify_slack() {
    local status="$1"
    local task="$2"
    local message="$3"
    local details="$4"

    local emoji
    case "$status" in
        success) emoji="✅" ;;
        error) emoji="❌" ;;
        warning) emoji="⚠️" ;;
        info) emoji="ℹ️" ;;
    esac

    local slack_message="$emoji *$task*\n$message"
    if [ -n "$details" ]; then
        slack_message="$slack_message\n\`\`\`$details\`\`\`"
    fi

    # Send to Slack via clawdbot (DM to Terry)
    echo "$slack_message" | clawdbot send slack:dm:U0ABTP704QK 2>&1 || {
        echo "Failed to send Slack notification"
    }
}

# Error handler
error_handler() {
    local exit_code=$?
    local line_number=$1

    notify_slack "error" "$TASK_NAME" \
        "Task failed at line $line_number (exit code: $exit_code)" \
        "Check logs: ~/clawd/memory/task-logs/$TASK_NAME-$(date +%Y%m%d).log"

    exit $exit_code
}

trap 'error_handler $LINENO' ERR

# Create log directory
mkdir -p ~/clawd/memory/task-logs

# Log file for this task
LOG_FILE=~/clawd/memory/task-logs/$TASK_NAME-$(date +%Y%m%d-%H%M%S).log

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "🤖 Jett Task: $TASK_NAME" | tee -a "$LOG_FILE"
echo "   Started: $(date)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Run task based on name
case "$TASK_NAME" in
    "21m-sports-research")
        echo "📊 Running 21M Sports Research..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation
        node 21m-sports-auto-research.js >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Sports Research" \
                "Fresh contract research complete! Ready for review." \
                "Location: ~/clawd/memory/21m-sports-verified-research.json"
        fi
        ;;

    "21m-bitcoin-research")
        echo "₿ Running 21M Bitcoin LIVE Research..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation
        node 21m-bitcoin-live-researcher.js >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Bitcoin Research" \
                "Live Bitcoin research complete! Found compelling content via web search." \
                "Quotes, wisdom, adoption news saved to knowledge database."
        fi
        ;;

    "21m-sports-content")
        echo "✍️ Generating 21M Sports Content..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation
        node 21m-claude-generator.js --type sports --output ~/clawd/memory/21m-sports-verified-content.json >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Sports Content" \
                "Content generated! Ready for deployment." \
                "Location: ~/clawd/memory/21m-sports-verified-content.json"
        fi
        ;;

    "21m-sports-deploy")
        echo "📨 Deploying 21M Sports tweets to Slack..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation

        # Deploy to #21msports channel for review
        node deploy-21m-tweet.js \
            ~/clawd/memory/21m-sports-verified-content.json \
            ~/clawd/memory/21m-sports-verified-content-slot2.json >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Sports Deployment" \
                "3 tweet options posted to #21msports! Ready for review and Twitter posting." \
                "Choose your favorite and post to @21MBitcoin"
        fi
        ;;

    "21m-bitcoin-content")
        echo "✍️ Generating 21M Bitcoin Content..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation
        node 21m-claude-generator.js --type bitcoin --output ~/clawd/memory/21m-bitcoin-verified-content.json >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Bitcoin Content" \
                "Bitcoin content generated! Ready for deployment." \
                "Location: ~/clawd/memory/21m-bitcoin-verified-content.json"
        fi
        ;;

    "21m-bitcoin-deploy")
        echo "📨 Deploying 21M Bitcoin tweets to Slack..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation

        # Deploy to #21msports channel for review
        node deploy-21m-tweet.js \
            ~/clawd/memory/21m-bitcoin-verified-content.json >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "21M Bitcoin Deployment" \
                "3 tweet options posted to #21msports! Ready for review and Twitter posting." \
                "Choose your favorite and post to @21MBitcoin"
        fi
        ;;

    "ebay-scan")
        echo "🔍 Running eBay Scan..." | tee -a "$LOG_FILE"
        cd ~/clawd/automation
        node deploy-ebay-scans.js >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            notify_slack "success" "eBay Scan" \
                "Today's eBay scan complete! Results posted to #levelupcards" \
                "Check Slack for details"
        fi
        ;;

    "health-check")
        echo "🏥 Running Health Check..." | tee -a "$LOG_FILE"
        bash ~/clawd/scripts/jett-health-monitor.sh --fix >> "$LOG_FILE" 2>&1

        # Only notify if issues were found
        if [ $? -ne 0 ]; then
            notify_slack "warning" "Health Check" \
                "System health issues detected and auto-fixed" \
                "Check: ~/clawd/memory/health-monitor.log"
        fi
        ;;

    *)
        echo "❌ Unknown task: $TASK_NAME" | tee -a "$LOG_FILE"
        notify_slack "error" "Task Orchestrator" \
            "Unknown task requested: $TASK_NAME" \
            "Valid tasks: 21m-sports-research, 21m-bitcoin-research, 21m-sports-content, 21m-bitcoin-content, ebay-scan"
        exit 1
        ;;
esac

echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "✅ Task Complete: $TASK_NAME" | tee -a "$LOG_FILE"
echo "   Finished: $(date)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

exit 0
