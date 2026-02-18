#!/bin/bash
# Deploy 21M content to Slack
# Usage: ./deploy-21m-tweet.sh <bitcoin|sports>

TYPE="${1:-bitcoin}"
MEMORY_DIR="$HOME/clawd/memory"
CONTENT_FILE="$MEMORY_DIR/21m-${TYPE}-verified-content.json"

if [ ! -f "$CONTENT_FILE" ]; then
    echo "Content file not found: $CONTENT_FILE"
    echo "Run: node /home/clawd/clawd/automation/21m-generator.js --type $TYPE"
    exit 1
fi

node /home/clawd/clawd/automation/deploy-21m-tweet.js "$CONTENT_FILE"
