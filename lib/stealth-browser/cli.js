#!/usr/bin/env node
/**
 * CLI interface for Stealth Browser Service
 * Usage: node cli.js <command> [options]
 */

const StealthBrowser = require('./browser-service');
const fs = require('fs').promises;
const path = require('path');

const commands = {
  async scrape(args) {
    const url = args.url;
    const outputFile = args.output || 'output.json';
    const selector = args.selector;
    const headless = args.headless !== 'false';

    if (!url) {
      console.error('Error: --url is required');
      process.exit(1);
    }

    console.log(`Launching stealth browser...`);
    const browser = new StealthBrowser({
      headless,
      sessionName: args.session
    });

    try {
      await browser.launch();
      console.log(`Navigating to ${url}...`);
      await browser.goto(url);

      const result = {
        url,
        timestamp: new Date().toISOString(),
        html: null,
        text: null,
        extracted: null
      };

      if (selector) {
        console.log(`Extracting data using selector: ${selector}`);
        result.extracted = await browser.extract(selector, {
          multiple: args.multiple === 'true'
        });
      } else {
        console.log(`Getting page content...`);
        result.html = await browser.getHTML();
        result.text = await browser.getText();
      }

      if (args.screenshot) {
        const screenshotPath = args.screenshot;
        console.log(`Taking screenshot: ${screenshotPath}`);
        await browser.screenshot(screenshotPath);
        result.screenshot = screenshotPath;
      }

      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      console.log(`Results saved to ${outputFile}`);

      // Also output to stdout for easy piping
      console.log('\n--- RESULT ---');
      console.log(JSON.stringify(result, null, 2));

    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    } finally {
      await browser.close();
    }
  },

  async screenshot(args) {
    const url = args.url;
    const output = args.output || 'screenshot.png';
    const headless = args.headless !== 'false';

    if (!url) {
      console.error('Error: --url is required');
      process.exit(1);
    }

    console.log(`Launching stealth browser...`);
    const browser = new StealthBrowser({ headless });

    try {
      await browser.launch();
      console.log(`Navigating to ${url}...`);
      await browser.goto(url);

      console.log(`Taking screenshot: ${output}`);
      await browser.screenshot(output, { fullPage: args.fullPage === 'true' });

      console.log(`Screenshot saved to ${output}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    } finally {
      await browser.close();
    }
  },

  async interactive(args) {
    const url = args.url;
    const headless = args.headless === 'true';

    if (!url) {
      console.error('Error: --url is required');
      process.exit(1);
    }

    console.log(`Launching stealth browser in interactive mode...`);
    console.log(`Browser will stay open. Press Ctrl+C to close.`);

    const browser = new StealthBrowser({
      headless,
      sessionName: args.session
    });

    try {
      await browser.launch();
      console.log(`Navigating to ${url}...`);
      await browser.goto(url);

      console.log(`Browser ready. Waiting for manual close...`);

      // Keep process alive
      await new Promise(() => {});
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },

  help() {
    console.log(`
Stealth Browser CLI - Anti-detection browser automation

COMMANDS:
  scrape       Scrape a webpage and extract data
  screenshot   Take a screenshot of a webpage
  interactive  Open browser and keep it open for manual testing

SCRAPE OPTIONS:
  --url <url>              URL to scrape (required)
  --output <file>          Output file (default: output.json)
  --selector <css>         CSS selector to extract specific data
  --multiple <bool>        Extract multiple elements (default: false)
  --screenshot <file>      Also take a screenshot
  --session <name>         Use persistent session (keeps cookies/login)
  --headless <bool>        Run in headless mode (default: true)

SCREENSHOT OPTIONS:
  --url <url>              URL to screenshot (required)
  --output <file>          Output file (default: screenshot.png)
  --fullPage <bool>        Capture full page (default: false)
  --headless <bool>        Run in headless mode (default: true)

INTERACTIVE OPTIONS:
  --url <url>              URL to open (required)
  --session <name>         Use persistent session
  --headless <bool>        Run in headless mode (default: false)

EXAMPLES:
  # Scrape a page and save HTML/text
  node cli.js scrape --url https://example.com --output result.json

  # Extract specific data using CSS selector
  node cli.js scrape --url https://ebay.com/search?q=jerseys --selector ".item-title" --multiple true

  # Take a screenshot
  node cli.js screenshot --url https://example.com --output page.png --fullPage true

  # Interactive mode with session (keeps login state)
  node cli.js interactive --url https://ebay.com --session ebay-session

  # Scrape with session and screenshot
  node cli.js scrape --url https://example.com --session my-session --screenshot page.png
    `);
  }
};

// Parse command line arguments
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++;
    }
  }
  return args;
}

// Main execution
async function main() {
  const [,, command, ...argv] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
    process.exit(0);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'node cli.js help' for usage information`);
    process.exit(1);
  }

  const args = parseArgs(argv);
  await commands[command](args);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = commands;
