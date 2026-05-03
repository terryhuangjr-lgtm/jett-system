#!/usr/bin/env node
/**
 * generate-superare-demo-data.js
 * Generates 24 months of realistic synthetic order history for Superare demo.
 */
const fs = require('fs');
const crypto = require('crypto');

const CONFIG = {
  startDate: new Date('2023-04-01T00:00:00-04:00'),
  endDate: new Date('2025-04-30T23:59:59-04:00'),
  batchSize: 1,
  batchDelayMs: 2000,
  logInterval: 50,
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  storeUrl: process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com',
  storeToken: process.env.SHOPIFY_TOKEN,
  locationId: parseInt(process.env.SHOPIFY_LOCATION_ID, 10) || 85513961637,
  apiVersion: '2024-01',
  manifestPath: '/home/clawd/clawd/automation/superare-demo-manifest.json',
  logPath: '/home/clawd/clawd/automation/superare-demo.log',
  telegram: { token: null, chatId: null },
};

(function loadTelegram() {
  const hermesEnv = '/home/clawd/.hermes/.env';
  if (!fs.existsSync(hermesEnv)) return;
  for (const line of fs.readFileSync(hermesEnv, 'utf8').split('\n')) {
    const m = line.match(/^TELEGRAM_BOT_TOKEN\s*=\s*(.+)$/);
    if (m) CONFIG.telegram.token = m[1].trim();
    const n = line.match(/^TELEGRAM_HOME_CHANNEL\s*=\s*(.+)$/);
    if (n) CONFIG.telegram.chatId = n[1].trim();
  }
})();

if (!CONFIG.storeToken) { console.error('❌ SHOPIFY_TOKEN not set'); process.exit(1); }
if (!CONFIG.telegram.token || !CONFIG.telegram.chatId) { console.error('❌ Telegram config missing'); process.exit(1); }

const BASE_URL = `https://${CONFIG.storeUrl}/admin/api/${CONFIG.apiVersion}`;
const HEADERS = { 'X-Shopify-Access-Token': CONFIG.storeToken, 'Content-Type': 'application/json' };

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(CONFIG.logPath, line + '\n', { encoding: 'utf8' });
}

async function shopifyFetch(endpoint, method='GET', body=null) {
  const url = `${BASE_URL}${endpoint}`;
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt.slice(0,200)}`);
  return JSON.parse(txt);
}
const shopifyGet = (e) => shopifyFetch(e,'GET');
const shopifyPost = (e,b) => shopifyFetch(e,'POST',b);

async function checkExistingOrders() {
  try { const d = await shopifyGet('/orders.json?status=any&limit=1'); return (d.orders||[]).length; } catch(e) { return 0; }
}

async function askForConsentTelegram(orderCount, estimatedTotal) {
  const msg = encodeURIComponent(`⚠️ <b>Superare Demo Data Confirmation</b>\n\nStore has ${orderCount} orders. This script adds ~${estimatedTotal} orders covering April 2023 – April 2025.\n\nReply <b>YES</b> to proceed or <b>NO</b> to abort.`);
  await fetch(`https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage?chat_id=${CONFIG.telegram.chatId}&parse_mode=HTML&text=${msg}`);
  log('📨 Confirmation sent, waiting 120s...');
  const pollBase = `https://api.telegram.org/bot${CONFIG.telegram.token}/getUpdates`;
  let lastId=null, elapsed=0;
  while (elapsed<120) {
    const offset = lastId?`&offset=${lastId+1}`:'';
    try {
      const r = await (await fetch(`${pollBase}${offset}`)).json();
      if (r.ok && r.result?.length) {
        for (const u of r.result) {
          lastId = u.update_id;
          const t = (u.message?.text||'').trim().toUpperCase();
          if (t==='YES'||t==='NO') return t==='YES';
        }
      }
    } catch {}
    await new Promise(r=>setTimeout(r,5000)); elapsed+=5;
  }
  return false;
}

async function fetchAllProducts() {
  const d = await shopifyGet('/products.json?limit=250&fields=id,title,variants');
  return d.products||[];
}

async function restockAllVariants(products, targetQty=1000) {
  if (CONFIG.dryRun) { log(`⚠️  DRY RUN — would restock ${products.reduce((s,p)=>s+p.variants.length,0)} variants`); return; }
  log(`🔧 Restocking all variants to ${targetQty}...`);
  let total=0, errors=0;
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.inventory_item_id) continue;
      try { await shopifyPost('/inventory_levels/set.json', { location_id: CONFIG.locationId, inventory_item_id: v.inventory_item_id, available: targetQty }); total++; }
      catch(e) { errors++; }
      await new Promise(r=>setTimeout(r,1000));
    }
  }
  log(`✅ Restock: ${total} ok, ${errors} failed`);
}

