#!/usr/bin/env node
/**
 * eBay API CLI
 * Fast command-line access to eBay data
 */

const eBayClient = require('./client');
const fs = require('fs').promises;

const commands = {
  async search(args) {
    const query = args.query || args._[0];
    const outputFile = args.output || null;
    const limit = parseInt(args.limit || 50);
    const minPrice = args.minPrice || args.min;
    const maxPrice = args.maxPrice || args.max;
    const condition = args.condition;

    if (!query) {
      console.error('Error: search query required');
      console.error('Usage: node cli.js search <query> [options]');
      process.exit(1);
    }

    console.log(`Searching eBay for: "${query}"...`);

    const client = new eBayClient();
    const results = await client.search(query, {
      limit,
      minPrice,
      maxPrice,
      condition
    });

    if (!results.success) {
      console.error(`Error: ${results.error}`);
      process.exit(1);
    }

    console.log(`\nFound ${results.count} items:\n`);

    // Display results
    results.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Price: $${item.price.value.toFixed(2)} ${item.price.currency}`);
      console.log(`   Condition: ${item.condition}`);
      console.log(`   Shipping: $${item.shipping.cost.toFixed(2)}`);
      console.log(`   Location: ${item.location}`);
      console.log(`   Seller: ${item.seller.username} (${item.seller.feedbackScore} feedback)`);
      console.log(`   URL: ${item.url}`);
      console.log('');
    });

    // Save to file if requested
    if (outputFile) {
      await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
      console.log(`Results saved to: ${outputFile}`);
    }

    // Also output JSON to stdout for piping
    if (args.json) {
      console.log('\n--- JSON OUTPUT ---');
      console.log(JSON.stringify(results, null, 2));
    }
  },

  async prices(args) {
    const query = args.query || args._[0];

    if (!query) {
      console.error('Error: search query required');
      console.error('Usage: node cli.js prices <query>');
      process.exit(1);
    }

    console.log(`Analyzing prices for: "${query}"...`);

    const client = new eBayClient();
    const stats = await client.getPriceStats(query);

    if (!stats.success) {
      console.error(`Error: ${stats.error}`);
      process.exit(1);
    }

    console.log(`\n=== Price Statistics ===`);
    console.log(`Query: ${stats.query}`);
    console.log(`Sample Size: ${stats.count} items`);
    console.log(`\nMin Price: $${stats.min.toFixed(2)}`);
    console.log(`Max Price: $${stats.max.toFixed(2)}`);
    console.log(`Average: $${stats.average.toFixed(2)}`);
    console.log(`Median: $${stats.median.toFixed(2)}`);

    // Show cheapest 5
    console.log(`\n=== Cheapest Items ===`);
    stats.items
      .sort((a, b) => a.price.value - b.price.value)
      .slice(0, 5)
      .forEach((item, index) => {
        console.log(`${index + 1}. $${item.price.value.toFixed(2)} - ${item.title.substring(0, 60)}...`);
        console.log(`   ${item.url}`);
      });
  },

  async monitor(args) {
    const query = args.query || args._[0];
    const threshold = parseFloat(args.threshold || args.t);
    const outputDir = args.output || './ebay-monitor';

    if (!query) {
      console.error('Error: search query required');
      console.error('Usage: node cli.js monitor <query> --threshold <price>');
      process.exit(1);
    }

    console.log(`Monitoring eBay for: "${query}"`);
    if (threshold) {
      console.log(`Alert threshold: $${threshold}`);
    }

    const client = new eBayClient();
    const results = await client.search(query, { limit: 100 });

    if (!results.success) {
      console.error(`Error: ${results.error}`);
      process.exit(1);
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Save full results with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${outputDir}/${query.replace(/\s+/g, '-')}-${timestamp}.json`;
    await fs.writeFile(filename, JSON.stringify(results, null, 2));

    console.log(`\nFound ${results.count} items`);
    console.log(`Data saved to: ${filename}`);

    // Alert on items below threshold
    if (threshold) {
      const deals = results.items.filter(item => item.price.value <= threshold);
      if (deals.length > 0) {
        console.log(`\n🚨 ALERT: ${deals.length} items below $${threshold}!`);
        deals.forEach(item => {
          console.log(`   $${item.price.value.toFixed(2)} - ${item.title}`);
          console.log(`   ${item.url}`);
        });
      } else {
        console.log(`\nNo items found below $${threshold}`);
      }
    }
  },

  async category(args) {
    const categoryId = args.category || args._[0];
    const limit = parseInt(args.limit || 20);

    if (!categoryId) {
      console.error('Error: category ID required');
      console.error('Usage: node cli.js category <categoryId>');
      process.exit(1);
    }

    console.log(`Fetching items from category ${categoryId}...`);

    const client = new eBayClient();
    const results = await client.findByCategory(categoryId, { limit });

    if (!results.success) {
      console.error(`Error: ${results.error}`);
      process.exit(1);
    }

    console.log(`\nFound ${results.count} items:\n`);

    results.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Price: $${item.price.value.toFixed(2)}`);
      console.log(`   ${item.url}`);
      console.log('');
    });
  },

  help() {
    console.log(`
eBay API CLI - Fast access to eBay data using official API

COMMANDS:
  search <query>       Search eBay listings
  prices <query>       Get price statistics
  monitor <query>      Monitor listings and save data
  category <id>        Browse items by category

SEARCH OPTIONS:
  --limit <n>          Number of results (default: 50, max: 100)
  --minPrice <n>       Minimum price filter
  --maxPrice <n>       Maximum price filter
  --condition <cond>   Condition: New, Used, Refurbished, etc.
  --output <file>      Save results to JSON file
  --json               Output JSON to stdout

PRICES OPTIONS:
  (Shows min, max, average, median prices)

MONITOR OPTIONS:
  --threshold <n>      Alert if items below this price
  --output <dir>       Output directory (default: ./ebay-monitor)

EXAMPLES:
  # Search for vintage jerseys
  node cli.js search "vintage jersey" --limit 20

  # Search with price filter
  node cli.js search "nike shoes" --minPrice 50 --maxPrice 150

  # Get price statistics
  node cli.js prices "vintage nintendo"

  # Monitor prices and save data
  node cli.js monitor "rare vinyl" --threshold 50 --output ./data

  # Save results to file
  node cli.js search "collectible cards" --output results.json

  # Browse category
  node cli.js category 220 --limit 10

SETUP:
  Before using, run: node setup.js
  This will help you configure your eBay API credentials.

POPULAR CATEGORIES:
  220 - Collectibles
  11450 - Clothing, Shoes & Accessories
  2984 - Sports Mem, Cards & Fan Shop
  11233 - Music
  1249 - Video Games & Consoles

Speed: 50-100x faster than web scraping!
    `);
  }
};

// Parse arguments
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++;
    } else {
      args._.push(argv[i]);
    }
  }
  return args;
}

// Main
async function main() {
  const [,, command, ...argv] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
    process.exit(0);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'node cli.js help' for usage`);
    process.exit(1);
  }

  const args = parseArgs(argv);
  await commands[command](args);
}

process.on('unhandledRejection', error => {
  console.error('Error:', error.message);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = commands;
