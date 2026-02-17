# Slack with Jett - Quick Start Guide

## ✅ You're All Set!

Slack is now your PRIMARY communication channel with Jett. The bridge is running and monitoring your workspace.

## How to Talk to Jett

### In Direct Messages
Just send Jett a DM - he'll respond within seconds.

### In Channels
1. Make sure Jett is invited to the channel
2. Either mention him (`@Jett`) or just chat normally - he monitors all messages
3. Currently monitoring: **#all-terrysworld**

## Commands

**Check bridge status:**
```bash
ps aux | grep slack-bridge | grep -v grep
```

**View logs:**
```bash
tail -f ~/clawd/slack-bridge.log
```

**Restart bridge:**
```bash
cd ~/clawd
./stop-slack-bridge.sh && ./start-slack-bridge.sh
```

## Adding Jett to New Channels (AUTO-DISCOVERY)

1. In Slack, go to the channel
2. Click channel name → Integrations → Add apps
3. Add "Jett"
4. **Done!** The bridge automatically detects new channels within 5 minutes
5. No restart or manual configuration needed

## Channels

- **Primary:** Slack (real-time, DMs + channels)
- **Backup:** Telegram (@JettAssistant_bot)
- **Disabled:** WhatsApp

## Tips

- Jett responds to all your messages (not just @mentions)
- Response time: ~3-5 seconds
- Bridge runs 24/7 in the background
- Logs are kept at `~/clawd/slack-bridge.log`

## Troubleshooting

**Bridge not responding?**
```bash
cd ~/clawd
./stop-slack-bridge.sh
./start-slack-bridge.sh
tail -f slack-bridge.log
```

**Can't see Jett's responses?**
- Check if Jett is in the channel
- Look at the logs for errors
- Verify the bridge is running

---

**Need help?** Check `SLACK-SETUP.md` for full documentation.
