#!/usr/bin/env node
/**
 * 21M Sports Tweet Deployment Script
 * Reads tweet variations and posts to #21msports channel
 */

const fs = require('fs');
const { execSync } = require('child_process');

const TWEET_FILE = process.argv[2] || '/tmp/21m-sports-tweet.json';
const SLACK_CHANNEL = 'C0ABK99L0B1'; // #21msports

try {
  console.log('📨 Deploying 21M Sports tweet to #21msports...');

  // Check if file exists
  if (!fs.existsSync(TWEET_FILE)) {
    console.error(`✗ Tweet file not found: ${TWEET_FILE}`);
    process.exit(1);
  }

  // Read the tweets
  const data = JSON.parse(fs.readFileSync(TWEET_FILE, 'utf8'));

  if (!data.tweets || data.tweets.length === 0) {
    console.error('✗ No tweets found in file');
    process.exit(1);
  }

  // Format message with all 3 variations
  let message = `🏈 *21M Sports - Tweet Options*\n`;
  message += `_Generated at ${new Date(data.timestamp).toLocaleString()}_\n\n`;

  data.tweets.forEach((tweet, index) => {
    message += `*Option ${index + 1}* (${data.metadata.pillars_used[index]})\n`;
    message += `${tweet}\n`;
    message += `_Length: ${tweet.length} chars_\n\n`;
  });

  message += `\n💡 Pick your favorite and post to X!`;

  console.log('\n--- Message Preview ---');
  console.log(message.substring(0, 400));
  console.log('...(truncated)\n');

  // Escape single quotes for shell
  const escapedMessage = message.replace(/'/g, "'\\''");

  // Post to Slack channel using clawdbot
  const cmd = `clawdbot message --channel slack --to "${SLACK_CHANNEL}" --text '${escapedMessage}' --json`;

  const output = execSync(cmd, {
    encoding: 'utf8',
    timeout: 30000
  });

  const result = JSON.parse(output.trim());

  if (result.status === 'ok') {
    console.log('✓ Tweet options posted to #21msports');
  } else {
    console.error('✗ Failed to post:', result.error || 'Unknown error');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying tweet:', error.message);
  process.exit(1);
}
