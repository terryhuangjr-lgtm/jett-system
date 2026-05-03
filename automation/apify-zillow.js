#!/usr/bin/env node
/**
 * Apify Zillow Scraper - NYC Expired/Off-Market Listings
 * Uses Apify API directly
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

const SHEET_ID = '1jPWFfCHbaTRX4BqqjlaPPjDB0U15qIIdpcIGQwg8Jcw';
const WORKSHEET = 'NYC Expired Listings Demo';

const HEADERS = [
  'address', 'neighborhood', 'property_type', 'bedrooms', 'bathrooms',
  'last_list_price', 'days_on_market', 'date_expired', 'status',
  'source_url', 'outreach_draft'
];

const AREAS = [
  { area: 'Manhattan', hoods: ['Upper East Side', 'Upper West Side', 'Tribeca', 'Chelsea', 'Harlem'] },
  { area: 'Brooklyn', hoods: ['Park Slope', 'Brooklyn Heights', 'Williamsburg', 'Bedford Stuyvesant', 'Fort Greene'] }
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function getApiKey() {
  const env = fs.readFileSync('/home/clawd/.env', 'utf8');
  const m = env.match(/APIFY_API_KEY[=\s]*([^\n]+)/);
  return m ? m[1].trim() : null;
}

function generateOutreach(l) {
  const strats = [
    'She analyzes current market data to price your home competitively from day one.',
    'She uses targeted digital marketing to reach qualified buyers immediately.',
    'She offers virtual tour capabilities to expand your buyer pool globally.',
    'She negotiates aggressively to get you the best terms.'
  ];
  return `Subject: Your property at ${l.address}
Hi there,
I came across your property at ${l.address} in ${l.neighborhood} — I noticed it recently came off the market after ${l.days_on_market} days.
I'm reaching out on behalf of a top NYC broker who specializes in ${l.neighborhood} and has a proven track record. Her approach is different — ${strats[Math.floor(Math.random() * strats.length)]}
Would you be open to a quick 15-minute conversation?`;
}

async function runScraper(area, neighborhood) {
  const apiKey = getApiKey();
  log(`Searching ${area}: ${neighborhood}...`);

  try {
    const result = execFileSync('apify', [
      'call', 'maxcopell/zillow-scraper',
      '--input', JSON.stringify({
        searchTerms: [`${neighborhood} ${area} NY`],
        maxResults: 30,
        maxPages: 3
      }),
      '--json'
    ], {
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const data = JSON.parse(result);
    const listings = data?.results || [];
    return listings;
  } catch (e) {
    log(`Error: ${e.message}`);
    return [];
  }
}

async function writeToSheet(listings) {
  log(`Writing ${listings.length} to sheet...`);
  
  const values = [HEADERS];
  for (const l of listings) {
    values.push([
      l.address || '', l.neighborhood || '', l.property_type || '',
      l.bedrooms || '', l.bathrooms || '', l.last_list_price || '',
      l.days_on_market || '', l.date_expired || '', l.status || '',
      l.source_url || '', l.outreach_draft || ''
    ]);
  }

  const params = JSON.stringify({
    spreadsheetId: SHEET_ID,
    range: WORKSHEET + '!A1',
    valueInputOption: 'RAW'
  });

  const jsonBody = JSON.stringify({ values });

  return execFileSync('gws', [
    'sheets', 'spreadsheets', 'values', 'update',
    '--params', params, '--json', jsonBody
  ], { encoding: 'utf8', timeout: 60000 });
}

async function main() {
  log('=== Apify Zillow Scraper ===');
  
  const apiKey = getApiKey();
  if (!apiKey) {
    log('ERROR: No API key');
    process.exit(1);
  }

  const allListings = [];

  for (const { area, hoods } of AREAS) {
    for (const hood of hoods) {
      const results = await runScraper(area, hood);
      
      for (const r of results) {
        const status = r.status || '';
        if (status.toLowerCase().includes('expired') || 
            status.toLowerCase().includes('off market') ||
            status.toLowerCase().includes('sold') ||
            status.toLowerCase().includes('withdrawn')) {
          
          const listing = {
            address: r.address || r.title || '',
            neighborhood: r.neighborhood || hood,
            property_type: r.propertyType || 'Residential',
            bedrooms: r.beds || r.bedrooms || '',
            bathrooms: r.baths || r.bathrooms || '',
            last_list_price: r.price || '',
            days_on_market: r.daysOnMarket || r.days || '',
            date_expired: r.offMarketDate || '',
            status: status,
            source_url: r.url || r.detailUrl || '',
            outreach_draft: ''
          };
          listing.outreach_draft = generateOutreach(listing);
          allListings.push(listing);
        }
      }
    }
  }

  if (allListings.length === 0) {
    log('No results - trying generic search...');
    const results = await runScraper('Manhattan', 'NY');
    for (const r of results) {
      const listing = {
        address: r.address || '',
        neighborhood: r.neighborhood || 'Manhattan',
        property_type: r.propertyType || 'Residential',
        bedrooms: r.beds || '',
        bathrooms: r.baths || '',
        last_list_price: r.price || '',
        days_on_market: r.daysOnMarket || '',
        date_expired: '',
        status: r.status || '',
        source_url: r.url || '',
        outreach_draft: ''
      };
      listing.outreach_draft = generateOutreach(listing);
      allListings.push(listing);
    }
  }

  log(`Total: ${allListings.length} listings`);

  if (allListings.length === 0) {
    log('No data from Apify. Check API key or actor.');
  } else {
    await writeToSheet(allListings);
  }

  log('=== Complete ===');
}

main().catch(e => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});