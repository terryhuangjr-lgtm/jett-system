# Macro News

**⚠️ PURGED: Unverified claims removed as of 2026-02-04**

Previously this file contained unverified claims without sources including:
- BTC price claims without verification
- Fed rate statements without links
- Inflation data without sources
- Market commentary without attribution

**New Standard:**
All macro news MUST include source URLs and verification dates.

---

## How to Log Macro News (Verified Only)

**Format:**
```markdown
✅ **[Claim]**
- Source: [URL]
- Date: [When published]
- Verified: [When you checked]
```

**Examples:**

✅ **BTC Price: $98,452**
- Source: https://api.coinbase.com/v2/prices/BTC-USD/spot
- Date: 2026-02-04 10:30 AM
- Verified: 2026-02-04 10:30 AM via API

✅ **Fed Holds Rates at 5.25-5.5%**
- Source: https://federalreserve.gov/newsevents/pressreleases/2026
- Date: Jan 31, 2026 FOMC meeting
- Verified: 2026-02-04 via web_search

✅ **CPI Report: Inflation at 2.9% YoY**
- Source: https://bls.gov/news.release/cpi.nr0.htm
- Date: Released Feb 1, 2026
- Verified: 2026-02-04 via web_search

---

## Run Verification Before Logging

```bash
node ~/clawd/automation/research-verifier.js \
  --claim "Your macro news claim" \
  --sources "url1,url2" \
  --type "macro"
```

---

Last updated: 2026-02-04
Status: Purged and ready for verified macro news only
