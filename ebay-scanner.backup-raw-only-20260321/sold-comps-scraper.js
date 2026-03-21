#!/usr/bin/env node
/**
 * eBay Sold Comps Scraper
 * Uses eBay's public sold listings (LH_Sold=1 parameter)
 */

const axios = require('axios');
const cheerio = require('cheerio');

class SoldCompsScraper {
  /**
   * Get sold comps from eBay's public sold listings page
   * @param {String} keywords - Search keywords
   * @param {Number} limit - Max results (default 20)
   * @returns {Promise<Array>} - Sold items
   */
  async getSoldComps(keywords, limit = 20) {
    try {
      const encodedKeywords = encodeURIComponent(keywords);
      
      // eBay sold listings URL
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedKeywords}&LH_Sold=1&LH_Complete=1&_sop=13`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const items = [];

      // Parse search results
      $('.s-item').each((i, elem) => {
        if (i >= limit) return false; // Stop at limit

        const $item = $(elem);
        
        // Skip sponsored ads
        if ($item.find('.s-item__title--tag').length > 0) return;

        const title = $item.find('.s-item__title').text().trim();
        const priceText = $item.find('.s-item__price').first().text().trim();
        const link = $item.find('.s-item__link').attr('href');
        const imageUrl = $item.find('.s-item__image-img').attr('src');

        // Parse price (handle ranges like "$100 to $150")
        let price = 0;
        const priceMatch = priceText.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        // Skip if no valid data
        if (!title || price === 0 || !link) return;

        items.push({
          title: title,
          price: price,
          totalPrice: price, // Sold listings show total (includes shipping)
          url: link,
          imageUrl: imageUrl || '',
          sold: true
        });
      });

      return items;

    } catch (error) {
      console.error('Error scraping sold comps:', error.message);
      return [];
    }
  }

  /**
   * Get average sold price
   * @param {Array} items - Sold items
   * @returns {Number} - Average price
   */
  calculateAverage(items) {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + item.price, 0);
    return Math.round((sum / items.length) * 100) / 100;
  }
}

module.exports = SoldCompsScraper;

// Test if run directly
if (require.main === module) {
  (async () => {
    const scraper = new SoldCompsScraper();
    console.log('\n🔍 Testing sold comps scraper...\n');
    
    const results = await scraper.getSoldComps('1997 topps chrome allen iverson refractor psa 10', 10);
    
    console.log(`Found ${results.length} sold items:\n`);
    results.forEach((item, i) => {
      console.log(`${i + 1}. $${item.price} - ${item.title.substring(0, 60)}`);
    });
    
    const avg = scraper.calculateAverage(results);
    console.log(`\n📊 Average: $${avg}`);
  })();
}
