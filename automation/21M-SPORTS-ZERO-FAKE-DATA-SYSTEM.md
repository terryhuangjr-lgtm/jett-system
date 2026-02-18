# 21M Sports Zero Fake Data System

## Overview

This system generates Bitcoin-related sports content with **zero tolerance for fake data**. Every claim must be backed by verified sources, and the system will exit with an error rather than generate unverified content.

## Architecture

### Core Principles

1. **NO FALLBACK DATA** - If research fails, the pipeline stops
2. **REAL APIs ONLY** - CoinGecko for BTC prices, web search for contracts
3. **BLOCKING VALIDATION** - Validators must pass before content is generated
4. **SOURCE VERIFICATION** - Every URL is checked to be accessible
5. **FAIL-SAFE DESIGN** - Better no content than fake content

### Pipeline Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    21M Sports Pipeline                        │
└──────────────────────────────────────────────────────────────┘

1. Research (3:00 AM)
   ├─ 21m-sports-real-research.js
   ├─ Fetches BTC prices from CoinGecko API
   ├─ Searches for contracts (manual until web_search integrated)
   ├─ Verifies all source URLs
   └─ Output: verified-research.json (or EXIT 1)

2. Content Generation (5:00 AM)
   ├─ 21m-sports-verified-generator-v2.js
   ├─ Reads verified-research.json (<24 hours old)
   ├─ Verifies all source URLs again
   ├─ Calculates BTC conversions (verified within 1% tolerance)
   ├─ Generates 3 tweet variations
   ├─ Validates character counts (<280 chars)
   └─ Output: verified-content.json (or EXIT 1)

3. Validation (Built into generator & deploy)
   ├─ 21m-sports-validator.js
   ├─ Checks verified flag
   ├─ Verifies URL accessibility
   ├─ Validates BTC calculations
   ├─ Checks for placeholder text
   └─ EXIT 0 or EXIT 1 (blocks deployment)

4. Deployment (7:30 AM)
   ├─ deploy-21m-tweet.js
   ├─ Runs pre-deployment validation
   ├─ Posts to #21msports channel
   └─ Logs to audit trail
