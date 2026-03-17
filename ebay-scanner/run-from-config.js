#!/usr/bin/env node
/**
 * eBay Scanner - Runs scans from config file
 * Usage: node run-from-config.js [monday|tuesday|wednesday|thursday|friday|saturday|sunday]
 * If no day specified, runs today's scan
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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

function sendResultsEmail(outputFile, day, scanName) {
  try {
    if (!fs.existsSync(outputFile)) {
      console.log('No results file to email');
      return;
    }

    const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const results = data.allResults || data.results || [];
    const topResults = results.slice(0, 20);

    if (topResults.length === 0) {
      console.log('No results to email');
      return;
    }

    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    const subject = `[${dayLabel}] Scan - ${scanName || 'eBay Results'}`;

    let html = `<html><body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">`;
    html += `<h2 style="color: #1a73e8;">${subject}</h2>`;
    html += `<p>Found ${results.length} total results, showing top ${topResults.length}:</p>`;
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 12px;">`;
    html += `<tr style="background: #f5f5f5;">
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">#</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Title</th>
      <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
      <th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">Score</th>
      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Seller</th>
    </tr>`;

    topResults.forEach((item, i) => {
      const score = item.dealScore?.score || 'N/A';
      const scoreColor = score >= 8 ? '#22c55e' : score >= 7 ? '#f59e0b' : '#ef4444';
      const title = (item.title || '').substring(0, 50) + ((item.title || '').length > 50 ? '...' : '');
      const price = item.totalPrice ? `$${item.totalPrice.toFixed(2)}` : 'N/A';
      const seller = item.sellerUsername || 'N/A';
      
      html += `<tr style="${i % 2 === 0 ? 'background: #fff;' : 'background: #fafafa;'}">
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${i + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">
          <a href="${item.viewItemURL || '#'}" style="color: #1a73e8; text-decoration: none;">${title}</a>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${price}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center; color: ${scoreColor}; font-weight: bold;">${score}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${seller}</td>
      </tr>`;
    });

    html += `</table>`;
    html += `<p style="margin-top: 20px; font-size: 11px; color: #666;">Sent from Jett eBay Scanner</p>`;
    html += `</body></html>`;

    const emailScript = path.join(__dirname, '..', 'lib', 'send-email.js');
    const { execSync } = require('child_process');
    
    execSync(`node ${emailScript} --to "terryhuangjr@gmail.com" --subject "${subject}" --body "${html.replace(/"/g, '\\"')}" --html`, {
      timeout: 30000
    });
    
    console.log(`📧 Email sent to terryhuangjr@gmail.com`);
    
  } catch (e) {
    console.log(`Email failed: ${e.message}`);
  }
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
  console.log(`Exclude: ${(scan.filters.exclude_words || []).join(', ') || 'none'}`);
  console.log(`Filters: min=$${scan.filters.minPrice || 'any'}, max=$${scan.filters.maxPrice || 'any'}, topN=${scan.filters.topN}`);
  console.log(`Vision: ${scan.useVision ? 'enabled' : 'disabled'}`);
  
  // Global filters
  const listingType = config.global_filters?.listing_type || 'fixed_price';
  const cardType = config.global_filters?.card_type || 'raw';
  console.log(`Listing type: ${listingType} | Card type: ${cardType}`);
  console.log('');

  // Build command
  const terms = scan.search_terms.join(', ');  // Use commas for multi-search splitting
  const minPrice = scan.filters.minPrice || '';
  const maxPrice = scan.filters.maxPrice || '';
  const topN = scan.filters.topN || 20;
  const outputFile = scan.output_file;
  const excludeWords = scan.filters.exclude_words || [];

  const args = ['multi-search.js', terms, '--topN', String(topN), '--output', outputFile];
  if (minPrice) args.push('--minPrice', minPrice);
  if (maxPrice) args.push('--maxPrice', maxPrice);
  if (excludeWords.length > 0) args.push('--exclude', excludeWords.join(','));
  if (scan.useVision) args.push('--vision');
  args.push('--listing-type', listingType);
  args.push('--card-type', cardType);

  console.log(`Executing: node ${args.join(' ')}\n`);

  try {
    execFileSync('node', args, {
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

    // Send email with results
    sendResultsEmail(outputFile, day, scan.name);

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
