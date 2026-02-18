#!/usr/bin/env node
/**
 * Debug scraper - inspect actual HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugScraper() {
  const url = 'https://www.ebay.com/sch/i.html';
  const params = {
    '_nkw': 'Michael Jordan PSA 10',
    '_sacat': '212',
    'LH_Complete': '1',
    'LH_Sold': '1',
    '_ipg': '50'
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    console.log('Fetching eBay page...\n');
    const response = await axios.get(url, { params, headers, timeout: 15000 });

    // Save full HTML for inspection
    fs.writeFileSync('/tmp/ebay-page.html', response.data);
    console.log('✅ Saved HTML to /tmp/ebay-page.html\n');

    // Parse and debug
    const $ = cheerio.load(response.data);

    // Try different selectors
    console.log('Testing selectors:\n');

    const selectors = [
      '.s-item',
      'li.s-item',
      '.srp-results li',
      '.srp-results .s-item',
      '[class*="s-item"]',
      'div.s-item',
      'ul.srp-results li'
    ];

    selectors.forEach(selector => {
      const count = $(selector).length;
      console.log(`${selector.padEnd(30)} → ${count} items`);
    });

    // Inspect first item structure
    console.log('\n' + '='.repeat(60));
    console.log('First item structure:\n');

    const $first = $('.s-item').first();
    if ($first.length > 0) {
      console.log('Classes:', $first.attr('class'));
      console.log('\nTitle selectors:');
      console.log('  .s-item__title:', $first.find('.s-item__title').text().substring(0, 50));
      console.log('  h3:', $first.find('h3').text().substring(0, 50));
      console.log('  [class*="title"]:', $first.find('[class*="title"]').first().text().substring(0, 50));

      console.log('\nPrice selectors:');
      console.log('  .s-item__price:', $first.find('.s-item__price').text());
      console.log('  [class*="price"]:', $first.find('[class*="price"]').first().text());

      console.log('\nHTML snippet:');
      console.log($first.html().substring(0, 500));
    } else {
      console.log('❌ No items found with .s-item selector');
    }

    // Check for alternative structure
    console.log('\n' + '='.repeat(60));
    console.log('Looking for any list items:\n');

    const allLi = $('li');
    console.log(`Total <li> elements: ${allLi.length}`);

    allLi.each((i, elem) => {
      if (i < 5) { // First 5
        const $li = $(elem);
        const classes = $li.attr('class') || '(no class)';
        const text = $li.text().substring(0, 80).replace(/\s+/g, ' ');
        console.log(`${i + 1}. ${classes}`);
        console.log(`   ${text}\n`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugScraper();
