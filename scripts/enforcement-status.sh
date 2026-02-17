#!/bin/bash
#
# Enforcement System Status & Quick Reference
#

echo ""
echo "🚨 Research Protocol Enforcement System"
echo "========================================"
echo ""

# Check if installed
if grep -q "research-protocol-enforcement" ~/.clawdbot/clawdbot.json 2>/dev/null; then
  echo "✅ Status: INSTALLED"
  echo ""

  # Check if clawdbot is running
  if pgrep -f "clawdbot" > /dev/null; then
    echo "✅ Clawdbot: RUNNING"
  else
    echo "⚠️  Clawdbot: NOT RUNNING"
    echo "   Run: clawdbot start"
  fi
  echo ""

  # Check recent enforcement activity
  if [ -f ~/clawd/memory/protocol-enforcement.jsonl ]; then
    ENTRIES=$(wc -l < ~/clawd/memory/protocol-enforcement.jsonl)
    echo "📊 Enforcement Log: $ENTRIES entries"

    # Show recent blocks
    BLOCKS=$(grep -c '"passed":false' ~/clawd/memory/protocol-enforcement.jsonl 2>/dev/null || echo "0")
    ALLOWS=$(grep -c '"passed":true' ~/clawd/memory/protocol-enforcement.jsonl 2>/dev/null || echo "0")

    echo "   - Blocked: $BLOCKS"
    echo "   - Allowed: $ALLOWS"
  else
    echo "⚠️  No enforcement log yet"
  fi
  echo ""

  # Check research files
  if [ -f ~/clawd/memory/21m-sports-verified-research.json ]; then
    AGE=$(( ($(date +%s) - $(stat -c %Y ~/clawd/memory/21m-sports-verified-research.json)) / 3600 ))
    echo "📝 Research File: ${AGE}h old"

    if [ $AGE -gt 24 ]; then
      echo "   ⚠️  Older than 24 hours - will be rejected"
    else
      echo "   ✅ Recent enough"
    fi
  else
    echo "❌ Research File: NOT FOUND"
    echo "   Run: node ~/clawd/automation/21m-sports-real-research.js --dry-run --test-date YYYY-MM-DD"
  fi
  echo ""

  # Check content file
  if [ -f ~/clawd/memory/21m-sports-verified-content.json ]; then
    echo "✅ Content File: FOUND"
  else
    echo "❌ Content File: NOT FOUND"
    echo "   Run: node ~/clawd/automation/21m-sports-verified-generator-v2.js"
  fi
  echo ""

else
  echo "❌ Status: NOT INSTALLED"
  echo ""
  echo "📦 Install:"
  echo "   cd ~/clawd/scripts"
  echo "   ./install_enforcement_hook.sh"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Quick Reference:"
echo ""
echo "  Deploy:  cd ~/clawd/scripts && ./install_enforcement_hook.sh"
echo "  Test:    cd ~/clawd/scripts && ./test_enforcement.sh"
echo "  Monitor: tail -f ~/.clawdbot/logs/research-protocol-hook.log"
echo "  Logs:    tail -f ~/clawd/memory/protocol-enforcement.jsonl"
echo ""
echo "📖 Documentation:"
echo ""
echo "  Full docs:    ~/clawd/ENFORCEMENT-SYSTEM-COMPLETE.md"
echo "  Quick deploy: ~/clawd/DEPLOY-ENFORCEMENT-NOW.md"
echo "  Summary:      ~/clawd/ENFORCEMENT-DELIVERY-SUMMARY.md"
echo ""
echo "🧪 Manual Test:"
echo ""
echo "  node ~/clawd/scripts/enforce_research_protocol.js \\"
echo "    --message 'Generate 21m sports tweet' \\"
echo "    --check-only"
echo ""
