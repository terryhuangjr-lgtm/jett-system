# Stealth Browser Service

Anti-detection browser automation tool using Puppeteer with stealth plugins. Designed to avoid bot detection on websites.

## Features

- **Anti-Detection**: Uses puppeteer-extra-stealth to bypass common bot detection
- **Human-like Behavior**: Random delays, realistic typing speed, mouse movements
- **Session Persistence**: Save cookies and login state between runs
- **Flexible Extraction**: CSS selectors, full HTML, or plain text
- **Screenshots**: Capture full page or viewport screenshots
- **Multiple User Agents**: Rotates between realistic user agents
- **CLI Interface**: Easy to use from command line or scripts

## Installation

```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

## Quick Start

### CLI Usage

```bash
# Scrape a webpage
node lib/stealth-browser/cli.js scrape --url https://example.com --output result.json

# Extract specific elements
node lib/stealth-browser/cli.js scrape \
  --url https://ebay.com/search?q=jerseys \
  --selector ".item-title" \
  --multiple true \
  --output items.json

# Take a screenshot
node lib/stealth-browser/cli.js screenshot \
  --url https://example.com \
  --output screenshot.png \
  --fullPage true

# Interactive mode (keeps browser open)
node lib/stealth-browser/cli.js interactive \
  --url https://ebay.com \
  --session ebay-session \
  --headless false
```

### Programmatic Usage

```javascript
const StealthBrowser = require('./lib/stealth-browser/browser-service');

async function example() {
  const browser = new StealthBrowser({
    headless: true,
    sessionName: 'my-session' // Optional: persist cookies
  });

  try {
    await browser.launch();
    await browser.goto('https://example.com');

    // Get full HTML
    const html = await browser.getHTML();

    // Extract specific data
    const title = await browser.extract('h1');
    const items = await browser.extract('.item', { multiple: true });

    // Interact with page
    await browser.type('#search', 'vintage jerseys');
    await browser.click('#search-button', { waitForNavigation: true });

    // Take screenshot
    await browser.screenshot('result.png');

    // Get cookies for session management
    const cookies = await browser.getCookies();

  } finally {
    await browser.close();
  }
}
```

## API Reference

### Constructor Options

```javascript
new StealthBrowser({
  headless: true,              // Run headless (default: true)
  sessionName: 'my-session',   // Persist cookies/storage (default: none)
  sessionDir: './sessions',    // Directory for sessions (default: ./sessions)
  timeout: 30000,              // Default timeout in ms (default: 30000)
  viewport: {                  // Viewport size (default: 1920x1080)
    width: 1920,
    height: 1080
  },
  userAgent: 'Mozilla/5.0...'  // Custom user agent (default: random)
})
```

### Methods

#### `launch()`
Initialize and launch the browser.

#### `goto(url, options)`
Navigate to a URL with human-like delays.
- `options.waitUntil`: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2' (default)
- `options.timeout`: Navigation timeout in ms

#### `screenshot(outputPath, options)`
Take a screenshot.
- `options.fullPage`: Capture full scrollable page (default: false)

#### `getHTML()`
Get full page HTML.

#### `getText()`
Get page text content (no HTML tags).

#### `extract(selector, options)`
Extract data using CSS selector.
- `options.type`: 'text' (default), 'html', or 'attr'
- `options.attribute`: Attribute name if type is 'attr'
- `options.multiple`: Extract all matches (default: false)

#### `click(selector, options)`
Click an element with human-like delay.
- `options.waitForNavigation`: Wait for page navigation after click

#### `type(selector, text, options)`
Type text with realistic delays.
- `options.delay`: Delay between keystrokes in ms (default: random 50-150)

#### `evaluate(fn, ...args)`
Execute JavaScript in page context.

#### `waitForSelector(selector, options)`
Wait for element to appear.

#### `scrollToBottom(options)`
Scroll to bottom of page with human-like behavior.
- `options.distance`: Pixels to scroll per step (default: 100)
- `options.delay`: Delay between scrolls in ms (default: 100)

#### `getCookies()`
Get all cookies.

#### `setCookies(cookies)`
Set cookies.

#### `close()`
Close browser and cleanup.

## Session Management

Sessions persist cookies, localStorage, and other browser state:

```javascript
// First run - login and save session
const browser = new StealthBrowser({ sessionName: 'ebay-logged-in' });
await browser.launch();
await browser.goto('https://ebay.com/signin');
await browser.type('#username', 'myuser');
await browser.type('#password', 'mypass');
await browser.click('#signin-button');
await browser.close();

// Second run - session is preserved!
const browser2 = new StealthBrowser({ sessionName: 'ebay-logged-in' });
await browser2.launch();
await browser2.goto('https://ebay.com'); // Already logged in!
```

## Anti-Detection Features

This tool implements multiple techniques to avoid detection:

1. **Puppeteer-Extra-Stealth**: Removes automation signatures
2. **Realistic User Agents**: Rotates between real browser user agents
3. **Human Delays**: Random delays between actions (500-2000ms)
4. **Realistic Typing**: Variable keystroke delays (50-150ms)
5. **Proper Headers**: Sets realistic Accept, Accept-Language, etc.
6. **WebDriver Override**: Removes navigator.webdriver flag
7. **Chrome Runtime**: Adds window.chrome object
8. **Permissions API**: Overrides permissions.query
9. **Large Viewport**: Uses realistic 1920x1080 viewport

## Use Cases

### eBay Price Monitoring
```bash
node lib/stealth-browser/cli.js scrape \
  --url "https://ebay.com/sch/i.html?_nkw=vintage+jersey" \
  --selector ".s-item__price" \
  --multiple true \
  --output ebay-prices.json
```

### Content Research
```javascript
const browser = new StealthBrowser();
await browser.launch();
await browser.goto('https://competitor-site.com/blog');
await browser.scrollToBottom();
const articles = await browser.extract('.article-title', { multiple: true });
```

### Market Research
```javascript
const browser = new StealthBrowser({ sessionName: 'research' });
await browser.launch();

const sites = ['site1.com', 'site2.com', 'site3.com'];
const data = [];

for (const site of sites) {
  await browser.goto(`https://${site}`);
  const info = await browser.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content
  }));
  data.push({ site, ...info });
}
```

## Troubleshooting

### Still Getting Detected?
- Use session management to build up reputation
- Add more random delays between actions
- Use non-headless mode for harder sites
- Consider using proxy rotation (add to launch options)

### Timeout Errors?
- Increase timeout: `new StealthBrowser({ timeout: 60000 })`
- Use 'domcontentloaded' instead of 'networkidle2' for slow sites

### Memory Issues?
- Always call `close()` when done
- Reuse browser instance for multiple pages instead of relaunching

## Token Savings

**Before (using Claude browser tools):**
- Each scraping task: 30-50k tokens
- Retry on detection: +30k tokens
- Total per task: 60-80k tokens

**After (using this tool):**
- Jett calls: `node cli.js scrape --url ...`
- Tool runs locally, returns data
- Jett processes: 1-2k tokens
- Total per task: 1-2k tokens

**Savings: 97-98% token reduction!**
