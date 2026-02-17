#!/usr/bin/env node
/**
 * Run health check and post to Slack
 */

const { exec } = require('child_process');
const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getSecret(name) {
  const homeDir = os.homedir();
  const secretsPath = path.join(homeDir, '.clawd', 'secrets.json');
  try {
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      return secrets[name];
    }
  } catch (e) {}
  return process.env[name];
}

async function runHealthCheck() {
  return new Promise((resolve, reject) => {
    exec('node /home/clawd/clawd/automation/system-health-check.js', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function postToSlack(message) {
  const SLACK_BOT_TOKEN = getSecret('SLACK_BOT_TOKEN');
  const CHANNEL_ID = '#all-terrysworld';
  
  if (!SLACK_BOT_TOKEN) {
    console.error('No Slack token found');
    return false;
  }
  
  const postData = JSON.stringify({
    channel: CHANNEL_ID,
    text: message,
    unfurl_links: false
  });
  
  const options = {
    hostname: 'slack.com',
    port: 443,
    path: '/api/chat.postMessage',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        if (response.ok) {
          console.log('✅ Posted to Slack');
          resolve(true);
        } else {
          console.error(`❌ Slack error: ${response.error}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Running health check...');
    const output = await runHealthCheck();
    
    // Format for Slack
    const slackMessage = '```\n' + output + '```';
    
    await postToSlack(slackMessage);
    
    // Also save to file
    fs.writeFileSync('/tmp/health-check-latest.txt', output);
    console.log('Health check saved to /tmp/health-check-latest.txt');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