```

## Files

### New Scripts (Production)

| File | Purpose | Exit Codes |
|------|---------|------------|
| `21m-sports-real-research.js` | Fetch real data from APIs | 0=success, 1=failed |
| `21m-sports-verified-generator-v2.js` | Generate verified content | 0=success, 1=failed |
| `21m-sports-validator.js` (enhanced) | Block bad content | 0=passed, 1=blocked |
| `deploy-21m-tweet.js` (enhanced) | Deploy with validation | 0=deployed, 1=blocked |
| `test-21m-system.sh` | Full pipeline test | 0=all pass, 1=failed |

### Deprecated Scripts (DO NOT USE)

| File | Reason for Deprecation |
|------|------------------------|
| `21m-sports-researcher.js` | Has hardcoded fallback data (lines 87-99) |
| `21m-sports-auto-verified.js` | Constructs fake URLs (lines 175-194) |

**Action Required:** Rename these files to `.DEPRECATED` after verifying new system works:
```bash
mv 21m-sports-researcher.js 21m-sports-researcher.js.DEPRECATED
mv 21m-sports-auto-verified.js 21m-sports-auto-verified.js.DEPRECATED
```

## API Integration

### CoinGecko API

**Endpoint:** `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=DD-MM-YYYY`

**Features:**
- Historical BTC prices (free tier: last 365 days)
- Caching (24 hour TTL) via StateManager
- Retry logic (3 attempts with exponential backoff)
- User-Agent header required

**Rate Limits:**
- Free tier: 50 requests/minute
- Cached aggressively to avoid hitting limits

**Example:**
```javascript
const btcData = await getBTCPriceForDate('06-02-2026');
// Returns: { price: 62853.69, source: "https://...", cached: false }
```

### Web Search (TODO)

**Status:** Not yet integrated (manual research required)

**Planned Integration:**
- Brave Search API via `web_search` tool
- Queries: "recent MLB contracts 2026 Spotrac"
- Extract real URLs from search results

**Current Workaround:**
- Dry-run mode uses known contract data
- Production requires manual research

## Validation Rules

### Blocking Errors (EXIT 1)

The system will FAIL and EXIT 1 if:

1. **Research Phase:**
   - CoinGecko API fails after 3 retries
   - No contract data found
   - Source URLs return 404/500

2. **Generation Phase:**
   - Research file missing or >24 hours old
   - Source URLs not accessible
   - BTC calculations incorrect (>1% error)
   - Placeholder text found: `[...]`, `{...}`, `XXX`, `TBD`, `TODO`
   - Character count >280

3. **Deployment Phase:**
   - `metadata.verified !== true`
   - Missing source URLs
   - Validator fails

### Non-Blocking Warnings

These generate warnings but don't block:
- Uncertainty words: "probably", "likely", "roughly"
- Unverified percentages (unless explicitly sourced)
- Hypothetical language: "could've", "would've"

## Output Formats

### verified-research.json

```json
{
  "type": "21m_sports_research",
  "timestamp": "2026-02-06T14:30:49.766Z",
  "findings": [
    {
      "player": "Juan Soto",
      "contract_value": "$765M",
      "contract_value_usd": 765000000,
      "signing_date": "2026-02-06",
      "btc_equivalent": "12171.12",
      "sources": [
        "https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/"
      ]
    }
  ],
  "btc_prices": {
    "2026-02-06": {
      "price": 62853.69,
      "source": "https://api.coingecko.com/api/v3/..."
    }
  },
  "verification_status": "VERIFIED"
}
```

### verified-content.json

```json
{
  "type": "21m_sports_tweets",
  "timestamp": "2026-02-06T14:31:47.123Z",
  "tweets": [
    "Juan Soto's $765M contract = 12171.12 BTC...",
    "Juan Soto signed for $765M...",
    "The Juan Soto contract: $765M..."
  ],
  "sources": {
    "contract": "https://www.spotrac.com/...",
    "btc_price": "https://api.coingecko.com/...",
    "additional": []
  },
  "metadata": {
    "player": "Juan Soto",
    "contract_value": "$765M",
    "signing_date": "2026-02-06",
    "btc_price_on_date": "$62,854",
    "btc_equivalent": "12171.12 BTC",
    "verified": true,
    "char_counts": [169, 161, 165],
    "pillars_used": [
      "contract_analysis",
      "bitcoin_standard",
      "fiat_debasement"
    ]
  }
}
```

## Content Pillars

The generator creates 3 variations per research finding:

### 1. Contract Analysis
Direct fiat vs BTC comparison. Shows how contract value looks in Bitcoin terms.

**Example:**
```
Juan Soto's $765M contract = 12171.12 BTC

When signed, Bitcoin was at $62,854. That same contract today?
Worth a fraction in BTC terms.

Fiat devalues. Bitcoin doesn't.
```

### 2. Bitcoin Standard
Percentage of 21M total supply. Emphasizes Bitcoin's fixed scarcity.

**Example:**
```
Juan Soto signed for $765M

In BTC terms: 12171.12 BTC
= 0.057958% of the 21M total supply

Every contract measured against fixed supply reveals fiat's weakness.
```

### 3. Fiat Debasement
Historical purchasing power erosion. Shows fiat losing value over time.

**Example:**
```
The Juan Soto contract: $765M

Converted to BTC: 12171.12 BTC @ $62,854

As fiat loses purchasing power, measuring wealth in Bitcoin
reveals true value preservation.
```

## Testing

### Run Full Test Suite

```bash
cd /home/clawd/clawd/automation
./test-21m-system.sh
```

**Expected Output:**
```
✅ ALL TESTS PASSED!

Summary:
  ✓ Real research script works
  ✓ Research output is valid and verified
  ✓ Content generator V2 works
  ✓ Content output is valid and verified
  ✓ Enhanced validator blocks bad content
  ✓ Deploy script has pre-deployment validation
