#!/bin/bash
# Safe Claude Code Stopper
# Stops Claude Code gracefully

PID_FILE="$HOME/clawd/claude-code.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "❌ No Claude Code PID file found"
  echo ""
  echo "Checking for running Claude processes..."
  PIDS=$(ps aux | grep -E "^\S+\s+[0-9]+.*claude$" | grep -v grep | awk '{print $2}')

  if [ -z "$PIDS" ]; then
    echo "✅ No Claude Code processes running"
    exit 0
  else
    echo "⚠️  Found Claude processes without PID file:"
    ps aux | grep -E "^\S+\s+[0-9]+.*claude$" | grep -v grep
    echo ""
    read -p "Kill all Claude processes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "$PIDS" | xargs kill -9
      echo "✅ All Claude processes killed"
    fi
  fi
  exit 0
fi

# Read PID and check if running
PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
  echo "🛑 Stopping Claude Code (PID: $PID)..."
  kill "$PID"
  sleep 2

  # Check if it's still running (force kill if needed)
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "⚠️  Process didn't stop gracefully, force killing..."
    kill -9 "$PID"
    sleep 1
  fi

  if ps -p "$PID" > /dev/null 2>&1; then
    echo "❌ Failed to stop process"
    exit 1
  else
    echo "✅ Claude Code stopped"
    rm "$PID_FILE"
  fi
else
  echo "⚠️  PID file exists but process not running (cleaning up)"
  rm "$PID_FILE"
fi

# Double-check for any other Claude processes
EXTRA_PIDS=$(ps aux | grep -E "^\S+\s+[0-9]+.*claude$" | grep -v grep | awk '{print $2}')
if [ ! -z "$EXTRA_PIDS" ]; then
  echo ""
  echo "⚠️  Warning: Other Claude processes still running:"
  ps aux | grep -E "^\S+\s+[0-9]+.*claude$" | grep -v grep
  echo ""
  echo "Run this script again to clean them up"
fi
