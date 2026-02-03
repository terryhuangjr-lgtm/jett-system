#!/bin/bash
# Start Task Manager (Server + Worker)

cd "$(dirname "$0")"

echo "Starting Task Manager..."

# Start server in background
node server.js > logs/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > .server.pid
echo "✓ Server started (PID: $SERVER_PID)"
echo "  Dashboard: http://localhost:3000"

# Start worker in background
node worker.js > logs/worker.log 2>&1 &
WORKER_PID=$!
echo $WORKER_PID > .worker.pid
echo "✓ Worker started (PID: $WORKER_PID)"

echo ""
echo "Task Manager is running!"
echo "Dashboard: http://localhost:3000"
echo ""
echo "To stop: ./stop.sh"
echo "To view logs: tail -f logs/server.log logs/worker.log"
