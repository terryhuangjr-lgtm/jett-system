#!/usr/bin/env node
/**
 * Register Shopify Webhooks for StoreIQ
 *
 * Registers 3 webhook subscriptions on the Shopify store:
 *   - orders/create        → triggers full sync to Supabase
 *   - orders/updated       → triggers full sync to Supabase
 *   - inventory_levels/update → triggers alerts-only sync (fast path)
 *
 * Registered webhook IDs (from first run):
 *   orders/create:          1648116859045
 *   orders/updated:         1648116891813
 *   inventory_levels/update: 1648116924581
 *
 * Usage:
 *   node register-shopify-webhooks.js
 */

const WEBHOOK_URL = 'https://jettmissioncontrol.com/webhooks/shopify';
const TOPICS = ['orders/create', 'orders/updated', 'inventory_levels/update'];

require('dotenv').config({ path: '/home/clawd/clawd/automation/.env' });

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;

if (!SHOP || !TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE or SHOPIFY_TOKEN in .env');
  process.exit(1);
}

async function register() {
  // First list existing webhooks to avoid duplicates
  const listUrl = `https://${SHOP}/admin/api/2024-01/webhooks.json`;
  console.log(`📋 Fetching existing webhooks from ${SHOP}...`);

  const listRes = await fetch(listUrl, {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  });

  if (!listRes.ok) {
    const text = await listRes.text();
    console.error(`❌ Failed to list webhooks: ${listRes.status} ${text}`);
    process.exit(1);
  }

  const listData = await listRes.json();
  const existing = listData.webhooks || [];
  console.log(`Existing webhooks: ${existing.length}`);
  existing.forEach(w => console.log(`  [${w.id}] ${w.topic} → ${w.address}`));

  console.log('\n--- Registering Webhooks ---\n');

  for (const topic of TOPICS) {
    const alreadyExists = existing.some(w => w.topic === topic && w.address === WEBHOOK_URL);
    if (alreadyExists) {
      console.log(`✅ Already registered: ${topic}`);
      continue;
    }

    const res = await fetch(`https://${SHOP}/admin/api/2024-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: WEBHOOK_URL,
          format: 'json'
        }
      })
    });

    const data = await res.json();

    if (data.webhook) {
      console.log(`✅ Registered: ${topic} → ID ${data.webhook.id}`);
    } else {
      console.log(`❌ Failed: ${topic}`);
      console.log(JSON.stringify(data, null, 2));
    }
  }

  console.log('\n--- Done ---');
}

register().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
