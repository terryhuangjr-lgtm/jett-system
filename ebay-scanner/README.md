# Michael Jordan eBay Auction Hunter (MVP)

## What it does
Scans eBay daily for rare Michael Jordan card auctions matching your specific criteria - NOT looking for arbitrage, just finding the rare stuff worth watching.

## How to run manually
Ask Jett: "Run the Michael Jordan eBay auction hunter"

Jett will:
1. Search eBay for MJ card AUCTIONS ($100-$2000 current bid)
2. Filter for rare cards: numbered parallels, rare inserts, autographs, PSA 10/BGS 9.5+ (NO base)
3. Pull recent sold comps for reference
4. Find top 10 active auctions worth watching
5. Email results to terryhuangjr@gmail.com with card details, current bid, time remaining, comp values, links

## Automated schedule
Runs daily at 1:00 PM ET via cron

## Files
- `config.json` - Full player list and criteria (for future expansion)
- `mj-results.json` - Latest scan results
- `email-body.html` - Generated email content

## Next steps (after testing)
Once MJ scanner works well for a few days:
1. Expand to Kobe, LeBron, etc.
2. Add all players from config.json
3. Optimize matching algorithm
