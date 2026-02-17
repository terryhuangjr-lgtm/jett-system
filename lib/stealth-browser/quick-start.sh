#!/bin/bash
# Quick start script for Stealth Browser

echo "=== Stealth Browser Quick Start ==="
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Try these examples:"
echo ""
echo "1. Scrape a webpage:"
echo "   node lib/stealth-browser/cli.js scrape --url https://example.com"
echo ""
echo "2. Search eBay for vintage jerseys:"
echo "   node lib/stealth-browser/example-ebay.js 'vintage jersey'"
echo ""
echo "3. Take a screenshot:"
echo "   node lib/stealth-browser/cli.js screenshot --url https://ebay.com --output ebay.png"
echo ""
echo "4. Interactive mode (test anti-detection):"
echo "   node lib/stealth-browser/cli.js interactive --url https://ebay.com --headless false"
echo ""
echo "For full documentation: cat lib/stealth-browser/README.md"
