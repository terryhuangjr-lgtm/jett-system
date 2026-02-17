#!/usr/bin/env node
/**
 * Stealth Browser Service
 * Anti-detection browser automation using puppeteer-extra with stealth plugins
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class StealthBrowser {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless !== false, // Default to headless
      sessionDir: options.sessionDir || path.join(__dirname, 'sessions'),
      timeout: options.timeout || 30000,
      viewport: options.viewport || { width: 1920, height: 1080 },
      userAgent: options.userAgent || this.getRandomUserAgent(),
      ...options
    };
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  async launch() {
    const launchOptions = {
      headless: this.options.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        `--window-size=${this.options.viewport.width},${this.options.viewport.height}`
      ]
    };

    // Use persistent session if sessionName provided
    if (this.options.sessionName) {
      await fs.mkdir(this.options.sessionDir, { recursive: true });
      const sessionPath = path.join(this.options.sessionDir, this.options.sessionName);
      launchOptions.userDataDir = sessionPath;
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();

    // Set viewport and user agent
    await this.page.setViewport(this.options.viewport);
    await this.page.setUserAgent(this.options.userAgent);

    // Additional anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => false });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Add chrome runtime
      window.chrome = { runtime: {} };
    });

    // Set extra headers to look more human
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    return this;
  }

  async goto(url, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    const waitOptions = {
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || this.options.timeout
    };

    // Random delay before navigation (human-like)
    await this.randomDelay(500, 1500);

    await this.page.goto(url, waitOptions);

    // Random delay after page load
    await this.randomDelay(1000, 2000);

    return this;
  }

  async screenshot(outputPath, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    await this.page.screenshot({
      path: outputPath,
      fullPage: options.fullPage || false,
      ...options
    });

    return outputPath;
  }

  async getHTML() {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return await this.page.content();
  }

  async getText() {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return await this.page.evaluate(() => document.body.innerText);
  }

  async extract(selector, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    const extractType = options.type || 'text';
    const multiple = options.multiple || false;

    if (multiple) {
      return await this.page.$$eval(selector, (elements, type) => {
        return elements.map(el => {
          switch(type) {
            case 'html': return el.innerHTML;
            case 'attr': return el.getAttribute(options.attribute);
            default: return el.textContent.trim();
          }
        });
      }, extractType);
    } else {
      return await this.page.$eval(selector, (element, type, attr) => {
        switch(type) {
          case 'html': return element.innerHTML;
          case 'attr': return element.getAttribute(attr);
          default: return element.textContent.trim();
        }
      }, extractType, options.attribute);
    }
  }

  async click(selector, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.randomDelay(300, 800);
    await this.page.click(selector);

    if (options.waitForNavigation) {
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    await this.randomDelay(500, 1500);
    return this;
  }

  async type(selector, text, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.randomDelay(200, 600);

    // Type with human-like delays
    await this.page.type(selector, text, { delay: options.delay || this.randomNumber(50, 150) });

    await this.randomDelay(300, 700);
    return this;
  }

  async evaluate(fn, ...args) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return await this.page.evaluate(fn, ...args);
  }

  async waitForSelector(selector, options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return await this.page.waitForSelector(selector, { timeout: this.options.timeout, ...options });
  }

  async scrollToBottom(options = {}) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');

    const distance = options.distance || 100;
    const delay = options.delay || 100;

    await this.page.evaluate(async (distance, delay) => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    }, distance, delay);

    return this;
  }

  async getCookies() {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    return await this.page.cookies();
  }

  async setCookies(cookies) {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.');
    await this.page.setCookie(...cookies);
    return this;
  }

  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = StealthBrowser;
