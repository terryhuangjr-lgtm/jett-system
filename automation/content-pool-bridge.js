#!/usr/bin/env node
/**
 * Content Pool Bridge - Node.js interface to Python Content Pool Manager
 *
 * Provides smart content selection for tweet generation:
 * - Selects diverse, non-recent content
 * - Balances categories (contracts, stories, quotes, history)
 * - Tracks usage to prevent repetition
 * - Enables content recycling
 *
 * Usage:
 *   const pool = require('./content-pool-bridge.js');
 *   pool.selectForGeneration('sports', 67200, 'up')
 *     .then(({content, context}) => console.log(content));
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'content_pool_manager.py');

/**
 * Get BTC price and trend
 */
function getBTCContext() {
  return new Promise((resolve) => {
    https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const price = parseFloat(JSON.parse(data).data.amount);
          resolve({ price, trend: 'neutral' });
        } catch (e) {
          resolve({ price: 67000, trend: 'neutral' });
        }
      });
    }).on('error', () => {
      resolve({ price: 67000, trend: 'neutral' });
    });
  });
}

/**
 * Call Python content pool manager
 */
function callPoolManager(args) {
  const cmd = `python3 ${SCRIPT_PATH} ${args.join(' ')}`;
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
      timeout: 30000
    });
    return JSON.parse(result);
  } catch (err) {
    console.error(`Pool manager error: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Select content for tweet generation
 */
async function selectForGeneration(contentType, btcPrice = null, btcTrend = 'neutral') {
  if (!btcPrice) {
    const ctx = await getBTCContext();
    btcPrice = ctx.price;
    // Determine trend (simplified - in production you'd track history)
    btcTrend = ctx.trend;
  }

  const args = [
    '--select', contentType,
    '--btc-price', btcPrice,
    '--btc-trend', btcTrend
  ];

  const result = callPoolManager(args);

  if (result.error) {
    return { content: [], context: { error: result.error } };
  }

  // Parse the output - it's a list format
  return {
    content: result.content || [],
    context: result.context || {}
  };
}

/**
 * Mark content as used
 */
function markUsed(contentId, topic, category, tweetIds, platform = 'x') {
  const args = [
    '--mark-used',
    contentId,
    `"${topic.replace(/"/g, '\\"')}"`,
    category,
    JSON.stringify(tweetIds),
    platform
  ];

  return callPoolManager(args);
}

/**
 * Get pool statistics
 */
function getStats() {
  return callPoolManager(['--stats']);
}

/**
 * Recycle old content
 */
function recycleContent(days = 30) {
  return callPoolManager(['--recycle', days]);
}

/**
 * Initialize usage log table
 */
function initTables() {
  return callPoolManager(['--init']);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Content Pool Bridge - Smart Content Selection for 21M

Usage:
  node content-pool-bridge.js --select <type> [--btc-price <price>] [--btc-trend <trend>]
  node content-pool-bridge.js --stats
  node content-pool-bridge.js --recycle [days]
  node content-pool-bridge.js --init

Options:
  --select       Content type: 'bitcoin' or 'sports'
  --btc-price    Current BTC price (optional, fetches if not provided)
  --btc-trend   BTC trend: 'up', 'down', or 'neutral'
  --stats        Show pool statistics
  --recycle      Recycle content older than N days (default 30)
  --init         Initialize usage log table

Examples:
  node content-pool-bridge.js --select sports --btc-price 67000 --btc-trend up
  node content-pool-bridge.js --stats
  node content-pool-bridge.js --recycle 60
    `);
    process.exit(0);
  }

  if (args.includes('--select')) {
    const typeIdx = args.indexOf('--select');
    const type = args[typeIdx + 1];

    let price = null;
    let trend = 'neutral';

    const priceIdx = args.indexOf('--btc-price');
    if (priceIdx > -1 && args[priceIdx + 1]) {
      price = parseFloat(args[priceIdx + 1]);
    }

    const trendIdx = args.indexOf('--btc-trend');
    if (trendIdx > -1 && args[trendIdx + 1]) {
      trend = args[trendIdx + 1];
    }

    selectForGeneration(type, price, trend).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (args.includes('--stats')) {
    console.log(JSON.stringify(getStats(), null, 2));
  } else if (args.includes('--recycle')) {
    const idx = args.indexOf('--recycle');
    const days = args[idx + 1] ? parseInt(args[idx + 1]) : 30;
    console.log(JSON.stringify(recycleContent(days), null, 2));
  } else if (args.includes('--init')) {
    console.log(JSON.stringify(initTables(), null, 2));
  } else {
    console.log('Use --help for usage');
  }
}

module.exports = {
  selectForGeneration,
  markUsed,
  getStats,
  recycleContent,
  initTables,
  getBTCContext
};