function assignProductPatterns(products) {
  const assignments = new Map();
  const bestsellerTitles = ['Supergel V Gloves','Superare Finisher Hoodie','Supergel Pro Gloves','World Champion Tee'];
  const steadyTitles = ['Superare Finisher Hand Wraps','Finisher Dad Hat','Superare Fundamental 2.0 Athletic Shorts','Supergel 2.0 Lace Up Gloves','S40 Italian Leather Lace Up Gloves'];
  const seasonalTitles = ['Finisher 2.0 Tee','Happiest At Heavyweight Tee','Superare Bringing The Heat Tee','Boxing Club NYC Tee'];
  const decliningTitles = ['Carico 2-in-1 Gear Bag 65L','Enorme 2-in-1 Gear Bag 83L','One Series Leather Headgear'];
  const deadTitles = ['Legacy Tee','One Series No Foul Protector'];
  const newLaunchTitles = ['Nike Hyper KO 3','S40 Italian Leather Velcro Gloves','Hajime No Ippo - Rounds Tee'];
  
  const assignByTitles = (titles,pattern) => { for (const t of titles) { const p = products.find(p=>p.title===t); if (p) assignments.set(p.id,{pattern,product:p}); } };
  assignByTitles(bestsellerTitles,'bestseller');
  assignByTitles(steadyTitles,'steady');
  assignByTitles(seasonalTitles,'seasonal');
  assignByTitles(decliningTitles,'declining');
  assignByTitles(deadTitles,'dead');
  assignByTitles(newLaunchTitles,'new_launch');
  for (const p of products) if (!assignments.has(p.id)) assignments.set(p.id,{pattern:'steady',product:p});
  return assignments;
}

class OrderGenerator {
  constructor(productAssignments) {
    this.assignments = productAssignments;
    this.customers = [];
    this.sources = ['instagram','google','direct','email'];
    this.discountCodes = [{code:'WELCOME10',type:'fixed',amount:'10.00'},{code:'FLASH20',type:'percentage',amount:'20.0'},{code:'LOYAL15',type:'fixed',amount:'15.00'}];
  }

  randInt(min,max) { return Math.floor(Math.random()*(max-min+1))+min; }
  pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

  gauss(mean,sigma) {
    const u1=Math.random(), u2=Math.random();
    const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
    return Math.max(0, Math.round(mean+sigma*z));
  }

  dayWeight(date) {
    const dow=date.getDay();
    if (dow===0||dow===6) return 1.3;
    if (dow===2) return 0.7;
    if (dow===4) return 1.1;
    return 1.0;
  }

  buildMonthlyTargets(pattern, year, month) {
    switch(pattern) {
      case 'bestseller': return this.gauss(2.5,0.8);
      case 'steady': return this.gauss(1,0.5);
      case 'seasonal': return month>=10&&month<=12 ? this.gauss(3,1) : this.gauss(0.1,0.3);
      case 'declining': { const mi=(year-2023)*12+(month-3); if(mi<=12) return this.gauss(0.8,0.6); if(mi<=18) return this.gauss(0.2,0.4); return 0; }
      case 'new_launch': { const mi=(year-2024)*12+(month-10); return mi<0?0:this.gauss(0.5+Math.min(mi,5)*0.3,0.7); }
      default: return 0;
    }
  }

  getCustomer() {
    if (this.customers.length>0 && Math.random()<0.30) return this.pick(this.customers);
    // Realistic names for credible demo data
    const firstNames = ["James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","William","Elizabeth","David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen"];
    const lastNames = ["Smith","Johnson","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Garcia","Martinez","Robinson","Clark","Rodriguez"];
    const first = this.pick(firstNames);
    const last = this.pick(lastNames);
    // First initial + last name + 3 random digits (e.g., j.martinez847@gmail.com)
    const initial = first.charAt(0).toLowerCase();
    const digits = Math.floor(100 + Math.random()*899);
    const email = `${initial}.${last.toLowerCase()}${digits}@gmail.com`;
    this.customers.push({ email, first, last });
    return { email, first, last };
  }

