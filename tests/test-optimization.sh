#!/bin/bash
# Test optimization tools to verify they work

echo "=== Clawdbot Optimization Test ==="
echo ""

# Test 1: Quick script
echo "1. Testing quick.sh..."
./quick.sh help > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ quick.sh working"
else
  echo "   ❌ quick.sh failed"
  exit 1
fi

# Test 2: State manager
echo "2. Testing state-manager..."
node lib/state-manager.js mark test-$(date +%s) > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ state-manager working"
else
  echo "   ❌ state-manager failed"
  exit 1
fi

# Test 3: Quick memory
echo "3. Testing quick-memory..."
node lib/quick-memory.js append "Test entry $(date)" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ quick-memory working"
else
  echo "   ❌ quick-memory failed"
  exit 1
fi

# Test 4: Token optimizer
echo "4. Testing token-optimizer..."
echo "test content" | node lib/token-optimizer.js estimate > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ token-optimizer working"
else
  echo "   ❌ token-optimizer failed"
  exit 1
fi

# Test 5: Run example integration
echo "5. Testing example integration..."
node lib/example-integration.js > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ example-integration working"
else
  echo "   ❌ example-integration failed"
  exit 1
fi

# Test 6: Check config file
echo "6. Checking config..."
if [ -f optimize.config.json ]; then
  echo "   ✅ optimize.config.json exists"
else
  echo "   ❌ optimize.config.json missing"
  exit 1
fi

# Test 7: Memory directory
echo "7. Checking memory directory..."
if [ -d memory ]; then
  echo "   ✅ memory directory exists"
else
  echo "   ❌ memory directory missing"
  exit 1
fi

echo ""
echo "=== All Tests Passed ✅ ==="
echo ""
echo "Optimization library is ready to use!"
echo "Run './quick.sh help' for quick commands"
echo "See 'lib/README.md' for full documentation"
