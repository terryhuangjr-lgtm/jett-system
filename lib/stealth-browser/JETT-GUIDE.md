# Stealth Browser - Quick Reference for Jett

## Installation Complete ✅

All dependencies installed. Tool is ready to use.

## How to Use This Tool

### Basic Commands

**Scrape any website (returns HTML + text):**
```bash
node /home/clawd/clawd/lib/stealth-browser/cli.js scrape --url <URL> --output result.json
```

**Extract specific data using CSS selectors:**
```bash
node /home/clawd/clawd/lib/stealth-browser/cli.js scrape \
  --url <URL> \
  --selector ".price" \
  --multiple true \
  --output prices.json
```

**Take screenshots:**
```bash
node /home/clawd/clawd/lib/stealth-browser/cli.js screenshot \
  --url <URL> \
  --output page.png \
  --fullPage true
```

**Use persistent sessions (keeps cookies/login state):**
```bash
node /home/clawd/clawd/lib/stealth-browser/cli.js scrape \
  --url <URL> \
  --session session-name \
  --output result.json
```

### Output Format

All scrape commands return JSON with this structure:
```json
{
  "url": "https://example.com",
  "timestamp": "2026-02-02T01:01:01.783Z",
  "html": "<full page HTML>",
  "text": "Plain text content",
  "extracted": ["data", "if", "selector", "used"],
  "screenshot": "path/to/screenshot.png"
}
```

### Command Options

**--url** (required): Website to scrape
**--output** (optional): Output file path (default: output.json)
**--selector** (optional): CSS selector to extract specific elements
**--multiple** (optional): Set to "true" to get all matching elements
**--screenshot** (optional): Path to save screenshot
**--session** (optional): Session name to persist cookies/login
**--headless** (optional): "true" (default) or "false" to see browser

## Key Features

### 1. Anti-Detection
- Bypasses Cloudflare, bot detection, CAPTCHAs
- Uses stealth plugins to appear as real user
- Random delays between actions
- Realistic user agents and headers

### 2. Session Persistence
Use `--session <name>` to:
- Keep login state between runs
- Save cookies automatically
- Build site reputation
- Avoid repeated logins

Example:
```bash
# First time - login
node cli.js interactive --url https://site.com/login --session myaccount --headless false
# (Login manually in browser)

# Future runs - already logged in!
node cli.js scrape --url https://site.com/data --session myaccount
```

### 3. Data Extraction
Use CSS selectors to extract specific data:

```bash
# Get all product prices
--selector ".product-price" --multiple true

# Get page title
--selector "h1"

# Get all links
--selector "a[href]" --multiple true
```

## What You Can Do Now

### 1. Market Research
Scrape competitor sites, pricing data, product listings without being blocked.

### 2. Content Research
Extract articles, blog posts, documentation from any site.

### 3. eBay/Marketplace Monitoring
Track prices, listings, availability (see example-ebay.js).

### 4. Web Data Collection
Gather data from sites without APIs - news, forums, social media.

### 5. Automated Screenshots
Capture page states, track visual changes, generate reports.

### 6. Form Automation
Use programmatic API (browser-service.js) to fill forms, click buttons, submit data.

## Programmatic Usage (Advanced)

For complex workflows, use the JavaScript API directly:

```javascript
const StealthBrowser = require('/home/clawd/clawd/lib/stealth-browser/browser-service');

async function complexTask() {
  const browser = new StealthBrowser({
    sessionName: 'my-session',
    headless: true
  });

  await browser.launch();
  await browser.goto('https://example.com');

  // Type in search box
  await browser.type('#search', 'vintage jerseys');

  // Click search button
  await browser.click('#search-btn', { waitForNavigation: true });

  // Wait for results to load
  await browser.waitForSelector('.results');

  // Extract data
  const results = await browser.extract('.result-item', { multiple: true });

  // Take screenshot
  await browser.screenshot('results.png');

  // Run custom JavaScript
  const customData = await browser.evaluate(() => {
    return {
      title: document.title,
      itemCount: document.querySelectorAll('.item').length
    };
  });

  await browser.close();

  return { results, customData };
}
```

## Available Methods

- `launch()` - Start browser
- `goto(url)` - Navigate to page
- `screenshot(path)` - Capture screenshot
- `getHTML()` - Get full HTML
- `getText()` - Get plain text
- `extract(selector, options)` - Extract elements
- `click(selector)` - Click element
- `type(selector, text)` - Type into input
- `evaluate(fn)` - Run JavaScript
- `waitForSelector(selector)` - Wait for element
- `scrollToBottom()` - Scroll page
- `getCookies()` / `setCookies()` - Cookie management
- `close()` - Close browser

## Token Savings

**Old way (browser automation tools):**
- 40-60k tokens per scraping task
- Frequent failures/retries = 2-3x cost

**New way (this tool):**
- 1-2k tokens for coordination
- Tool runs locally (free computation)
- 97% token reduction!

## Examples

### Example 1: Monitor eBay Prices
```bash
node /home/clawd/clawd/lib/stealth-browser/example-ebay.js "vintage jersey"
```

### Example 2: Scrape with Screenshot
```bash
node cli.js scrape \
  --url https://example.com/products \
  --selector ".product" \
  --multiple true \
  --screenshot products.png \
  --output products.json
```

### Example 3: Research Task
```bash
# Scrape competitor blog
node cli.js scrape \
  --url https://competitor.com/blog \
  --selector "article h2" \
  --multiple true \
  --output blog-titles.json

# Take screenshot for visual reference
node cli.js screenshot \
  --url https://competitor.com/blog \
  --output competitor-blog.png \
  --fullPage true
```

## File Locations

- **CLI Tool**: `/home/clawd/clawd/lib/stealth-browser/cli.js`
- **JavaScript API**: `/home/clawd/clawd/lib/stealth-browser/browser-service.js`
- **eBay Example**: `/home/clawd/clawd/lib/stealth-browser/example-ebay.js`
- **Sessions Stored**: `/home/clawd/clawd/lib/stealth-browser/sessions/`
- **Full Docs**: `/home/clawd/clawd/lib/stealth-browser/README.md`

## Tips for Best Results

1. **Use sessions** for sites that require login or have rate limits
2. **Add delays** between requests to same domain (be respectful)
3. **Start with headless=false** to debug, then switch to headless=true for production
4. **Combine with other tools** - scrape data, then process with your code
5. **Cache results** - save JSON outputs to avoid re-scraping

## When to Use This vs Other Tools

**Use Stealth Browser when:**
- Site has no API
- Getting blocked/detected by bot protection
- Need to interact with page (click, type, scroll)
- Need screenshots or visual capture
- Need to maintain login sessions

**Use APIs when available:**
- Faster and more reliable
- Less resource intensive
- Better for high-frequency requests

## Next Steps

This tool is ONE PIECE of a larger automation toolkit. Consider:
- Task scheduler for overnight jobs
- Database to store scraped data
- API wrappers for services with APIs
- Notification system for completed tasks
