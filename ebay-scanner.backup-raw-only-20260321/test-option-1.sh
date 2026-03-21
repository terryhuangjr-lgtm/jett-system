#!/bin/bash
# Quick test script to verify Option 1 improvements

echo "════════════════════════════════════════════════════════"
echo "🧪 TESTING OPTION 1 FILTER IMPROVEMENTS"
echo "════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

echo "✅ Changes applied:"
echo "   - Listing age: 7 → 21 days"
echo "   - Comp search: Broadened matching"
echo "   - Price variance: Added 5% check"
echo ""

echo "📝 Quick verification:"
echo ""

# Check listing age in advanced-filter.js
echo "1. Checking listing age filter..."
LISTING_AGE=$(grep -A 1 "maxListingAge = " advanced-filter.js | grep -o "[0-9]\+" | head -1)
if [ "$LISTING_AGE" = "21" ]; then
  echo "   ✅ Listing age set to 21 days"
else
  echo "   ❌ Listing age is $LISTING_AGE (expected 21)"
fi
echo ""

# Check if price variance method exists
echo "2. Checking price variance method..."
if grep -q "isPriceWithinVariance" comp-analyzer.js; then
  echo "   ✅ Price variance method added"
else
  echo "   ❌ Price variance method missing"
fi
echo ""

# Check if expanded brand list exists
echo "3. Checking expanded comp matching..."
if grep -q "donruss" comp-analyzer.js; then
  echo "   ✅ Expanded brand list found"
else
  echo "   ❌ Brand list not expanded"
fi
echo ""

echo "════════════════════════════════════════════════════════"
echo "🚀 READY TO TEST"
echo "════════════════════════════════════════════════════════"
echo ""
echo "To test the new filters, run:"
echo ""
echo "  node flexible-search-template.js"
echo ""
echo "Expected improvements:"
echo "  - More results (8-15 vs 1-3 before)"
echo "  - Better comp matching"
echo "  - Price variance filtering"
echo ""
echo "If results still suck after testing:"
echo "  - Read OPTION-2-BACKUP-PLAN.md"
echo "  - Consider implementing simpler approach"
echo ""
