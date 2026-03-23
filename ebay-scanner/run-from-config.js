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

// Load HTML template
function loadHtmlTemplate() {
  const templatePath = path.join(__dirname, '..', 'templates', 'ebay-scan-email.html');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  return null;
}

// Render using new template
function renderHtmlTemplate(template, data) {
  let html = template;
  
  html = html.replace(/\{\{DATE\}\}/g, data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  html = html.replace(/\{\{TOTAL_RESULTS\}\}/g, data.totalResults || data.cards?.length || 0);
  html = html.replace(/\{\{SCAN_NAME\}\}/g, data.scanName || 'eBay Scan');
  html = html.replace(/\{\{SEARCH_TERM\}\}/g, data.searchTerm || 'Card Search');
  
  const cards = data.cards || [];
  const highScores = cards.filter(c => {
    const s = typeof c.score === 'number' ? c.score : parseFloat(c.score) || 0;
    return s >= 8.0;
  }).length;
  const steals = cards.filter(c => {
    const s = typeof c.score === 'number' ? c.score : parseFloat(c.score) || 0;
    return s >= 9.0;
  }).length;
  
  html = html.replace(/\{\{HIGH_SCORES\}\}/g, String(highScores));
  html = html.replace(/\{\{STEALS\}\}/g, String(steals));
  
  if (!cards || cards.length === 0) {
    return html.replace(/\{\{TABLE_ROWS\}\}/g, '<tr><td colspan="10" style="padding:40px;text-align:center;color:#64748b;">No results found</td></tr>');
  }
  
  const topCards = cards.slice(0, 20);
  const tableRows = topCards.map((card, i) => {
    const score = typeof card.score === 'number' ? card.score : parseFloat(card.score) || 0;
    const scoreColor = score >= 8 ? '#22c55e' : score >= 7 ? '#f59e0b' : '#ef4444';
    const price = card.price ? `$${card.price.toFixed(2)}` : 'N/A';
    const title = (card.title || '').substring(0, 50) + ((card.title || '').length > 50 ? '...' : '');
    const seller = card.seller || '-';
    const age = card.listingAge || '-';
    const psa9 = card.psa9 || '-';
    const psa10 = card.psa10 || '-';
    const vision = card.vision ? (card.vision.grade || card.vision.raw || '✓') : '-';
    const url = card.url || '#';
    
    return `<tr style="${i % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;'}">
      <td style="padding: 10px 16px; font-size: 12px; color: #64748b;">${i + 1}</td>
      <td style="padding: 10px 16px; font-size: 13px;"><a href="${url}" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">${title}</a></td>
      <td style="padding: 10px 16px; text-align: right; font-size: 13px; font-weight: 600; color: #0f172a;">${price}</td>
      <td style="padding: 10px 16px; text-align: center; font-size: 13px; font-weight: 700; color: ${scoreColor};">${score.toFixed(1)}</td>
      <td class="mobile-hide" style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b;">${vision}</td>
      <td class="mobile-hide" style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b;">${seller}</td>
      <td class="mobile-hide" style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b;">${age}</td>
      <td class="mobile-hide" style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b;">${psa9}</td>
      <td class="mobile-hide" style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b;">${psa10}</td>
      <td style="padding: 10px 16px; text-align: center;"><a href="${url}" style="display:inline-block;padding:6px 12px;background-color:#1e3a5f;color:#ffffff;text-decoration:none;font-size:11px;border-radius:4px;">View</a></td>
    </tr>`;
  }).join('');
  
  return html.replace(/\{\{TABLE_ROWS\}\}/g, tableRows);
}

function sendResultsEmail(outputFile, day, scanName, cardMode = 'raw', listingType = 'both') {
  try {
    if (!fs.existsSync(outputFile)) {
      console.log('No results file to email');
      return;
    }

    const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const results = data.allResults || data.results || [];

    if (results.length === 0) {
      console.log('No results to email');
      return;
    }

    // Transform data for new template format
    const cards = results.slice(0, 20).map(item => ({
      title: item.title,
      price: item.currentPrice || item.totalPrice || 0,
      score: parseFloat(item.dealScore?.score) || 0,
      url: item.viewItemURL,
      seller: item.seller || '-',
      listingAge: item.listingAge || '-',
      psa9: item.psa9 || '-',
      psa10: item.psa10 || '-',
      vision: item.vision || null
    }));

    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    const modeLabel = cardMode === 'graded' ? '[GRADED]' : '[RAW]';
    const typeLabel = listingType === 'auction' ? '[AUCTION]' : listingType === 'fixed_price' ? '[BIN]' : '';
    const subject = `[${dayLabel}] ${modeLabel} ${typeLabel} Scan - ${scanName || 'eBay Results'}`;

    // Use new template
    const template = loadHtmlTemplate();
    const htmlData = {
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      totalResults: results.length,
      scanName: scanName || 'eBay Scan',
      searchTerm: scanName || 'Card Search',
      cards: cards
    };
    
    const body = renderHtmlTemplate(template, htmlData);

    const emailScript = path.join(__dirname, '..', 'lib', 'send-email.js');
    const { execSync } = require('child_process');
    
    const escapedHtml = body.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    execSync(`node ${emailScript} --to "terryhuangjr@gmail.com" --subject "${subject}" --body "${escapedHtml}" --html`, {
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
  const cardMode = config.cardMode || 'raw';
  console.log(`Listing type: ${listingType} | Card mode: ${cardMode}`);
  console.log('');

  // Build command
  const terms = scan.search_terms.join(', ');  // Comma-separated for smart query parser
  const minPrice = scan.filters.minPrice || '';
  const maxPrice = scan.filters.maxPrice || '';
  const topN = scan.filters.topN || 20;
  // Build dynamic filename from search terms
  const firstTerm = scan.search_terms[0] || 'scan';
  const safeName = firstTerm
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // remove special chars
    .replace(/\s+/g, '-')          // spaces to hyphens
    .substring(0, 25)               // cap length
    .replace(/-+$/, '');           // trim trailing hyphens
  const timestamp = new Date().toISOString().split('T')[0]; // 2026-03-22
  const outputFile = `/tmp/${safeName}-${timestamp}.json`;
  
  const excludeWords = scan.filters.exclude_words || [];

  const args = ['multi-search.js', terms, '--topN', String(topN), '--output', outputFile];
  if (minPrice) args.push('--minPrice', minPrice);
  if (maxPrice) args.push('--maxPrice', maxPrice);
  if (excludeWords.length > 0) args.push('--exclude', excludeWords.join(','));
  if (scan.useVision) args.push('--vision');
  args.push('--listing-type', listingType);
  args.push('--card-mode', cardMode);

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
    sendResultsEmail(outputFile, day, scan.name, cardMode, listingType);

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
