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
  // Extract title from either format
  let title = '';
  const titleMatch = content.match(/\*\*Episode Title\*\*:\s*(.+)/i) ||
                     content.match(/^Title:\s*(.+)/im);
  if (titleMatch) title = titleMatch[1].replace(/\*\*/g, '').trim();

  // Extract guest
  let guest = '';
  const guestMatch = content.match(/\*\*Guest\*\*:\s*(.+)/i);
  if (guestMatch) guest = guestMatch[1].replace(/\*\*/g, '').trim();

  // Extract podcast name
  let podcastName = '';
  const podcastMatch = content.match(/\*\*Podcast Name\*\*:\s*(.+)/i);
  if (podcastMatch) podcastName = podcastMatch[1].replace(/\*\*/g, '').trim();

  // Get everything after the header divider (the real meat)
  const dividerIndex = content.indexOf('---');
  const bodyContent = dividerIndex > -1 ? content.substring(dividerIndex + 3) : content;

  return { title, guest, podcastName, bodyContent: bodyContent.trim() };
}

function formatSlackMessage(summaryData, filename) {
  const { title, guest, podcastName, bodyContent } = summaryData;

  let header = `🎧 *PODCAST SUMMARY*\n`;
  if (podcastName) header += `📻 *${podcastName}*\n`;
  if (title) header += `🎙️ *${title}*\n`;
  if (guest) header += `👤 *Guest:* ${guest}\n`;
  header += `\n${'─'.repeat(40)}\n\n`;

  // Clean up markdown for Slack - convert ## headers to bold
  const cleaned = bodyContent
    .replace(/^#{1,3}\s+/gm, '*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^(\*[^*\n]+)$/gm, '$1*')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return header + cleaned + `\n\n📄 _${filename}_`;
}

async function postToSlack(message) {
  return new Promise((resolve, reject) => {
    const CLAWDBOT = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
    const { exec } = require('child_process');
    const escaped = message.replace(/"/g, '\\"').replace(/`/g, '\\`');
    execFileSync(CLAWDBOT, ['message', 'send', '--channel', 'slack', '--target', '#podcastsummary', '--message', message], { timeout: 15000 }),
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
