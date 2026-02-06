# Permanent Automation Schedule

**Status:** LIVE - Auto-posting enabled
**Last Updated:** 2026-02-06 (Research automation rewritten to PROTOCOL v1.0)

---

## Daily Schedule

### 21M Sports Content (2 posts/day)

**3:00 AM** - Sports Research & Data Collection
- Script: `21m-sports-real-research.py` (PROTOCOL v1.0)
- Task: #59
- Outputs:
  - `memory/research/YYYY-MM-DD-contracts.md` (dated research)
  - `memory/verification-logs/YYYY-MM-DD.md` (verification log)
  - Database entries with sources
- Verification: Real web search, URL validation, database logging
- Exits on failure (no fake data)

**4:30 AM** - Bitcoin Research & Data Collection
- Script: `21m-bitcoin-real-research.py` (PROTOCOL v1.0)
- Task: #66
- Outputs:
  - `memory/research/YYYY-MM-DD-bitcoin.md` (dated research)
  - `memory/verification-logs/YYYY-MM-DD-bitcoin.md` (verification log)
  - Database entries with sources
- Topics: Bitcoin quotes, history, milestones, news
- Verification: Source URLs verified, database logging
- Exits on failure (no fake data)

**5:00 AM** - Content Generation #1
- Script: `21m-sports-verified-generator-v2.js`
- Task: #60
- Output: `memory/21m-sports-verified-content.json`
- Generates 3 tweet options from verified research
- Blocking validation: URLs, BTC calculations, placeholders

**7:30 AM** - Deploy Post #1 to #21msports
- Script: `deploy-21m-tweet.js`
- Task: #61
- Channel: #21msports (Slack)
- Pre-deployment validation gate
- Posts 3 verified options for selection

**11:00 AM** - Content Generation #2
- Script: `21m-sports-verified-generator-v2.js --output slot2`
- Task: #62
- Output: `memory/21m-sports-verified-content-slot2.json`
- Generates different 3 tweet options from same research

**12:00 PM** - Deploy Post #2 to #21msports
- Script: `deploy-21m-tweet.js`
- Task: #63
- Channel: #21msports (Slack)
- Posts second set of 3 verified options

---

### eBay Card Scans (Daily + Weekly)

**Daily 8:30 AM** - Deploy Previous Scan Results
- Script: `deploy-ebay-scans.js`
- Task: #38
- Channel: #levelupcards (Slack)
- Shows top 20 cards with links, scores, prices

**Weekly Scans (4:00 AM):**
- Monday (#28): MJ Topps Finest 1993-1999
- Tuesday (#31): Griffey Jr Chrome/Finest Refractors
- Wednesday (#58): Kobe Refractors
- Thursday (#29): MJ Upper Deck 1996-2000
- Friday (#33): Multi-Search (Kobe/Duncan/Dirk/Wade)
- Saturday (#30): MJ Base 1994-1999
- Sunday (#34): 2025 Cam Ward

---

## System Features

### Zero Fake Data System (21M Sports)
✅ Real API integration (CoinGecko for BTC prices)
✅ URL verification before content generation
✅ BTC calculation verification (<1% tolerance)
✅ Placeholder detection (blocks [...], XXX, TBD)
✅ Exits on any validation failure (no fake data possible)
✅ Complete audit trail (all API calls logged)
✅ Pre-deployment validation gate

### eBay Scanner
✅ Automated searches with scoring algorithm
✅ Deal detection based on price, seller quality, relevance
✅ Top 20 results with direct eBay links
✅ Condition, shipping, seller feedback included

---

## Monitoring

**Task Manager:** http://localhost:3000
**CLI:** `cd /home/clawd/clawd/task-manager && node cli.js list`

**Check logs:**
```bash
node cli.js logs 59  # 21M Research
node cli.js logs 61  # 21M Deploy #1
node cli.js logs 63  # 21M Deploy #2
node cli.js logs 38  # eBay Deploy
```

**Audit trails:**
- `/home/clawd/clawd/memory/21m-sports-api-log.jsonl` - API calls
- `/home/clawd/clawd/memory/21m-sports-deployments.log` - Deployments

---

## Cost

**21M Sports:** ~$1-2/month (CoinGecko free tier + minimal web searches)
**eBay Scans:** Free (runs locally)

**Total:** ~$1-2/month

---

## Emergency Stop

To disable all automation:
```bash
cd /home/clawd/clawd/task-manager
node cli.js remove 59 60 61 62 63 38 28 29 30 31 33 34 58
```

To disable just 21M:
```bash
node cli.js remove 59 60 61 62 63
```

To disable just eBay:
```bash
node cli.js remove 38 28 29 30 31 33 34 58
```

---

**System Status:** Operational 🟢
**Auto-posting:** ENABLED (live to Slack)
**Next maintenance:** Review after 7 days
