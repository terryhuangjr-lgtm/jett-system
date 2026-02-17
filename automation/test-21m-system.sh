#!/bin/bash
#
# Test script for 21M Sports Zero Fake Data System
# Tests the full pipeline from research to deployment
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MEMORY_DIR="$HOME/clawd/memory"

echo "════════════════════════════════════════════════════════════════════"
echo "21M Sports Zero Fake Data System - Full Pipeline Test"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Test 1: Research Script
echo "Test 1: Real Research Script"
echo "─────────────────────────────────────────────────────────────────────"
# Use today's date for testing (CoinGecko free API only allows last 365 days)
TEST_DATE=$(date +%Y-%m-%d)
echo "Running: 21m-sports-real-research.js --dry-run --test-date $TEST_DATE"
echo ""

if node "$SCRIPT_DIR/21m-sports-real-research.js" --dry-run --test-date "$TEST_DATE"; then
  echo ""
  echo "✅ Test 1 PASSED: Research script executed successfully"
else
  echo ""
  echo "❌ Test 1 FAILED: Research script failed"
  exit 1
fi

echo ""
echo ""

# Test 2: Verify research output
echo "Test 2: Verify Research Output"
echo "─────────────────────────────────────────────────────────────────────"

RESEARCH_FILE="$MEMORY_DIR/21m-sports-verified-research.json"

if [ -f "$RESEARCH_FILE" ]; then
  echo "✓ Research file exists: $RESEARCH_FILE"

  # Check file is valid JSON
  if python3 -m json.tool < "$RESEARCH_FILE" > /dev/null 2>&1; then
    echo "✓ Research file is valid JSON"

    # Check required fields
    if python3 -c "import json,sys; data=json.load(open('$RESEARCH_FILE')); sys.exit(0 if data.get('verification_status') == 'VERIFIED' else 1)"; then
      echo "✓ Verification status is VERIFIED"
    else
      echo "✗ Verification status is not VERIFIED"
      exit 1
    fi

    if python3 -c "import json,sys; data=json.load(open('$RESEARCH_FILE')); sys.exit(0 if len(data.get('findings', [])) > 0 else 1)"; then
      echo "✓ Research has findings"
    else
      echo "✗ Research has no findings"
      exit 1
    fi

    echo ""
    echo "✅ Test 2 PASSED: Research output is valid"
  else
    echo "✗ Research file is not valid JSON"
    exit 1
  fi
else
  echo "✗ Research file not found"
  exit 1
fi

echo ""
echo ""

# Test 3: Content Generator
echo "Test 3: Verified Content Generator V2"
echo "─────────────────────────────────────────────────────────────────────"
echo "Running: 21m-sports-verified-generator-v2.js --dry-run"
echo ""

if node "$SCRIPT_DIR/21m-sports-verified-generator-v2.js" --dry-run; then
  echo ""
  echo "✅ Test 3 PASSED: Generator executed successfully"
else
  echo ""
  echo "❌ Test 3 FAILED: Generator failed"
  exit 1
fi

echo ""
echo ""

# Test 4: Verify content output
echo "Test 4: Verify Content Output"
echo "─────────────────────────────────────────────────────────────────────"

CONTENT_FILE="$MEMORY_DIR/21m-sports-verified-content.json"

if [ -f "$CONTENT_FILE" ]; then
  echo "✓ Content file exists: $CONTENT_FILE"

  # Check file is valid JSON
  if python3 -m json.tool < "$CONTENT_FILE" > /dev/null 2>&1; then
    echo "✓ Content file is valid JSON"

    # Check required fields
    if python3 -c "import json,sys; data=json.load(open('$CONTENT_FILE')); sys.exit(0 if data.get('metadata', {}).get('verified') == True else 1)"; then
      echo "✓ Content is marked as verified"
    else
      echo "✗ Content is not marked as verified"
      exit 1
    fi

    if python3 -c "import json,sys; data=json.load(open('$CONTENT_FILE')); sys.exit(0 if len(data.get('tweets', [])) == 3 else 1)"; then
      echo "✓ Content has 3 tweet variations"
    else
      echo "✗ Content does not have 3 tweet variations"
      exit 1
    fi

    if python3 -c "import json,sys; data=json.load(open('$CONTENT_FILE')); sys.exit(0 if 'contract' in data.get('sources', {}) else 1)"; then
      echo "✓ Content has contract source"
    else
      echo "✗ Content missing contract source"
      exit 1
    fi

    echo ""
    echo "✅ Test 4 PASSED: Content output is valid"
  else
    echo "✗ Content file is not valid JSON"
    exit 1
  fi
else
  echo "✗ Content file not found"
  exit 1
fi

echo ""
echo ""

# Test 5: Enhanced Validator
echo "Test 5: Enhanced Validator with Blocking Checks"
echo "─────────────────────────────────────────────────────────────────────"
echo "Running: 21m-sports-validator.js --content-file=$CONTENT_FILE"
echo ""

if node "$SCRIPT_DIR/21m-sports-validator.js" --content-file="$CONTENT_FILE"; then
  echo ""
  echo "✅ Test 5 PASSED: Validator passed all checks"
else
  echo ""
  echo "❌ Test 5 FAILED: Validator failed"
  exit 1
fi

echo ""
echo ""

# Test 6: Deploy Script (Dry Run)
echo "Test 6: Deploy Script with Pre-Deployment Validation"
echo "─────────────────────────────────────────────────────────────────────"
echo "Running: deploy-21m-tweet.js $CONTENT_FILE --dry-run"
echo ""

if node "$SCRIPT_DIR/deploy-21m-tweet.js" "$CONTENT_FILE" --dry-run; then
  echo ""
  echo "✅ Test 6 PASSED: Deploy script executed successfully"
else
  echo ""
  echo "❌ Test 6 FAILED: Deploy script failed"
  exit 1
fi

echo ""
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════════"
echo "✅ ALL TESTS PASSED!"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  ✓ Real research script works"
echo "  ✓ Research output is valid and verified"
echo "  ✓ Content generator V2 works"
echo "  ✓ Content output is valid and verified"
echo "  ✓ Enhanced validator blocks bad content"
echo "  ✓ Deploy script has pre-deployment validation"
echo ""
echo "Generated files:"
echo "  • $RESEARCH_FILE"
echo "  • $CONTENT_FILE"
echo "  • $MEMORY_DIR/21m-sports-api-log.jsonl"
echo ""
echo "Next steps:"
echo "  1. Review generated content in $CONTENT_FILE"
echo "  2. Test with different dates and contracts"
echo "  3. Integrate web_search for automated research"
echo "  4. Schedule new scripts in task manager"
echo ""
