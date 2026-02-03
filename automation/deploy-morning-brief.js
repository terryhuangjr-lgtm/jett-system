#!/usr/bin/env node
/**
 * Morning Brief Deployment Script
 * Reads morning-brief.json and posts to Terry's Slack DM
 */

const fs = require('fs');
const { execSync } = require('child_process');

const BRIEF_FILE = process.argv[2] || '/tmp/morning-brief.json';
const TERRY_USER_ID = 'U0ABTP704QK'; // Terry's Slack user ID

try {
  console.log('📨 Deploying morning brief to Terry\'s DM...');

  // Check if file exists
  if (!fs.existsSync(BRIEF_FILE)) {
    console.error(`✗ Brief file not found: ${BRIEF_FILE}`);
    process.exit(1);
  }

  // Read the brief
  const data = JSON.parse(fs.readFileSync(BRIEF_FILE, 'utf8'));
  const message = data.content;

  console.log('\n--- Message Preview ---');
  console.log(message.substring(0, 300));
  console.log('...(truncated)\n');

  // Escape single quotes for shell
  const escapedMessage = message.replace(/'/g, "'\\''");

  // Post to Slack DM using clawdbot
  const cmd = `clawdbot message --channel slack --to "${TERRY_USER_ID}" --text '${escapedMessage}' --json`;

  const output = execSync(cmd, {
    encoding: 'utf8',
    timeout: 30000
  });

  const result = JSON.parse(output.trim());

  if (result.status === 'ok') {
    console.log('✓ Morning brief delivered to Terry\'s DM');
  } else {
    console.error('✗ Failed to deliver:', result.error || 'Unknown error');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying morning brief:', error.message);
  process.exit(1);
}
