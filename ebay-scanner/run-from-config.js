#!/usr/bin/env node
/**
 * eBay Scanner - Runs scans from config file
 * Usage: node run-from-config.js [monday|tuesday|wednesday|thursday|friday|saturday|sunday]
 * If no day specified, runs today's scan
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '..', 'task-manager', 'ebay-scans-config.json');

// Get day from args or use today
function getDayFromArgs() {
  const dayMap = {
    'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
    'friday': 5, 'saturday': 6, 'sunday': 0
  };

  const arg = process.argv[2]?.toLowerCase();
  if (arg && dayMap[arg] !== undefined) {
    return arg;
  }

  // Use today
  const today = new Date().getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[today];
}

async function runScan(day) {
  console.log(`\n🔍 Running eBay scan for: ${day.toUpperCase()}\n`);

  // Read config
  const configPath = path.join(__dirname, '..', 'task-manager', 'ebay-scans-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const scan = config.scans[day];
  if (!scan) {
    console.error(`No scan configured for ${day}`);
    process.exit(1);
  }

  if (!scan.enabled) {
    console.log(`Scan for ${day} is disabled. Skipping.`);
    return;
  }

  console.log(`Scan: ${scan.name}`);
  console.log(`Terms: ${scan.search_terms.join(', ')}`);
  console.log(`Filters: min=$${scan.filters.minPrice || 'any'}, max=$${scan.filters.maxPrice || 'any'}, topN=${scan.filters.topN}`);
  console.log('');

  // Build command
  const terms = scan.search_terms.join(', ');  // Use commas for multi-search splitting
  const minPrice = scan.filters.minPrice || '';
  const maxPrice = scan.filters.maxPrice || '';
  const topN = scan.filters.topN || 20;
  const outputFile = scan.output_file;

  let cmd = `cd ${__dirname} && node multi-search.js '${terms}' --topN ${topN} --output ${outputFile}`;
  if (minPrice) cmd += ` --minPrice ${minPrice}`;
  if (maxPrice) cmd += ` --maxPrice ${maxPrice}`;

  console.log(`Executing: ${cmd.substring(0, 80)}...\n`);

  try {
    execSync(cmd, {
      cwd: __dirname,
      stdio: 'inherit',
      timeout: 180000  // 3 minutes
    });

    // Update config with last run time
    config.scans[day].last_run = new Date().toISOString();
    config.scans[day].last_results = {
      timestamp: new Date().toISOString(),
      success: true
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\n✅ ${day} scan complete!`);
    console.log(`Results saved to: ${outputFile}`);

  } catch (error) {
    console.error(`\n❌ ${day} scan failed: ${error.message}`);

    // Update config with failure
    config.scans[day].last_run = new Date().toISOString();
    config.scans[day].last_results = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    process.exit(1);
  }
}

// Run
const day = getDayFromArgs();
runScan(day);
