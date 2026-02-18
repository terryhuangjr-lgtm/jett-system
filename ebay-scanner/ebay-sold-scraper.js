/**
 * eBay Sold Listings Scraper
 * Scrapes eBay's public completed/sold listings page for real comp data
 */

const axios = require('axios');
const cheerio = require('cheerio');

class EbaySoldScraper {
  constructor() {
    this.baseUrl = 'https://www.ebay.com/sch/i.html';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
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
      categoryId = '212', // Sports cards
      minPrice = null,
      maxPrice = null
    } = options;

    try {
      // Build search URL
      const params = {
        '_nkw': keywords,
        '_sacat': categoryId,
        'LH_Complete': '1',      // Completed listings
        'LH_Sold': '1',          // Sold only (not just ended)
        '_ipg': Math.min(maxResults, 200), // Items per page (max 200)
        '_sop': '13'             // Sort by: Recently ended
      };

      // Add price filters
      if (minPrice) {
        params['_udlo'] = minPrice; // Lower price
      }
      if (maxPrice) {
        params['_udhi'] = maxPrice; // Upper price
      }

      console.log(`🌐 Scraping: ${keywords}`);

      // Fetch page
      const response = await axios.get(this.baseUrl, {
        params,
        headers: this.headers,
        timeout: 15000
      });

      // Parse HTML
      const $ = cheerio.load(response.data);
      const items = [];

      // Find all listing items
      // eBay uses different selectors, try multiple
      const listingSelectors = [
        '.s-item',           // Standard grid view
        'li.s-item',         // List items
        '.srp-results li'    // Search results list
      ];

      let $listings = $();
      for (const selector of listingSelectors) {
        $listings = $(selector);
        if ($listings.length > 0) break;
      }

      console.log(`   Found ${$listings.length} listings on page`);

      $listings.each((i, elem) => {
        try {
          const $item = $(elem);

          // Skip if this is a header or ad
          if ($item.hasClass('s-item--before-first-search-result')) return;

          // Extract title
          const title = $item.find('.s-item__title').text().trim();
          if (!title || title === '') return;

          // Extract price (sold price)
          let priceText = $item.find('.s-item__price').first().text().trim();
          if (!priceText) return;

          // Parse price (handle ranges like "$100 to $150")
          const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
          if (!priceMatch) return;

          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (isNaN(price) || price === 0) return;

          // Extract shipping cost
          let shippingCost = 0;
          const shippingText = $item.find('.s-item__shipping, .s-item__freeXDays').text().toLowerCase();
          if (shippingText.includes('free')) {
            shippingCost = 0;
          } else {
            const shippingMatch = shippingText.match(/\$?([\d,]+\.?\d*)/);
            if (shippingMatch) {
              shippingCost = parseFloat(shippingMatch[1].replace(/,/g, ''));
            }
          }

          // Extract date sold
          const soldText = $item.find('.s-item__title--tag, .POSITIVE').text().trim();
          let dateSold = null;
          if (soldText.toLowerCase().includes('sold')) {
            // Extract date from text like "Sold Dec 15, 2024"
            const dateMatch = soldText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/);
            if (dateMatch) {
              dateSold = new Date(dateMatch[0]);
            }
          }

          // Extract item link
          const link = $item.find('.s-item__link').attr('href');

          // Extract condition (if available)
          const condition = $item.find('.SECONDARY_INFO').text().trim();

          // Extract item ID from link
          let itemId = '';
          if (link) {
            const idMatch = link.match(/\/itm\/(\d+)/);
            if (idMatch) itemId = idMatch[1];
          }

          // Only add valid items
          if (title && price > 0) {
            items.push({
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
          }

        } catch (err) {
          // Skip items that fail to parse
          console.error(`   Error parsing item: ${err.message}`);
        }
      });

      console.log(`   ✅ Parsed ${items.length} sold items\n`);

      return items.slice(0, maxResults);

    } catch (error) {
      console.error(`❌ Scraping error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
      }
      return [];
    }
  }

  /**
   * Get sold comps for a specific card (PSA 10 and PSA 9)
   * @param {String} cardTitle - Card title
   * @returns {Promise<Object>} - { psa10: [...], psa9: [...] }
   */
  async getSoldComps(cardTitle) {
    try {
      // Clean title for better search
      const cleanTitle = this.cleanTitle(cardTitle);

      console.log(`\n📊 Getting sold comps for: ${cleanTitle}\n`);

      // Search for PSA 10
      const psa10Results = await this.searchSold(`${cleanTitle} PSA 10`, {
        maxResults: 50,
        minPrice: 10,
        maxPrice: 10000
      });

      // Small delay to avoid rate limiting
      await this.sleep(1000);

      // Search for PSA 9
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
   * Clean card title for search
   * @param {String} title - Raw title
   * @returns {String} - Cleaned title
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
   * @param {Number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EbaySoldScraper;
