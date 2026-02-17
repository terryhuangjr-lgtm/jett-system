#!/usr/bin/env node
/**
 * Example: Scraping eBay search results
 * Demonstrates anti-detection and data extraction
 */

const StealthBrowser = require('./browser-service');

async function scrapeEbaySearch(query) {
  console.log(`Searching eBay for: ${query}`);

  const browser = new StealthBrowser({
    headless: true,
    sessionName: 'ebay-search' // Persist session to build reputation
  });

  try {
    await browser.launch();
    console.log('Browser launched with stealth mode...');

    // Navigate to eBay search
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    await browser.goto(searchUrl);
    console.log('Navigated to search results...');

    // Scroll to load all items
    await browser.scrollToBottom({ distance: 300, delay: 200 });
    console.log('Scrolled through results...');

    // Extract item data
    const items = await browser.evaluate(() => {
      const itemElements = document.querySelectorAll('.s-item');
      const results = [];

      itemElements.forEach(item => {
        try {
          const title = item.querySelector('.s-item__title')?.textContent?.trim();
          const price = item.querySelector('.s-item__price')?.textContent?.trim();
          const link = item.querySelector('.s-item__link')?.href;
          const image = item.querySelector('.s-item__image-img')?.src;
          const shipping = item.querySelector('.s-item__shipping')?.textContent?.trim();

          if (title && title !== 'Shop on eBay') {
            results.push({
              title,
              price,
              link,
              image,
              shipping: shipping || 'Not specified'
            });
          }
        } catch (err) {
          // Skip items that fail to parse
        }
      });

      return results;
    });

    console.log(`\nFound ${items.length} items:\n`);

    // Display results
    items.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Price: ${item.price}`);
      console.log(`   Shipping: ${item.shipping}`);
      console.log(`   Link: ${item.link}`);
      console.log('');
    });

    // Save full results to file
    const fs = require('fs').promises;
    const outputFile = `ebay-${query.replace(/\s+/g, '-')}-${Date.now()}.json`;
    await fs.writeFile(outputFile, JSON.stringify(items, null, 2));
    console.log(`Full results saved to: ${outputFile}`);

    return items;

  } catch (error) {
    console.error('Error during scraping:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

// Run if called directly
if (require.main === module) {
  const query = process.argv[2] || 'vintage sports jersey';
  scrapeEbaySearch(query)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = scrapeEbaySearch;
