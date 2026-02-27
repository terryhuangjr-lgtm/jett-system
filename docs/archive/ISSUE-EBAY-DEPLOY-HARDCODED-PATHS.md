# CRITICAL ISSUE - eBay Deploy Script Hardcoded Paths

**Status:** 🔴 BLOCKING eBay results deployment
**Severity:** Critical
**Created:** 2026-02-19 10:48 EST

---

## Problem

Deploy script is hardcoded to look for specific file paths that don't match what the scan produces.

**Evidence:**
- Scan runs successfully: `node run-from-config.js wednesday`
- Produces: `/home/clawd/clawd/ebay-scanner/results/multi_kobe_bryant_topps_chrome__topps_finest_1997_2005_r_2026-02-19.json` (32 deals found)
- Deploy script looks for: `/tmp/mj-upperdeck-scan.json` (doesn't exist)
- Result: Posts "empty" or old cached results to Slack

---

## Root Cause

**File:** `/home/clawd/clawd/automation/deploy-ebay-scans.js`

The script is hardcoded with old test file paths:
```
scan_file: /tmp/mj-upperdeck-scan.json
scan_name: MJ Upper Deck 96-00
```

Instead of dynamically finding the latest scan results from `/home/clawd/clawd/ebay-scanner/results/`

---

## Solution

Rewrite deploy script to:
1. Check `/home/clawd/clawd/ebay-scanner/results/` for today's files
2. Find the most recent scan file (by timestamp)
3. Read and parse it
4. Extract deals and post to Slack

OR:

Have scan script save a "latest-scan.json" pointer so deploy knows which file to use.

---

## Impact

- ❌ eBay results never deploy to #levelupcards (gets empty/cached results)
- ❌ Users never see daily deal findings
- ❌ Makes system appear broken when it's actually working

---

## Test Evidence

**Feb 19 Scan Run (10:35 AM):**
- ✅ Scan found: 365 Kobe listings
- ✅ Qualified: 32 deals  
- ✅ File saved: `multi_kobe_bryant_topps_chrome__topps_finest_1997_2005_r_2026-02-19.json`
- ❌ Deploy posted: Empty/old results (because looking for wrong file)

---

**For Mini:** This is a 30-minute fix. Just need to make the deploy script dynamic instead of hardcoded.
