#!/bin/bash
# Complete Shutdown Script for Clawdbot System

echo "🛑 Shutting down all components..."
echo ""

# 1. Stop clawdbot gateway
echo "1. Stopping clawdbot gateway..."
clawdbot gateway stop 2>/dev/null || echo "  (gateway not running via service)"
pkill -9 clawdbot-gateway 2>/dev/null && echo "  ✓ Killed clawdbot-gateway processes"
sleep 1

# 2. Stop clawdbot main process
echo "2. Stopping clawdbot..."
pkill -9 clawdbot 2>/dev/null && echo "  ✓ Killed clawdbot processes"
sleep 1

# 3. Stop Slack bridge
echo "3. Stopping Slack bridge..."
if [ -f ~/clawd/slack-bridge.pid ]; then
  kill $(cat ~/clawd/slack-bridge.pid) 2>/dev/null && echo "  ✓ Stopped slack-bridge"
  rm ~/clawd/slack-bridge.pid
fi
pkill -9 -f "slack-bridge.js" 2>/dev/null && echo "  ✓ Killed slack-bridge processes"
sleep 1

# 4. Stop Claude Code
echo "4. Stopping Claude Code..."
if [ -f ~/clawd/claude-code.pid ]; then
  kill $(cat ~/clawd/claude-code.pid) 2>/dev/null && echo "  ✓ Stopped Claude"
  rm ~/clawd/claude-code.pid
fi
pkill -9 claude 2>/dev/null && echo "  ✓ Killed Claude processes"
sleep 1

# 5. Stop Ollama (optional - keeps it for other uses)
echo "5. Ollama status (not stopping - runs independently)..."
ps aux | grep ollama | grep -v grep | awk '{print "  - PID " $2 ": ollama"}'

echo ""
echo "✅ Shutdown complete!"
echo ""
echo "Verify nothing is running:"
ps aux | grep -E "(claude|clawdbot|slack-bridge)" | grep -v grep | grep -v shutdown

if [ $? -eq 0 ]; then
  echo ""
  echo "⚠️  Some processes still running (shown above)"
else
  echo "✓ All processes stopped"
fi
