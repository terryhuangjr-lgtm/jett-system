#!/bin/bash
# Safe startup script - prevents duplicate processes
# Updated: PM2 manages task-manager + podcast; clawdbot runs separately

echo "Starting all services..."

# 1. Start/restart PM2 managed services (task-manager-server, task-manager-worker, podcast-summarizer)
PM2_BIN="/home/clawd/.nvm/versions/node/v22.22.0/bin/pm2"
if [ -f "$PM2_BIN" ]; then
  echo "   Starting PM2 services..."
  "$PM2_BIN" start /home/clawd/clawd/ecosystem.config.js --update-env 2>/dev/null || \
    "$PM2_BIN" restart all 2>/dev/null
  echo "   PM2 services started"
else
  echo "   WARNING: pm2 not found at $PM2_BIN, falling back to nohup..."
  nohup node /home/clawd/clawd/task-manager/server.js > /tmp/task-server.log 2>&1 &
  nohup node /home/clawd/clawd/task-manager/worker.js > /tmp/task-worker.log 2>&1 &
fi

# 2. Kill any existing clawdbot instances first
echo "   Stopping existing clawdbot..."
pkill -9 -f "clawdbot-gateway" 2>/dev/null
pkill -9 -f "^clawdbot$" 2>/dev/null
sleep 2

# 3. Clean up PID files
rm -f ~/clawd/slack-bridge.pid
rm -f ~/.clawdbot/*.pid 2>/dev/null

# 4. Start clawdbot (includes native Slack plugin)
echo "   Starting clawdbot..."
cd /home/clawd
nohup clawdbot > /tmp/clawdbot.log 2>&1 &
sleep 7  # Give gateway time to start

# 5. Verify clawdbot gateway is running
echo ""
echo "Services started:"
ps aux | grep "clawdbot-gateway" | grep -v grep | awk '{print "   - clawdbot-gateway (PID: " $2 ")"}'

GATEWAY_COUNT=$(ps aux | grep "clawdbot-gateway" | grep -v grep | wc -l)
echo ""
if [ "$GATEWAY_COUNT" -eq 1 ]; then
    echo "All good! clawdbot + PM2 services running."
else
    echo "WARNING: clawdbot gateway not running properly!"
    echo "   Run: ~/clawd/start-all-services.sh"
fi

echo ""
echo "Status:"
echo "   PM2:      $PM2_BIN list"
echo "   clawdbot: tail -f /tmp/clawdbot.log"
