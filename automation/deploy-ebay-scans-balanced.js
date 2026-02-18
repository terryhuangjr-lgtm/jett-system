#!/usr/bin/env node
/**
 * Balanced eBay Scan Deployment - Shows top results from EACH player
 * For multi-player searches
 */

const fs = require('fs');
const { execSync } = require('child_process');

const scanFile = process.argv[2] || '/tmp/topps-refractors-multi-scan.json';
const SLACK_CHANNEL = '#levelupcards';

// Read scan
const data = JSON.parse(fs.readFileSync(scanFile, 'utf8'));

// Detect players
const players = ['kobe', 'duncan', 'dirk', 'wade', 'nowitzki', 'dwyane'];

// Group results by player
const byPlayer = {};
data.results.forEach(item => {
  const title = item.title.toLowerCase();
  for (const player of players) {
    if (title.includes(player)) {
      if (!byPlayer[player]) byPlayer[player] = [];
      byPlayer[player].push(item);
      break; // Only count in first matching player
    }
  }
});

// Build message with top 5 from each player
let message = `📊 *eBay Scan: Multi: Kobe/Duncan/Dirk/Wade*\n`;
message += `🔍 Found ${data.results.length} results\n`;
message += `⏰ Scanned at: ${new Date(data.timestamp).toLocaleString()}\n\n`;

message += `*Top 5 per player:*\n\n`;

// Kobe
const kobeCards = byPlayer['kobe'] || [];
message += `*🏀 Kobe Bryant (${kobeCards.length} total)*\n`;
kobeCards.slice(0, 5).forEach((item, i) => {
  message += `${i+1}. ${item.title.substring(0, 55)}\n`;
  message += `   💰 $${item.totalPrice.toFixed(2)} | 📈 ${item.score?.toFixed(1) || 'N/A'}/10\n`;
  message += `   🔗 ${item.viewItemURL}\n\n`;
});

// Duncan
const duncanCards = byPlayer['duncan'] || [];
message += `*🏀 Tim Duncan (${duncanCards.length} total)*\n`;
duncanCards.slice(0, 5).forEach((item, i) => {
  message += `${i+1}. ${item.title.substring(0, 55)}\n`;
  message += `   💰 $${item.totalPrice.toFixed(2)} | 📈 ${item.score?.toFixed(1) || 'N/A'}/10\n`;
  message += `   🔗 ${item.viewItemURL}\n\n`;
});

// Dirk
const dirkCards = byPlayer['dirk'] || byPlayer['nowitzki'] || [];
message += `*🏀 Dirk Nowitzki (${dirkCards.length} total)*\n`;
dirkCards.slice(0, 5).forEach((item, i) => {
  message += `${i+1}. ${item.title.substring(0, 55)}\n`;
  message += `   💰 $${item.totalPrice.toFixed(2)} | 📈 ${item.score?.toFixed(1) || 'N/A'}/10\n`;
  message += `   🔗 ${item.viewItemURL}\n\n`;
});

// Wade
const wadeCards = byPlayer['wade'] || byPlayer['dwyane'] || [];
message += `*🏀 Dwyane Wade (${wadeCards.length} total)*\n`;
wadeCards.slice(0, 5).forEach((item, i) => {
  message += `${i+1}. ${item.title.substring(0, 55)}\n`;
  message += `   💰 $${item.totalPrice.toFixed(2)} | 📈 ${item.score?.toFixed(1) || 'N/A'}/10\n`;
  message += `   🔗 ${item.viewItemURL}\n\n`;
});

// Post to Slack
const escapedMessage = message.replace(/'/g, "'\\''");
const cmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel slack --target "${SLACK_CHANNEL}" --message '${escapedMessage}' --json`;

try {
  execSync(cmd, { encoding: 'utf8', timeout: 30000 });
  console.log('✓ Posted balanced results to #levelupcards');
} catch (error) {
  console.error('✗ Failed to post:', error.message);
  process.exit(1);
}
