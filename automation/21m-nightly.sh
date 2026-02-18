#!/bin/bash
# 21M Sports Nightly Automation
# Runs at 11 PM every night

DATE=$(date +%Y-%m-%d)
DAY=$(date +%A)
OUTPUT_DIR="/home/clawd/clawd/automation/output"
mkdir -p "$OUTPUT_DIR"

echo "=== 21M Sports Nightly Automation - $DATE ==="
echo ""

# Determine tomorrow's theme based on day
case "$DAY" in
  "Sunday")
    THEME="21m-monday"
    THEME_NAME="21M Monday - Breaking News in BTC Terms"
    ;;
  "Monday")
    THEME="timechain-thursday"
    THEME_NAME="Timechain Thursday - Historical Moments"
    ;;
  "Tuesday")
    THEME="timechain-thursday"
    THEME_NAME="Timechain Thursday - Historical Moments"
    ;;
  "Wednesday")
    THEME="fiat-friday"
    THEME_NAME="Fiat Friday - Contract Era Comparisons"
    ;;
  "Thursday")
    THEME="fiat-friday"
    THEME_NAME="Fiat Friday - Contract Era Comparisons"
    ;;
  "Friday")
    THEME="sat-stacking-saturday"
    THEME_NAME="Sat Stacking Saturday - Educational Content"
    ;;
  "Saturday")
    THEME="sound-money-sunday"
    THEME_NAME="Sound Money Sunday - Athlete Wealth Stories"
    ;;
esac

echo "Tomorrow's theme: $THEME_NAME"
echo ""

# Generate content
echo "Generating content..."
cd /home/clawd/clawd/21m-sports-generator
CONTENT=$(npm run generate theme "$THEME" 2>&1)

# Save raw output
echo "$CONTENT" > "$OUTPUT_DIR/generated-content-$DATE.txt"

# Extract just the tweet options (remove the ASCII art header and footer)
TWEETS=$(echo "$CONTENT" | sed -n '/─── Option/,/📊 DATA/p' | sed '/📊 DATA/d')

# Create formatted output for Slack
cat > "$OUTPUT_DIR/nightly-$DATE.md" << EOF
# 21M Sports Content - $(date +"%A, %B %d, %Y")

## 🎯 Tomorrow's Theme
**$THEME_NAME**

## 🐦 Ready-to-Post Tweets

$TWEETS

---
Generated: $(date +"%I:%M %p %Z")
Source: Content Generator (fact-checked)
EOF

echo "✓ Content generated and saved to $OUTPUT_DIR/nightly-$DATE.md"
echo ""
echo "Preview:"
cat "$OUTPUT_DIR/nightly-$DATE.md"
