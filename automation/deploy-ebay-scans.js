#!/usr/bin/env node
/**
 * eBay Scan Deployment Script
 * Reads eBay scan JSON files and posts formatted results to #levelupcards
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SLACK_CHANNEL = 'C0ACEEDAC68'; // #levelupcards

// Map of scan files to scan names
const SCAN_FILES = {
  '/tmp/mj-finest-scan.json': 'MJ Topps Finest 1993-1999 (Monday)',
  '/tmp/griffey-refractors-scan.json': 'Griffey Jr Chrome/Finest Refractors (Tuesday)',
  '/tmp/griffey-1989-scan.json': '1989 Griffey Jr Rookies (Wednesday)',
  '/tmp/mj-upperdeck-scan.json': 'MJ Upper Deck Serial #\'d 1996-2000 (Thursday)',
  '/tmp/topps-refractors-multi-scan.json': 'Multi-Search: Kobe/Duncan/Dirk/Wade (Friday)',
  '/tmp/mj-base-scan.json': 'MJ Base 1994-1999 (Saturday)',
  '/tmp/cam-ward-scan.json': '2025 Cam Ward (Sunday)'
};

// Get today's scan file
function getTodayScanFile() {
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const files = Object.keys(SCAN_FILES);

  const dayMap = {
    1: files[0], // Monday
    2: files[1], // Tuesday
    3: files[2], // Wednesday
    4: files[3], // Thursday
    5: files[4], // Friday
    6: files[5], // Saturday
    0: files[6]  // Sunday
  };

  return dayMap[dayOfWeek];
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
  const topResults = results.slice(0, 10);

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
    // Escape single quotes for shell
    const escapedMessage = message.replace(/'/g, "'\\''");

    // Use clawdbot to send message
    const cmd = `clawdbot message send --channel slack --target "${SLACK_CHANNEL}" --message '${escapedMessage}' --json`;

    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout: 30000
    });

    const result = JSON.parse(output.trim());

    if (result.payload && result.payload.ok) {
      console.log('✓ Posted to #levelupcards');
      return true;
    } else {
      console.error('✗ Failed to post to Slack:', result.error || 'Unknown error');
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

  // Determine which scan to deploy
  const scanFile = process.argv[2] || getTodayScanFile();
  const scanName = SCAN_FILES[scanFile] || 'eBay Scan';

  console.log(`  Scan file: ${scanFile}`);
  console.log(`  Scan name: ${scanName}`);

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
