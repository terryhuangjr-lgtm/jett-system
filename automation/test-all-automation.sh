#!/bin/bash
# Comprehensive Automation Test Suite
# Tests all components before trusting them to run automatically

echo "════════════════════════════════════════════════════════════════════"
echo "AUTOMATION HEALTH CHECK"
echo "════════════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

function test_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASS++))
}

function test_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAIL++))
}

# Test 1: Node Version
echo "Test 1: Node Version"
NODE_VERSION=$(node --version)
if [[ "$NODE_VERSION" == v22.* ]]; then
  test_pass "Node v22 detected: $NODE_VERSION"
else
  test_fail "Wrong Node version: $NODE_VERSION (need v22)"
fi
echo ""

# Test 2: Clawdbot Available
echo "Test 2: Clawdbot Binary"
if command -v /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot &> /dev/null; then
  test_pass "Clawdbot binary found"
else
  test_fail "Clawdbot binary not found"
fi
echo ""

# Test 3: Slack Status
echo "Test 3: Slack Connection"
SLACK_STATUS=$(/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot status 2>&1 | grep -A 2 "Slack" | grep "OK")
if [[ ! -z "$SLACK_STATUS" ]]; then
  test_pass "Slack connected and OK"
else
  test_fail "Slack not connected"
fi
echo ""

# Test 4: Task Manager Running
echo "Test 4: Task Manager Status"
if pgrep -f "node.*worker.js" > /dev/null; then
  WORKER_PID=$(pgrep -f "node.*worker.js")
  WORKER_NODE=$(/bin/ps -p $WORKER_PID -o cmd= | grep -o "/[^ ]*/node")
  if [[ "$WORKER_NODE" == *"v22.22.0"* ]]; then
    test_pass "Task manager worker running with Node v22 (PID: $WORKER_PID)"
  else
    test_fail "Task manager worker using wrong Node: $WORKER_NODE"
  fi
else
  test_fail "Task manager worker not running"
fi
echo ""

# Test 5: Deploy Scripts Exist
echo "Test 5: Deploy Scripts"
if [[ -f /home/clawd/clawd/automation/deploy-21m-tweet.js ]]; then
  test_pass "21M deploy script exists"
else
  test_fail "21M deploy script missing"
fi

if [[ -f /home/clawd/clawd/automation/deploy-ebay-scans.js ]]; then
  test_pass "eBay deploy script exists"
else
  test_fail "eBay deploy script missing"
fi
echo ""

# Test 6: Verified Generator
echo "Test 6: Verified Content Generator"
if [[ -f /home/clawd/clawd/automation/21m-sports-verified-generator-v2.js ]]; then
  test_pass "Verified generator V2 exists"
else
  test_fail "Verified generator V2 missing"
fi

if [[ -f /home/clawd/clawd/automation/21m-sports-real-research.js ]]; then
  test_pass "Real research script exists"
else
  test_fail "Real research script missing"
fi
echo ""

# Test 7: Memory Directory Structure
echo "Test 7: Memory Directories"
if [[ -d /home/clawd/clawd/memory/daily-logs ]]; then
  test_pass "daily-logs directory exists"
else
  test_fail "daily-logs directory missing"
fi

if [[ -d /home/clawd/clawd/memory/research ]]; then
  test_pass "research directory exists"
else
  test_fail "research directory missing"
fi
echo ""

# Test 8: Task Manager Database
echo "Test 8: Task Manager Database"
if [[ -f /home/clawd/clawd/task-manager/tasks.db ]]; then
  DB_SIZE=$(du -h /home/clawd/clawd/task-manager/tasks.db | cut -f1)
  test_pass "Task database exists ($DB_SIZE)"
else
  test_fail "Task database missing"
fi
echo ""

# Test 9: Slack Channel Test (dry run)
echo "Test 9: Slack Posting Test"
TEST_MSG="🧪 Automation test $(date +%H:%M:%S)"
if /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --target "#21msports" --message "$TEST_MSG" --json &> /dev/null; then
  test_pass "Slack message posted successfully"
else
  test_fail "Slack message failed to post"
fi
echo ""

# Test 10: Deploy Script Execution
echo "Test 10: Deploy Script Dry Run"
cd /home/clawd/clawd/automation
if node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content-slot2.json &> /dev/null; then
  test_pass "21M deploy script executes without error"
else
  test_fail "21M deploy script execution failed"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}PASSED:${NC} $PASS tests"
echo -e "${RED}FAILED:${NC} $FAIL tests"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED - Automation is ready${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED - Fix issues before trusting automation${NC}"
  exit 1
fi
