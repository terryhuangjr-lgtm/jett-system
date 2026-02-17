#!/bin/bash
#
# Overnight Research Runner
# Executes automated 21M Sports research and logs results
#

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$HOME/clawd/memory/research-logs/overnight-$TIMESTAMP.log"

mkdir -p "$HOME/clawd/memory/research-logs"

echo "🌙 Starting overnight research at $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

cd "$HOME/clawd/automation"

# Run automated research
node 21m-sports-auto-research.js >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "" >> "$LOG_FILE"
echo "✅ Research completed at $(date) with exit code: $EXIT_CODE" >> "$LOG_FILE"

# If successful, log to summary
if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date +%Y-%m-%d) - Success - Research saved" >> "$HOME/clawd/memory/research-logs/summary.log"
else
    echo "$(date +%Y-%m-%d) - Failed - Exit code $EXIT_CODE" >> "$HOME/clawd/memory/research-logs/summary.log"
fi

exit $EXIT_CODE
