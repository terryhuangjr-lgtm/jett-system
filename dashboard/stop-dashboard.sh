#!/bin/bash
# Stop the API Usage Dashboard server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/dashboard.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "ℹ️  Dashboard is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "🛑 Stopping dashboard server (PID: $PID)..."
    kill "$PID"
    sleep 1

    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️  Server didn't stop gracefully, forcing..."
        kill -9 "$PID"
    fi

    echo "✅ Dashboard server stopped"
else
    echo "ℹ️  Dashboard server is not running"
fi

rm -f "$PID_FILE"
