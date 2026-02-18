#!/bin/bash
#
# Add Tweet Preparation and Deployment to Schedule
#
# Adds automated tweet drafting and Slack posting
#

set -e

echo "🐦 Adding Tweet Preparation & Deployment"
echo "════════════════════════════════════════════"
echo ""

echo "📋 Current 21M Sports workflow:"
echo ""
echo "  2:00 AM - Research (find fresh contracts)"
echo "  3:00 AM - Content generation (draft 3 tweet options)"
echo "  ⚠️  MISSING: Deploy to Slack for review"
echo ""
echo "📋 Updated workflow:"
echo ""
echo "  2:00 AM - Research (find fresh contracts)"
echo "  3:00 AM - Content generation (draft 3 tweet options)"
echo "  3:15 AM - Deploy to #21msports (3 options for review) ← NEW"
echo ""

read -p "Add tweet deployment to schedule? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "📅 Adding deployment task..."

# Get current crontab
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Check if deployment already exists
if echo "$CURRENT_CRON" | grep -q "task-orchestrator.sh 21m-sports-deploy"; then
    echo "⚠️  Tweet deployment already scheduled"
    exit 0
fi

# Add deployment after content generation (3:15 AM)
NEW_ENTRY="15 3 * * * $HOME/clawd/scripts/task-orchestrator.sh 21m-sports-deploy"

# Insert after the 21m-sports-content line
UPDATED_CRON=$(echo "$CURRENT_CRON" | awk -v new="$NEW_ENTRY" '
    {print}
    /21m-sports-content/ {print new}
')

# Install updated crontab
echo "$UPDATED_CRON" | crontab -

echo "✅ Deployment task added!"
echo ""
echo "📋 Updated 21M Sports schedule:"
crontab -l | grep "21m-sports"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TWEET DEPLOYMENT ADDED"
echo ""
echo "📅 Complete 21M Sports workflow:"
echo "   • 2:00 AM - Research (fresh contracts)"
echo "   • 3:00 AM - Generate (3 tweet options)"
echo "   • 3:15 AM - Deploy (#21msports for review)"
echo ""
echo "📱 Morning routine:"
echo "   1. Check Slack DM (task notifications)"
echo "   2. Go to #21msports channel"
echo "   3. Review 3 tweet options"
echo "   4. Choose and post to Twitter"
echo ""
echo "🤖 Jett handles:"
echo "   • Finding fresh contract news"
echo "   • Drafting 3 variations"
echo "   • Posting to Slack for review"
echo "   • Notifying you when ready"
echo ""
echo "👤 You handle:"
echo "   • Final approval"
echo "   • Choosing best option"
echo "   • Posting to Twitter"
echo ""
