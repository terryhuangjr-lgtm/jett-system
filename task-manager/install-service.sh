#!/bin/bash
# Install Task Manager as systemd services (server + worker)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="$HOME/.config/systemd/user"

echo "🔧 Installing Task Manager Services..."

# Stop current running instances
if [ -f "$SCRIPT_DIR/.server.pid" ]; then
    SERVER_PID=$(cat "$SCRIPT_DIR/.server.pid")
    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo "Stopping current server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
    fi
    rm -f "$SCRIPT_DIR/.server.pid"
fi

if [ -f "$SCRIPT_DIR/.worker.pid" ]; then
    WORKER_PID=$(cat "$SCRIPT_DIR/.worker.pid")
    if ps -p "$WORKER_PID" > /dev/null 2>&1; then
        echo "Stopping current worker (PID: $WORKER_PID)..."
        kill $WORKER_PID 2>/dev/null
    fi
    rm -f "$SCRIPT_DIR/.worker.pid"
fi

sleep 1

# Create systemd user directory if it doesn't exist
mkdir -p "$SYSTEMD_DIR"
mkdir -p "$SCRIPT_DIR/logs"

# Copy service files
cp "$SCRIPT_DIR/task-manager.service" "$SYSTEMD_DIR/"
cp "$SCRIPT_DIR/task-manager-worker.service" "$SYSTEMD_DIR/"

# Reload systemd
systemctl --user daemon-reload

# Enable and start services
systemctl --user enable task-manager.service
systemctl --user enable task-manager-worker.service
systemctl --user start task-manager.service
systemctl --user start task-manager-worker.service

sleep 2

echo ""
echo "✅ Task Manager services installed successfully!"
echo ""
echo "📋 Useful commands:"
echo "   Status:  systemctl --user status task-manager task-manager-worker"
echo "   Start:   systemctl --user start task-manager task-manager-worker"
echo "   Stop:    systemctl --user stop task-manager task-manager-worker"
echo "   Restart: systemctl --user restart task-manager task-manager-worker"
echo "   Logs:    journalctl --user -u task-manager -u task-manager-worker -f"
echo ""
echo "📍 Dashboard URL: http://localhost:3000"
echo ""
echo "Current status:"
systemctl --user status task-manager --no-pager -l
echo ""
systemctl --user status task-manager-worker --no-pager -l
