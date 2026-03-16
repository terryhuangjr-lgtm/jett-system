#!/usr/bin/env node

/**
 * eBay Card Auction Hunter
 * Finds rare card auctions matching Terry's criteria
 * Now with AI-powered deal scoring!
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const CompAnalyzer = require('./comp-analyzer');
const DealScorerV2 = require('./deal-scorer-v2');
const RawCardFilter = require('./raw-card-filter');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CREDS_PATH = path.join(__dirname, 'credentials.json');
const RESULTS_PATH = path.join(__dirname, 'latest-results.json');

// Load config and credentials
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));

// Initialize scoring modules
const compAnalyzer = new CompAnalyzer();
const dealScorer = new DealScorerV2();
const rawFilter = new RawCardFilter();

/**
 * Search eBay using Browse API
 */
async function searchEbay(playerName, sport) {
  console.log(`Searching eBay for ${playerName} (${sport})...`);
  
  return new Promise((resolve, reject) => {
    // Build search query
    const query = buildSearchQuery(playerName, sport);
    
    // eBay Browse API endpoint
    const endpoint = creds.environment === 'sandbox' 
      ? 'api.sandbox.ebay.com'
      : 'api.ebay.com';
    
    // Build filter string for auctions only + price range
    const priceFilter = config.criteria.bidRange.max 
      ? `price:[${config.criteria.bidRange.min}..${config.criteria.bidRange.max}],`
      : `price:[${config.criteria.bidRange.min}..],`;
    const filter = `buyingOptions:{AUCTION},${priceFilter}priceCurrency:USD`;
    
    const params = new URLSearchParams({
      'q': query,
      'filter': filter,
      'limit': '200', // Max allowed
      'sort': 'endingSoonest' // Auctions ending soon first
    });
    
    const path = `/buy/browse/v1/item_summary/search?${params.toString()}`;
    
    const options = {
      hostname: endpoint,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.oauthToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const items = extractItems(result);
          resolve({
            player: playerName,
            sport: sport,
            items: items
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Build eBay search query based on criteria
 */
function buildSearchQuery(playerName, sport) {
  let query = playerName;
  
  // Add sport-specific terms
  if (sport === 'basketball') query += ' basketball card';
  else if (sport === 'baseball') query += ' baseball card';
  else if (sport === 'football') query += ' football card';
  
  // Keep it simple - eBay Browse API doesn't support complex Boolean operators
  // We'll filter the results after fetching them
  
  return query;
}

/**
 * Extract items from eBay API response
 * Format items for scoring system
 */
function extractItems(apiResponse) {
  try {
    if (!apiResponse.itemSummaries) return [];
    
    return apiResponse.itemSummaries.map(item => {
      // Parse current bid/price
      const currentBid = parseFloat(item.price?.value || item.currentBidPrice?.value || 0);
      
      // Shipping cost (may not be available for auctions)
      const shippingCost = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || 0);
      
      // Total price = bid + shipping
      const totalPrice = currentBid + shippingCost;
      
      // Parse bid count if available
      const bidCount = parseInt(item.bidCount || 0);
      
      // Determine condition
      const condition = item.condition || 'Unknown';
      
      // Parse end time
      const endTime = item.itemEndDate || '';
      
      // Seller info (if available in Browse API)
      const seller = {
        username: item.seller?.username || 'Unknown',
        feedbackPercentage: parseFloat(item.seller?.feedbackPercentage || 0),
        feedbackScore: parseInt(item.seller?.feedbackScore || 0)
      };
      
      return {
        title: item.title || 'Unknown',
        currentBid: currentBid,
        totalPrice: totalPrice, // Required by scoring system
        bidCount: bidCount,
        endTime: endTime,
        url: item.itemWebUrl || item.itemAffiliateWebUrl || '',
        viewItemURL: item.itemWebUrl || item.itemAffiliateWebUrl || '', // Alias for scoring
        imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
        condition: condition,
        itemId: item.itemId || '',
        seller: seller,
        listingInfo: {
          listingType: 'Auction',
          startTime: item.itemCreationDate || ''
        }
      };
    }).filter(item => item.currentBid > 0); // Only items with valid prices
  } catch (e) {
    console.error('Error parsing eBay response:', e);
    return [];
  }
}

/**
 * Score items using AI deal scoring
 * Returns array of items with dealScore property
 */
async function scoreItems(items) {
  console.log(`\n📊 Scoring ${items.length} listings with AI...`);
  
  // Filter to raw cards only
  const stats = rawFilter.getStats(items);
  const rawItems = rawFilter.filterRawOnly(items);
  console.log(`   ${items.length} total → ${rawItems.length} raw (${stats.rawPercent}%)`);
  
  const scoredItems = [];
  
  for (const item of rawItems) {
    try {
      // Get comps (may return foundComps: false, that's OK)
      const comps = await compAnalyzer.getComps(item.title);
      
      // Score the deal (handles missing comps gracefully)
      const score = dealScorer.score(item, comps);
      
      scoredItems.push({
        ...item,
        comps,
        dealScore: score
      });
      
    } catch (error) {
      // If scoring fails, still include item with minimal score
      console.error(`   Error scoring ${item.title.substring(0, 40)}: ${error.message}`);
      
      const score = dealScorer.score(item, { foundComps: false });
      
      scoredItems.push({
        ...item,
        comps: { foundComps: false },
        dealScore: score
      });
    }
  }
  
  // Sort by score (highest first)
  scoredItems.sort((a, b) => b.dealScore.score - a.dealScore.score);
  
  console.log(`   ✅ Scored ${scoredItems.length} listings\n`);
  
  return scoredItems;
}

/**
 * Generate email report with scored results
 */
function generateReport(allScoredItems) {
  // Filter to minimum score threshold (6.0+ = decent or better)
  const minScore = 6.0;
  const topItems = allScoredItems.filter(item => item.dealScore.score >= minScore);
  
  // Take top N results
  const displayItems = topItems.slice(0, config.schedule.resultsLimit);
  
  if (displayItems.length === 0) {
    return `
      <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>🏀⚾🏈 Card Auction Hunter (AI-Powered)</h2>
        <p>No high-scoring deals found today (minimum score: ${minScore}/10).</p>
        <p><em>Scan time: ${new Date().toLocaleString()}</em></p>
      </body>
      </html>
    `;
  }
  
  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; }
        h2 { color: #333; }
        .card { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 8px; display: flex; gap: 15px; }
        .card:hover { background-color: #f9f9f9; }
        .card img { width: 100px; height: 100px; object-fit: cover; border-radius: 4px; }
        .card-info { flex: 1; }
        .score-badge { display: inline-block; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 16px; font-weight: bold; margin-bottom: 8px; }
        .score-great { background: #ff9800; }
        .score-steal { background: #f44336; }
        .title { font-weight: bold; font-size: 1.05em; color: #0066cc; margin-bottom: 8px; }
        .player { color: #666; font-size: 0.9em; }
        .price { color: #090; font-weight: bold; font-size: 1.2em; }
        .comp-info { color: #666; font-size: 0.85em; margin-top: 3px; }
        .meta { color: #666; font-size: 0.85em; margin-top: 5px; }
        .time-left { color: #c00; font-weight: bold; }
        .signals { color: #4CAF50; font-size: 0.85em; margin-top: 3px; }
        .red-flags { color: #f44336; font-size: 0.85em; margin-top: 3px; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h2>🏀⚾🏈 Card Auction Hunter - AI-Scored Deals</h2>
      <p><strong>${new Date().toLocaleDateString()}</strong> | Found ${allScoredItems.length} listings, showing top ${displayItems.length} (score ≥ ${minScore})</p>
  `;
  
  displayItems.forEach((item, i) => {
    const score = item.dealScore;
    const breakdown = score.breakdown;
    const timeLeft = item.endTime ? calculateTimeLeft(item.endTime) : 'Unknown';
    
    // Score badge styling
    let badgeClass = 'score-badge';
    if (score.score >= 9) badgeClass += ' score-steal';
    else if (score.score >= 8) badgeClass += ' score-great';
    
    html += `
      <div class="card">
        <img src="${item.imageUrl}" alt="Card" onerror="this.style.display='none'">
        <div class="card-info">
          <span class="${badgeClass}">${score.score.toFixed(1)}/10 - ${score.rating}</span>
          <div class="title"><a href="${item.url}" target="_blank">${item.title}</a></div>
          <div class="player">${item.player} (${item.sport})</div>
          <div class="price">Current Bid: $${item.currentBid.toFixed(2)} <span style="color: #666; font-size: 0.8em;">(${item.bidCount} bids)</span></div>
    `;
    
    // Add comp info if available
    if (breakdown.priceAnalysis && breakdown.priceAnalysis.medianPrice) {
      const pa = breakdown.priceAnalysis;
      html += `<div class="comp-info">📊 Median comp: $${pa.medianPrice} (${Math.abs(pa.percentBelowMedian)}% ${pa.percentBelowMedian > 0 ? 'below' : 'above'})</div>`;
    }
    
    // Add seller info
    if (breakdown.sellerQuality) {
      const sq = breakdown.sellerQuality;
      html += `<div class="meta">👤 Seller: ${sq.feedback}% (${sq.salesCount} sales) ${sq.trust}</div>`;
    }
    
    // Add positive signals
    if (breakdown.listingQuality && breakdown.listingQuality.signals.length > 0) {
      html += `<div class="signals">✨ ${breakdown.listingQuality.signals.join(', ')}</div>`;
    }
    
    // Add red flags
    if (breakdown.listingQuality && breakdown.listingQuality.redFlags.length > 0) {
      html += `<div class="red-flags">⚠️ ${breakdown.listingQuality.redFlags.join(', ')}</div>`;
    }
    
    html += `
          <div class="meta">
            <span class="time-left">⏱ ${timeLeft}</span> | 
            ${item.condition}
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      <p style="color: #999; font-size: 0.85em; margin-top: 30px;">
        <em>Automated scan by Jett • AI-powered deal scoring • Raw cards only • Comps based on active listings (85% discount)</em>
      </p>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Calculate time left in human-readable format
 */
function calculateTimeLeft(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;
  
  if (diff < 0) return 'Ended';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  
  return `${hours}h ${minutes}m left`;
}

/**
 * Send email via Gmail (placeholder - will use browser automation)
 */
function sendEmail(htmlContent) {
  const tempFile = path.join(__dirname, 'latest-email.html');
  fs.writeFileSync(tempFile, htmlContent);
  
  console.log(`\nEmail report generated: ${tempFile}`);
  console.log('TODO: Integrate with Gmail browser automation to send');
  console.log(`To: ${config.email.to}`);
  console.log(`Subject: ${config.email.subject}`);
}

/**
 * Main scanner function (now with AI scoring!)
 */
async function scan() {
  console.log('🎯 Starting Card Auction Hunter (AI-Powered)...');
  console.log(`Time: ${new Date().toLocaleString('en-US', { timeZone: config.schedule.timezone })}`);
  console.log(`Mode: ${config.mode}`);
  console.log('');
  
  const allResults = [];
  
  // For MVP, only scan Michael Jordan
  const mvpPlayer = 'Michael Jordan';
  const mvpSport = 'basketball';
  
  console.log(`\n🏀 MVP TEST: Scanning ${mvpPlayer} only...`);
  
  try {
    const result = await searchEbay(mvpPlayer, mvpSport);
    console.log(`Found ${result.items.length} auction listings`);
    
    // Score all items using AI
    const scoredItems = await scoreItems(result.items);
    
    // Add player/sport to each scored item
    scoredItems.forEach(item => {
      item.player = mvpPlayer;
      item.sport = mvpSport;
    });
    
    allResults.push(...scoredItems);
    
  } catch (error) {
    console.error(`Error searching for ${mvpPlayer}:`, error.message);
  }
  
  // Save raw results
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(allResults, null, 2));
  
  // Generate and "send" report
  const report = generateReport(allResults);
  sendEmail(report);
  
  console.log('\n✅ Scan complete!');
  console.log(`Results saved to: ${RESULTS_PATH}`);
}

// Run if called directly
if (require.main === module) {
  scan().catch(err => {
    console.error('❌ Scan failed:', err);
    process.exit(1);
  });
}

module.exports = { scan };
