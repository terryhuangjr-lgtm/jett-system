#!/usr/bin/env node
/**
 * Task Worker Health Monitor
 * Alerts when worker goes down or becomes stale
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

const HEARTBEAT_FILE = '/tmp/clawd-task-worker.heartbeat';
const LOCK_FILE = '/tmp/clawd-task-worker.lock';
const STALE_THRESHOLD_MS = 120000; // 2 minutes
const CHECK_INTERVAL_MS = 60000; // Check every minute
const ALERT_COOLDOWN_MS = 300000; // 5 min between alerts

let lastAlertTime = 0;

async function getHeartbeat() {
  try {
    const content = await fsp.readFile(HEARTBEAT_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

async function getLock() {
  try {
    const content = await fsp.readFile(LOCK_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function sendAlert(message) {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    console.log('Alert cooldown active, skipping');
    return;
  }
  
  try {
    // Slack
    const slackCmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel slack --target "U0ABTP704QK" --message "${message.replace(/"/g, '\\"')}" --json`;
    execSync(slackCmd, { timeout: 10000, stdio: 'ignore' });
    
    // Telegram
    const telegramCmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel telegram --target "5867308866" --message "${message.replace(/"/g, '\\"')}" --json`;
    execSync(telegramCmd, { timeout: 10000, stdio: 'ignore' });
    
    lastAlertTime = now;
    console.log('✅ Alert sent:', message);
  } catch (e) {
    console.error('Failed to send alert:', e.message);
  }
}

async function checkHealth() {
  const heartbeat = await getHeartbeat();
  const lock = await getLock();
  
  if (!lock) {
    sendAlert('🚨 Task Worker DOWN - No lock file found!');
    return;
  }
  
  if (!heartbeat) {
    sendAlert('🚨 Task Worker DOWN - No heartbeat file!');
    return;
  }
  
  const elapsed = Date.now() - heartbeat.lastBeat;
  
  if (elapsed > STALE_THRESHOLD_MS) {
    sendAlert(`🚨 Task Worker STALE - No heartbeat for ${Math.round(elapsed/1000)}s\nPID: ${lock.pid}`);
  } else {
    console.log(`✅ Worker healthy - heartbeat ${Math.round(elapsed/1000)}s ago`);
  }
}

async function main() {
  console.log('🔍 Task Worker Health Monitor starting...');
  
  // Initial check
  await checkHealth();
  
  // Periodic check
  setInterval(checkHealth, CHECK_INTERVAL_MS);
}

main().catch(console.error);
