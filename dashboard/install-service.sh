#!/bin/bash
# Install dashboard as a systemd service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/dashboard.service"
SYSTEMD_DIR="$HOME/.config/systemd/user"

echo "🔧 Installing Dashboard Service..."

# Create systemd user directory if it doesn't exist
mkdir -p "$SYSTEMD_DIR"

# Copy service file
cp "$SERVICE_FILE" "$SYSTEMD_DIR/"

# Reload systemd
systemctl --user daemon-reload

# Enable and start service
systemctl --user enable dashboard.service
systemctl --user start dashboard.service

echo ""
echo "✅ Dashboard service installed successfully!"
echo ""
echo "📋 Useful commands:"
echo "   Status:  systemctl --user status dashboard"
echo "   Start:   systemctl --user start dashboard"
echo "   Stop:    systemctl --user stop dashboard"
echo "   Restart: systemctl --user restart dashboard"
echo "   Logs:    journalctl --user -u dashboard -f"
echo ""
echo "📍 Dashboard URL: http://localhost:8000"
