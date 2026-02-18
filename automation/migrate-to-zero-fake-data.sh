#!/bin/bash
#
# Migration Script: Deprecate Old 21M Sports Scripts
# Run this after verifying new system works for 1 week
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "════════════════════════════════════════════════════════════════════"
echo "21M Sports - Migration to Zero Fake Data System"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  WARNING: This will deprecate the old scripts with fake data"
echo ""
echo "Prerequisites:"
echo "  ✓ New system tested for at least 1 week"
echo "  ✓ All tests passing (./test-21m-system.sh)"
echo "  ✓ Content quality manually reviewed"
echo "  ✓ Error rates acceptable (<5%)"
echo ""

# Check if tests pass
echo "Step 1: Running system tests..."
echo "─────────────────────────────────────────────────────────────────────"

if ! "$SCRIPT_DIR/test-21m-system.sh" > /tmp/migration-test.log 2>&1; then
  echo "❌ System tests FAILED"
  echo ""
  echo "Test output:"
  tail -50 /tmp/migration-test.log
  echo ""
  echo "❌ Migration ABORTED - fix test failures first"
  exit 1
fi

echo "✅ All tests passed"
echo ""
echo ""

# Show what will be deprecated
echo "Step 2: Files to be deprecated"
echo "─────────────────────────────────────────────────────────────────────"

OLD_FILES=(
  "21m-sports-researcher.js"
  "21m-sports-auto-verified.js"
)

for file in "${OLD_FILES[@]}"; do
  if [ -f "$SCRIPT_DIR/$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ⚠ $file (not found - may already be deprecated)"
  fi
done

echo ""
echo ""

# Confirm with user
echo "Step 3: Confirmation"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
read -p "Do you want to proceed with deprecation? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo "❌ Migration cancelled by user"
  exit 0
fi

echo ""
echo ""

# Backup old scripts
echo "Step 4: Backing up old scripts"
echo "─────────────────────────────────────────────────────────────────────"

BACKUP_DIR="$SCRIPT_DIR/deprecated-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

for file in "${OLD_FILES[@]}"; do
  if [ -f "$SCRIPT_DIR/$file" ]; then
    cp "$SCRIPT_DIR/$file" "$BACKUP_DIR/"
    echo "  ✓ Backed up: $file"
  fi
done

echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo ""

# Rename files
echo "Step 5: Deprecating old scripts"
echo "─────────────────────────────────────────────────────────────────────"

for file in "${OLD_FILES[@]}"; do
  if [ -f "$SCRIPT_DIR/$file" ]; then
    mv "$SCRIPT_DIR/$file" "$SCRIPT_DIR/$file.DEPRECATED"
    echo "  ✓ Deprecated: $file → $file.DEPRECATED"
  fi
done

echo ""
echo ""

# Add deprecation notice
echo "Step 6: Adding deprecation notices"
echo "─────────────────────────────────────────────────────────────────────"

for file in "${OLD_FILES[@]}"; do
  if [ -f "$SCRIPT_DIR/$file.DEPRECATED" ]; then
    cat > "$SCRIPT_DIR/$file.DEPRECATED.txt" << EOF
DEPRECATED: $file

This script has been deprecated due to fake data generation issues.

Issue: Contains hardcoded fallback data that nearly got auto-posted
Example: Claimed Juan Soto signed a contract in 2015 (he wasn't in MLB until 2018)

Replacement: 21M Sports Zero Fake Data System
- 21m-sports-real-research.js (real API integration)
- 21m-sports-verified-generator-v2.js (no fake URLs)
- Enhanced validation (blocking errors)

Documentation: 21M-SPORTS-ZERO-FAKE-DATA-SYSTEM.md

Migration Date: $(date +%Y-%m-%d)
EOF
    echo "  ✓ Created notice: $file.DEPRECATED.txt"
  fi
done

echo ""
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════════"
echo "✅ Migration Complete!"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "What was done:"
echo "  ✓ Backed up old scripts to: $BACKUP_DIR"
echo "  ✓ Renamed old scripts to .DEPRECATED"
echo "  ✓ Added deprecation notices"
echo ""
echo "Active scripts:"
echo "  • 21m-sports-real-research.js (NEW)"
echo "  • 21m-sports-verified-generator-v2.js (NEW)"
echo "  • 21m-sports-validator.js (ENHANCED)"
echo "  • deploy-21m-tweet.js (ENHANCED)"
echo ""
echo "Next steps:"
echo "  1. Update task scheduler to use new scripts"
echo "  2. Remove old scripts from scheduler"
echo "  3. Monitor for 1 week"
echo "  4. Review audit logs daily"
echo ""
echo "Rollback (if needed):"
echo "  cd $BACKUP_DIR"
echo "  mv *.js $SCRIPT_DIR/"
echo ""
echo "Documentation:"
echo "  cat 21M-SPORTS-ZERO-FAKE-DATA-SYSTEM.md"
echo ""
