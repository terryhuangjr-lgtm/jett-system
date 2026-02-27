# Automation Playbook - Jett's Guide

## New Capabilities (Feb 2, 2026)

Claude Code built two powerful tools that change how we work:

### 🕵️ Stealth Browser
**Location:** `/home/clawd/clawd/lib/stealth-browser/`  
**What:** Anti-detection web scraper that bypasses bot protection  
**Token Savings:** 97% reduction vs my browser automation

### 📋 Task Manager
**Location:** `/home/clawd/clawd/task-manager/`  
**Dashboard:** http://localhost:3000 (NOW RUNNING)  
**What:** Complete automation system for scheduling tasks  
**Token Savings:** 100% - runs locally, zero API calls

---

## Common Workflows

### 1. Schedule a Daily Web Scrape

**Example: eBay vintage jersey monitoring**

```bash
cd /home/clawd/clawd
node task-manager/cli.js add "eBay Vintage Jerseys" \
  "node lib/stealth-browser/example-ebay.js 'vintage jersey'" \
  --schedule "daily at 06:00" \
  --description "Morning eBay price check"
```

**Result:** Runs every morning at 6 AM, saves results, zero tokens

---

### 2. Scrape a Website Once

**Example: Competitor research**

```bash
node lib/stealth-browser/cli.js scrape \
  --url https://competitor.com/products \
  --selector ".product-price" \
  --multiple true \
  --output competitor-prices.json
```

**Result:** Scraped data in JSON format, ready to analyze

---

### 3. Take Website Screenshots

**Example: Track visual changes**

```bash
node lib/stealth-browser/cli.js screenshot \
  --url https://example.com \
  --output screenshot.png \
  --fullPage true
```

---

### 4. Schedule Hourly Monitoring

**Example: Monitor marketplace listings**

```bash
node task-manager/cli.js add "Marketplace Monitor" \
  "node lib/stealth-browser/cli.js scrape --url https://marketplace.com --output /tmp/listings.json" \
  --schedule "hourly"
```

---

### 5. Run Task Immediately (One-Time)

```bash
node task-manager/cli.js add "Quick Research" \
  "node lib/stealth-browser/cli.js scrape --url https://site.com"
```

**Result:** Task runs once on next worker check (within 30s)

---

### 6. Complex Scraping with Sessions

**Example: Site requiring login**

```bash
# First time - login manually
node lib/stealth-browser/cli.js scrape \
  --url https://site.com/login \
  --session myaccount \
  --headless false
# (Login in browser that opens)

# Future runs - automatically logged in
node lib/stealth-browser/cli.js scrape \
  --url https://site.com/data \
  --session myaccount \
  --output data.json
```

---

## Task Manager Commands

### View All Tasks
```bash
node task-manager/cli.js list
```

### View Task Details
```bash
node task-manager/cli.js show <task-id>
```

### View Task Logs
```bash
node task-manager/cli.js logs <task-id>
```

### Delete Task
```bash
node task-manager/cli.js remove <task-id>
```

### Statistics
```bash
node task-manager/cli.js stats
```

---

## Best Practices

### 1. Test Commands First
Run commands manually before scheduling:
```bash
# Test first
node lib/stealth-browser/cli.js scrape --url https://site.com

# Then schedule if it works
node task-manager/cli.js add "Scheduled Scrape" \
  "node lib/stealth-browser/cli.js scrape --url https://site.com" \
  --schedule "daily at 06:00"
```

### 2. Use Absolute Paths
```bash
# Good
node /home/clawd/clawd/lib/stealth-browser/cli.js scrape --url https://site.com

# Bad (might fail from worker context)
node cli.js scrape --url https://site.com
```

### 3. Save Results to Known Locations
```bash
--output /home/clawd/clawd/data/results.json
```

### 4. Use Sessions for Login Sites
```bash
--session session-name
```

### 5. Set Priorities for Important Tasks
```bash
--priority 10  # Higher = runs first
```

---

## Integration with My Workflow

### When Terry Asks for Research
**Old way:** I use 50k tokens to browse and scrape  
**New way:** I schedule a task, it runs locally, costs $0

### For Overnight Jobs
**Perfect use case:**
```bash
node task-manager/cli.js add "Overnight Research" \
  "bash /home/clawd/clawd/scripts/overnight-research.sh" \
  --schedule "daily at 02:00"
```

### For Recurring Monitoring
**Set it and forget it:**
```bash
node task-manager/cli.js add "Daily Price Check" \
  "node lib/stealth-browser/cli.js scrape --url https://site.com/prices" \
  --schedule "daily at 06:00"
```

---

## Token Savings Calculator

| Task | Old Method | New Method | Savings |
|------|------------|------------|---------|
| Daily eBay check | 50k tokens | 0 tokens | 100% |
| Hourly monitoring | 120k tokens/day | 0 tokens | 100% |
| Overnight research | 200k tokens | 0 tokens | 100% |
| Website scraping | 40k tokens | 0 tokens | 100% |

**Result:** Massive reduction in API costs, freed up for high-value work

---

## Real-World Use Cases for Terry

### 1. eBay Gem Finder
```bash
node task-manager/cli.js add "eBay MJ Cards" \
  "node lib/stealth-browser/example-ebay.js 'michael jordan psa 10'" \
  --schedule "daily at 06:00"
```

### 2. Competitor Price Monitoring
```bash
node task-manager/cli.js add "Competitor Prices" \
  "node lib/stealth-browser/cli.js scrape --url https://competitor.com/products --selector '.price' --multiple true --output /home/clawd/clawd/data/competitor-prices.json" \
  --schedule "daily at 12:00"
```

### 3. 21M Sports Content Research
```bash
node task-manager/cli.js add "Sports Contract News" \
  "node lib/stealth-browser/cli.js scrape --url https://sportsbusiness.com/contracts --output /home/clawd/clawd/21m-research/contracts/daily.json" \
  --schedule "daily at 07:00"
```

### 4. Opportunity Scanner
```bash
node task-manager/cli.js add "Franchise Opportunities" \
  "node lib/stealth-browser/cli.js scrape --url https://franchise.com/listings --output /home/clawd/clawd/opportunities/franchises.json" \
  --schedule "daily at 08:00"
```

---

## Maintenance

### Check Task Manager Status
```bash
ps aux | grep -E "(server|worker).js"
```

### View Logs
```bash
tail -f /home/clawd/clawd/task-manager/logs/*.log
```

### Restart Task Manager
```bash
cd /home/clawd/clawd/task-manager
./stop.sh
./start.sh
```

---

## Future Enhancements

Ideas for extending these tools:
- Slack notifications on task completion
- Email alerts for failed tasks
- Data analysis scripts
- Automated reports
- Integration with 21M content generator
- Price tracking database
- Visual dashboards for scraped data

---

**Built:** Feb 2, 2026 by Claude Code  
**Status:** Production ready, currently running  
**Dashboard:** http://localhost:3000
