# Fix: 21M Sports Content Source Validation Failure

## Problem

The `deploy-21m-tweet.js` script is failing validation with:
```
❌ VERIFICATION FAILED: Missing contract/knowledge source
```

**Root cause:** The content generator creates `21m-sports-verified-content.json` but doesn't include the contract source URLs that exist in `21m-sports-verified-research.json`.

## Files Involved

1. **Research file:** `/home/clawd/clawd/memory/21m-sports-verified-research.json`
   - ✅ Contains all contract sources (Spotrac URLs)
   - ✅ Contains BTC price sources
   - ✅ Has full verification data

2. **Content file:** `/home/clawd/clawd/memory/21m-sports-verified-content.json`
   - ❌ Missing `sources.contract` field
   - ❌ Missing proper source URLs from research
   - ✅ Has the actual tweet text

3. **Validator:** `/home/clawd/clawd/automation/21m-sports-validator.js`
   - Requires: `sources.contract` OR `sources.knowledge`
   - Requires: `sources.btc_price`
   - Blocks deployment if missing

## Current Content Structure (BROKEN)

```json
{
  "type": "21m_sports_tweets",
  "tweets": ["...tweet text..."],
  "sources": {
    "btc_price": "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    "content_count": 3
  },
  "metadata": {
    "verified": true
  }
}
```

## Required Content Structure (FIXED)

```json
{
  "type": "21m_sports_tweets",
  "tweets": ["...tweet text..."],
  "sources": {
    "contract": "https://www.spotrac.com/nfl/baltimore-ravens/lamar-jackson-21754/",
    "btc_price": "https://api.coingecko.com/api/v3/coins/bitcoin/history?date=2023-04-27"
  },
  "metadata": {
    "verified": true,
    "player": "Lamar Jackson",
    "contract_value": "$260M",
    "btc_equivalent": "8666.67",
    "btc_price_on_date": "$30,000"
  }
}
```

## Solution

**Update the content generator script** (wherever it creates the content JSON) to:

1. **Read the research file:** `/home/clawd/clawd/memory/21m-sports-verified-research.json`

2. **Extract the source URLs** from the research findings:
   - `findings[0].sources[0]` → Contract URL (Spotrac)
   - `btc_prices[date].source` → BTC price URL

3. **Include them in the content JSON** under `sources.contract` and `sources.btc_price`

4. **Copy metadata** from research to content file:
   - `player`
   - `contract_value`
   - `btc_equivalent`
   - `btc_price_on_date`

## Code Changes Needed

Find the script that generates `21m-sports-verified-content.json` and add:

```javascript
// Read research file
const researchPath = '/home/clawd/clawd/memory/21m-sports-verified-research.json';
const research = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

// Get the first finding (or match by player name)
const finding = research.findings[0];
const signingDate = finding.signing_date;

// Build content JSON with proper sources
const content = {
  type: "21m_sports_tweets",
  tweets: generatedTweets,
  sources: {
    contract: finding.sources[0], // Spotrac URL
    btc_price: research.btc_prices[signingDate].source // CoinGecko API URL
  },
  metadata: {
    verified: true,
    player: finding.player,
    contract_value: finding.contract_value,
    btc_equivalent: finding.btc_equivalent,
    btc_price_on_date: finding.btc_price_on_date
  }
};

// Write to content file
fs.writeFileSync('/home/clawd/clawd/memory/21m-sports-verified-content.json', 
                 JSON.stringify(content, null, 2));
```

## Verification After Fix

Run the validator manually to confirm:
```bash
node /home/clawd/clawd/automation/21m-sports-validator.js \
  --content-file="/home/clawd/clawd/memory/21m-sports-verified-content.json"
```

Should output:
```
✓ Content marked as verified
✓ Sources present
✓ All URLs accessible
✅ CONTENT FILE VALIDATION PASSED
```

## Current Verified Content Available

The research file has 3 verified contracts ready to use:

1. **Lamar Jackson** - $260M → 8666 BTC (2023)
   - Source: https://www.spotrac.com/nfl/baltimore-ravens/lamar-jackson-21754/

2. **Patrick Mahomes** - $450M → 48,913 BTC (2020)
   - Source: https://www.spotrac.com/nfl/kansas-city-chiefs/patrick-mahomes-21751/

3. **Jalen Brunson** - $157M → 2582 BTC (2024)
   - Source: https://www.spotrac.com/nba/new-york-knicks/jalen-brunson-4485/

All are verified and ready - just need the generator to include the sources properly.

---

**Priority:** HIGH - Blocks all 21M Sports deployments until fixed
**Assigned to:** Claude Code / Mini
**Created:** 2026-02-14 08:08 AM EST