  buildOrder(date, product, variantIdx, quantity) {
    const variant = product.variants[variantIdx % product.variants.length];
    const subtotal = variant.price * quantity;
    const hasDisc = Math.random() < 0.20;
    const disc = hasDisc ? this.pick(this.discountCodes) : null;
    let total = subtotal;
    if (disc) total = disc.type==='fixed' ? total-parseFloat(disc.amount) : total*(1-disc.amount/100);
    total = Math.max(0, parseFloat(total.toFixed(2)));
  getCustomer() {
    if (this.customers.length>0 && Math.random()<0.30) return this.pick(this.customers);
    // Realistic names for credible demo data
    const firstNames = ["James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","William","Elizabeth","David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen"];
    const lastNames = ["Smith","Johnson","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Garcia","Martinez","Robinson","Clark","Rodriguez"];
    const first = this.pick(firstNames);
    const last = this.pick(lastNames);
    // First initial + last name + 3 random digits (e.g., j.martinez847@gmail.com)
    const initial = first.charAt(0).toLowerCase();
    const digits = Math.floor(100 + Math.random()*899);
    const email = `${initial}.${last.toLowerCase()}${digits}@gmail.com`;
    this.customers.push({ email, first, last });
    return { email, first, last };
  }

  async generateAll() {
    log('📅 Generating 24 months of order history...');
    const orders = [];
    const months = [];
    for (let y=2023; y<=2025; y++) {
      const sm = (y===2023)?4:1, em=(y===2025)?4:12;
      for (let m=sm; m<=em; m++) months.push({year:y,month:m});
    }

    for (const {year, month} of months) {
      const dim = new Date(year,month,0).getDate();
      log(`  → ${year}-${String(month).padStart(2,'0')}: generating...`);

      const dayInfos = [];
      for (let d=1; d<=dim; d++) {
        const dt = new Date(year, month, d);
        if (dt.getDay()===0) continue;
        dayInfos.push({ day: d, weight: this.dayWeight(dt) });
      }
      if (dayInfos.length===0) continue;
      const totalWeight = dayInfos.reduce((s,di)=>s+di.weight,0);

      for (const [,info] of this.assignments) {
        const monthlyTarget = this.buildMonthlyTargets(info.pattern, year, month);
        if (monthlyTarget <= 0) continue;

        for (let oi=0; oi<monthlyTarget; oi++) {
          let r = Math.random() * totalWeight;
          let picked = dayInfos[0].day;
          for (const di of dayInfos) { r -= di.weight; if (r<=0) { picked=di.day; break; } }
          const date = new Date(year, month, picked, this.randInt(9,21), this.randInt(0,59), this.randInt(0,59));
          const variantIdx = this.randInt(0, info.product.variants.length-1);
          const qty = this.randInt(1,3);
          orders.push(this.buildOrder(date, info.product, variantIdx, qty));
        }
      }
    }
    log(`📦 Generated ${orders.length} synthetic orders`);
    return orders;
  }

  async writeOrders(orders) {
    if (CONFIG.dryRun) {
      log(`⚠️  DRY RUN — would write ${orders.length} orders`);
      return {success: orders.length, fail: 0};
    }
    log(`🚀 Writing ${orders.length} orders...`);
    let success=0, fail=0;
    for (let i=0; i<orders.length; i++) {
      try {
        await shopifyPost('/orders.json', { order: orders[i].order });
        success++;
        if (success % CONFIG.logInterval === 0) log(`  ✅ ${success} written`);
      } catch (e) {
        fail++;
        if (e.message.includes('429')) {
          log('  ⏳ Rate limited, waiting 60s...');
          await new Promise(r=>setTimeout(r,60000));
          try { await shopifyPost('/orders.json', { order: orders[i].order }); success++; fail--; } catch {}
        } else { log(`  ❌ ${e.message}`); }
      }
      if (i+1 < orders.length) await new Promise(r=>setTimeout(r,CONFIG.batchDelayMs));
    }
    log(`✅ Write complete: ${success} ok, ${fail} failed`);
    return {success, fail};
  }
}

async function main() {
  log('🏁 Starting demo data generation');
  const existingOrders = await checkExistingOrders();
  const products = await fetchAllProducts();
  
  const assignments = assignProductPatterns(products);
  const patternAverages = { bestseller:2.5, steady:1.0, seasonal:0.8, declining:0.5, dead:0, new_launch:0.4 };
  let estimatedTotal=0;
  for (const info of assignments.values()) {
    const avgMo = patternAverages[info.pattern]||0;
    const monthsActive = (info.pattern==='new_launch')?12:24;
    estimatedTotal += avgMo * monthsActive;
  }
  estimatedTotal = Math.round(estimatedTotal);

  if (existingOrders>0) {
    if (CONFIG.dryRun) { log('⚠️  DRY RUN — skip confirm'); }
    else if (CONFIG.force) { log('⚠️  --force — skip confirm'); }
    else {
      const ok = await askForConsentTelegram(existingOrders,estimatedTotal);
      if (!ok) { log('❌ Aborted'); process.exit(0); }
    }
  }

  const manifest = { generatedAt:new Date().toISOString(), store:CONFIG.storeUrl, dateRange:{from:CONFIG.startDate.toISOString(),to:CONFIG.endDate.toISOString()}, existingOrdersBefore:existingOrders, estimatedOrderCount:estimatedTotal, productPatterns:Array.from(assignments.entries()).map(([id,info])=>({product_id:id,title:info.product.title,pattern:info.pattern,variants:info.product.variants.length})) };
  fs.writeFileSync(CONFIG.manifestPath, JSON.stringify(manifest,null,2));
  log('📄 Manifest saved');

  if (CONFIG.dryRun) {
    log('🏠 DRY RUN — no orders written');
    log(`📊 Would generate ~${estimatedTotal} orders`);
    process.exit(0);
  }

  const generator = new OrderGenerator(assignments);
  const orders = await generator.generateAll();
  const result = await generator.writeOrders(orders);

  const summary = `<b>✅ Superare Demo Data Complete</b>\n\n📊 Stats:\n• Orders created: ${result.success} (${result.fail} failed)\n• Date range: April 2023 – April 2025\n• Products: ${products.length}\n\n🚀 Ready for Hermes analytics demo`;
  await fetch(`https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage?chat_id=${CONFIG.telegram.chatId}&parse_mode=HTML&text=`+encodeURIComponent(summary));
  log('📨 Summary sent');
  log('🎉 Complete');
}

main().catch(e=>{ log(`💥 FATAL: ${e.message}`); process.exit(1); });
