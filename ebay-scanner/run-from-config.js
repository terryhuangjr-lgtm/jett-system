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
const { getTimeRemaining, formatBidCount, getTrustBadge } = require('../automation/auction-utils');

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
  
  // Card mode and styling
  const cardMode = data.cardMode || 'Raw';
  const cardModeStyle = cardMode === 'Graded' 
    ? 'background: #E6F1FB; color: #0C447C;'
    : 'background: #E1F5EE; color: #085041;';
  
  html = html.replace(/\{\{DATE\}\}/g, data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  html = html.replace(/\{\{TOTAL_RESULTS\}\}/g, data.totalResults || data.cards?.length || 0);
  html = html.replace(/\{\{SCAN_NAME\}\}/g, data.scanName || 'eBay Scan');
  html = html.replace(/\{\{SEARCH_TERM\}\}/g, data.searchTerm || 'Card Search');
  html = html.replace(/\{\{CARD_MODE\}\}/g, cardMode);
  html = html.replace(/\{\{CARD_MODE_STYLE\}\}/g, cardModeStyle);
  
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
    return html.replace(/\{\{TABLE_ROWS\}\}/g, '<tr><td colspan="9" style="padding:40px;text-align:center;color:#64748b;">No results found</td></tr>');
  }
  
  const topCards = cards.slice(0, 20);
  const tableRows = topCards.map((card, i) => {
    const isEven = i % 2 === 0;
    const rowBg = isEven ? '#ffffff' : '#fafafa';
    
    // Full title - NO truncation
    const title = card.title || '';
    const titleEscaped = title.replace(/"/g, '&quot;');
    
    // Price with shipping
    const price = typeof card.price === 'number' ? card.price.toFixed(2) : '0.00';
    const shipping = card.shippingCost ? `<br><span style="font-size:11px;color:#94a3b8">+ $${card.shippingCost.toFixed(2)} ship</span>` : '';
    
    // Score pill
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
    
    // Vision tier badge
    const visionScore = typeof card.visionScore === 'number' ? card.visionScore : 0;
    let visionBadge = '';
    if (visionScore >= 7) {
      visionBadge = '<span title="Vision: Clean" style="display:inline-block;margin-left:4px;color:#1D9E75;font-size:10px;">✅</span>';
    } else if (visionScore >= 5.5) {
      visionBadge = '<span title="Vision: Borderline - visible issues" style="display:inline-block;margin-left:4px;color:#BA7517;font-size:10px;">⚠️</span>';
    } else if (visionScore > 0) {
      visionBadge = '<span title="Vision: Issues - buyer beware" style="display:inline-block;margin-left:4px;color:#E24B4A;font-size:10px;">🔶</span>';
    }
    
    // Trust badge
    const trust = getTrustBadge(card.sellerRating, card.sellerSales);
    const trustBadge = `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:500;background:${trust.bg};color:${trust.color}">● ${trust.display}</span>`;
    
    // Age
    const age = card.daysListed ? `${card.daysListed}d` : '—';
    
    // PSA columns
    const psa9Val = card.psa9Est && card.psa9Est !== '—' ? `$${card.psa9Est}` : '—';
    const psa9Style = card.psa9Est && card.psa9Est !== '—' ? 'color: #1a1a1a;' : 'color: #cbd5e1;';
    const psa10Val = card.psa10Est && card.psa10Est !== '—' ? `$${card.psa10Est}` : '—';
    const psa10Style = card.psa10Est && card.psa10Est !== '—' ? 'color: #1a1a1a;' : 'color: #cbd5e1;';
    
    // Card mode badge
    const isGraded = cardMode === 'Graded' || (card.grade && !card.vision);
    const badgeStyle = isGraded ? 'background: #E6F1FB; color: #0C447C;' : 'background: #E1F5EE; color: #085041;';
    const badgeText = isGraded ? 'Graded' : 'Raw';
    
    // Listing type badge - get from card or use passed listingType
    const cardListingType = card.listingType || listingType || 'bin';
    const isAuction = cardListingType === 'auction' || cardListingType === 'AUCTION';
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
      const shipCost = typeof card.shippingCost === 'number' ? card.shippingCost : parseFloat(card.shippingCost) || 0;
      priceCell = `$${price}<br><span style="font-size:10px;color:#94a3b8">+ $${shipCost.toFixed(2)} ship</span>`;
    }
    
    // Time remaining cell
    let timeCell = '<span style="color:#cbd5e1;">—</span>';
    if (timeRemaining) {
      timeCell = `<span style="color:${timeRemaining.color};font-weight:500;font-size:11px;">${timeRemaining.display}</span>`;
    }
    
    // URL
    const url = card.url || card.viewItemURL || '#';
    
    return `<tr style="background-color: ${rowBg}; border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 12px; font-size: 11px; color: #94a3b8; text-align: center;">${i + 1}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #1a1a1a; font-weight: 500; min-width: 320px; white-space: normal; word-wrap: break-word;">
        ${titleEscaped}
        <br>
        <span style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:4px;font-size:10px;${badgeStyle}">${badgeText}</span>
        <span style="display:inline-block;margin-top:4px;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;${listingBadgeStyle}">${listingBadgeText}</span>
      </td>
      <td style="padding: 10px 12px; font-size: 13px; font-weight: 500; color: #1a1a1a; text-align: right;">
        ${priceCell}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${scoreBadge}${visionBadge}</td>
      <td class="hide-mobile" style="padding: 10px 12px; text-align: center;">${trustBadge}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 11px; color: #64748b; text-align: center;">${age}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 12px; text-align: center;${psa9Style}">${psa9Val}</td>
      <td class="hide-mobile" style="padding: 10px 12px; font-size: 12px; text-align: center;${psa10Style}">${psa10Val}</td>
      <td class="hide-mobile" style="padding: 10px 12px; text-align: center;">${timeCell}</td>
      <td style="padding: 10px 12px; text-align: center;"><a href="${url}" style="font-size: 12px; color: #000000; text-decoration: none;">View -&gt;</a></td>
    </tr>
    ${card.visionCorners ? `<tr style="${rowBg}">
      <td colspan="9" style="padding:4px 8px 8px;font-size:11px;color:#888;font-style:italic">
        AI Scout: ${(() => {
          const issues = card.visionIssues || [];
          const avg = ((card.visionCorners || 5) + (card.visionCentering || 5)) / 2;
          const label = avg >= 7.5 ? 'CLEAN' : avg >= 6 ? 'REVIEW' : 'CAUTION';
          
          if (issues.length > 0) {
            return `[${label}] ${issues[0]}`;
          } else if (card.visionCorners >= 7 && card.visionCentering >= 7) {
            return `[${label}] Card looks clean`;
          } else if (card.visionCorners >= 6) {
            return `[${label}] Minor corner wear${card.visionCentering < 6 ? ' · slight off-center' : ''}`;
          } else {
            return `[${label}] Corner wear · off-center`;
          }
        })()}
      </td>
    </tr>` : ''}`;
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
      sellerRating: item.sellerPositivePercent || item.sellerFeedbackPercent || 0,
      sellerSales: item.sellerFeedbackScore || 0,
      listingAge: item.listingAge || '-',
      psa9: item.psa9 || '-',
      psa10: item.psa10 || '-',
      vision: item.vision || null,
      visionCorners: item.visionCorners || null,
      visionCentering: item.visionCentering || null,
      visionIssues: item.visionIssues || [],
      listingType: item.listingType || 'BIN',
      itemEndDate: item.itemEndDate || null,
      currentBidPrice: item.currentBidPrice || null,
      bidCount: item.bidCount || 0
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
      cardMode: cardMode === 'graded' ? 'Graded' : 'Raw',
      scanTimestamp: new Date().toISOString(),
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
  
  const cardCondition = scan.card_condition || 'raw';
  const listingType = scan.listing_type || 'bin';

  console.log(`Card condition: ${cardCondition.toUpperCase()} (per-scan)`);
  console.log(`Listing type: ${listingType.toUpperCase()} (per-scan)`);
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
  args.push('--card-mode', cardCondition);

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
    sendResultsEmail(outputFile, day, scan.name, cardCondition, listingType);

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
