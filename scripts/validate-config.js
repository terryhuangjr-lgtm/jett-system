#!/usr/bin/env node
/**
 * Validate Jett Configuration
 *
 * Checks if config changes are valid before applying them
 * Run after updating jett-config.json
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.env.HOME, 'clawd', 'config', 'jett-config.json');

console.log('🔍 Validating Jett Configuration');
console.log('═'.repeat(50));
console.log('');

let hasErrors = false;
let hasWarnings = false;

function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  hasErrors = true;
}

function warning(msg) {
  console.warn(`⚠️  WARNING: ${msg}`);
  hasWarnings = true;
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

// Check file exists
if (!fs.existsSync(CONFIG_FILE)) {
  error(`Config file not found: ${CONFIG_FILE}`);
  process.exit(1);
}

// Try to parse JSON
let config;
try {
  const content = fs.readFileSync(CONFIG_FILE, 'utf8');
  config = JSON.parse(content);
  success('Config file is valid JSON');
} catch (err) {
  error(`Failed to parse JSON: ${err.message}`);
  process.exit(1);
}

console.log('');

// Validate structure
console.log('Checking configuration structure...');
console.log('');

// Check sports research
if (config.sports_research) {
  success('Sports research config found');

  if (!config.sports_research.excluded_players || !Array.isArray(config.sports_research.excluded_players)) {
    error('sports_research.excluded_players must be an array');
  } else {
    console.log(`  ℹ️  Excluding ${config.sports_research.excluded_players.length} players: ${config.sports_research.excluded_players.join(', ')}`);
  }

  if (!config.sports_research.priorities) {
    warning('sports_research.priorities not defined');
  }
} else {
  error('Missing sports_research section');
}

console.log('');

// Check eBay scans
if (config.ebay_scans && config.ebay_scans.schedule) {
  success('eBay scans config found');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const missingDays = days.filter(day => !config.ebay_scans.schedule[day]);

  if (missingDays.length > 0) {
    warning(`Missing eBay scans for: ${missingDays.join(', ')}`);
  } else {
    success('All 7 days have eBay scan configurations');
  }

  // Validate each day's config
  days.forEach(day => {
    const scan = config.ebay_scans.schedule[day];
    if (scan) {
      console.log(`  ℹ️  ${day}: ${scan.name}`);
      if (!scan.search_terms || scan.search_terms.length === 0) {
        warning(`${day}: No search terms defined`);
      }
    }
  });
} else {
  error('Missing ebay_scans.schedule section');
}

console.log('');

// Check Slack channels
if (config.slack_channels) {
  success('Slack channels config found');

  const requiredChannels = ['sports_tweets', 'ebay_scans', 'notifications_dm'];
  requiredChannels.forEach(ch => {
    if (!config.slack_channels[ch]) {
      error(`Missing slack_channels.${ch}`);
    } else {
      console.log(`  ℹ️  ${ch}: ${config.slack_channels[ch]}`);
    }
  });
} else {
  error('Missing slack_channels section');
}

console.log('');

// Check schedules
if (config.schedules) {
  success('Schedules config found');

  const cronRegex = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/;

  Object.entries(config.schedules).forEach(([task, schedule]) => {
    if (task.startsWith('_')) return; // Skip metadata

    if (!cronRegex.test(schedule)) {
      warning(`${task}: Invalid cron format: ${schedule}`);
    } else {
      console.log(`  ℹ️  ${task}: ${schedule}`);
    }
  });
}

console.log('');
console.log('═'.repeat(50));

// Summary
if (hasErrors) {
  console.error('');
  console.error('❌ VALIDATION FAILED');
  console.error('Fix errors above before using this config');
  console.error('');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('');
  console.warn('⚠️  VALIDATION PASSED WITH WARNINGS');
  console.warn('Config is usable but has issues to review');
  console.warn('');
  process.exit(0);
}

console.log('');
console.log('✅ VALIDATION PASSED');
console.log('Config is valid and ready to use');
console.log('');

// Show what changed
console.log('📊 Config Summary:');
console.log(`   - Sports research: ${config.sports_research.excluded_players.length} excluded players`);
console.log(`   - eBay scans: 7 days configured`);
console.log(`   - Slack channels: ${Object.keys(config.slack_channels).length - 1} channels`); // -1 for notes
console.log(`   - Schedules: ${Object.keys(config.schedules).filter(k => !k.startsWith('_')).length} tasks`);
console.log('');

process.exit(0);
