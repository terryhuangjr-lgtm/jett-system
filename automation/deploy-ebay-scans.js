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
      .filter(f => f.match(/^[a-z].*-\d{4}-\d{2}-\d{2}\.json$/))
      .map(f => ({
        name: f,
        path: path.join('/tmp', f),
        mtime: fs.statSync(path.join('/tmp', f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (scanFiles.length > 0) {
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
  
  // Replace header variables
  html = html.replace(/\{\{DATE\}\}/g, data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  html = html.replace(/\{\{TOTAL_RESULTS\}\}/g, data.totalResults || data.cards?.length || 0);
  html = html.replace(/\{\{SCAN_NAME\}\}/g, data.scanName || 'eBay Scan');
  html = html.replace(/\{\{SEARCH_TERM\}\}/g, data.searchTerm || 'Card Search');
  
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
  
  // Render table rows
  const tableRows = cards.slice(0, 20).map((card, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? '#ffffff' : '#f9f9f9';
    
    // Truncate title to ~50 chars
    let title = (card.title || '').substring(0, 50);
    if (card.title && card.title.length > 50) title += '...';
    
    // Price
    const price = typeof card.price === 'number' ? card.price.toFixed(2) : String(card.price || '0.00');
    
    // Score
    const score = typeof card.score === 'number' ? card.score : parseFloat(card.score) || 0;
    let scoreBadge = '';
    if (score >= 9.0) {
      scoreBadge = '<span style="background-color: #dc2626; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">' + score.toFixed(1) + '</span>';
    } else if (score >= 8.0) {
      scoreBadge = '<span style="background-color: #1e3a5f; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">' + score.toFixed(1) + '</span>';
    } else if (score >= 7.0) {
      scoreBadge = '<span style="background-color: #059669; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">' + score.toFixed(1) + '</span>';
    } else {
      scoreBadge = '<span style="background-color: #e2e8f0; color: #64748b; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">' + score.toFixed(1) + '</span>';
    }
    
    // Vision score (for raw cards)
    let vision = '—';
    if (card.visionCorners !== undefined || card.visionCentering !== undefined) {
      const corners = card.visionCorners || card.vision?.corners || '—';
      const center = card.visionCentering || card.vision?.centering || '—';
      const surface = card.visionSurface || card.vision?.surface || '—';
      if (corners !== '—' || center !== '—') {
        vision = `${corners}c / ${center}ctr`;
      }
    } else if (card.grade) {
      vision = card.grade; // For graded cards, show the grade
    }
    
    // Seller
    const seller = card.sellerRating ? `${card.sellerRating}%` : '—';
    
    // Age
    const age = card.daysListed ? `${card.daysListed}d` : '—';
    
    // PSA
    const psa9 = card.psa9Est || '—';
    const psa10 = card.psa10Est || '—';
    
    // URL
    const url = card.url || card.viewItemURL || '#';
    
    return `<tr style="background-color: ${rowBg}; border-bottom: 1px solid #e5e5e5;">
      <td style="padding: 12px 16px; color: #64748b; font-size: 13px; font-weight: 500;">${card.rank || index + 1}</td>
      <td style="padding: 12px 16px; color: #1e293b; font-size: 13px;" title="${(card.title || '').replace(/"/g, '&quot;')}">${title}</td>
      <td style="padding: 12px 16px; text-align: right; color: #059669; font-size: 13px; font-weight: 700;">$${price}</td>
      <td style="padding: 12px 16px; text-align: center;">${scoreBadge}</td>
      <td style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 12px;" class="mobile-hide">${vision}</td>
      <td style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 12px;" class="mobile-hide">${seller}</td>
      <td style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px;" class="mobile-hide">${age}</td>
      <td style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px;" class="mobile-hide">${psa9}</td>
      <td style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px;" class="mobile-hide">${psa10}</td>
      <td style="padding: 12px 16px; text-align: center;"><a href="${url}" style="color: #1e3a5f; font-size: 12px; font-weight: 600; text-decoration: none;">View</a></td>
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
  // Extract scan name from filename (e.g., "luka-doncic-2026-03-22.json" -> "luka doncic")
  const filename = path.basename(scanFile, '.json');
  const scanName = filename
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')  // remove date suffix
    .replace(/-/g, ' ')                    // hyphens to spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // title case
  
  console.log(`  Scan file: ${scanFile}`);
  console.log(`  Scan name: ${scanName}`);
  console.log(`  Source: task-manager/ebay-scans-config.json`);

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
      cards: data.results ? data.results.slice(0, 20).map((item, index) => ({
        rank: index + 1,
        title: item.title,
        subtype: item.subtype || item.variant,
        price: item.totalPrice || item.price,
        shipping: item.shippingCost,
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
        visionSurface: item.visionSurface
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
