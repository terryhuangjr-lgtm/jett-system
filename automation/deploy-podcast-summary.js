#!/usr/bin/env node
/**
 * Podcast Summary Deployment Script
 * Reads latest summary and posts to Slack #podcastsummary
 * Run daily at 6:30 AM
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const SUMMARY_DIR = '/home/clawd/data/podcasts/summaries';
const DEPLOYED_FILE = '/home/clawd/data/podcasts/deployed.json';
const CHANNEL_ID = 'C0AEZKJNQBG'; // #podcastsummary

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

function getDeployed() {
  try {
    if (fs.existsSync(DEPLOYED_FILE)) {
      return JSON.parse(fs.readFileSync(DEPLOYED_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function markDeployed(summaryFile) {
  const deployed = getDeployed();
  deployed.push(summaryFile);
  fs.writeFileSync(DEPLOYED_FILE, JSON.stringify(deployed, null, 2));
}

function isDeployed(summaryFile) {
  return getDeployed().includes(summaryFile);
}

function getLatestSummary() {
  if (!fs.existsSync(SUMMARY_DIR)) {
    return null;
  }
  
  const files = fs.readdirSync(SUMMARY_DIR)
    .filter(f => f.endsWith('.txt'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(SUMMARY_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) {
    return null;
  }
  
  const latest = files[0];
  return {
    path: path.join(SUMMARY_DIR, latest.name),
    content: fs.readFileSync(path.join(SUMMARY_DIR, latest.name), 'utf8'),
    filename: latest.name
  };
}

function parseSummary(content) {
  const lines = content.split('\n');
  
  let title = '';
  let overview = '';
  let keyPoints = [];
  let bestClips = [];
  let takeaways = [];
  
  let currentSection = null;
  let currentClip = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('TITLE:')) {
      title = trimmed.replace(/^TITLE:\s*/i, '');
    } else if (trimmed.toUpperCase().includes('OVERVIEW')) {
      currentSection = 'overview';
    } else if (trimmed.toUpperCase().includes('KEY POINTS')) {
      currentSection = 'key_points';
    } else if (trimmed.toUpperCase().includes('BEST CLIPS')) {
      currentSection = 'clips';
    } else if (trimmed.toUpperCase().includes('ACTIONABLE') || trimmed.toUpperCase().includes('TAKEAWAYS')) {
      currentSection = 'takeaways';
    } else if (/^\d+\.\s+"/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      // Start of numbered clip item - save previous if exists
      if (currentClip && currentSection === 'clips') {
        bestClips.push(currentClip.trim());
      }
      currentClip = trimmed + '\n';
    } else if (currentSection === 'clips' && (trimmed.startsWith('Context:') || trimmed.startsWith('Use:') || trimmed.startsWith('"') || trimmed.length > 0)) {
      // Continuation of clip (Context, Use lines, or quote continuation)
      currentClip += trimmed + '\n';
    } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
      // Bullet points for key points or takeaways
      if (currentSection === 'key_points') {
        keyPoints.push(trimmed);
      } else if (currentSection === 'takeaways') {
        takeaways.push(trimmed);
      }
    } else if (currentSection === 'overview' && trimmed && !trimmed.startsWith('=') && trimmed.length > 10) {
      overview += trimmed + ' ';
    }
  }
  
  // Don't forget last clip
  if (currentClip && currentSection === 'clips') {
    bestClips.push(currentClip.trim());
  }
  
  return {
    title: title,
    overview: overview.trim(),
    keyPoints: keyPoints.slice(0, 5),
    bestClips: bestClips.slice(0, 3),
    takeaways: takeaways.slice(0, 3)
  };
}

function formatSlackMessage(summaryData, filename) {
  const { title, overview, keyPoints, bestClips, takeaways } = summaryData;
  
  const titleLine = title ? `🎙️ *${title}*\n\n` : '';
  
  return `🎧 *New Podcast Summary*
${titleLine}📝 *Overview:*
${overview}

💡 *Key Points:*
${keyPoints.join('\n')}

🎯 *Best Clips:*
${bestClips.join('\n')}

✅ *Takeaways:*
${takeaways.join('\n')}

📄 *File:* \`${filename}\``;
}

async function postToSlack(message) {
  return new Promise((resolve, reject) => {
    const SLACK_BOT_TOKEN = getSecret('SLACK_BOT_TOKEN');
    
    const postData = JSON.stringify({
      channel: CHANNEL_ID,
      text: message,
      mrkdwn: true
    });
    
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
            reject(new Error(result.error || 'Slack error'));
          }
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

async function main() {
  console.log('📡 Checking for new podcast summaries...\n');
  
  const latest = getLatestSummary();
  
  if (!latest) {
    console.log('No summaries found.');
    return;
  }
  
  if (isDeployed(latest.filename)) {
    console.log(`Already deployed: ${latest.filename}`);
    return;
  }
  
  console.log(`Found: ${latest.filename}`);
  
  const parsed = parseSummary(latest.content);
  const message = formatSlackMessage(parsed, latest.filename);
  
  try {
    await postToSlack(message);
    markDeployed(latest.filename);
    console.log(`✅ Posted to #podcastsummary`);
  } catch (e) {
    console.error(`❌ Slack error: ${e.message}`);
    process.exit(1);
  }
}

main();
