#!/bin/bash
# Quick script to update dashboard data
# Run this daily via cron or manually

cd "$(dirname "$0")"
node parse-clawdbot.js

echo ""
echo "✅ Dashboard data updated!"
echo "📂 View data: cat ../data/token-usage.json | head -50"
echo "🌐 Open dashboard: open ../public/index.html"
