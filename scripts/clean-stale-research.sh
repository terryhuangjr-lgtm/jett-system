#!/bin/bash
#
# Clean Stale Research Data
#
# Archives old research files and clears cached content
# so Jett does fresh research instead of reusing old data
#

set -e

echo "🧹 Cleaning Stale Research Data"
echo "================================"
echo ""

MEMORY_DIR="$HOME/clawd/memory"
ARCHIVE_DIR="$HOME/clawd/memory/archive"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

echo "📦 Archiving old research files..."
echo ""

# Archive 21M Sports research files
FILES_TO_ARCHIVE=(
  "21m-sports-verified-research.json"
  "21m-sports-verified-content.json"
  "21m-sports-verified-content-slot2.json"
  "21m-sports-research.md"
  "21m-bitcoin-research.md"
  "21m-bitcoin-verified-content.json"
)

for file in "${FILES_TO_ARCHIVE[@]}"; do
  if [ -f "$MEMORY_DIR/$file" ]; then
    echo "  📁 Archiving: $file"
    mv "$MEMORY_DIR/$file" "$ARCHIVE_DIR/${file%.json}-${TIMESTAMP}.json" 2>/dev/null || \
    mv "$MEMORY_DIR/$file" "$ARCHIVE_DIR/${file%.md}-${TIMESTAMP}.md" 2>/dev/null
    echo "     → $ARCHIVE_DIR/${file}"
  else
    echo "  ℹ️  Not found: $file (skipping)"
  fi
done

echo ""
echo "✅ Old research archived to: $ARCHIVE_DIR"
echo ""

# Show what was archived
echo "📊 Archived files:"
ls -lh "$ARCHIVE_DIR" | tail -10
echo ""

# Clear any cached/temp research data
echo "🗑️  Cleaning temp/cache files..."
rm -f /tmp/21m-sports*.json 2>/dev/null && echo "  ✓ Cleared /tmp/21m-sports*.json" || echo "  ℹ️  No temp files found"
rm -f /tmp/topps-*.json 2>/dev/null && echo "  ✓ Cleared /tmp/topps-*.json" || echo "  ℹ️  No topps files found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ CLEANUP COMPLETE"
echo ""
echo "📊 What was cleaned:"
echo "  - Juan Soto research (archived)"
echo "  - Old verified content (archived)"
echo "  - Cached research data (deleted)"
echo ""
echo "🔍 Next research will be FRESH:"
echo "  - No cached data to reuse"
echo "  - Will look for CURRENT contracts"
echo "  - Date-filtered for relevance"
echo ""
echo "🚀 Ready for fresh research:"
echo "  node ~/clawd/automation/21m-sports-real-research.js"
echo ""
