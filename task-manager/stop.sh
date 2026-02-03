#!/bin/bash
# Stop Task Manager

cd "$(dirname "$0")"

echo "Stopping Task Manager..."

# Stop server
if [ -f .server.pid ]; then
  SERVER_PID=$(cat .server.pid)
  if kill -0 $SERVER_PID 2>/dev/null; then
    kill $SERVER_PID
    echo "✓ Server stopped (PID: $SERVER_PID)"
  fi
  rm .server.pid
fi

# Stop worker
if [ -f .worker.pid ]; then
  WORKER_PID=$(cat .worker.pid)
  if kill -0 $WORKER_PID 2>/dev/null; then
    kill $WORKER_PID
    echo "✓ Worker stopped (PID: $WORKER_PID)"
  fi
  rm .worker.pid
fi

echo "Task Manager stopped"
