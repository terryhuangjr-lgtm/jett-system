#!/bin/bash
# Run health check and post to Slack

OUTPUT=$(node /home/clawd/clawd/automation/system-health-check.js 2>&1)

# Post to Slack via ClawdBot message tool or webhook
# For now, save to file that can be checked
echo "$OUTPUT" > /tmp/health-check-latest.txt
echo "Health check saved to /tmp/health-check-latest.txt"
