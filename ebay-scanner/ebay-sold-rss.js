/**
 * eBay Sold Listings via RSS Feed
 * Simpler approach using eBay's RSS feed
 */

const axios = require('axios');
const cheerio = require('cheerio');

class EbaySoldRSS {
  constructor() {
    this.baseUrl = 'https://www.ebay.com/sch/i.html';
  }

  /**
   * Search for sold listings via RSS
   * @param {String} keywords - Search keywords
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Sold items
   */
  async searchSold(keywords, options = {}) {
    const {
      maxResults = 50,
      categoryId = '212'
    } = options;

    try {
      // Build RSS URL
      let url = `${this.baseUrl}?_nkw=${encodeURIComponent(keywords)}`;
      url += `&_sacat=${categoryId}`;
      url += '&LH_Complete=1';   // Completed
      url += '&LH_Sold=1';       // Sold only
      url += '&_rss=1';          // RSS format!
      url += `&_ipg=${Math.min(maxResults, 200)}`;

      console.log(`🌐 Fetching RSS: ${keywords}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)'
        },
        timeout: 15000
      });

      // Parse RSS/XML
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = [];

      $('item').each((i, elem) => {
        try {
          const $item = $(elem);

          const title = $item.find('title').text().trim();
          if (!title) return;

          // Parse price from title (eBay includes it)
          // Format: "Card Name - $123.45"
          let price = 0;
          const priceMatch = title.match(/\$\s*([\d,]+\.?\d*)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/,/g, ''));
          }

          // Get link
          const link = $item.find('link').text().trim();

          // Get pub date (when sold)
          const pubDate = $item.find('pubDate').text().trim();
          let dateSold = null;
          if (pubDate) {
            dateSold = new Date(pubDate);
          }

          // Extract item ID from link
          let itemId = '';
          if (link) {
            const idMatch = link.match(/\/itm\/(\d+)/);
            if (idMatch) itemId = idMatch[1];
          }

          if (title && price > 0) {
            items.push({
              itemId,
              title,
              price,
              shippingCost: 0, // RSS doesn't include shipping
              totalPrice: price,
              dateSold,
              url: link,
              sold: true
            });
          }

        } catch (err) {
          // Skip failed items
        }
      });

      console.log(`   ✅ Found ${items.length} sold listings\n`);
      return items.slice(0, maxResults);

    } catch (error) {
      console.error(`❌ RSS fetch error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get sold comps (PSA 10 and PSA 9)
   * @param {String} cardTitle - Card title
   * @returns {Promise<Object>} - { psa10: [...], psa9: [...] }
   */
  async getSoldComps(cardTitle) {
    try {
      const cleanTitle = this.cleanTitle(cardTitle);
      console.log(`\n📊 Getting sold comps for: ${cleanTitle}\n`);

      // PSA 10
      const psa10Results = await this.searchSold(`${cleanTitle} PSA 10`, {
        maxResults: 50
      });

      await this.sleep(1000);

      // PSA 9
      const psa9Results = await this.searchSold(`${cleanTitle} PSA 9`, {
        maxResults: 50
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
   * Clean title
   */
  cleanTitle(title) {
    return title
      .toLowerCase()
      .replace(/\b(raw|ungraded|mint|nm|near mint|gem|pristine)\b/gi, '')
      .replace(/\b(psa|bgs|sgc|graded|grade)\s*\d*/gi, '')
      .replace(/[!@#$%^&*()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 80);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EbaySoldRSS;
