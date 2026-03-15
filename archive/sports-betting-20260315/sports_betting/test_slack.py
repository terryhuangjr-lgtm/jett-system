#!/usr/bin/env python3
"""
Test Slack integration
"""

from notifiers.slack_notifier import SlackNotifier
import config

print("Testing Slack integration...\n")

# Check if webhook URL is configured
if config.SLACK_WEBHOOK_URL == 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL':
    print("❌ Slack webhook not configured yet!")
    print("\nTo set up Slack:")
    print("1. Go to: https://api.slack.com/messaging/webhooks")
    print("2. Create a new webhook for your workspace")
    print("3. Choose #sportsbetting channel")
    print("4. Copy the webhook URL")
    print("5. Edit ~/clawd/sports_betting/config.py")
    print("6. Replace SLACK_WEBHOOK_URL with your webhook")
    print("\nSee SLACK_SETUP.md for detailed instructions.")
    print("\nThen run this test again.")
    exit(1)

# Create notifier
notifier = SlackNotifier(config.SLACK_WEBHOOK_URL)

# Send test message
print("Sending test message to Slack...")
success = notifier.send_test_message()

if success:
    print("\n✅ SUCCESS! Check #sportsbetting channel for the test message.")
    print("\nIf you see the message in #sportsbetting, integration is working!")
    print("\nAll analysis, picks, and results will now post to #sportsbetting automatically!")
else:
    print("\n❌ FAILED to send message.")
    print("\nTroubleshooting:")
    print("1. Check webhook URL in config.py")
    print("2. Make sure URL starts with https://hooks.slack.com/")
    print("3. Verify webhook is active in Slack settings")
