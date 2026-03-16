/**
 * eBay Sold Listings Scraper v2 - Using Puppeteer
 * Handles JavaScript-rendered pages
 */

const puppeteer = require('puppeteer');

class EbaySoldScraperV2 {
  constructor() {
    this.baseUrl = 'https://www.ebay.com/sch/i.html';
    this.browser = null;
  }

  /**
   * Initialize browser
   */
  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Search for sold listings
   * @param {String} keywords - Search keywords
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of sold items
   */
  async searchSold(keywords, options = {}) {
    const {
      maxResults = 50,
      categoryId = '212',
      minPrice = null,
      maxPrice = null
    } = options;

    await this.init();
    const page = await this.browser.newPage();

    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Build URL
      let url = `${this.baseUrl}?_nkw=${encodeURIComponent(keywords)}`;
      url += `&_sacat=${categoryId}`;
      url += '&LH_Complete=1';  // Completed listings
      url += '&LH_Sold=1';      // Sold only
      url += `&_ipg=${Math.min(maxResults, 200)}`;
      url += '&_sop=13';        // Recently ended

      if (minPrice) url += `&_udlo=${minPrice}`;
      if (maxPrice) url += `&_udhi=${maxPrice}`;

      console.log(`🌐 Loading: ${keywords}`);

      // Go to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for results to load
      await page.waitForSelector('ul.srp-results, .srp-river-results', { timeout: 10000 }).catch(() => {});

      // Extract data using page.evaluate
      const items = await page.evaluate(() => {
        const results = [];

        // Find all listing items - eBay uses div.s-item in grid view
        const listings = document.querySelectorAll('div.s-item, li.s-item');

        listings.forEach(item => {
          try {
            // Skip headers/ads
            if (item.classList.contains('s-item--before-first-search-result')) return;

            // Title
            const titleElem = item.querySelector('.s-item__title span[role="heading"]') ||
                            item.querySelector('.s-item__title');
            if (!titleElem) return;
            const title = titleElem.textContent.trim();
            if (!title || title === '') return;

            // Price
            const priceElem = item.querySelector('.s-item__price');
            if (!priceElem) return;
            const priceText = priceElem.textContent.trim();

            // Parse price (handle ranges)
            const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
            if (!priceMatch) return;
            const price = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (isNaN(price) || price === 0) return;

            // Shipping
            let shippingCost = 0;
            const shippingElem = item.querySelector('.s-item__shipping, .s-item__freeXDays');
            if (shippingElem) {
              const shippingText = shippingElem.textContent.toLowerCase();
              if (shippingText.includes('free')) {
                shippingCost = 0;
              } else {
                const shippingMatch = shippingText.match(/\$?([\d,]+\.?\d*)/);
                if (shippingMatch) {
                  shippingCost = parseFloat(shippingMatch[1].replace(/,/g, ''));
                }
              }
            }

            // Date sold
            let dateSold = null;
            const soldElem = item.querySelector('.s-item__title--tag, .POSITIVE');
            if (soldElem) {
              const soldText = soldElem.textContent;
              const dateMatch = soldText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/);
              if (dateMatch) {
                dateSold = dateMatch[0];
              }
            }

            // Link
            const linkElem = item.querySelector('.s-item__link');
            const link = linkElem ? linkElem.href : '';

            // Item ID
            let itemId = '';
            if (link) {
              const idMatch = link.match(/\/itm\/(\d+)/);
              if (idMatch) itemId = idMatch[1];
            }

            // Condition
            const conditionElem = item.querySelector('.SECONDARY_INFO');
            const condition = conditionElem ? conditionElem.textContent.trim() : '';

            results.push({
              itemId,
              title,
              price,
              shippingCost,
              totalPrice: parseFloat((price + shippingCost).toFixed(2)),
              dateSold,
              condition,
              url: link,
              sold: true
            });

          } catch (err) {
            // Skip items that fail
          }
        });

        return results;
      });

      console.log(`   ✅ Found ${items.length} sold listings\n`);

      await page.close();
      return items.slice(0, maxResults);

    } catch (error) {
      console.error(`❌ Scraping error: ${error.message}`);
      await page.close().catch(() => {});
      return [];
    }
  }

  /**
   * Get sold comps for a card (PSA 10 and PSA 9)
   * @param {String} cardTitle - Card title
   * @returns {Promise<Object>} - { psa10: [...], psa9: [...] }
   */
  async getSoldComps(cardTitle) {
    try {
      const cleanTitle = this.cleanTitle(cardTitle);

      console.log(`\n📊 Getting sold comps for: ${cleanTitle}\n`);

      // Search PSA 10
      const psa10Results = await this.searchSold(`${cleanTitle} PSA 10`, {
        maxResults: 50,
        minPrice: 10,
        maxPrice: 10000
      });

      // Small delay
      await this.sleep(2000);

      // Search PSA 9
      const psa9Results = await this.searchSold(`${cleanTitle} PSA 9`, {
        maxResults: 50,
        minPrice: 10,
        maxPrice: 10000
      });

      return {
        psa10: psa10Results,
        psa9: psa9Results
      };

    } catch (error) {
      console.error('Error getting sold comps:', error.message);
      return { psa10: [], psa9: [] };
    }
  }

  /**
   * Clean title for search
   */
  cleanTitle(title) {
    return title
      .toLowerCase()
      .replace(/\b(raw|ungraded|mint|nm|near mint|gem|pristine)\b/gi, '')
      .replace(/\b(psa|bgs|sgc|graded|grade)\s*\d*/gi, '')
      .replace(/\b(with coating|no coating|protective peel)\b/gi, '')
      .replace(/[!@#$%^&*()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 80);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EbaySoldScraperV2;
