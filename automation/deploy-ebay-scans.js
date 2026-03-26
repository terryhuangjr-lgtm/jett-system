#!/usr/bin/env node
/**
 * eBay Scan Deployment Script
 * Reads eBay scan JSON files and posts formatted results to #levelupcards
 * Uses task-manager/ebay-scans-config.json as single source of truth
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const notifyFailure = require('../lib/notify-failure');
const { getTimeRemaining, formatBidCount, getTrustBadge } = require('./auction-utils');

// Load config from task manager (single source of truth)
const CONFIG_PATH = path.join(__dirname, '..', 'task-manager', 'ebay-scans-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load config:', e.message);
  }
  return null;
}

function getTodayScanConfig() {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  
  const config = loadConfig();
  if (config && config.scans && config.scans[today]) {
    return config.scans[today];
  }
  return null;
}

function getScanFileFromDay() {
  // Find the most recently modified scan file in /tmp
  const fs = require('fs');
  const path = require('path');
  
  try {
    const files = fs.readdirSync('/tmp');
    const scanFiles = files
      .filter(f => f.endsWith('.json') && (f.includes('-scan') || f.match(/-\d{4}-\d{2}-\d{2}\.json$/)))
      .map(f => ({
        name: f,
        path: path.join('/tmp', f),
        mtime: fs.statSync(path.join('/tmp', f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (scanFiles.length > 0) {
      console.log('[DEBUG] Found scan files:', scanFiles.map(f => `${f.name} (${new Date(f.mtime).toLocaleTimeString()})`).join(', '));
      return scanFiles[0].path;
    }
  } catch (e) {
    console.error('Error finding scan files:', e.message);
  }
  
  // Fallback
  return '/tmp/mj-base-scan.json';
}

// Format results for Slack
function formatResults(data, scanName) {
  if (!data || !data.results || data.results.length === 0) {
    return {
      text: `📊 *${scanName}*\n\nNo results found.`,
      hasResults: false
    };
  }

  const { results, timestamp } = data;
  const topResults = results.slice(0, 20);

  let message = `📊 *eBay Scan: ${scanName}*\n`;
  message += `🔍 Found ${results.length} results (showing top ${topResults.length})\n`;

  // Use timestamp from root level (not metadata.scanned_at)
  if (timestamp) {
    message += `⏰ Scanned at: ${new Date(timestamp).toLocaleString()}\n\n`;
  } else {
    message += '\n';
  }

  topResults.forEach((item, index) => {
    message += `*${index + 1}. ${item.title.substring(0, 80)}${item.title.length > 80 ? '...' : ''}*\n`;

    // Use totalPrice (number) and format it
    const price = item.totalPrice || item.price;
    message += `💰 Price: $${typeof price === 'number' ? price.toFixed(2) : price}`;

    // Check for dealScore.score or score
    const score = item.dealScore?.score || item.score;
    if (score) {
      message += ` | 📈 Score: ${typeof score === 'number' ? score.toFixed(1) : score}/10`;
    }

    // Use viewItemURL or url
    const itemUrl = item.viewItemURL || item.url;
    message += `\n🔗 ${itemUrl}\n`;

    // Add notable details
    if (item.condition) {
      message += `   Condition: ${item.condition}`;
    }

    // Handle shipping cost (shippingCost number vs shipping string)
    const shipping = item.shippingCost !== undefined
      ? (item.shippingCost === 0 ? 'FREE' : `$${item.shippingCost.toFixed(2)}`)
      : item.shipping;

    if (shipping) {
      message += ` | Shipping: ${shipping}`;
    }
    message += '\n\n';
  });

  message += `\n_Full results: ${results.length} cards found_`;

  return {
    text: message,
    hasResults: true
  };
}

// Post to Slack (DISABLED - Slack removed)
function postToSlack(message) {
  console.log('Slack posting disabled - using email only');
  return false;
}

// Template selector - routes to different templates based on scan config
function selectEmailTemplate(scan) {
  const condition = scan.card_condition || 'raw';
  const listingType = scan.listing_type || 'bin';
  
  if (listingType === 'auction') {
    return 'auction';
  }
  if (condition === 'graded') {
    return 'graded';
  }
  return 'raw'; // default
}

// Load HTML template
function loadHtmlTemplate() {
  const templatePath = path.join(__dirname, '..', 'templates', 'ebay-scan-email.html');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  return null;
}

// Template rendering - table format
function renderHtmlTemplate(template, data) {
  let html = template;
  
  // Card mode and styling
  const cardMode = data.cardMode || 'Raw';
  const cardModeStyle = cardMode === 'Graded' 
    ? 'background: #E6F1FB; color: #0C447C;'
    : 'background: #E1F5EE; color: #085041;';
  
  // Replace header variables
  html = html.replace(/\{\{DATE\}\}/g, data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  html = html.replace(/\{\{TOTAL_RESULTS\}\}/g, data.totalResults || data.cards?.length || 0);
  html = html.replace(/\{\{SCAN_NAME\}\}/g, data.scanName || 'eBay Scan');
  html = html.replace(/\{\{SEARCH_TERM\}\}/g, data.searchTerm || 'Card Search');
  html = html.replace(/\{\{CARD_MODE\}\}/g, cardMode);
  html = html.replace(/\{\{CARD_MODE_STYLE\}\}/g, cardModeStyle);
  
  // Calculate summary stats - handle both string and number scores
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
  
  // If no cards, return empty state
  if (!cards || cards.length === 0) {
    return html.replace(/\{\{TABLE_ROWS\}\}/g, '<tr><td colspan="10" style="padding:40px;text-align:center;color:#64748b;">No results found</td></tr>');
  }
  
  // Check if this is an auction scan
  const hasAuctions = cards.some(c => c.listingType === 'AUCTION' || c.listingType === 'auction' || c.listingType === 'AUC');
  if (hasAuctions) {
    html = html.replace('</td>', '</td><td style="padding:8px 12px;font-size:11px;color:#BA7517;">Auction prices and times captured at scan time. Check eBay for current status.</td>');
  }
  
  // Render table rows
  const tableRows = cards.slice(0, 20).map((card, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? '#ffffff' : '#fafafa';
    
    // Full title - NO truncation
    const title = card.title || '';
    const titleEscaped = title.replace(/"/g, '&quot;');
    
    // Price with shipping
    const price = typeof card.price === 'number' ? card.price.toFixed(2) : '0.00';
    const shipCost = typeof card.shippingCost === 'number' ? card.shippingCost : parseFloat(card.shippingCost) || 0;
    const shipping = shipCost > 0 ? `<br><span style="font-size:11px;color:#94a3b8">+ $${shipCost.toFixed(2)} ship</span>` : '';
    
    // Score pill - colored based on value
    const score = typeof card.score === 'number' ? card.score : parseFloat(card.score) || 0;
    let scoreStyle = '';
    if (score >= 8.0) {
      scoreStyle = 'background: #E1F5EE; color: #085041;';
    } else if (score >= 7.0) {
      scoreStyle = 'background: #FAEEDA; color: #633806;';
    } else {
      scoreStyle = 'background: #FAECE7; color: #712B13;';
    }
    const scoreBadge = `<span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:20px;${scoreStyle}">${score.toFixed(1)}</span>`;
    
    // Trust badge
    const trust = getTrustBadge(card.sellerRating, card.sellerSales);
    const trustBadge = `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:500;background:${trust.bg};color:${trust.color}">● ${trust.display}</span>`;
    
    // Age
    const age = card.daysListed ? `${card.daysListed}d` : '—';
    
    // PSA columns - show $XXX or —
    const psa9Val = card.psa9Est && card.psa9Est !== '—' ? `$${card.psa9Est}` : '—';
    const psa9Style = card.psa9Est && card.psa9Est !== '—' ? 'color: #1a1a1a;' : 'color: #cbd5e1;';
    const psa10Val = card.psa10Est && card.psa10Est !== '—' ? `$${card.psa10Est}` : '—';
    const psa10Style = card.psa10Est && card.psa10Est !== '—' ? 'color: #1a1a1a;' : 'color: #cbd5e1;';
    
    // Card mode badge
    const isGraded = data.cardMode === 'Graded' || (card.grade && !card.vision);
    const badgeStyle = isGraded ? 'background: #E6F1FB; color: #0C447C;' : 'background: #E1F5EE; color: #085041;';
    const badgeText = isGraded ? 'Graded' : 'Raw';
    
    // Listing type badge
    const isAuction = card.listingType === 'auction' || card.listingType === 'AUC' || card.listingType === 'AUCTION';
    const listingBadgeStyle = isAuction 
      ? 'background: #FAEEDA; color: #633806;' 
      : 'background: #E1F5EE; color: #085041;';
    const listingBadgeText = isAuction ? 'AUC' : 'BIN';
    
    // Auction-specific: time remaining and bid count
    const timeRemaining = isAuction ? getTimeRemaining(card.itemEndDate) : null;
    const bidInfo = isAuction ? formatBidCount(card.bidCount || 0) : null;
    
    // Price cell - show differently for auctions
    const currentBid = typeof card.currentBidPrice === 'number' ? card.currentBidPrice : parseFloat(card.currentBidPrice) || 0;
    let priceCell = `$${price}`;
    if (isAuction && currentBid > 0) {
      const captureTime = new Date(data.scanTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      priceCell = `$${currentBid.toFixed(2)}<br><span style="font-size:10px;color:#64748b">at ${captureTime}</span><br><span style="font-size:10px;color:#64748b">${bidInfo.display}</span>`;
    } else if (shipping) {
      priceCell = `$${price}${shipping}`;
    }
    
    // Time remaining cell
    let timeCell = '<span style="color:#cbd5e1;">—</span>';
    if (timeRemaining) {
      timeCell = `<span style="color:${timeRemaining.color};font-weight:500;font-size:11px;">${timeRemaining.display}</span>`;
    }
    
    // URL
    const url = card.url || card.viewItemURL || '#';
    
    return `<tr style="background-color: ${rowBg}; border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 12px; font-size: 11px; color: #94a3b8; text-align: center;">${index + 1}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #1a1a1a; font-weight: 500; min-width: 320px; white-space: normal; word-wrap: break-word;">
        ${titleEscaped}
        <br>
        <span style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:4px;font-size:10px;${badgeStyle}">${badgeText}</span>
        <span style="display:inline-block;margin-top:4px;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;${listingBadgeStyle}">${listingBadgeText}</span>
      </td>
      <td style="padding: 10px 12px; font-size: 13px; font-weight: 500; color: #1a1a1a; text-align: right;">
        ${priceCell}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${scoreBadge}</td>
      <td class="hide-mobile" style="padding: 10px 12px; text-align: center;">${trustBadge}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 11px; color: #64748b; text-align: center;">${age}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 12px; text-align: center;${psa9Style}">${psa9Val}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 12px; text-align: center;${psa10Style}">${psa10Val}</td>
      <td class="hide-mobile" style="padding: 10px 12px; text-align: center;">${timeCell}</td>
      <td style="padding: 10px 12px; text-align: center;"><a href="${url}" style="font-size: 12px; color: #000000; text-decoration: none;">View -&gt;</a></td>
    </tr>`;
  }).join('\n');
  
  html = html.replace(/\{\{TABLE_ROWS\}\}/g, tableRows);
  
  return html;
}

// Send via email (HTML)
function postToEmailHtml(data, scanName) {
  try {
    const template = loadHtmlTemplate();
    const body = renderHtmlTemplate(template, data);
    
    const emailScript = path.join(__dirname, '..', 'lib', 'send-email.js');
    const subject = `${scanName} - eBay Scan Results`;
    const env = { ...process.env };
    execFileSync('node', [emailScript, '--to', 'terryhuangjr@gmail.com', '--subject', subject, '--body', body, '--html'], {
      encoding: 'utf8',
      timeout: 30000,
      env: env
    });
    console.log('✓ Emailed HTML to terryhuangjr@gmail.com');
    return true;
  } catch (error) {
    console.error('✗ Error sending HTML email:', error.message);
    return false;
  }
}

// Send via email (plain text - fallback)
function postToEmail(message, scanName) {
  try {
    const emailScript = path.join(__dirname, '..', 'lib', 'send-email.js');
    const subject = `${scanName} - eBay Scan Results`;
    const env = { ...process.env };
    execFileSync('node', [emailScript, '--to', 'terryhuangjr@gmail.com', '--subject', subject, '--body', message], {
      encoding: 'utf8',
      timeout: 30000,
      env: env
    });
    console.log('✓ Emailed to terryhuangjr@gmail.com');
    return true;
  } catch (error) {
    console.error('✗ Error sending email:', error.message);
    return false;
  }
}

// Main execution
const useEmail = process.argv.includes('--email');
// Get first non-flag argument as scan file, or use today's default
const scanFileArg = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--'));
const scanFile = scanFileArg || getScanFileFromDay();

console.log(useEmail ? '📤 Emailing eBay scan results...' : '📤 Deploying eBay scan results to Slack...');

try {
  // Read scan file to get actual search query
  let scanQuery = 'Card Scan';
  try {
    const scanData = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
    if (scanData.searchQuery) {
      scanQuery = scanData.searchQuery;
    }
  } catch (e) {
    // Fall back to filename
  }
  
  // Extract scan name from filename (fallback)
  const filename = path.basename(scanFile, '.json');
  const scanNameFromFile = filename
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  
  // Use search query from scan file, or fallback to filename
  const scanName = scanQuery !== 'Card Scan' ? scanQuery : scanNameFromFile;
  
  console.log(`  Scan file: ${scanFile}`);
  console.log(`  Scan name: ${scanName}`);
  console.log(`  Source: task-manager/ebay-scans-config.json`);
  
  // Get template type based on scan config
  const todayScan = getTodayScanConfig();
  const templateType = selectEmailTemplate(todayScan || {});
  console.log(`  Template: ${templateType}`);

  // Check if file exists
  if (!fs.existsSync(scanFile)) {
    console.log(`⚠️  Scan file not found: ${scanFile}`);
    console.log('   This scan may not have run yet.');

    // Post notification
    const noResultsMessage = `📊 *${scanName}*\n\n⚠️ Scan not completed yet or no results file found.`;
    if (useEmail) {
      postToEmail(noResultsMessage, scanName);
    } else {
      postToSlack(noResultsMessage);
    }
    process.exit(0);
  }

  // Read and parse scan results
  const data = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
  console.log(`  Results found: ${data.results ? data.results.length : 0}`);

  // Format for Slack
  const { text, hasResults } = formatResults(data, scanName);

  // Preview
  console.log('\n--- Message Preview ---');
  console.log(text.substring(0, 500));
  if (text.length > 500) {
    console.log('...(truncated)');
  }
  console.log('--- End Preview ---\n');

  // Post
  let success;
  if (useEmail) {
    // Transform data for HTML template
    const htmlData = {
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      scanName: scanName,
      searchTerm: scanName,
      totalResults: data.results ? data.results.length : 0,
      cardMode: data.cardMode || 'Raw',
      scanTimestamp: data.timestamp || new Date().toISOString(),
      cards: data.results ? data.results.slice(0, 20).map((item, index) => ({
        rank: index + 1,
        title: item.title,
        subtype: item.subtype || item.variant,
        price: item.totalPrice || item.price,
        shippingCost: item.shippingCost,
        condition: item.condition,
        daysListed: item.daysListed,
        sellerRating: item.sellerRating,
        sellerSales: item.sellerSales,
        score: item.dealScore?.score || item.score,
        url: item.viewItemURL || item.url,
        psa9Est: item.psa9Est,
        psa10Est: item.psa10Est,
        grade: item.grade,
        visionCorners: item.visionCorners,
        visionCentering: item.visionCentering,
        visionSurface: item.visionSurface,
        listingType: item.listingType || 'BIN',
        itemEndDate: item.itemEndDate || null,
        currentBidPrice: item.currentBidPrice || null,
        bidCount: item.bidCount || 0
      })) : []
    };
    success = postToEmailHtml(htmlData, scanName);
  } else {
    success = postToSlack(text);
  }

  if (success) {
    console.log('\n✓ Deployment complete');
  } else {
    console.error('\n✗ Deployment failed');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying scan:', error.message);
  const notifyFailure = require('../lib/notify-failure');
  notifyFailure('eBay Scans Deploy', error);
  process.exit(1);
}
