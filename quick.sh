#!/bin/bash
# Quick Helper Script - Fast access to common operations
# Usage: ./quick.sh [command] [args]

WORKSPACE="/home/clawd/clawd"
cd "$WORKSPACE" || exit 1

case "$1" in
  # Memory operations
  "log"|"l")
    shift
    node lib/quick-memory.js append "$@"
    ;;

  "recent"|"r")
    node lib/quick-memory.js recent
    ;;

  "last")
    node lib/quick-memory.js last "${2:-5}"
    ;;

  # State operations
  "check"|"c")
    node lib/state-manager.js check "$2" "${3:-30}"
    ;;

  "mark"|"m")
    node lib/state-manager.js mark "$2"
    ;;

  "state"|"s")
    node lib/state-manager.js dump
    ;;

  # File operations
  "files"|"f")
    node lib/quick-memory.js list
    ;;

  # Cleanup
  "clean")
    node lib/quick-memory.js clean "${2:-30}"
    node lib/state-manager.js clean
    echo "Cleanup complete"
    ;;

  # Today's date for file creation
  "today")
    date +%Y-%m-%d
    ;;

  # Quick git status
  "git"|"g")
    git -C "$WORKSPACE" status --short
    ;;

  # Show current context size (estimate tokens)
  "size")
    RECENT=$(node lib/quick-memory.js recent | wc -c)
    echo "Recent context: ~$((RECENT / 4)) tokens"
    ;;

  # File upload check
  "upload-check"|"uc")
    if [ -z "$2" ]; then
      echo "Usage: ./quick.sh upload-check <file>"
      exit 1
    fi
    node lib/file-upload-helper.js debug "$2"
    ;;

  # List uploadable files
  "upload-list"|"ul")
    node lib/file-upload-helper.js list
    ;;

  # Health check
  "health")
    echo "=== Clawdbot Health Check ==="
    echo "Workspace: $WORKSPACE"
    echo -n "Memory files: "
    ls -1 memory/*.md 2>/dev/null | wc -l
    echo -n "State file: "
    [ -f memory/state.json ] && echo "✓" || echo "✗"
    echo -n "Node modules: "
    [ -d node_modules ] && echo "✓" || echo "✗"
    ;;

  # Help
  "help"|"-h"|"")
    cat <<EOF
Quick Helper Script - Fast access to common operations

Memory:
  log|l <text>       Append to today's memory
  recent|r           Show recent context (today + yesterday)
  last [n]           Show last N entries from today (default 5)
  files|f            List all memory files with sizes

State:
  check|c <key> [min] Check if enough time passed (default 30 min)
  mark|m <key>        Mark something as checked
  state|s             Dump current state

Utilities:
  today              Get today's date (YYYY-MM-DD)
  git|g              Quick git status
  size               Estimate current context size in tokens
  clean [days]       Clean old files (default 30 days)
  health             System health check

File Upload:
  upload-check|uc <file>   Check if file exists and resolve path
  upload-list|ul           List all uploadable files

Examples:
  ./quick.sh log "Started new task"
  ./quick.sh check email 30
  ./quick.sh mark email
  ./quick.sh recent | head -20
EOF
    ;;

  *)
    echo "Unknown command: $1"
    echo "Run './quick.sh help' for usage"
    exit 1
    ;;
esac
