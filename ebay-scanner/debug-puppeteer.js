#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function debugPuppeteer() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    const url = 'https://www.ebay.com/sch/i.html?_nkw=Michael+Jordan+PSA+10&_sacat=212&LH_Complete=1&LH_Sold=1&_ipg=50';

    console.log('Loading page...\n');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Take screenshot
    await page.screenshot({ path: '/tmp/ebay-debug.png', fullPage: true });
    console.log('✅ Screenshot saved to /tmp/ebay-debug.png\n');

    // Debug selectors
    const debug = await page.evaluate(() => {
      const info = {
        divItems: document.querySelectorAll('div.s-item').length,
        liItems: document.querySelectorAll('li.s-item').length,
        srpResults: document.querySelectorAll('.srp-results').length,
        anyResults: document.querySelectorAll('[class*="result"]').length,
        allDivs: document.querySelectorAll('div').length,
        allLis: document.querySelectorAll('li').length,
        bodyText: document.body.textContent.substring(0, 500)
      };

      // Try to find first item with any selector
      const selectors = [
        'div.s-item',
        'li.s-item',
        '.srp-results li',
        '.srp-results div',
        '[data-view="mi:1686|iid:1"]',
        '.clearfix.item'
      ];

      info.firstItem = {};
      selectors.forEach(sel => {
        const elem = document.querySelector(sel);
        if (elem) {
          info.firstItem[sel] = {
            exists: true,
            innerHTML: elem.innerHTML.substring(0, 200),
            classes: elem.className
          };
        } else {
          info.firstItem[sel] = { exists: false };
        }
      });

      return info;
    });

    console.log('Page Analysis:');
    console.log(JSON.stringify(debug, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugPuppeteer();
