#!/usr/bin/env node
/**
 * Podcast Summary Deployment Script
 * Reads latest summary and posts to Slack #podcastsummary
 * Run daily at 6:30 AM
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SUMMARY_DIR = '/home/clawd/data/podcasts/summaries';
const DEPLOYED_FILE = '/home/clawd/data/podcasts/deployed.json';

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
  let takeaways = [];

  // Extract title - handles both old format (TITLE:) and new markdown (Episode Title:)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^Title:\s*/i) || trimmed.match(/\*\*Episode Title\*\*:/i)) {
      title = trimmed.replace(/^.*Title\*?\*?:\s*/i, '').replace(/\*\*/g, '').trim();
      if (title) break;
    }
  }

  // Extract executive summary / overview
  let inSummary = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/EXECUTIVE SUMMARY|OVERVIEW/i)) {
      inSummary = true;
      continue;
    }
    if (inSummary && trimmed.startsWith('##')) {
      break;
    }
    if (inSummary && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && trimmed.length > 20) {
      overview += trimmed + ' ';
      if (overview.length > 400) break;
    }
  }

  // Extract key points / insights
  let inKeyPoints = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/KEY TOPICS|KEY POINTS|INSIGHTS/i)) {
      inKeyPoints = true;
      continue;
    }
    if (inKeyPoints && trimmed.startsWith('## ') && !trimmed.match(/KEY/i)) {
      break;
    }
    if (inKeyPoints && trimmed.match(/^###\s+\d+\./)) {
      const point = trimmed.replace(/^###\s+\d+\.\s*/, '').replace(/\*\*/g, '').trim();
      if (point) keyPoints.push(`• ${point}`);
      if (keyPoints.length >= 5) break;
    }
  }

  // Extract takeaways
  let inTakeaways = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/TAKEAWAY|ACTION|CONCLUSION/i)) {
      inTakeaways = true;
      continue;
    }
    if (inTakeaways && trimmed.startsWith('## ')) break;
    if (inTakeaways && (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.match(/^\d+\./))) {
      const point = trimmed.replace(/^[-*•\d.]\s*/, '').replace(/\*\*/g, '').trim();
      if (point && point.length > 10) takeaways.push(`• ${point}`);
      if (takeaways.length >= 3) break;
    }
  }

  // Fallbacks if parsing finds nothing
  if (!title) title = 'Latest Episode';
  if (!overview) {
    // Just grab first substantial paragraph
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 100 && !trimmed.startsWith('#') && !trimmed.startsWith('=')) {
        overview = trimmed.substring(0, 400);
        break;
      }
    }
  }
  if (keyPoints.length === 0) keyPoints = ['• See full summary for details'];
  if (takeaways.length === 0) takeaways = ['• See full summary for details'];

  return {
    title,
    overview: overview.trim().substring(0, 400),
    keyPoints: keyPoints.slice(0, 5),
    bestClips: [],
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
    const CLAWDBOT = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
    const { exec } = require('child_process');
    const escaped = message.replace(/"/g, '\\"').replace(/`/g, '\\`');
    exec(
      `${CLAWDBOT} message send --channel slack --target U0ABTP704QK --message "${escaped}" --json`,
      { timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error('✗ Failed to post:', stderr || error.message);
          reject(error);
        } else {
          console.log('✓ Podcast summary posted to Slack');
          resolve(stdout);
        }
      }
    );
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
