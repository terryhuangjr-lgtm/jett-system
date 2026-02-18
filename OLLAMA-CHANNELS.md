# Ollama Channel Routing

## Current Setup

### Always Claude (Conversation Context)
- **DMs with Terry** - Maintains full conversation history
- **Channels with context keywords** - "our database", "my task", etc.

### Always Ollama (Simple Tasks, Cost Savings)
- **#daily-tasks** (`C0AD0PZ30MN`) - Task lists, reminders, simple queries

### Smart Routing (Analyze Complexity)
- **All other channels** - Routes to Ollama for simple questions, Claude for complex tasks

## Ollama Usage Stats

Run this to see Ollama usage:
```bash
bash ~/check-ollama-usage.sh
```

## Add More Ollama-Only Channels

1. Find the channel ID in Slack (right-click channel → Copy Link → ID is at the end)
2. Edit `/home/clawd/clawd/slack-bridge.js`
3. Add to `OLLAMA_ONLY_CHANNELS` array (around line 274):
   ```javascript
   const OLLAMA_ONLY_CHANNELS = [
     'C0AD0PZ30MN',  // daily-tasks
     'C0XXXXXXXX',   // your-new-channel
   ];
   ```
4. Restart bridge: `pkill -f slack-bridge && nohup node slack-bridge.js >> slack-bridge.log 2>&1 &`

## Good Candidates for Ollama Channels

- Quick lookups
- Simple calculations
- Task lists / reminders
- Basic summaries
- Standalone questions (no conversation context needed)

## Bad Candidates for Ollama Channels

- Complex analysis
- Code generation
- Long-form content writing
- Conversations requiring memory of previous messages
