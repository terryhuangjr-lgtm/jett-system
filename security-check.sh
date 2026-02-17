#!/bin/bash
# Clawdbot Security Audit Script
# Run this anytime to verify your setup is secure

echo "🔒 CLAWDBOT SECURITY AUDIT"
echo "=========================="
echo ""

CONFIG_FILE="/home/clawd/.clawdbot/clawdbot.json"

# Check 1: Gateway bind setting
echo "1️⃣ Gateway Bind Setting:"
BIND=$(grep -A 3 '"gateway"' "$CONFIG_FILE" | grep '"bind"' | cut -d'"' -f4)
if [ "$BIND" = "loopback" ]; then
    echo "   ✅ SECURE - Bound to loopback only"
elif [ "$BIND" = "all" ] || [ "$BIND" = "0.0.0.0" ]; then
    echo "   ⚠️  EXPOSED - Bind: $BIND (change to 'loopback'!)"
else
    echo "   ℹ️  Bind: $BIND"
fi
echo ""

# Check 2: Port exposure
echo "2️⃣ Port Exposure Check:"
PORT_CHECK=$(ss -tln 2>/dev/null | grep 18789 | grep -v "127.0.0.1\|::1" || echo "")
if [ -z "$PORT_CHECK" ]; then
    echo "   ✅ SECURE - Port 18789 only listening on localhost"
else
    echo "   ⚠️  WARNING - Port 18789 exposed to network:"
    echo "$PORT_CHECK" | sed 's/^/      /'
fi
echo ""

# Check 3: Auth mode
echo "3️⃣ Gateway Authentication:"
AUTH_MODE=$(grep -A 5 '"gateway"' "$CONFIG_FILE" | grep -A 2 '"auth"' | grep '"mode"' | cut -d'"' -f4)
if [ "$AUTH_MODE" = "token" ]; then
    echo "   ✅ SECURE - Token auth enabled"
elif [ "$AUTH_MODE" = "none" ]; then
    echo "   ⚠️  EXPOSED - No authentication!"
else
    echo "   ℹ️  Auth mode: ${AUTH_MODE:-unknown}"
fi
echo ""

# Check 4: WhatsApp allowlist
echo "4️⃣ WhatsApp Access Control:"
WA_POLICY=$(grep '"dmPolicy"' "$CONFIG_FILE" | cut -d'"' -f4)
if [ "$WA_POLICY" = "allowlist" ]; then
    ALLOWED=$(grep -A 10 '"allowFrom"' "$CONFIG_FILE" | grep '+' | wc -l)
    echo "   ✅ SECURE - Allowlist mode ($ALLOWED number(s) allowed)"
else
    echo "   ⚠️  WARNING - DM Policy: ${WA_POLICY:-unknown} (should be 'allowlist')"
fi
echo ""

# Check 5: Running processes
echo "5️⃣ Clawdbot Processes:"
PROC_COUNT=$(ps aux | grep "[c]lawdbot" | wc -l)
echo "   ℹ️  $PROC_COUNT clawdbot process(es) running"
echo ""

# Check 6: Cron jobs
echo "6️⃣ Active Cron Jobs:"
if [ -f "/home/clawd/.clawdbot/cron/jobs.json" ]; then
    CRON_COUNT=$(grep -c '"id"' /home/clawd/.clawdbot/cron/jobs.json 2>/dev/null || echo "0")
    echo "   ℹ️  $CRON_COUNT cron job(s) configured"
    if [ "$CRON_COUNT" -gt 0 ]; then
        grep '"name"' /home/clawd/.clawdbot/cron/jobs.json | cut -d'"' -f4 | sed 's/^/      - /'
    fi
else
    echo "   ℹ️  No cron jobs configured"
fi
echo ""

# Check 7: File permissions
echo "7️⃣ Sensitive File Permissions:"
if [ -d "/home/clawd/.clawdbot" ]; then
    PERMS=$(stat -c "%a" /home/clawd/.clawdbot)
    echo "   ℹ️  ~/.clawdbot permissions: $PERMS"
fi
echo ""

# Summary
echo "=========================="
echo "✅ Audit complete!"
echo ""
echo "To run this check anytime:"
echo "  cd ~/clawd && ./security-check.sh"
echo ""
