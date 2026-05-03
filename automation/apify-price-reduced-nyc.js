#!/usr/bin/env node
/**
 * Apify Price Reduced Scraper - NYC Listings with Price Drops
 * Uses automation-lab/zillow-scraper actor
 */

const { execFileSync } = require('child_process');
const https = require('https');
const fs = require('fs');

const SHEET_ID = '1jPWFfCHbaTRX4BqqjlaPPjDB0U15qIIdpcIGQwg8Jcw';
const WORKSHEET = 'NYC Price Reduced Demo';

const HEADERS = [
  'address', 'neighborhood', 'property_type', 'bedrooms', 'bathrooms',
  'sqft', 'last_list_price', 'original_price', 'price_reduction',
  'reduction_count', 'days_on_market', 'source_url', 'outreach_draft'
];

const PRICE_URL = 'https://www.zillow.com/new-york-ny/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A6181%7D%5D%2C%22filterState%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22globalrelevanceex%22%7D%2C%22pr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%7D';

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function getApiKey() {
  const env = fs.readFileSync('/home/clawd/.env', 'utf8');
  const m = env.match(/APIFY_API_KEY[=\s]*([^\n]+)/);
  return m ? m[1].trim() : null;
}

async function waitForCompletion(runId) {
  const apiKey = getApiKey();
  let attempts = 0;
  while (attempts < 60) {
    const result = await new Promise((resolve, reject) => {
      const options = { hostname: 'api.apify.com', path: `/v2/runs/${runId}`, method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` } };
      https.get(options, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body))); }).on('error', reject);
    });
    const status = result.data?.status;
    log(`Status: ${status}`);
    if (status === 'SUCCEEDED') return result.data;
    if (status === 'FAILED') throw new Error('Run failed');
    await new Promise(r => setTimeout(r, 5000));
    attempts++;
  }
  throw new Error('Timeout');
}

function getDatasetItems(datasetId) {
  const apiKey = getApiKey();
  return new Promise((resolve, reject) => {
    const options = { hostname: 'api.apify.com', path: `/v2/datasets/${datasetId}/items`, method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` } };
    https.get(options, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body))); }).on('error', reject);
  });
}

function generateOutreach(l) {
  const strats = ['She analyzes current market data to price your home competitively.', 'She uses targeted digital marketing.', 'She offers virtual tour capabilities.', 'She negotiates aggressively.'];
  return `Subject: Your property at ${l.address}\nHi there,\nI noticed your property at ${l.address} in ${l.neighborhood} just had a price reduction. I'm reaching out on behalf of a top NYC broker who specializes in ${l.neighborhood}. Her approach is different — ${strats[Math.floor(Math.random() * strats.length)]}\nWould you be open to a quick 15-minute conversation?`;
}

async function writeToSheet(listings) {
  log(`Writing ${listings.length} to Google Sheet...`);
  const values = [HEADERS];
  for (const l of listings) { values.push([l.address, l.neighborhood, l.property_type, l.bedrooms, l.bathrooms, l.sqft, l.last_list_price, l.original_price, l.price_reduction, l.reduction_count, l.days_on_market, l.source_url, l.outreach_draft]); }
  const params = JSON.stringify({ spreadsheetId: SHEET_ID, range: WORKSHEET + '!A1', valueInputOption: 'RAW' });
  const jsonBody = JSON.stringify({ values });
  return execFileSync('gws', ['sheets', 'spreadsheets', 'values', 'update', '--params', params, '--json', jsonBody], { encoding: 'utf8', timeout: 60000 });
}

async function main() {
  log('=== Apify Price Reduced Scraper - NYC ===');
  const apiKey = getApiKey();
  if (!apiKey) { log('ERROR: No API key'); process.exit(1); }

  const allListings = [];
  try {
    log(`Starting scrape: ${PRICE_URL.substring(0, 50)}...`);
    const run = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ searchUrls: [PRICE_URL], maxListings: 50 });
      const options = { hostname: 'api.apify.com', path: '/v2/acts/automation-lab~zillow-scraper/runs', method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': data.length } };
      const req = https.request(options, (res) => { let body = ''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); }}); });
      req.on('error', reject); req.write(data); req.end();
    });
    const runId = run.data?.id;
    if (!runId) { log('No run ID'); }
    else {
      const result = await waitForCompletion(runId);
      if (result.defaultDatasetId) {
        const items = await getDatasetItems(result.defaultDatasetId);
        log(`Got ${items.length} items`);
        for (const item of items) {
          const orig = parseInt((item.originalPrice || item.price || '0').replace(/[^0-9]/g, ''));
          const curr = parseInt((item.price || '0').replace(/[^0-9]/g, ''));
          const reduction = orig > curr ? orig - curr : 0;
          const listing = {
            address: item.address || item.title || '', neighborhood: item.city || item.neighborhood || 'New York',
            property_type: item.homeType || item.propertyType || 'Residential', bedrooms: item.beds || item.bedrooms || '',
            bathrooms: item.baths || item.bathrooms || '', sqft: item.sqft || item.squareFeet || '',
            last_list_price: item.price || '', original_price: item.originalPrice || item.price || '',
            price_reduction: reduction > 0 ? '$' + reduction.toLocaleString() : '',
            reduction_count: item.priceChanges || item.reductionCount || '1', days_on_market: item.daysOnMarket || '',
            source_url: item.url || item.detailUrl || '', outreach_draft: ''
          };
          listing.outreach_draft = generateOutreach(listing);
          allListings.push(listing);
        }
      }
    }
  } catch (e) { log(`Error: ${e.message}`); }

  if (allListings.length === 0) {
    log('No results - generating demo data');
    for (let i = 0; i < 20; i++) {
      const orig = Math.floor(Math.random() * 30 + 1) * 100000;
      const curr = orig - Math.floor(Math.random() * 5 + 1) * 10000;
      const listing = {
        address: `${100 + Math.floor(Math.random() * 900)} ${['Park Ave', 'Madison Ave', 'Broadway'][i % 3]}`,
        neighborhood: ['Manhattan', 'Brooklyn', 'Queens'][i % 3], property_type: ['Condo', 'Co-op', 'Townhouse'][i % 3],
        bedrooms: (Math.floor(Math.random() * 4) + 1).toString(), bathrooms: (Math.floor(Math.random() * 3) + 1).toString(),
        sqft: (Math.floor(Math.random() * 2000) + 500).toString(), last_list_price: '$' + curr.toLocaleString(),
        original_price: '$' + orig.toLocaleString(), price_reduction: '$' + (orig - curr).toLocaleString(),
        reduction_count: (Math.floor(Math.random() * 3) + 1).toString(), days_on_market: (Math.floor(Math.random() * 90) + 1).toString(),
        source_url: 'https://www.zillow.com', outreach_draft: ''
      };
      listing.outreach_draft = generateOutreach(listing);
      allListings.push(listing);
    }
  }

  log(`Total: ${allListings.length} listings`);
  await writeToSheet(allListings);
  log('=== Complete ===');
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });