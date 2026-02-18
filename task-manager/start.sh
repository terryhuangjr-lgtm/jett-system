#!/bin/bash
# Start Task Manager (Server + Worker)

cd "$(dirname "$0")"

echo "Starting Task Manager..."

# Set timezone to EST (America/New_York)
export TZ='America/New_York'
echo "⏰ Timezone: EST ($(date +%T))"

# Use NVM Node v22 (required for clawdbot)
NODE_BIN="/home/clawd/.nvm/versions/node/v22.22.0/bin/node"

# Kill any existing workers first
echo "Cleaning up existing workers..."
pkill -9 -f "worker.js" 2>/dev/null || true
rm -f /tmp/clawd-task-worker.lock 2>/dev/null || true
sleep 2

# Verify no workers running - retry up to 3 times
for i in {1..3}; do
    if ! pgrep -f "node.*worker.js" > /dev/null 2>&1; then
        echo "✓ Worker cleanup verified"
        break
    fi
    if [ $i -eq 3 ]; then
        echo "WARNING: Workers still detected after cleanup, but continuing..."
        echo "  (Worker lock file will prevent duplicates)"
    else
        echo "  Retry $i: Workers still present, waiting..."
        pkill -9 -f "worker.js" 2>/dev/null || true
        sleep 2
    fi
done

# Start server in background
TZ='America/New_York' $NODE_BIN server.js > logs/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > .server.pid
echo "✓ Server started (PID: $SERVER_PID)"
echo "  Dashboard: http://localhost:3000"

# Wait for any system processes to settle
sleep 1

# Start worker - ensure only one
echo "Starting worker..."
TZ='America/New_York' $NODE_BIN worker.js > logs/worker.log 2>&1 &
WORKER_PID=$!
echo $WORKER_PID > .worker.pid

# Verify only one worker
sleep 3
WORKER_COUNT=$(pgrep -f "node.*worker.js" 2>/dev/null | wc -l)
echo "✓ Worker started (PID: $WORKER_PID) - Count: $WORKER_COUNT"

if [ "$WORKER_COUNT" -gt "1" ]; then
    echo "WARNING: Multiple workers detected!"
fi

echo ""
echo "Task Manager is running in EST!"
echo "Dashboard: http://localhost:3000"
echo ""
echo "To stop: ./stop.sh"
echo "To view logs: tail -f logs/server.log logs/worker.log"
