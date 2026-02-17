#!/bin/bash
# Test script for 21M Sports verified content pipeline
# This ensures the entire pipeline works correctly before going live

set -e  # Exit on any error

SCRIPT_DIR="$HOME/clawd/automation"
TEST_OUTPUT="/tmp/test-verified-output.json"

echo "🧪 Testing 21M Sports Verified Pipeline"
echo "========================================"
echo ""

# Test 1: Check that research file exists
echo "Test 1: Checking research file..."
RESEARCH_FILE="$HOME/clawd/memory/21m-sports-research.md"
if [ ! -f "$RESEARCH_FILE" ]; then
    echo "❌ Research file not found: $RESEARCH_FILE"
    echo "   Run task 27 (21M Sports Researcher) first"
    exit 1
fi
echo "✓ Research file exists"
echo ""

# Test 2: Run auto-verified generator
echo "Test 2: Running auto-verified generator..."
node "$SCRIPT_DIR/21m-sports-auto-verified.js" "$TEST_OUTPUT"
if [ $? -ne 0 ]; then
    echo "❌ Auto-generator failed"
    exit 1
fi
echo "✓ Auto-generator succeeded"
echo ""

# Test 3: Validate output format
echo "Test 3: Validating output format..."
if [ ! -f "$TEST_OUTPUT" ]; then
    echo "❌ Output file not created"
    exit 1
fi

# Check JSON is valid
if ! jq empty "$TEST_OUTPUT" 2>/dev/null; then
    echo "❌ Output is not valid JSON"
    exit 1
fi

# Check required fields
VERIFIED=$(jq -r '.metadata.verified' "$TEST_OUTPUT")
if [ "$VERIFIED" != "true" ]; then
    echo "❌ Output not marked as verified"
    exit 1
fi

CONTRACT_SOURCE=$(jq -r '.sources.contract' "$TEST_OUTPUT")
BTC_SOURCE=$(jq -r '.sources.btc_price' "$TEST_OUTPUT")
if [ -z "$CONTRACT_SOURCE" ] || [ -z "$BTC_SOURCE" ]; then
    echo "❌ Missing source URLs"
    exit 1
fi

echo "✓ Output format valid"
echo ""
echo "Generated output:"
jq '{
  player: .metadata.player,
  contract: .metadata.contract_value,
  btc: .metadata.btc_equivalent,
  verified: .metadata.verified,
  sources: .sources
}' "$TEST_OUTPUT"
echo ""

# Test 4: Verify deploy script validation
echo "Test 4: Testing deploy script verification..."
node "$SCRIPT_DIR/deploy-21m-tweet.js" "$TEST_OUTPUT" --dry-run
if [ $? -ne 0 ]; then
    echo "❌ Deploy script rejected content"
    exit 1
fi
echo "✓ Deploy script accepted verified content"
echo ""

# Test 5: Test deploy script rejects unverified content
echo "Test 5: Testing deploy script blocks unverified content..."
FAKE_OUTPUT="/tmp/test-fake-output.json"
cat > "$FAKE_OUTPUT" <<EOF
{
  "type": "21m_sports_tweets",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tweets": ["Fake tweet"],
  "sources": {},
  "metadata": {
    "verified": false
  }
}
EOF

node "$SCRIPT_DIR/deploy-21m-tweet.js" "$FAKE_OUTPUT" --dry-run 2>/dev/null
if [ $? -eq 0 ]; then
    echo "❌ Deploy script accepted unverified content (should have rejected)"
    rm "$FAKE_OUTPUT"
    exit 1
fi
echo "✓ Deploy script correctly blocked unverified content"
rm "$FAKE_OUTPUT"
echo ""

# All tests passed
echo "═══════════════════════════════════════"
echo "✅ ALL TESTS PASSED"
echo "═══════════════════════════════════════"
echo ""
echo "Pipeline is ready for production:"
echo "  1. Research runs at 3 AM (task 27)"
echo "  2. Auto-generator creates tweets at 5 AM & 11 AM"
echo "  3. Deploy script posts to #21msports at 7:30 AM & 12 PM"
echo "  4. All content includes verified sources"
echo "  5. System blocks unverified content"
echo ""
echo "Cleanup test files:"
echo "  rm $TEST_OUTPUT"
echo ""
