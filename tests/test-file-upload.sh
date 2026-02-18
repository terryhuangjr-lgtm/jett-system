#!/bin/bash
# Test file upload functionality

echo "=== File Upload Test Suite ==="
echo ""

# Test 1: Check if test file exists
echo "1. Testing file resolution..."
if [ -f test-upload.txt ]; then
  node lib/file-upload-helper.js check test-upload.txt
  echo "   ✅ test-upload.txt found"
else
  echo "test file content" > test-upload.txt
  echo "   ✅ Created test-upload.txt"
fi
echo ""

# Test 2: List available files
echo "2. Listing available files in workspace..."
node lib/file-upload-helper.js list | head -20
echo ""

# Test 3: Test path resolution
echo "3. Testing path resolution..."
RESOLVED=$(node lib/file-upload-helper.js resolve test-upload.txt)
echo "$RESOLVED" | grep -q "valid.*true" && echo "   ✅ Path resolution works" || echo "   ❌ Path resolution failed"
echo ""

# Test 4: Check PDF if exists
echo "4. Checking for PDF files..."
PDF_FILE=$(find /home/clawd/clawd -maxdepth 1 -name "*.pdf" -type f | head -1)
if [ -n "$PDF_FILE" ]; then
  echo "   Found: $(basename $PDF_FILE)"
  node lib/file-upload-helper.js debug "$PDF_FILE"
else
  echo "   No PDF files found in workspace"
fi
echo ""

# Test 5: Generate Gmail workflow
echo "5. Testing Gmail workflow generation..."
node lib/file-upload-helper.js gmail test-upload.txt test@example.com "Test Subject" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Gmail workflow generated"
else
  echo "   ❌ Gmail workflow failed"
fi
echo ""

# Test 6: Generate Drive workflow
echo "6. Testing Drive workflow generation..."
node lib/file-upload-helper.js drive test-upload.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Drive workflow generated"
else
  echo "   ❌ Drive workflow failed"
fi
echo ""

echo "=== File Upload Tests Complete ==="
echo ""
echo "Usage examples:"
echo "  ./quick.sh upload-check <file>    # Check file before upload"
echo "  node lib/file-upload-helper.js gmail <file> <to> <subject> <body>"
echo "  node lib/file-upload-helper.js drive <file> [folder]"
