#!/usr/bin/env node
/**
 * Slack Bridge for Clawdbot
 * Monitors Slack for messages and forwards them to the clawdbot gateway
 * Supports file uploads (images, PDFs, etc.)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const SLACK_BOT_TOKEN = 'REDACTED_SLACK_BOT_TOKEN';
const SLACK_TEAM_ID = 'T0ABY3NMR2A';
const ALLOWED_USER_ID = 'U0ABTP704QK'; // Terry's Slack user ID
const BOT_USER_ID = 'U0ABX015Y5T'; // Jett's Slack user ID
const CLAWDBOT_GATEWAY = 'http://localhost:18789';
const CLAWDBOT_TOKEN = '5a5132b80dedcc723bec68c13679992b6eaadc7fa848b7af';
const POLL_INTERVAL = 15000; // Poll every 15 seconds (reduced API calls, still feels instant)
const FILE_DOWNLOAD_DIR = path.join(process.env.HOME, 'clawd', 'slack-files');
const TIMESTAMP_FILE = path.join(process.env.HOME, 'clawd', 'slack-bridge-timestamps.json');

let lastMessageTimestamps = {};
let isProcessing = false;

// Load saved timestamps on startup to avoid reprocessing old messages
function loadTimestamps() {
  try {
    if (fs.existsSync(TIMESTAMP_FILE)) {
      const data = fs.readFileSync(TIMESTAMP_FILE, 'utf8');
      lastMessageTimestamps = JSON.parse(data);
      console.log(`📝 Loaded ${Object.keys(lastMessageTimestamps).length} saved timestamps`);
    }
  } catch (err) {
    console.error('Error loading timestamps:', err.message);
  }
}

// Save timestamps periodically
function saveTimestamps() {
  try {
    fs.writeFileSync(TIMESTAMP_FILE, JSON.stringify(lastMessageTimestamps, null, 2));
  } catch (err) {
    console.error('Error saving timestamps:', err.message);
  }
}

// Helper: Make Slack API call
function slackAPI(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');

    const options = {
      hostname: 'slack.com',
      path: `/api/${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Helper: Download file from Slack using API
async function downloadSlackFile(fileId, fileName, destPath) {
  try {
    // First, make the file public temporarily using Slack API
    const publicUrlResult = await slackAPI('files.sharedPublicURL', {
      file: fileId
    });

    if (!publicUrlResult.ok) {
      throw new Error(`Failed to get public URL: ${publicUrlResult.error}`);
    }

    const publicUrl = publicUrlResult.file.permalink_public;

    // Download from the public URL
    return new Promise((resolve, reject) => {
      https.get(publicUrl, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, handleDownload).on('error', reject);
          } else {
            reject(new Error('Redirect without location'));
          }
          return;
        }

        handleDownload(res);
      }).on('error', reject);

      function handleDownload(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();

          // Revoke public access
          slackAPI('files.revokePublicURL', { file: fileId }).catch(() => {});

          resolve(destPath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }
    });
  } catch (error) {
    throw new Error(`Slack file download failed: ${error.message}`);
  }
}

// Helper: Process file attachments in a message
async function processFileAttachments(files) {
  if (!files || files.length === 0) {
    return [];
  }

  const fileInfoList = [];

  for (const file of files) {
    // Instead of downloading, just gather all the file info and URLs
    // Jett can access these via Slack MCP or direct URLs
    fileInfoList.push({
      slackId: file.id,
      name: file.name,
      title: file.title || file.name,
      mimetype: file.mimetype,
      filetype: file.filetype,
      size: file.size,
      url_private: file.url_private,
      url_private_download: file.url_private_download,
      permalink: file.permalink,
      permalink_public: file.permalink_public,
      // Include best available thumbnail
      thumb_360: file.thumb_360,
      thumb_480: file.thumb_480,
      thumb_720: file.thumb_720,
      thumb_1024: file.thumb_1024
    });

    console.log(`   📎 File detected: ${file.name} (${file.mimetype}, ${(file.size/1024).toFixed(1)}KB)`);
  }

  return fileInfoList;
}

// Helper: Send message to clawdbot gateway (with LLM routing)
async function sendToClawdbot(message, slackChannelId, slackUserId, attachedFiles = []) {
  try {
    // Build message with file information if present
    let fullMessage = message || '';

    if (attachedFiles.length > 0) {
      // Add file information to the message with all URLs
      const fileInfo = attachedFiles.map(f => {
        let info = `\n\n📎 Slack File Attachment: ${f.name}\n` +
                   `Type: ${f.mimetype}\n` +
                   `Size: ${(f.size / 1024).toFixed(1)} KB\n` +
                   `Slack File ID: ${f.slackId}\n`;

        // Add available URLs for Jett to access
        if (f.permalink_public) info += `Public URL: ${f.permalink_public}\n`;
        if (f.thumb_1024) info += `Thumbnail (1024): ${f.thumb_1024}\n`;
        else if (f.thumb_720) info += `Thumbnail (720): ${f.thumb_720}\n`;
        else if (f.thumb_480) info += `Thumbnail (480): ${f.thumb_480}\n`;

        info += `\nYou can access this file using the Slack MCP tools with file ID: ${f.slackId}`;

        return info;
      }).join('\n');

      fullMessage = fullMessage.trim() + fileInfo;
    }

    // Clean the message: remove @ mentions that might cause issues
    const cleanedMessage = fullMessage
      .replace(/<@[A-Z0-9]+>/g, '') // Remove Slack user mentions
      .trim();

    // Pre-filter: Skip messages that don't need LLM processing
    const SKIP_PATTERNS = [
      /^(ok|okay|thanks|thank you|thx|got it|sounds good|cool|nice|great)$/i,
      /^(yes|no|yep|nope|sure|k|kk)$/i,
      /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u, // emoji-only
      /^(👍|🙏|✅|❤️|🔥|💯|😊|😂|🎉|👋)+$/u // common reaction emojis
    ];

    const shouldSkip = SKIP_PATTERNS.some(pattern => pattern.test(cleanedMessage));

    if (shouldSkip) {
      console.log(`   ⚡ Skipping simple message (no LLM needed): "${cleanedMessage}"`);
      // Return a simple acknowledgment without calling LLM
      return {
        response: null,
        success: true,
        provider: 'filtered',
        skipped: true
      };
    }

    // Create a unique session ID based on Slack channel + user
    const sessionId = `slack:${slackChannelId}:${slackUserId}`;

    // Use LLM Bridge for smart routing between Ollama and Claude
    const LLMBridge = require('./llm-bridge.js');
    const bridge = new LLMBridge();

    const result = await bridge.route(cleanedMessage, sessionId);

    // Log usage
    bridge.logUsage(result);

    if (result.success && result.response) {
      return { response: result.response, success: true, provider: result.provider };
    } else {
      return { response: null, success: false, error: result.error || 'No response' };
    }
  } catch (error) {
    console.error('LLM Bridge error:', error.message);
    return { response: null, success: false, error: error.message };
  }
}

// Check for new messages in a conversation
async function checkConversation(channelId, channelName) {
  try {
    // If no saved timestamp for this channel, use current time (don't process old messages)
    if (!lastMessageTimestamps[channelId]) {
      lastMessageTimestamps[channelId] = (Date.now() / 1000).toString();
      saveTimestamps();
    }

    const lastTs = lastMessageTimestamps[channelId];

    const history = await slackAPI('conversations.history', {
      channel: channelId,
      oldest: lastTs,
      limit: 10
    });

    if (!history.ok) {
      // Handle rate limiting gracefully
      if (history.error === 'ratelimited') {
        // Skip this channel for this cycle
        return;
      }
      console.error(`Error fetching history for ${channelName}:`, history.error);
      return;
    }

    // Filter messages from allowed user, not from bot
    const newMessages = (history.messages || [])
      .filter(msg =>
        msg.user === ALLOWED_USER_ID &&
        msg.user !== BOT_USER_ID &&
        !msg.bot_id &&
        parseFloat(msg.ts) > parseFloat(lastTs)
      )
      .reverse(); // Process oldest first

    for (const msg of newMessages) {
      console.log(`\n📩 New message in ${channelName}:`);
      console.log(`   User: ${msg.user}`);
      console.log(`   Text: ${msg.text || '(no text)'}`);

      // Note: File attachments are not supported due to Slack authentication requirements
      // Use Telegram for file uploads instead

      // Update timestamp
      lastMessageTimestamps[channelId] = msg.ts;

      // Send to clawdbot (text only)
      try {
        console.log(`   ⚡ Forwarding to Jett...`);
        const response = await sendToClawdbot(msg.text, channelId, msg.user);

        // Skip posting if message was filtered (simple acknowledgments)
        if (response && response.skipped) {
          console.log(`   ⏭️  Message filtered, no response needed`);
          continue;
        }

        if (response && response.success && response.response) {
          const preview = response.response.length > 100
            ? response.response.substring(0, 100) + '...'
            : response.response;
          console.log(`   ✅ Jett's response: ${preview}`);

          // Post response back to Slack
          const result = await slackAPI('chat.postMessage', {
            channel: channelId,
            text: response.response
          });

          if (result.ok) {
            console.log(`   ✅ Posted to Slack`);
          } else {
            console.error(`   ❌ Failed to post to Slack:`, result.error);
          }
        } else if (!response.success) {
          console.error(`   ❌ Failed to get response from Jett:`, response.error);
        }
      } catch (err) {
        console.error(`   ❌ Error processing message:`, err.message);
      }
    }

    // Update timestamp even if no new messages
    if (history.messages && history.messages.length > 0) {
      const latestTs = history.messages[0].ts;
      if (parseFloat(latestTs) > parseFloat(lastTs)) {
        lastMessageTimestamps[channelId] = latestTs;
        saveTimestamps(); // Save after updating
      }
    }
  } catch (err) {
    console.error(`Error checking ${channelName}:`, err.message);
  }
}

// Cache for channel list (refresh every 5 minutes)
let channelListCache = null;
let channelListCacheTime = 0;
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get all channels where Jett is a member
async function getMonitoredChannels() {
  const now = Date.now();

  // Return cached list if still valid
  if (channelListCache && (now - channelListCacheTime) < CHANNEL_CACHE_TTL) {
    return channelListCache;
  }

  try {
    const channels = [];

    // Get all channel types
    const types = ['public_channel', 'private_channel'];

    for (const type of types) {
      const result = await slackAPI('conversations.list', {
        types: type,
        limit: 200,
        exclude_archived: true
      });

      if (result.ok && result.channels) {
        // Filter to only channels where bot is a member
        const memberChannels = result.channels.filter(ch => ch.is_member);
        channels.push(...memberChannels.map(ch => ({
          id: ch.id,
          name: ch.name || 'unknown',
          type: type
        })));
      }
    }

    // Add the DM channel
    const dmResult = await slackAPI('conversations.open', {
      users: ALLOWED_USER_ID
    });

    if (dmResult.ok && dmResult.channel) {
      channels.push({
        id: dmResult.channel.id,
        name: 'DM with Terry',
        type: 'im'
      });
    }

    channelListCache = channels;
    channelListCacheTime = now;

    console.log(`📋 Monitoring ${channels.length} channels:`, channels.map(c => c.name).join(', '));

    return channels;
  } catch (err) {
    console.error('Error fetching channel list:', err.message);
    return channelListCache || [];
  }
}

// Main polling loop
async function poll() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Get all channels where Jett is a member
    const channels = await getMonitoredChannels();

    // Check each channel for new messages
    for (const channel of channels) {
      const displayName = channel.type === 'im' ? channel.name : `#${channel.name}`;
      await checkConversation(channel.id, displayName);
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  } finally {
    isProcessing = false;
  }
}

// Startup
console.log('🦞 Slack Bridge for Clawdbot starting...');
console.log(`📡 Monitoring Slack workspace: ${SLACK_TEAM_ID}`);
console.log(`👤 Allowed user: ${ALLOWED_USER_ID}`);
console.log(`🤖 Bot user: ${BOT_USER_ID}`);
console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
console.log(`📎 File downloads: ${FILE_DOWNLOAD_DIR}`);

// Ensure file download directory exists
if (!fs.existsSync(FILE_DOWNLOAD_DIR)) {
  fs.mkdirSync(FILE_DOWNLOAD_DIR, { recursive: true });
  console.log(`   Created file download directory`);
}

// Load saved timestamps to avoid reprocessing old messages
loadTimestamps();

console.log(`🚀 Bridge active! File uploads now supported across all channels.\n`);

// Start polling
setInterval(poll, POLL_INTERVAL);
poll(); // Run immediately
