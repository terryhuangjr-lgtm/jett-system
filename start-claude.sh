#!/bin/bash
# Safe Claude Code Starter
# Ensures only ONE Claude Code instance runs at a time

PID_FILE="$HOME/clawd/claude-code.pid"

# Function to check if process is running
is_running() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      return 0  # Process is running
    else
      rm "$PID_FILE"  # Stale PID file
      return 1
    fi
  fi
  return 1
}

# Check if Claude is already running
if is_running; then
  PID=$(cat "$PID_FILE")
  echo "❌ Claude Code is already running (PID: $PID)"
  echo ""
  echo "Options:"
  echo "  1. Use the existing session"
  echo "  2. Stop it first: ./stop-claude.sh"
  echo "  3. Force restart: ./stop-claude.sh && ./start-claude.sh"
  exit 1
fi

# Start Claude Code
echo "🚀 Starting Claude Code..."
cd "$HOME/clawd"

# Start in background and save PID
nohup claude > /tmp/claude-output.log 2>&1 &
CLAUDE_PID=$!

# Save PID
echo $CLAUDE_PID > "$PID_FILE"

echo "✅ Claude Code started (PID: $CLAUDE_PID)"
echo "📝 Logs: /tmp/claude-output.log"
echo ""
echo "To stop: ./stop-claude.sh"
