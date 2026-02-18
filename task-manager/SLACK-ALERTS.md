# Slack Alerts Configuration

For health check alerts to be sent to Slack, you need to configure a webhook.

## Option 1: Webhook URL

Create a Slack Incoming Webhook:
1. Go to: https://api.slack.com/messaging/webhooks
2. Select or create a workspace
3. Select the channel (e.g., #alerts)
4. Copy the webhook URL

Save it:
```bash
echo "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" > ~/.slack/alerts_webhook
```

## Option 2: Use Existing Bot Token

The system can use the existing clawdbot Slack bot via `SLACK_BOT_TOKEN`.

## Environment Variables

Set either:
- `SLACK_WEBHOOK_URL` - For webhook-based alerts
- `SLACK_ALERTS_WEBHOOK` - Alternative webhook location

## Test Alerts

```bash
cd /home/clawd/clawd/task-manager
node system-health-check.js
```

This will run a health check and send alerts to Slack if configured.

## Cron Schedule

Health checks run every 6 hours via cron:
- 12 AM, 6 AM, 12 PM, 6 PM

Check cron:
```bash
crontab -l | grep health
```
