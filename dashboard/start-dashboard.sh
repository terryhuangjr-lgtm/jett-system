#!/bin/bash
# Start the API Usage Dashboard server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/dashboard.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️  Dashboard is already running (PID: $PID)"
        echo "📍 URL: http://localhost:8000"
        echo "   To restart, run: $SCRIPT_DIR/stop-dashboard.sh && $0"
        exit 0
    fi
fi

# Start server in background
cd "$SCRIPT_DIR"
nohup python3 server.py > dashboard.log 2>&1 &
SERVER_PID=$!

# Save PID
echo "$SERVER_PID" > "$PID_FILE"

# Wait a moment for server to start
sleep 1

# Check if server started successfully
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "✅ Dashboard server started successfully!"
    echo "📍 URL: http://localhost:8000"
    echo "📝 Logs: tail -f $SCRIPT_DIR/dashboard.log"
    echo "🛑 Stop: $SCRIPT_DIR/stop-dashboard.sh"
else
    echo "❌ Failed to start dashboard server"
    echo "📝 Check logs: cat $SCRIPT_DIR/dashboard.log"
    rm -f "$PID_FILE"
    exit 1
fi
