#!/usr/bin/env node
/**
 * Mark Content Used - Simple wrapper for content_pool_manager
 *
 * Usage:
 *   node mark-content-used.js --id 123 --topic "Topic Name" --category "contract" --tweets "123,456"
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '_mark_used_helper.py');

// Parse args
const args = process.argv.slice(2);
const idIdx = args.indexOf('--id');
const topicIdx = args.indexOf('--topic');
const catIdx = args.indexOf('--category');
const tweetsIdx = args.indexOf('--tweets');

if (idIdx === -1 || topicIdx === -1 || catIdx === -1 || tweetsIdx === -1) {
  console.error('Usage: node mark-content-used.js --id <id> --topic "<topic>" --category "<cat>" --tweets "<ids>"');
  process.exit(1);
}

const contentId = args[idIdx + 1];
const topic = args[topicIdx + 1];
const category = args[catIdx + 1];
const tweetIds = args[tweetsIdx + 1];

try {
  const result = execSync(
    `python3 "${SCRIPT_PATH}" --id ${contentId} --topic "${topic.replace(/"/g, '\\"')}" --category "${category}" --tweets "${tweetIds}"`,
    { encoding: 'utf8', timeout: 10000 }
  );
  console.log(result.trim());
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
