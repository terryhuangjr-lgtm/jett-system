#!/usr/bin/env node
/**
 * eBay Scan Deployment Script
 * Reads eBay scan JSON files and posts formatted results to #levelupcards
 * Uses task-manager/ebay-scans-config.json as single source of truth
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SLACK_CHANNEL = '#levelupcards';

// Load config from task manager (single source of truth)
const CONFIG_PATH = path.join(__dirname, '..', 'task-manager', 'ebay-scans-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load config:', e.message);
  }
  return null;
}

function getTodayScanConfig() {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  
  const config = loadConfig();
  if (config && config.scans && config.scans[today]) {
    return config.scans[today];
  }
  return null;
}

function getScanFileFromDay() {
  const dayMap = {
    1: '/tmp/mj-finest-scan.json',      // Monday
    2: '/tmp/griffey-refractors-scan.json', // Tuesday
    3: '/tmp/kobe-refractors-scan.json',    // Wednesday
    4: '/tmp/mj-upperdeck-scan.json',       // Thursday
    5: '/tmp/topps-refractors-multi-scan.json', // Friday
    6: '/tmp/mj-base-scan.json',           // Saturday
    0: '/tmp/cam-ward-scan.json'           // Sunday
  };
  return dayMap[new Date().getDay()];
}

// Format results for Slack
function formatResults(data, scanName) {
  if (!data || !data.results || data.results.length === 0) {
    return {
      text: `📊 *${scanName}*\n\nNo results found.`,
      hasResults: false
    };
  }

  const { results, timestamp } = data;
  const topResults = results.slice(0, 20);

  let message = `📊 *eBay Scan: ${scanName}*\n`;
  message += `🔍 Found ${results.length} results (showing top ${topResults.length})\n`;

  // Use timestamp from root level (not metadata.scanned_at)
  if (timestamp) {
    message += `⏰ Scanned at: ${new Date(timestamp).toLocaleString()}\n\n`;
  } else {
    message += '\n';
  }

  topResults.forEach((item, index) => {
    message += `*${index + 1}. ${item.title.substring(0, 80)}${item.title.length > 80 ? '...' : ''}*\n`;

    // Use totalPrice (number) and format it
    const price = item.totalPrice || item.price;
    message += `💰 Price: $${typeof price === 'number' ? price.toFixed(2) : price}`;

    // Check for dealScore.score or score
    const score = item.dealScore?.score || item.score;
    if (score) {
      message += ` | 📈 Score: ${typeof score === 'number' ? score.toFixed(1) : score}/10`;
    }

    // Use viewItemURL or url
    const itemUrl = item.viewItemURL || item.url;
    message += `\n🔗 ${itemUrl}\n`;

    // Add notable details
    if (item.condition) {
      message += `   Condition: ${item.condition}`;
    }

    // Handle shipping cost (shippingCost number vs shipping string)
    const shipping = item.shippingCost !== undefined
      ? (item.shippingCost === 0 ? 'FREE' : `$${item.shippingCost.toFixed(2)}`)
      : item.shipping;

    if (shipping) {
      message += ` | Shipping: ${shipping}`;
    }
    message += '\n\n';
  });

  message += `\n_Full results: ${results.length} cards found_`;

  return {
    text: message,
    hasResults: true
  };
}

// Post to Slack
function postToSlack(message) {
  try {
    const output = execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', ['message', 'send', '--channel', 'slack', '--target', SLACK_CHANNEL, '--message', message], {
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        PATH: `/home/clawd/.nvm/versions/node/v22.22.0/bin:${process.env.PATH}`
      }
    });

    const result = JSON.parse(output.trim());

    if (result && (result.ok || (result.payload && result.payload.ok))) {
      console.log('✓ Posted to #levelupcards');
      return true;
    } else {
      console.error('✗ Failed to post to Slack:', result.error || JSON.stringify(result));
      return false;
    }
  } catch (error) {
    console.error('✗ Error posting to Slack:', error.message);
    return false;
  }
}

// Main execution
try {
  console.log('📤 Deploying eBay scan results to Slack...');

  // Get today's scan config from task manager
  const todayConfig = getTodayScanConfig();
  
  // Determine which scan to deploy
  const scanFile = process.argv[2] || getScanFileFromDay();
  
  // Get scan name from config, fallback to generic
  let scanName = 'eBay Scan';
  if (todayConfig && todayConfig.name) {
    scanName = todayConfig.name;
  } else if (todayConfig) {
    scanName = `eBay Scan: ${todayConfig.search_terms ? todayConfig.search_terms[0] : 'Unknown'}`;
  }

  console.log(`  Scan file: ${scanFile}`);
  console.log(`  Scan name: ${scanName}`);
  console.log(`  Source: task-manager/ebay-scans-config.json`);

  // Check if file exists
  if (!fs.existsSync(scanFile)) {
    console.log(`⚠️  Scan file not found: ${scanFile}`);
    console.log('   This scan may not have run yet.');

    // Post notification to Slack
    const noResultsMessage = `📊 *${scanName}*\n\n⚠️ Scan not completed yet or no results file found.`;
    postToSlack(noResultsMessage);
    process.exit(0);
  }

  // Read and parse scan results
  const data = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
  console.log(`  Results found: ${data.results ? data.results.length : 0}`);

  // Format for Slack
  const { text, hasResults } = formatResults(data, scanName);

  // Preview
  console.log('\n--- Message Preview ---');
  console.log(text.substring(0, 500));
  if (text.length > 500) {
    console.log('...(truncated)');
  }
  console.log('--- End Preview ---\n');

  // Post to Slack
  const success = postToSlack(text);

  if (success) {
    console.log('\n✓ Deployment complete');
  } else {
    console.error('\n✗ Deployment failed');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying scan:', error.message);
  process.exit(1);
}
