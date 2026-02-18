#!/bin/bash
# eBay Test Scraper - Demonstration
# Searches for vintage sports items and saves results

DATE=$(date +%Y-%m-%d-%H%M)
OUTPUT_DIR="/home/clawd/clawd/automation/output/ebay"
mkdir -p "$OUTPUT_DIR"

echo "=== eBay Test Scraper - $DATE ==="

# Test search: vintage baseball jerseys
SEARCH_TERM="vintage baseball jersey"

echo "Searching eBay for: $SEARCH_TERM"

cd /home/clawd/clawd/lib/stealth-browser

# Run eBay example script
node example-ebay.js "$SEARCH_TERM" > "$OUTPUT_DIR/results-$DATE.txt" 2>&1

echo "✓ Results saved to $OUTPUT_DIR/results-$DATE.txt"
echo ""
echo "Preview (first 30 lines):"
head -30 "$OUTPUT_DIR/results-$DATE.txt"
