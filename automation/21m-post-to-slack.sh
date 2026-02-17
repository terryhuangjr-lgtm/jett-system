#!/bin/bash
# Post 21M Sports content to Slack channel
# Runs at 7 AM every morning

DATE=$(date +%Y-%m-%d)
CONTENT_FILE="/home/clawd/clawd/automation/output/nightly-$DATE.md"

# Check if content file exists (it should have been generated at 11 PM)
if [ ! -f "$CONTENT_FILE" ]; then
    # Try yesterday's file if today's doesn't exist yet
    YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
    CONTENT_FILE="/home/clawd/clawd/automation/output/nightly-$YESTERDAY.md"
    
    if [ ! -f "$CONTENT_FILE" ]; then
        echo "Error: No content file found"
        exit 1
    fi
fi

# Read the content
CONTENT=$(cat "$CONTENT_FILE")

# Post to Slack using message tool via node
node -e "
const content = \`$CONTENT\`;
console.log(JSON.stringify({
    action: 'send',
    channel: 'slack',
    to: '#21-m-sports',
    message: content
}));
"

echo "✓ Content posted to #21-m-sports"
