#!/usr/bin/env node
/**
 * Slack Poster for Podcast Summary
 * Posts formatted summaries to #podcastsummary channel
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const { getSecret } = require('./lib/secrets-manager.js');

// Channel ID for #podcastsummary
const CHANNEL_ID = process.env.PODCAST_SUMMARY_CHANNEL || 'C0AEZKJNQBG';

async function postToSlack(message, channelId = CHANNEL_ID) {
  const SLACK_BOT_TOKEN = getSecret('SLACK_BOT_TOKEN');
  
  const postData = JSON.stringify({
    channel: channelId,
    text: message,
    mrkdwn: true
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Slack API error'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Slack response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const messageFile = args.find(a => !a.startsWith('--'));
  const channelArg = args.find(a => a.startsWith('--channel='));
  const channelId = channelArg ? channelArg.split('=')[1] : CHANNEL_ID;
  
  if (!messageFile) {
    console.error('Usage: node post-podcast-summary.js <message-file> [--channel=CXXXXX]');
    console.error('Or set PODCAST_SUMMARY_CHANNEL environment variable');
    process.exit(1);
  }
  
  if (!fs.existsSync(messageFile)) {
    console.error(`File not found: ${messageFile}`);
    process.exit(1);
  }
  
  const message = fs.readFileSync(messageFile, 'utf8').trim();
  
  console.log(`Posting to channel ${channelId}...`);
  
  postToSlack(message, channelId)
    .then(result => {
      console.log('✅ Posted to Slack:', result.ts);
    })
    .catch(err => {
      console.error('❌ Slack post failed:', err.message);
      process.exit(1);
    });
}

module.exports = { postToSlack };
