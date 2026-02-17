#!/bin/bash
# Check dashboard status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/dashboard.pid"

echo "================================"
echo "  📊 Dashboard Status Check"
echo "================================"
echo

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "Status: ❌ NOT RUNNING"
    echo "Start: $SCRIPT_DIR/start-dashboard.sh"
    exit 1
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Status: ✅ RUNNING"
    echo "PID: $PID"
    echo "URL: http://localhost:8000"
    echo

    # Check if server responds
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ | grep -q "200"; then
        echo "Server Response: ✅ OK"
    else
        echo "Server Response: ⚠️  Not responding"
    fi

    echo
    echo "Logs: tail -f $SCRIPT_DIR/dashboard.log"
    echo "Stop: $SCRIPT_DIR/stop-dashboard.sh"

    # Check data age
    if [ -f "$SCRIPT_DIR/public/token-usage.json" ]; then
        DATA_DATE=$(stat -c %y "$SCRIPT_DIR/public/token-usage.json" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo
        echo "Data last updated: $DATA_DATE"
        echo "Update data: $SCRIPT_DIR/update-data.sh"
    fi
else
    echo "Status: ❌ NOT RUNNING (stale PID file)"
    echo "Cleaning up..."
    rm -f "$PID_FILE"
    echo "Start: $SCRIPT_DIR/start-dashboard.sh"
    exit 1
fi

echo
echo "================================"