```

### Manual Testing

1. **Test Research Script:**
   ```bash
   node 21m-sports-real-research.js --dry-run --test-date 2026-02-06
   ```

2. **Test Generator:**
   ```bash
   node 21m-sports-verified-generator-v2.js --dry-run
   ```

3. **Test Validator:**
   ```bash
   node 21m-sports-validator.js --content-file=/home/clawd/clawd/memory/21m-sports-verified-content.json
   ```

4. **Test Deploy:**
   ```bash
   node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json --dry-run
   ```

### Test Failure Scenarios

**Old data should fail:**
```bash
# Make research file old
touch -t 202601010000 /home/clawd/clawd/memory/21m-sports-verified-research.json

# Generator should fail with "research file too old"
node 21m-sports-verified-generator-v2.js
```

**Bad calculations should fail:**
```bash
# Manually edit verified-content.json to have wrong BTC amount
# Validator should fail with "BTC calculation mismatch"
node 21m-sports-validator.js --content-file=...
```

## Audit Trails

### API Call Log

**File:** `/home/clawd/clawd/memory/21m-sports-api-log.jsonl`

Logs every API call for debugging and rate limit tracking:
```jsonl
{"timestamp":"2026-02-06T14:30:49.766Z","api":"coingecko","url":"https://...","success":true,"error":null}
{"timestamp":"2026-02-06T14:30:50.123Z","api":"spotrac","url":"https://...","success":false,"error":"404 Not Found"}
```

### Error Log

**File:** `/home/clawd/clawd/memory/21m-sports-research-errors.jsonl`

Logs all research failures:
```jsonl
{"timestamp":"2026-02-06T14:30:49.766Z","stage":"btc_price_fetch","error":"API rate limit exceeded","context":{"date":"06-02-2026"}}
```

### Deployment Log

**File:** `/home/clawd/clawd/memory/21m-sports-deployments.log`

Logs every deployment attempt (success or failure):
```jsonl
{"timestamp":"2026-02-06T14:32:00.000Z","content_type":"21m_sports_tweets","player":"Juan Soto","verified":true,"dry_run":false}
```

## Scheduling

### Recommended Schedule

| Time | Task | Script | Duration |
|------|------|--------|----------|
| 3:00 AM | Research | `21m-sports-real-research.js` | ~30s |
| 5:00 AM | Generate | `21m-sports-verified-generator-v2.js` | ~10s |
| 7:30 AM | Deploy | `deploy-21m-tweet.js` | ~5s |

### Task Manager Integration

Update `/home/clawd/clawd/lib/task-scheduler.js` (or equivalent):

```javascript
{
  name: '21m-sports-research',
  schedule: '0 3 * * *', // 3 AM daily
  script: '/home/clawd/clawd/automation/21m-sports-real-research.js',
  timeout: 60000,
  onError: 'alert-slack' // Alert if research fails
},
{
  name: '21m-sports-generate',
  schedule: '0 5 * * *', // 5 AM daily
  script: '/home/clawd/clawd/automation/21m-sports-verified-generator-v2.js',
  dependsOn: '21m-sports-research', // Only run if research succeeded
  timeout: 30000
},
{
  name: '21m-sports-deploy',
  schedule: '30 7 * * *', // 7:30 AM daily
  script: '/home/clawd/clawd/automation/deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json',
  dependsOn: '21m-sports-generate',
  timeout: 30000
}
```

## Error Handling

### When Research Fails

**Symptoms:**
- `verified-research.json` not created
- Exit code 1
- Error logged to `21m-sports-research-errors.jsonl`

**Action:**
1. Check API logs: `tail -20 /home/clawd/clawd/memory/21m-sports-api-log.jsonl`
2. Check error logs: `tail -20 /home/clawd/clawd/memory/21m-sports-research-errors.jsonl`
3. Common causes:
   - CoinGecko rate limit exceeded → Wait 1 hour
   - Contract data not found → Manual research required
   - Network timeout → Retry script

**DO NOT:**
- Generate content without verified research
- Use old research data (>24 hours)
- Add fallback data to "fix" it

### When Generation Fails

**Symptoms:**
- `verified-content.json` not created or invalid
- Exit code 1
- Validator errors

**Action:**
1. Check if research file exists and is recent
2. Run validator manually: `node 21m-sports-validator.js --content-file=...`
3. Common causes:
   - Research file too old → Re-run research
   - Source URLs inaccessible → Verify URLs in browser
   - BTC calculation mismatch → Check research data

### When Deployment Fails

**Symptoms:**
- Content not posted to #21msports
- Exit code 1

**Action:**
1. Check pre-deployment validation output
2. Verify Slack channel ID is correct
3. Check `clawdbot` is configured

## Migration from Old System

### Step 1: Verify New System Works

```bash
# Run full test suite
./test-21m-system.sh

