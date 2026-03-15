#!/bin/bash
echo "=== Sports Betting Slack Setup ==="
echo ""
echo "1. Go to: https://api.slack.com/apps"
echo "2. Find your existing Slack app (or create new one)"
echo "3. Click 'Incoming Webhooks' in left sidebar"
echo "4. Click 'Add New Webhook to Workspace'"
echo "5. Select #sportsbetting channel"
echo "6. Copy the webhook URL"
echo ""
echo "Then run:"
echo "  nano ~/clawd/sports_betting/config.py"
echo ""
echo "And paste your webhook URL on line 11."
echo ""
read -p "Or paste webhook URL now and I'll update it for you: " WEBHOOK

if [ ! -z "$WEBHOOK" ]; then
  sed -i "s|SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'|SLACK_WEBHOOK_URL = '$WEBHOOK'|" ~/clawd/sports_betting/config.py
  echo "✅ Updated! Testing..."
  cd ~/clawd/sports_betting && python3 test_slack.py
else
  echo "No webhook provided. Update manually when ready."
fi
