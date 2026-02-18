#!/bin/bash
# Safe startup script - prevents duplicate processes
# Updated: Using clawdbot's native Slack plugin (slack-bridge.js DISABLED)

echo "🔧 Starting all services safely..."

# 1. Kill any existing instances first
echo "   Stopping existing processes..."
pkill -9 -f "clawdbot-gateway"
pkill -9 -f "slack-bridge.js"
pkill -9 -f "^clawdbot$"
sleep 2

# 2. Clean up PID files
rm -f ~/clawd/slack-bridge.pid
rm -f ~/.clawdbot/*.pid 2>/dev/null

# 3. Start clawdbot (includes native Slack plugin)
echo "   Starting clawdbot (with native Slack)..."
cd /home/clawd
nohup clawdbot > /tmp/clawdbot.log 2>&1 &
sleep 7  # Give gateway time to start

# 4. Verify clawdbot gateway is running
echo ""
echo "✅ Services started:"
ps aux | grep "clawdbot-gateway" | grep -v grep | awk '{print "   - clawdbot-gateway (PID: " $2 ")"}'

# 5. Count gateway instances
GATEWAY_COUNT=$(ps aux | grep "clawdbot-gateway" | grep -v grep | wc -l)

echo ""
if [ "$GATEWAY_COUNT" -eq 1 ]; then
    echo "✅ All good! clawdbot gateway running with native Slack."
else
    echo "⚠️  WARNING: Gateway not running properly!"
    echo "   Gateways: $GATEWAY_COUNT"
    echo ""
    echo "   Run: ~/clawd/shutdown-all.sh && ~/clawd/start-all-services.sh"
fi

echo ""
echo "Logs:"
echo "   clawdbot: tail -f /tmp/clawdbot.log"
