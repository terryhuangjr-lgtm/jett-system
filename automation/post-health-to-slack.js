#!/usr/bin/env node
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const notifyFailure = require('../lib/notify-failure');

async function main() {
  try {
    console.log('Running health check...');
    const output = execSync('node /home/clawd/clawd/automation/system-health-check.js', { encoding: 'utf8' });
    const telegramMessage = '```\n' + output + '```';
    execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
      'message', 'send', '--channel', 'telegram',
      '--target', '5867308866',
      '--message', telegramMessage
    ], { timeout: 15000, stdio: 'pipe' });
    fs.writeFileSync('/tmp/health-check-latest.txt', output);
    console.log('✅ Health check posted to Telegram');
  } catch (error) {
    console.error('Error:', error.message);
    notifyFailure('System Health Check', error);
    process.exit(1);
  }
}
main();
