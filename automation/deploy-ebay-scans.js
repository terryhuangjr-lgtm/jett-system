#!/usr/bin/env node
/**
 * eBay Scan Deployment Script
 * Reads eBay scan JSON files and posts formatted results to #levelupcards
 * Uses task-manager/ebay-scans-config.json as single source of truth
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const notifyFailure = require('../lib/notify-failure');

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
    execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', ['message', 'send', '--channel', 'slack', '--target', '#levelupcards', '--message', message], {
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        PATH: `/home/clawd/.nvm/versions/node/v22.22.0/bin:${process.env.PATH}`
      }
    });

    console.log('✓ Posted to #levelupcards');
    return true;
  } catch (error) {
    console.error('✗ Error posting to Slack:', error.message);
    return false;
  }
}

// Send via email
function postToEmail(message, scanName) {
  try {
    const emailScript = path.join(__dirname, '..', 'lib', 'send-email.js');
    const subject = `${scanName} - eBay Scan Results`;
    const env = { ...process.env };
    execFileSync('node', [emailScript, '--to', 'terryhuangjr@gmail.com', '--subject', subject, '--body', message], {
      encoding: 'utf8',
      timeout: 30000,
      env: env
    });
    console.log('✓ Emailed to terryhuangjr@gmail.com');
    return true;
  } catch (error) {
    console.error('✗ Error sending email:', error.message);
    return false;
  }
}

// Main execution
const useEmail = process.argv.includes('--email');
// Get first non-flag argument as scan file, or use today's default
const scanFileArg = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--'));
const scanFile = scanFileArg || getScanFileFromDay();

console.log(useEmail ? '📤 Emailing eBay scan results...' : '📤 Deploying eBay scan results to Slack...');

try {
  // Get today's scan config from task manager
  const todayConfig = getTodayScanConfig();
  
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

    // Post notification
    const noResultsMessage = `📊 *${scanName}*\n\n⚠️ Scan not completed yet or no results file found.`;
    if (useEmail) {
      postToEmail(noResultsMessage, scanName);
    } else {
      postToSlack(noResultsMessage);
    }
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

  // Post
  let success;
  if (useEmail) {
    success = postToEmail(text, scanName);
  } else {
    success = postToSlack(text);
  }

  if (success) {
    console.log('\n✓ Deployment complete');
  } else {
    console.error('\n✗ Deployment failed');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying scan:', error.message);
  const notifyFailure = require('../lib/notify-failure');
  notifyFailure('eBay Scans Deploy', error);
  process.exit(1);
}
