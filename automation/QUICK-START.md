# 21M Sports Zero Fake Data System - Quick Start

## TL;DR

New automation system that generates sports content with **zero fake data**. If research fails, system exits with error instead of generating unverified content.

## 🚀 Quick Test (5 minutes)

```bash
cd /home/clawd/clawd/automation

# Run full test suite
./test-21m-system.sh

# View generated content
cat /home/clawd/clawd/memory/21m-sports-verified-content.json
```

**Expected:** All tests pass, content has real sources.

## 📁 Key Files

| File | Purpose |
|------|---------|
| `21m-sports-real-research.js` | Fetch real data from APIs (no fallback) |
| `21m-sports-verified-generator-v2.js` | Generate content (only from verified data) |
| `21m-sports-validator.js` | Block bad content (not just warn) |
| `deploy-21m-tweet.js` | Deploy with validation gate |
| `test-21m-system.sh` | Test everything |
| `migrate-to-zero-fake-data.sh` | Deprecate old scripts |

## ⚡ Manual Run

```bash
# Step 1: Research (gets BTC price, verifies URLs)
node 21m-sports-real-research.js --dry-run --test-date 2026-02-06

# Step 2: Generate (creates 3 tweet variations)
node 21m-sports-verified-generator-v2.js --dry-run

# Step 3: Validate (blocks if bad)
node 21m-sports-validator.js --content-file=/home/clawd/clawd/memory/21m-sports-verified-content.json

# Step 4: Deploy (dry run - doesn't actually post)
node deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json --dry-run
```

## 🔍 What Changed?

### ❌ Old System (DEPRECATED)
- Had hardcoded fallback data (fake contracts)
- Generated fake Spotrac URLs
- Validators warned but didn't block
- Nearly posted fake content about Juan Soto

### ✅ New System
- **No fallback data** - exits 1 if research fails
- **Real URLs only** - verified via HTTP checks
- **Blocking validators** - stops bad content
- **Real APIs** - CoinGecko for BTC prices

## 📊 Output Example

**Research Output:**
```json
{
  "verification_status": "VERIFIED",
  "findings": [{
    "player": "Juan Soto",
    "contract_value": "$765M",
    "btc_equivalent": "12171.12",
    "sources": ["https://www.spotrac.com/..."]
  }],
  "btc_prices": {
    "2026-02-06": {
      "price": 62853.69,
      "source": "https://api.coingecko.com/..."
    }
  }
}
```

**Generated Tweets:**
```
Option 1: Juan Soto's $765M contract = 12171.12 BTC...
Option 2: Juan Soto signed for $765M. In BTC terms: 12171.12 BTC...
Option 3: The Juan Soto contract: $765M. Converted to BTC: 12171.12 BTC...
```

All tweets:
- ✅ Under 280 characters
- ✅ No placeholder text
- ✅ Real source URLs
- ✅ Verified calculations

## 🚨 Error Handling

### If Research Fails
```
❌ Research failed: CoinGecko API error

Action: Check API logs, retry later
DO NOT: Generate content anyway
```

### If Validation Fails
```
❌ VALIDATION FAILED: Source URLs not accessible

Action: Fix source URLs
DO NOT: Deploy content
```

### If Deployment Blocked
```
🚫 DEPLOYMENT BLOCKED - Content must pass validation

Action: Run validator to see what failed
DO NOT: Skip validation
```

## 📅 Migration Plan

### Week 1: Test
```bash
# Run new system manually (dry-run)
./test-21m-system.sh

# Compare with old system output
# Review for quality
```

### Week 2: Parallel
```bash
# Keep old system running
# Run new system daily
# Monitor error logs
```

### Week 3: Migrate
```bash
# Deprecate old scripts
./migrate-to-zero-fake-data.sh

# Update task scheduler
# Monitor for 1 week
```

## 🔧 Troubleshooting

### "Research file not found"
```bash
# Solution: Run research first
node 21m-sports-real-research.js --dry-run --test-date $(date +%Y-%m-%d)
```

### "URL not accessible"
```bash
# Check if URL works in browser
curl -I "https://www.spotrac.com/..."

# If 403: That's expected for Spotrac (they block HEAD requests)
# System accepts 403 for known scraping targets
```

### "BTC calculation mismatch"
```bash
# Re-run research to refresh price
node 21m-sports-real-research.js --dry-run --test-date $(date +%Y-%m-%d)
```

## 📖 Full Documentation

- **System Overview:** `21M-SPORTS-ZERO-FAKE-DATA-SYSTEM.md`
- **Implementation Details:** `IMPLEMENTATION-SUMMARY.md`
- **This Guide:** `QUICK-START.md`

## ✅ Success Checklist

Before using in production:

- [ ] Run `./test-21m-system.sh` - all tests pass
- [ ] Review generated content manually
- [ ] Verify sources are real and accessible
- [ ] Check audit logs are being written
- [ ] Test failure scenarios (old data, bad URLs)
- [ ] Run for 1 week manually
- [ ] Compare quality with old system
- [ ] Migrate with `./migrate-to-zero-fake-data.sh`

## 💡 Key Principles

1. **Accuracy > Efficiency** - Better no content than fake content
2. **Exit on Failure** - Don't generate content if research fails
3. **Verify Everything** - URLs, calculations, character counts
4. **Block Bad Content** - Validators exit 1, not just warn
5. **Audit Trail** - Log all API calls and errors

## 🆘 Support

- **Test Command:** `./test-21m-system.sh`
- **Docs:** `21M-SPORTS-ZERO-FAKE-DATA-SYSTEM.md`
- **Issues:** Report at GitHub

---

**Created:** 2026-02-06
**Status:** ✅ Ready for Testing
**Next:** Run test suite and review output
