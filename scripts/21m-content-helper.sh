#!/bin/bash

# 21M Sports Content Helper
# Generates ready-to-post tweet options using the generator

cd /home/clawd/clawd/21m-sports-generator

# Determine theme based on day of week
DAY=$(date +%A)
THEME=""

case $DAY in
  Monday)
    THEME="21m-monday"
    ;;
  Thursday)
    THEME="timechain-thursday"
    ;;
  Friday)
    THEME="fiat-friday"
    ;;
  Saturday)
    THEME="sat-stacking-saturday"
    ;;
  Sunday)
    THEME="sound-money-sunday"
    ;;
  *)
    # Default to "all" for other days
    npm run generate all > /tmp/21m-output.txt 2>&1
    echo "Generated all content types"
    exit 0
    ;;
esac

# Generate content for specific theme
npm run generate theme "$THEME" > /tmp/21m-output.txt 2>&1

# Extract first 3 tweet options (keep it manageable)
echo "Generated content for $THEME theme"
head -100 /tmp/21m-output.txt
