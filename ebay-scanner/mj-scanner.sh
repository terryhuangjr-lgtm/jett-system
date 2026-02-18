#!/bin/bash
# Michael Jordan eBay Arbitrage Scanner (MVP)
# Searches for MJ cards, compares active vs sold, finds opportunities

WORKSPACE="/home/clawd/clawd/ebay-scanner"
RESULTS_FILE="$WORKSPACE/mj-results.json"
EMAIL_BODY="$WORKSPACE/email-body.html"

echo "🏀 Scanning eBay for Michael Jordan arbitrage opportunities..."
echo "Time: $(date)"

# Run the scanner via clawdbot
clawdbot chat << 'EOF'
Search eBay for Michael Jordan basketball cards with these criteria:
- Price range: $100-$2000
- Exclude base cards and common rookies
- Focus on: numbered parallels, rare inserts, autographs, PSA 10 or BGS 9.5+
- Search ACTIVE Buy It Now listings
- Then search SOLD/COMPLETED listings
- Compare prices and find cards where active price is 15%+ below recent sold average
- Generate top 10 opportunities with:
  * Card description
  * Current price
  * Average sold price (last 5-10 sales)
  * Arbitrage %
  * eBay listing URL

Save results to /home/clawd/clawd/ebay-scanner/mj-results.json

Then create an HTML email at /home/clawd/clawd/ebay-scanner/email-body.html with the top 10 formatted nicely.
EOF

echo "Scan complete. Results saved to $RESULTS_FILE"
