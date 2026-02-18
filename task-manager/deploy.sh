#!/bin/bash
# Deploy task-manager worker with systemd

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Task Manager Worker Deployment ==="

# Create log directory
mkdir -p logs

# Stop existing service
echo "Stopping existing service..."
systemctl --user stop task-manager-worker 2>/dev/null || true

# Copy service file
cp task-manager-worker.service ~/.config/systemd/user/

# Reload systemd
echo "Reloading systemd daemon..."
systemctl --user daemon-reload

# Enable service to start on boot
echo "Enabling service for auto-start..."
systemctl --user enable task-manager-worker

# Start the service
echo "Starting service..."
systemctl --user start task-manager-worker

# Verify status
echo ""
echo "Service status:"
systemctl --user status task-manager-worker --no-pager

echo ""
echo "=== Deployment Complete ==="
echo "Worker will auto-start on boot and restart on failure."
