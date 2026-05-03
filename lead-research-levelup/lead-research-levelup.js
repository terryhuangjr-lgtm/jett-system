#!/usr/bin/env node
/**
 * Lead Research - Level Up Digital
 * ==============================
 * Researches hair salons and real estate agents in Nassau/Suffolk County NY
 * that have no website or low-quality web presence.
 * 
 * Runs: Monday, Wednesday, Friday at 9am
 * Writes to: Google Sheet via GWS CLI
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyAgmfVMDHDCbQdq06pCDiMCEeN-0lx-_d4';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || 'BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi';
const SPREADSHEET_ID = '1jPWFfCHbaTRX4BqqjlaPPjDB0U15qIIdpcIGQwg8Jcw';
const WORKSHEET_NAME = 'Salons and RE leads';

// Nassau County towns
const NASSAU_TOWNS = [
  { name: 'Garden City', lat: 40.7268, lng: -73.6330 },
  { name: 'Great Neck', lat: 40.8001, lng: -73.7329 },
  { name: 'Manhasset', lat: 40.7957, lng: -73.6968 },
  { name: 'Roslyn', lat: 40.7993, lng: -73.6474 },
  { name: 'Rockville Centre', lat: 40.6587, lng: -73.6407 },
  { name: 'Hewlett', lat: 40.6437, lng: -73.6835 },
  { name: 'Mineola', lat: 40.7496, lng: -73.6413 },
  { name: 'Westbury', lat: 40.7554, lng: -73.5874 },
  { name: 'Hempstead', lat: 40.7062, lng: -73.6187 },
  { name: 'Valley Stream', lat: 40.6643, lng: -73.7085 },
  { name: 'Lynbrook', lat: 40.6559, lng: -73.6735 },
  { name: 'Oceanside', lat: 40.6387, lng: -73.6368 },
  { name: 'Baldwin', lat: 40.6557, lng: -73.6107 },
  { name: 'Freeport', lat: 40.6576, lng: -73.5835 },
  { name: 'Merrick', lat: 40.6593, lng: -73.5496 },
  { name: 'Bellmore', lat: 40.6686, lng: -73.5306 },
  { name: 'Wantagh', lat: 40.6615, lng: -73.5096 },
  { name: 'Massapequa', lat: 40.6776, lng: -73.4735 },
];

// Suffolk County towns
const SUFFOLK_TOWNS = [
  { name: 'Huntington', lat: 40.8681, lng: -73.4257 },
  { name: 'Babylon', lat: 40.6896, lng: -73.3262 },
  { name: 'Bay Shore', lat: 40.7040, lng: -73.2624 },
  { name: 'Islip', lat: 40.7498, lng: -73.2104 },
  { name: 'Commack', lat: 40.8429, lng: -73.2932 },
  { name: 'Smithtown', lat: 40.8568, lng: -73.2018 },
  { name: 'Hauppauge', lat: 40.8243, lng: -73.2032 },
  { name: 'Brentwood', lat: 40.7812, lng: -73.2468 },
  { name: 'Central Islip', lat: 40.7876, lng: -73.1982 },
  { name: 'Patchogue', lat: 40.7648, lng: -73.0146 },
];
const QUEENS_TOWNS = [
  { name: 'Forest Hills', lat: 40.7185, lng: -73.8448 },
  { name: 'Bayside', lat: 40.7627, lng: -73.7710 },
  { name: 'Fresh Meadows', lat: 40.7373, lng: -73.7955 },
  { name: 'Jamaica', lat: 40.6916, lng: -73.8054 },
  { name: 'Flushing', lat: 40.7675, lng: -73.8330 },
  { name: 'Howard Beach', lat: 40.6573, lng: -73.8482 },
  { name: 'Astoria', lat: 40.7721, lng: -73.9302 },
  { name: 'Jackson Heights', lat: 40.7557, lng: -73.8827 },
  { name: 'Woodside', lat: 40.7448, lng: -73.9038 },
  { name: 'Elmhurst', lat: 40.7355, lng: -73.8822 },
];

const SALON_KEYWORDS = ['hair salon', 'nail salon', 'beauty salon', 'med spa'];
const RE_KEYWORDS = ['real estate agent', 'real estate broker', 'realtor'];

const BROKERAGE_DOMAINS = [
  'remax.com', 'kw.com', 'coldwellbanker.com', 'compass.com', 
  'elliman.com', 'sothebys.com', 'century21.com', 'brokerage'
];

const TEMPLATE_DOMAINS = ['facebook.com', 'wix.com', 'squarespace.com', 'weebly.com', 'wordpress.com', 'godaddysites.com', 'sites.google.com'];

const HEADERS = ['business_name', 'owner_name', 'category', 'town', 'phone', 'email', 'gbp_url', 'website_status', 'facebook', 'instagram', 'linkedin', 'priority', 'date_added', 'outreach_status'];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function runGwsCommand(args) {
  try {
    const result = execFileSync('gws', args, { 
      encoding: 'utf8', 
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch (e) {
    log(`GWS error: ${e.message}`);
    return null;
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok) return resp;
      if (resp.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return resp;
    } catch (e) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
}

async function searchPlaces(lat, lng, keyword, radius = 5000) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const resp = await fetchWithRetry(url, { timeout: 10000 });
    const data = await resp.json();
    return data.results || [];
  } catch (e) {
    log(`Places search error for "${keyword}": ${e.message}`);
    return [];
  }
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,url&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const resp = await fetchWithRetry(url, { timeout: 10000 });
    const data = await resp.json();
    return data.result || {};
  } catch (e) {
    log(`Place details error: ${e.message}`);
    return {};
  }
}

function checkWebsiteStatus(websiteUrl) {
  if (!websiteUrl) return { status: 'none', url: '' };
  
  const url = websiteUrl.toLowerCase();
  
  // Check brokerage
  for (const domain of BROKERAGE_DOMAINS) {
    if (url.includes(domain)) {
      return { status: 'brokerage_only', url: websiteUrl };
    }
  }
  
  // Check template sites
  for (const domain of TEMPLATE_DOMAINS) {
    if (url.includes(domain)) {
      if (url.includes('facebook.com')) {
        return { status: 'facebook_only', url: websiteUrl };
      }
      return { status: 'low_quality', url: websiteUrl };
    }
  }
  
  // Assume custom site (may still be low quality but we can't check without fetching)
  return { status: 'has_website', url: websiteUrl };
}

async function findSocialProfiles(businessName, category, town) {
  const result = { facebook: '', instagram: '', linkedin: '' };
  
  try {
    // Use Brave Search API to find social profiles
    const url = 'https://api.search.brave.com/res/v1/web/search';
    const headers = {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    };
    
    // Search for Facebook
    const fbQuery = `${businessName} ${town} facebook`;
    const fbParams = `?q=${encodeURIComponent(fbQuery)}&count=5&country=us`;
    const fbOut = execFileSync('curl', ['-s', '-H', 'Accept: application/json', '-H', `X-Subscription-Token: ${BRAVE_API_KEY}`, url + fbParams]);
    try {
      const fbData = JSON.parse(fbOut);
      const fbResults = fbData.web?.results || [];
      for (const r of fbResults) {
        const url = r.url || '';
        if (url.includes('facebook.com/') && !url.includes('share') && !url.includes('l.php')) {
          result.facebook = url.split('?')[0];
          break;
        }
      }
    } catch (e) {}
    
    await new Promise(r => setTimeout(r, 300));
    
    // Search for Instagram
    const igQuery = `${businessName} ${town} instagram`;
    const igParams = `?q=${encodeURIComponent(igQuery)}&count=5&country=us`;
    const igOut = execFileSync('curl', ['-s', '-H', 'Accept: application/json', '-H', `X-Subscription-Token: ${BRAVE_API_KEY}`, url + igParams]);
    try {
      const igData = JSON.parse(igOut);
      const igResults = igData.web?.results || [];
      for (const r of igResults) {
        const url = r.url || '';
        if (url.includes('instagram.com/')) {
          const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (match && match[1] !== 'login' && match[1] !== 'about') {
            result.instagram = '@' + match[1].replace(/\/.*$/, '');
            break;
          }
        }
      }
    } catch (e) {}
    
    await new Promise(r => setTimeout(r, 300));
    
    // For RE agents, search LinkedIn
    if (category === 'realestate') {
      const liQuery = `${businessName} LinkedIn`;
      const liParams = `?q=${encodeURIComponent(liQuery)}&count=5&country=us`;
      const liOut = execFileSync('curl', ['-s', '-H', 'Accept: application/json', '-H', `X-Subscription-Token: ${BRAVE_API_KEY}`, url + liParams]);
      try {
        const liData = JSON.parse(liOut);
        const liResults = liData.web?.results || [];
        for (const r of liResults) {
          const url = r.url || '';
          if (url.includes('linkedin.com/in/')) {
            result.linkedin = url.split('?')[0];
            break;
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    log(`Social search error: ${e.message}`);
  }
  
  return result;
}

async function getExistingRows() {
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    
    if (!result) return { phones: new Set(), names: new Set() };
    
    const data = JSON.parse(result);
    const values = data.values || [];
    
    const phones = new Set();
    const names = new Set();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4]) phones.add(row[4].replace(/\D/g, ''));
      if (row[0] && row[3]) names.add(`${row[0].toLowerCase()}|${row[3].toLowerCase()}`);
    }
    
    return { phones, names };
  } catch (e) {
    log(`Error reading existing rows: ${e.message}`);
    return { phones: new Set(), names: new Set() };
  }
}

async function getTownTracking() {
  const TRACKING_SHEET = 'Town_Tracking';
  const searched = new Map();
  
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: TRACKING_SHEET
    })]);
    
    if (!result) return searched;
    
    const data = JSON.parse(result);
    const values = data.values || [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] && row[1]) {
        searched.set(row[0], row[1]);
      }
    }
  } catch (e) {}
  
  return searched;
}

function markTownSearched(townName) {
  const TRACKING_SHEET = 'Town_Tracking';
  const today = new Date().toISOString().split('T')[0];
  
  try {
    runGwsCommand(['sheets', 'spreadsheets', 'values', 'append', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: TRACKING_SHEET,
      valueInputOption: 'USER_ENTERED'
    }), '--json', JSON.stringify({ values: [[townName, today]] })]);
  } catch (e) {}
}

function getTownsToSearch(allTowns, trackingMap, daysSinceLastSearch = 7) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - daysSinceLastSearch);
  
  return allTowns.filter(town => {
    const lastSearched = trackingMap.get(town.name);
    if (!lastSearched) return true;
    
    const lastDate = new Date(lastSearched);
    return lastDate < sevenDaysAgo;
  });
}

function ensureHeaders() {
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    
    if (!result) {
      runGwsCommand(['sheets', 'spreadsheets', 'values', 'update', '--params', JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        range: WORKSHEET_NAME,
        valueInputOption: 'USER_ENTERED'
      }), '--json', JSON.stringify({ values: [HEADERS] })]);
    }
  } catch (e) {
    // Ignore
  }
}

async function appendLead(lead) {
  const row = [
    lead.business_name,
    lead.owner_name || '',
    lead.category,
    lead.town,
    lead.phone || '',
    lead.email || '',
    lead.gbp_url || '',
    lead.website_status,
    lead.facebook || '',
    lead.instagram || '',
    lead.linkedin || '',
    lead.priority,
    lead.date_added,
    lead.outreach_status || 'pending'
  ];
  
  try {
    runGwsCommand(['sheets', 'spreadsheets', 'values', 'append', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME,
      valueInputOption: 'USER_ENTERED'
    }), '--json', JSON.stringify({ values: [row] })]);
  } catch (e) {
    log(`Append error: ${e.message}`);
  }
}

function getPriority(websiteStatus) {
  if (websiteStatus === 'none' || websiteStatus === 'brokerage_only') return 'HIGH';
  if (websiteStatus === 'facebook_only' || websiteStatus === 'low_quality' || websiteStatus === 'outdated') return 'MEDIUM';
  return 'MEDIUM';
}

async function getPlaceDetailsWithAbout(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,url,editorial_summary,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`;
  
  try {
    const resp = await fetchWithRetry(url, { timeout: 10000 });
    const data = await resp.json();
    return data.result || {};
  } catch (e) {
    log(`Place details error: ${e.message}`);
    return {};
  }
}

async function fetchWebsite(url) {
  try {
    const resp = await fetch(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return await resp.text();
  } catch (e) {
    return '';
  }
}

function extractInstagramFromHtml(html) {
  if (!html) return '';
  const patterns = [
    /instagram\.com\/([a-zA-Z0-9._]+)/gi,
    /@([a-zA-Z0-9._]+)/gi
  ];
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (m.includes('instagram.com') && !m.includes('login') && !m.includes('about')) {
          const handle = m.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (handle && handle[1]) return '@' + handle[1].replace(/\/.*$/, '');
        }
      }
    }
  }
  return '';
}

async function braveSearch(query, count = 5) {
  try {
    const url = 'https://api.search.brave.com/res/v1/web/search';
    const headers = {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    };
    const params = `?q=${encodeURIComponent(query)}&count=${count}&country=us`;
    const out = execFileSync('curl', ['-s', '-H', 'Accept: application/json', '-H', `X-Subscription-Token: ${BRAVE_API_KEY}`, url + params]);
    const data = JSON.parse(out);
    return data.web?.results || [];
  } catch (e) {
    return [];
  }
}

async function enrichHighPriorityLead(lead) {
  const enriched = { ...lead };
  const startTime = Date.now();
  const TIMEOUT_MS = 7 * 60 * 1000; // 7 min total for all HIGH leads
  
  log(`    Enriching: ${lead.business_name} (${lead.category})`);
  
  // Get owner name from GBP details
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(lead.gbp_url.split('/').pop())}&fields=name,formatted_phone_number,website,formatted_address,url,editorial_summary&key=${GOOGLE_PLACES_API_KEY}`;
    const resp = await fetchWithRetry(url, { timeout: 10000 });
    const data = await resp.json();
    if (data.result?.editorial_summary?.overview) {
      enriched.owner_name = data.result.editorial_summary.overview.substring(0, 100);
    }
  } catch (e) {}
  
  await new Promise(r => setTimeout(r, 300));
  
  if (lead.category === 'salon') {
    // SALON: Find Instagram
    let instagramFound = '';
    
    // Method 1: If website exists, fetch and look for Instagram
    if (lead.website_status !== 'none' && lead.website_status !== 'brokerage_only') {
      const websiteUrl = lead.gbp_url.match(/maps\.place\/([a-zA-Z0-9]+)/);
      if (websiteUrl) {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${websiteUrl[1]}&fields=website&key=${GOOGLE_PLACES_API_KEY}`;
          const detResp = await fetchWithRetry(detailsUrl, { timeout: 10000 });
          const detData = await detResp.json();
          if (detData.result?.website) {
            const html = await fetchWebsite(detData.result.website);
            instagramFound = extractInstagramFromHtml(html);
            if (instagramFound) log(`      Found IG from website: ${instagramFound}`);
          }
        } catch (e) {}
      }
    }
    
    // Method 2: Google search for Instagram
    if (!instagramFound) {
      await new Promise(r => setTimeout(r, 400));
      const results = await braveSearch(`${lead.business_name} ${lead.town} instagram`);
      for (const r of results) {
        if (r.url?.includes('instagram.com/') && !r.url.includes('login')) {
          const match = r.url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
          if (match && match[1] !== 'about') {
            instagramFound = '@' + match[1].replace(/\/.*$/, '');
            log(`      Found IG from search: ${instagramFound}`);
            break;
          }
        }
      }
    }
    
    // Method 3: Check Facebook (already in lead.facebook or search)
    if (!instagramFound && lead.facebook) {
      await new Promise(r => setTimeout(r, 400));
      const fbHtml = await fetchWebsite(lead.facebook);
      instagramFound = extractInstagramFromHtml(fbHtml);
      if (instagramFound) log(`      Found IG from FB: ${instagramFound}`);
    }
    
    if (instagramFound) {
      enriched.instagram = instagramFound;
    }
    
  } else if (lead.category === 'realestate') {
    // RE AGENT: Find email and LinkedIn
    
    // Method 1: Get owner name from website
    if (!enriched.owner_name && lead.website_status !== 'none') {
      const websiteUrlMatch = lead.gbp_url.match(/maps\.place\/([a-zA-Z0-9]+)/);
      if (websiteUrlMatch) {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${websiteUrlMatch[1]}&fields=website&key=${GOOGLE_PLACES_API_KEY}`;
          const detResp = await fetchWithRetry(detailsUrl, { timeout: 10000 });
          const detData = await detResp.json();
          if (detData.result?.website) {
            const html = await fetchWebsite(detData.result.website);
            const aboutMatches = html.match(/<h[1-3][^>]*>(?:About|Meet the Team|Our Team|Our Agents)[^<]*<\/h[1-3]>/gi);
            if (aboutMatches) {
              const nameMatch = html.match(/<p[^>]*>([A-Z][a-z]+ [A-Z][a-z]+)<\/p>/);
              if (nameMatch) {
                enriched.owner_name = nameMatch[1];
              }
            }
          }
        } catch (e) {}
      }
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    // Find LinkedIn
    const liResults = await braveSearch(`${lead.business_name} ${lead.town} real estate linkedin`);
    for (const r of liResults) {
      if (r.url?.includes('linkedin.com/in/')) {
        enriched.linkedin = r.url.split('?')[0];
        log(`      Found LinkedIn: ${enriched.linkedin}`);
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 400));
    
    // Find email via Zillow or Realtor.com
    const zillowResults = await braveSearch(`${lead.business_name} ${lead.town} zillow agent`);
    for (const r of zillowResults) {
      if (r.url?.includes('zillow.com')) {
        const html = await fetchWebsite(r.url);
        const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !emailMatch[0].includes('zillow')) {
          enriched.email = emailMatch[0];
          log(`      Found email from Zillow: ${enriched.email}`);
          break;
        }
      }
    }
    
    // If no email from Zillow, try Realtor.com
    if (!enriched.email) {
      await new Promise(r => setTimeout(r, 400));
      const realtorResults = await braveSearch(`${lead.business_name} ${lead.town} realtor.com agent`);
      for (const r of realtorResults) {
        if (r.url?.includes('realtor.com')) {
          const html = await fetchWebsite(r.url);
          const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch && !emailMatch[0].includes('realtor')) {
            enriched.email = emailMatch[0];
            log(`      Found email from Realtor.com: ${enriched.email}`);
            break;
          }
        }
      }
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  log(`      Enriched in ${elapsed.toFixed(1)}s — IG: ${enriched.instagram || 'none'}, Email: ${enriched.email || 'none'}, LI: ${enriched.linkedin ? 'yes' : 'no'}`);
  
  return enriched;
}

async function enrichHighPriorityLeads(leads) {
  const startTime = Date.now();
  const MAX_TIME_MS = 6 * 60 * 1000; // 6 min max for enrichment
  
  const highPriorityLeads = leads.filter(l => l.priority === 'HIGH');
  log(`\n--- Enriching ${highPriorityLeads.length} HIGH priority leads ---`);
  
  const enrichedLeads = [];
  
  for (let i = 0; i < highPriorityLeads.length; i++) {
    if (Date.now() - startTime > MAX_TIME_MS) {
      log(`  ⚠️ Enrichment timeout reached, stopping at ${i} leads`);
      break;
    }
    
    const enriched = await enrichHighPriorityLead(highPriorityLeads[i]);
    enrichedLeads.push(enriched);
    
    // Rate limit between enrichments
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Merge: HIGH leads get enriched, MEDIUM keep original
  const mediumLeads = leads.filter(l => l.priority !== 'HIGH');
  
  log(`  Enriched ${enrichedLeads.length} HIGH priority leads in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  
  return [...enrichedLeads, ...mediumLeads];
}

async function sendTelegramSummary(stats, totalInSheet) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  
  const message = `Level Up Lead Research — ${date}
---
Salons found: ${stats.salonTotal} new (HIGH: ${stats.salonHigh} | MEDIUM: ${stats.salonMedium})
RE Agents found: ${stats.reTotal} new (HIGH: ${stats.reHigh} | MEDIUM: ${stats.reMedium})
Total leads in sheet: ${totalInSheet}
---
Top new HIGH priority leads:
${stats.topLeads.map((l, i) => `${i + 1}. ${l.business_name} — ${l.town}`).join('\n')}`;
  
  try {
    execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
      'message', 'send', '--channel', 'telegram',
      '--target', '5867308866',
      '--message', message
    ], { timeout: 10000, stdio: 'ignore' });
    log('Telegram summary sent');
  } catch (e) {
    log(`Telegram error: ${e.message}`);
  }
}


async function processCategory(towns, keywords, category, existing, stats) {
  const leads = [];

  for (const town of towns) {
    for (const keyword of keywords) {
      log(`Searching ${town.name} for "${keyword}"...`);
      const places = await searchPlaces(town.lat, town.lng, keyword);
      log(`Found ${places.length} places in ${town.name}`);

      for (const place of places) {
        // Skip if already in sheet
        if (existing.names.has(place.name)) {
          log(`Skipping duplicate: ${place.name}`);
          continue;
        }

        // Get details
        const details = await getPlaceDetails(place.place_id);
        const phone = details.formatted_phone_number || '';

        // Skip if phone already in sheet
        if (phone && existing.phones.has(phone)) {
          log(`Skipping duplicate phone: ${phone}`);
          continue;
        }

        // Verify place is actually in the searched town
        const address = (details.formatted_address || '').toLowerCase();
        const townName = town.name.toLowerCase();
        // Also allow neighboring zip variations but reject obvious mismatches
        const townWords = townName.split(' ');
        const addressMatchesTown = townWords.every(word => address.includes(word));
        if (!addressMatchesTown) {
          log(`Skipping wrong town: ${place.name} (address: ${details.formatted_address}, expected: ${town.name})`);
          continue;
        }

        // Check website status
        const websiteCheck = checkWebsiteStatus(details.website);
        const priority = getPriority(websiteCheck.status);

        // Only collect HIGH and MEDIUM
        if (priority === 'HIGH') {
          stats.high;
        } else {
          stats.medium;
        }

        const lead = {
          business_name: place.name,
          owner_name: '',
          category,
          town: town.name,
          phone,
          email: '',
          gbp_url: details.url || '',
          website_status: websiteCheck.status,
          facebook: '',
          instagram: '',
          linkedin: '',
          priority,
          date_added: new Date().toISOString().split('T')[0],
          outreach_status: 'pending'
        };

        leads.push(lead);
        existing.names.add(place.name);
        if (phone) existing.phones.add(phone);

        log(`Added ${priority}: ${place.name} (${town.name}) - ${websiteCheck.status}`);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  return leads;
}

async function main() {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, 3=Wed, 5=Fri
  
  // Run Mon(1), Wed(3), Fri(5) unless force flag
  const forceRun = process.argv.includes('--force');
  if (!forceRun && ![1, 3, 5].includes(dayOfWeek)) {
    log(`Not a scheduled day (day=${dayOfWeek}), skipping`);
    return;
  }
  
  if (forceRun) {
    log('FORCE RUN - processing all towns');
  }
  
  log('=== Level Up Lead Research ===');
  log(`Running for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}`);
  
  const stats = {
    salonHigh: 0,
    salonMedium: 0,
    reHigh: 0,
    reMedium: 0,
    topLeads: []
  };
  
  // Get existing leads
  const existing = await getExistingRows();
  log(`Existing leads: ${existing.phones.size} phones, ${existing.names.size} businesses`);
  
  // Get town tracking - skip towns searched in last 7 days
  const tracking = await getTownTracking();
  const allSalonTowns = [...NASSAU_TOWNS, ...QUEENS_TOWNS];
  const allReTowns = [...NASSAU_TOWNS, ...SUFFOLK_TOWNS, ...QUEENS_TOWNS];
  const townsToSearch = existing.phones.size > 0 ? getTownsToSearch(allSalonTowns, tracking) : allSalonTowns;
  const reTownsToSearch = existing.phones.size > 0 ? getTownsToSearch(allReTowns, tracking) : allReTowns;
  
  if (townsToSearch.length === 0 && reTownsToSearch.length === 0) {
    log('All towns searched in last 7 days. Skipping this run.');
    return;
  }
  
  log(`Towns to search: ${townsToSearch.length} Nassau, ${reTownsToSearch.length} total`);
  
  // Limit towns for faster execution (use first 2 towns only)
  const quickTowns = townsToSearch.slice(0, 3);
  const quickReTowns = reTownsToSearch.slice(0, 3);
  
  log(`Processing ${quickTowns.length} Nassau towns, ${quickReTowns.length} total for RE`);
  
  // Process salons
  log('\n--- Processing Salons ---');
  const salonLeads = await processCategory(quickTowns, SALON_KEYWORDS.slice(0,1), 'salon', existing, {
    get high() { return stats.salonHigh++; },
    get medium() { return stats.salonMedium++; }
  });
  
  // Process RE agents  
  log('\n--- Processing Real Estate Agents ---');
  const reLeads = await processCategory(quickReTowns, RE_KEYWORDS.slice(0,1), 'realestate', existing, {
    get high() { return stats.reHigh++; },
    get medium() { return stats.reMedium++; }
  });

  // Combine and enrich HIGH priority leads
  const allLeads = [...salonLeads, ...reLeads];
  const enrichedLeads = await enrichHighPriorityLeads(allLeads);

  // Mark towns as searched
  for (const town of townsToSearch) {
    markTownSearched(town.name);
  }
  for (const town of reTownsToSearch) {
    markTownSearched(town.name);
  }

  // Append all leads (HIGH and MEDIUM)
  ensureHeaders();

  for (const lead of enrichedLeads) {
    await appendLead(lead);
    if (lead.priority === 'HIGH' && stats.topLeads.length < 6) {
      stats.topLeads.push(lead);
    }
  }
   
  // Get total in sheet
  let totalInSheet = 0;
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    if (result) {
      const data = JSON.parse(result);
      totalInSheet = (data.values || []).length - 1;
    }
  } catch (e) {}
  
  stats.salonTotal = stats.salonHigh + stats.salonMedium;
  stats.reTotal = stats.reHigh + stats.reMedium;
  
  log('\n=== Summary ===');
  log(`Salons: ${stats.salonTotal} (HIGH: ${stats.salonHigh}, MEDIUM: ${stats.salonMedium})`);
  log(`RE Agents: ${stats.reTotal} (HIGH: ${stats.reHigh}, MEDIUM: ${stats.reMedium})`);
  log(`Total in sheet: ${totalInSheet}`);
  
  await sendTelegramSummary(stats, totalInSheet);
  
  log('Done');
}

main().catch(e => {
  log(`Error: ${e.message}`);
  process.exit(1);
});