# Review generated content
cat /home/clawd/clawd/memory/21m-sports-verified-content.json

# Manually review tweets for accuracy
```

### Step 2: Run in Parallel (Week 1)

- Keep old scripts running
- Run new scripts manually (dry-run mode)
- Compare output quality

### Step 3: Switch to New System (Week 2)

```bash
# Deprecate old scripts
mv 21m-sports-researcher.js 21m-sports-researcher.js.DEPRECATED
mv 21m-sports-auto-verified.js 21m-sports-auto-verified.js.DEPRECATED

# Update task scheduler to use new scripts
# (see "Scheduling" section above)
```

### Step 4: Monitor (Week 3+)

- Check audit logs daily
- Review content quality
- Track error rates
- Verify no fake data generated

## Success Criteria

After migration, verify:

- ✅ No hardcoded fallback data in any script
- ✅ All claims have real source URLs (HTTP 200 or verified 403)
- ✅ BTC calculations verified to <1% error
- ✅ Failed research sessions exit 1 (don't generate fake content)
- ✅ Validators block bad content (not just warn)
- ✅ All API calls logged to audit trail
- ✅ Test suite passes 100%

## Cost Estimate

### API Usage (Monthly)

- **CoinGecko:** Free tier (50 calls/min)
  - 30 days × 1 call/day = 30 calls/month
  - Cost: $0 (within free tier)

- **Web Search:** (When integrated)
  - 30 days × 3 queries/day = 90 queries/month
  - Cost: ~$0.20-0.50 (depending on provider)

**Total:** <$1/month

### Token Usage

- Research: ~500 tokens/session
- Generation: ~300 tokens/session
- Validation: ~100 tokens/session
- Monthly: ~30 sessions × 900 tokens = 27,000 tokens
- Cost: ~$0.54/month @ $0.02/1k tokens

**Total Cost:** ~$1-2/month

**User priority:** Accuracy > Efficiency

## Troubleshooting

### "Research file not found"

**Cause:** Research script failed or hasn't run yet

**Fix:**
```bash
node 21m-sports-real-research.js --dry-run --test-date $(date +%Y-%m-%d)
```

### "URL not accessible"

**Cause:** Source URL returns 404/500 or is blocked

**Fix:**
1. Verify URL in browser
2. Check if site blocks automated requests
3. Update URL in research data
4. If Spotrac/CoinGecko: Check User-Agent header

### "BTC calculation mismatch"

**Cause:** Math error or stale BTC price

**Fix:**
1. Verify BTC price is correct
2. Re-run research to refresh price
3. Check calculation logic in generator

### "Content file too old"

**Cause:** Research file >24 hours old

**Fix:**
```bash
node 21m-sports-real-research.js --dry-run --test-date $(date +%Y-%m-%d)
```

## Support

**Issues:** Report at `https://github.com/anthropics/claude-code/issues`

**Documentation:** This file (`21M-SPORTS-ZERO-FAKE-DATA-SYSTEM.md`)

**Code:** `/home/clawd/clawd/automation/21m-sports-*.js`

---

**Last Updated:** 2026-02-06

**Version:** 1.0.0

**Status:** ✅ Production Ready (after integration testing)
