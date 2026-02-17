#!/bin/bash
# Quick script to update dashboard data
# Run this manually or set up as a cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/update.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Updating dashboard data..." | tee -a "$LOG_FILE"

cd "$SCRIPT_DIR/scripts"
if node parse-clawdbot.js 2>&1 | tee -a "$LOG_FILE"; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Update successful" | tee -a "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Update failed" | tee -a "$LOG_FILE"
    exit 1
fi
