#!/bin/bash
# System Health Check Script
# Run hourly: crontab -l && echo "0 * * * * ~/clawd/system-health-check.sh"

REPORT_FILE="/home/clawd/clawd/memory/system-health.log"
WEBHOOK_URL=""  # Add Slack webhook if needed

echo "🔧 SYSTEM HEALTH CHECK - $(date)" > "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

ISSUES=0

# 1. Check critical processes
echo "1. PROCESSES:" >> "$REPORT_FILE"
if pgrep -x "clawdbot" > /dev/null; then
    echo "  ✅ clawdbot running" >> "$REPORT_FILE"
else
    echo "  ❌ clawdbot NOT running" >> "$REPORT_FILE"
    ISSUES=$((ISSUES + 1))
fi

if pgrep -f "slack-bridge.js" > /dev/null; then
    echo "  ⚠️  slack-bridge.js STILL RUNNING (should be disabled)" >> "$REPORT_FILE"
    ISSUES=$((ISSUES + 1))
else
    echo "  ✅ slack-bridge.js disabled" >> "$REPORT_FILE"
fi

# 2. Check task manager
echo "" >> "$REPORT_FILE"
echo "2. TASK MANAGER:" >> "$REPORT_FILE"
TM_STATUS=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if echo "$TM_STATUS" | grep -q "healthy"; then
    echo "  ✅ Task manager API responding" >> "$REPORT_FILE"
else
    echo "  ❌ Task manager API not responding" >> "$REPORT_FILE"
    ISSUES=$((ISSUES + 1))
fi

# 3. Check content pool
echo "" >> "$REPORT_FILE"
echo "3. CONTENT POOL:" >> "$REPORT_FILE"
TOTAL=$(python3 -c "import sqlite3; db=sqlite3.connect('/home/clawd/clawd/data/jett_knowledge.db'); print(db.execute('SELECT COUNT(*) FROM content_ideas').fetchone()[0])" 2>/dev/null || echo "0")
if [ "$TOTAL" -gt 50 ] 2>/dev/null; then
    echo "  ✅ Content pool: $TOTAL items" >> "$REPORT_FILE"
else
    echo "  ⚠️  Content pool low: $TOTAL items" >> "$REPORT_FILE"
fi

# 4. Check eBay config
echo "" >> "$REPORT_FILE"
echo "4. EBAY SCANNER:" >> "$REPORT_FILE"
ENABLED=$(python3 -c "import json; c=json.load(open('/home/clawd/clawd/task-manager/ebay-scans-config.json')); print(sum(1 for s in c['scans'].values() if s['enabled']))")
echo "  ✅ $ENABLED/7 eBay scans enabled" >> "$REPORT_FILE"

# 5. Check recent task runs
echo "" >> "$REPORT_FILE"
echo "5. RECENT TASK RUNS:" >> "$REPORT_FILE"
LAST_RESEARCH=$(python3 -c "
import sqlite3, json
db=sqlite3.connect('/home/clawd/clawd/task-manager/tasks.db')
r=db.execute('SELECT MAX(last_run) FROM tasks WHERE name LIKE \"%Research%\"').fetchone()[0]
print(r if r else 'NULL')
" 2>/dev/null || echo "NULL")
if [ "$LAST_RESEARCH" = "NULL" ] || [ -z "$LAST_RESEARCH" ]; then
    echo "  Last research: Never" >> "$REPORT_FILE"
else
    echo "  Last research: $LAST_RESEARCH" >> "$REPORT_FILE"
fi

# Summary
echo "" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
if [ $ISSUES -eq 0 ]; then
    echo "✅ ALL SYSTEMS HEALTHY" >> "$REPORT_FILE"
else
    echo "⚠️  $ISSUES ISSUES DETECTED" >> "$REPORT_FILE"
fi

cat "$REPORT_FILE"

# Optional: Send to Slack if issues
if [ $ISSUES -gt 0 ] && [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ System Health Check: $ISSUES issues detected\"}" \
        "$WEBHOOK_URL" > /dev/null
fi
