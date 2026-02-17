# Slack Integration Setup Guide - #sportsbetting Channel

## Overview
All sports betting analysis, picks, results, and performance updates will now post to **#sportsbetting** channel automatically!

## Step 1: Create Webhook for #sportsbetting

1. **Go to Slack API:**
   - Visit: https://api.slack.com/messaging/webhooks
   - Click "Create your Slack app" (or use existing app)

2. **Create App (if new):**
   - Choose "From scratch"
   - App Name: "Sports Betting System"
   - Choose your workspace
   - Click "Create App"

3. **Enable Webhooks:**
   - In the left sidebar, click "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to **ON**

4. **Add Webhook to #sportsbetting Channel:**
   - Scroll down and click "Add New Webhook to Workspace"
   - Choose channel: **#sportsbetting** (you created this!)
   - Click "Allow"

5. **Copy Webhook URL:**
   - You'll see a webhook URL like:
     ```
     https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
     ```
   - Copy this URL

## Step 2: Configure System

1. **Edit config file:**
   ```bash
   nano ~/clawd/sports_betting/config.py
   ```

2. **Update SLACK_WEBHOOK_URL:**
   Replace this line:
   ```python
   SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
   ```

   With your actual webhook URL:
   ```python
   SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
   ```

3. **Save and exit** (Ctrl+X, Y, Enter)

## Step 3: Test Integration

```bash
cd ~/clawd/sports_betting
python3 test_slack.py
```

Expected output:
```
Testing Slack integration...
Sending test message to Slack...
✅ Sent to Slack successfully

✅ SUCCESS! Check your Slack channel for the test message.
```

## Step 4: Run Full System

```bash
cd ~/clawd/sports_betting
python3 orchestrator.py
```

The system will:
1. Analyze games
2. Generate recommendations
3. Send beautiful report to Slack
4. Display in console too

## Message Features

Your Slack messages will include:

- 🏀 **Header:** Daily Betting Analysis
- 📅 **Stats:** Season record and recent form
- 🌟 **Daily Pick:** Top recommendation
- 🎯 **Bet Details:** Selection, confidence, expected value
- ✅ **Reasoning:** Why this bet makes sense
- ⚠️ **Concerns:** Things to watch out for
- 📋 **Alternatives:** Other good bets
- 💡 **Footer:** Reminders and disclaimers

## Scheduling (Optional)

To receive reports automatically each morning:

```bash
crontab -e
```

Add this line to run at 6 AM daily:
```
0 6 * * * cd ~/clawd/sports_betting && python3 orchestrator.py >> logs/daily.log 2>&1
```

## Troubleshooting

### "Failed to send to Slack"
- Check webhook URL is correct
- Verify URL starts with `https://hooks.slack.com/`
- Make sure webhook is still active in Slack app settings

### "Invalid token"
- Webhook may have been revoked
- Create a new webhook and update config.py

### "Channel not found"
- Make sure #sportsbetting channel exists in your Slack workspace
- Verify webhook is configured for #sportsbetting (not #general or another channel)
- If needed, create new webhook targeting #sportsbetting

### Test webhook manually:
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test"}' \
YOUR_WEBHOOK_URL
```

## Security Note

⚠️ Keep your webhook URL secret! Anyone with the URL can post to your Slack channel.

- Don't commit config.py to public repos
- Add to .gitignore
- Regenerate webhook if exposed

## Mobile Access

Slack messages are:
- ✅ Mobile-friendly
- ✅ Support rich formatting
- ✅ Can be read on the go
- ✅ Notification-ready

Perfect for checking bets from anywhere!
