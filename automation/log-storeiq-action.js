#!/usr/bin/env node
/**
 * StoreIQ Activity Logger
 * Usage: node log-storeiq-action.js <action> <summary> [status] [details]
 * Reads env from automation/.env
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

// Read env from automation directory
const envPath = path.join(__dirname, '.env');
const env = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(\S+)/)?.[1] || env.match(/SUPABASE_URL=(\S+)/)?.[1];
const SUPABASE_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/)?.[1] || env.match(/SUPABASE_ANON_KEY=(\S+)/)?.[1];
const STORE_ID = env.match(/STORE_ID=(\S+)/)?.[1] || '00000000-0000-0000-0000-000000000001';

const action = process.argv[2];
const summary = process.argv[3] || '';
const status = process.argv[4] || 'success';
const details = process.argv.slice(5).join(' ') || '';

if (!action || !SUPABASE_URL || !SUPABASE_KEY) process.exit(0);

const body = JSON.stringify({
  store_id: STORE_ID,
  action: String(action).slice(0, 100),
  summary: String(summary).slice(0, 500),
  status: String(status),
  details: String(details).slice(0, 2000),
  created_at: new Date().toISOString()
});

const url = SUPABASE_URL + '/rest/v1/activity_log';
const opts = { hostname: new URL(url).hostname, path: '/rest/v1/activity_log', method: 'POST', timeout: 10, family: 4,
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' }
};
const req = https.request(opts, () => {});
req.on('error', () => {});
req.write(body);
req.end();
