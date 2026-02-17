# Slack Integration - Complete Setup

## Status: ✅ ACTIVE & MONITORING

The Slack bridge is running and Jett is actively monitoring your workspace for messages.

## Configuration Complete ✅

**Workspace:** Your Slack workspace
**Team ID:** T0ABY3NMR2A
**Bot Name:** Clawdbot
**Status:** Connected

## MCP Server Details

- **Type:** stdio
- **Package:** @modelcontextprotocol/server-slack
- **Command:** npx -y @modelcontextprotocol/server-slack
- **Config Location:** ~/.claude.json

## Bot Permissions

Your bot has the following scopes:
- `chat:write` - Send messages
- `channels:history` - Read channel messages
- `channels:read` - View channels
- `groups:history` - Read private channel messages
- `groups:read` - View private channels
- `im:history` - Read direct messages
- `im:read` - View DMs
- `im:write` - Send DMs
- `users:read` - View user info
- `reactions:write` - Add reactions

## How to Use

The Slack MCP server provides tools to interact with your Slack workspace. In Claude Code, you can now:

1. **List channels** - See all channels in your workspace
2. **Read messages** - Get message history from channels
3. **Send messages** - Post messages to channels or DMs
4. **Add reactions** - React to messages with emojis
5. **Get user info** - Look up user details

## Testing the Connection

To test if Clawdbot can interact with Slack, you can ask Claude to:
- "List my Slack channels"
- "Send a test message to #general"
- "Read the latest messages from #general"

## Maintenance

**Check server status:**
```bash
claude mcp list
```

**Get server details:**
```bash
claude mcp get slack
```

**Restart server (if needed):**
```bash
claude mcp remove slack
claude mcp add --transport stdio slack -- npx -y @modelcontextprotocol/server-slack
# Then manually add credentials back to ~/.claude.json
```

## Security Notes

- Bot token is stored in ~/.claude.json
- Keep this file secure and never commit it to git
- Token can be rotated at https://api.slack.com/apps if compromised

## Slack Bridge Service - AUTO-DISCOVERY ENABLED ✨

The Slack bridge runs continuously in the background with **automatic channel discovery**:
- **Monitors ALL channels** where Jett is a member
- **Automatically detects** new channels within 5 minutes
- **No manual configuration** needed when adding Jett to channels
- Currently monitoring: #21-m-sports, #level-up-batting-cage, #all-terrysworld, and DMs

**How it works:**
1. Polls Slack every 3 seconds for new messages
2. Automatically discovers channels where Jett is a member (refreshes every 5 min)
3. When you send a message, it forwards it to Jett through clawdbot
4. Jett processes your message and responds back in Slack (3-5 second response time)

**Managing the bridge:**

Start the bridge:
```bash
cd /home/clawd/clawd
./start-slack-bridge.sh
```

Stop the bridge:
```bash
cd /home/clawd/clawd
./stop-slack-bridge.sh
```

Check if running:
```bash
ps aux | grep slack-bridge | grep -v grep
```

View live logs:
```bash
tail -f /home/clawd/clawd/slack-bridge.log
```

**Adding Jett to more channels:**
1. In Slack: Channel → Integrations → Add apps → Add "Jett"
2. That's it! The bridge will automatically detect it within 5 minutes
3. No restart or configuration needed

**Auto-start on boot (optional):**
To make the bridge start automatically when your system boots, add this to your crontab:
```bash
@reboot /home/clawd/clawd/start-slack-bridge.sh
```

---

**Setup Date:** 2026-01-30
**Status:** Slack is now the PRIMARY communication channel
**Telegram:** Remains as backup channel
