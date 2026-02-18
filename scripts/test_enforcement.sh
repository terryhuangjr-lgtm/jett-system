#!/bin/bash
#
# Test Research Protocol Enforcement System
#
# This script runs comprehensive tests to verify the enforcement
# system is working correctly and blocking unverified content.
#

set -e

echo "🧪 Testing Research Protocol Enforcement System"
echo "=============================================="
echo ""

ENFORCEMENT_SCRIPT="$HOME/clawd/scripts/enforce_research_protocol.js"

# Test 1: Non-21M Sports content (should pass)
echo "Test 1: Non-21M Sports content..."
if node "$ENFORCEMENT_SCRIPT" --message "What's the weather today?" --check-only; then
  echo "✓ PASS: Non-21M content allowed"
else
  echo "✗ FAIL: Non-21M content was blocked"
  exit 1
fi
echo ""

# Test 2: 21M Sports request with valid research (should pass)
echo "Test 2: 21M Sports with valid research..."
if node "$ENFORCEMENT_SCRIPT" --message "Generate 21m sports tweet" --check-only; then
  echo "✓ PASS: Valid 21M Sports content allowed"
else
  echo "✗ FAIL: Valid 21M Sports content was blocked"
  exit 1
fi
echo ""

# Test 3: Response with fabricated player name (should block)
echo "Test 3: Response with fabricated content..."
FAKE_RESPONSE="Shedeur Sanders signed a $500M contract with Jackson State. In BTC terms, that's 5000 BTC."
if node "$ENFORCEMENT_SCRIPT" --message "Tell me about athlete contracts" --response "$FAKE_RESPONSE"; then
  echo "✗ FAIL: Fabricated content was NOT blocked"
  exit 1
else
  echo "✓ PASS: Fabricated content blocked"
fi
echo ""

# Test 4: Response with correct player name (should pass)
echo "Test 4: Response with verified player..."
VALID_RESPONSE="Juan Soto signed a $765M contract. According to verified research, that's 12171 BTC."
if node "$ENFORCEMENT_SCRIPT" --message "Tell me about Juan Soto" --response "$VALID_RESPONSE"; then
  echo "✓ PASS: Verified content allowed"
else
  echo "✗ FAIL: Verified content was blocked"
  exit 1
fi
echo ""

# Test 5: Check enforcement logs exist
echo "Test 5: Checking logs..."
ENFORCEMENT_LOG="$HOME/clawd/memory/protocol-enforcement.jsonl"
if [ -f "$ENFORCEMENT_LOG" ]; then
  LINE_COUNT=$(wc -l < "$ENFORCEMENT_LOG")
  echo "✓ PASS: Enforcement log exists with $LINE_COUNT entries"
else
  echo "✗ FAIL: Enforcement log not found"
  exit 1
fi
echo ""

# Summary
echo "=============================================="
echo "✅ ALL TESTS PASSED"
echo ""
echo "The enforcement system is working correctly:"
echo "  ✓ Allows non-21M Sports content"
echo "  ✓ Allows verified 21M Sports content"
echo "  ✓ BLOCKS fabricated content"
echo "  ✓ BLOCKS responses with wrong player names"
echo "  ✓ Logs all enforcement actions"
echo ""
echo "📊 View enforcement log:"
echo "  tail -10 $ENFORCEMENT_LOG"
echo ""
