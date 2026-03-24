#!/usr/bin/env node
/**
 * Jett Watchlist Check
 * Deterministic price checker - ONLY notifies when thresholds breach
 * Zero token cost unless alert fires
 * 
 * Run: node jett-watchlist-check.js
 * Cron: every 15 min via clawdbot
 */

'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');

const LOG_FILE = '/tmp/jett-watchlist.log';
const PRICE_FILE = '/tmp/jett-watchlist-prices.json';
const ALERT_COOLDOWN_FILE = '/tmp/jett-watchlist-alerts.json';
const NODE_BIN = '/home/clawd/.nvm/versions/node/v22.22.0/bin/node';
const CLAWDBOT_BIN = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const TELEGRAM_TARGET = '5867308866';
const WATCHLIST_PORT = 5002;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function logError(msg) {
  log(`ERROR: ${msg}`);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(new Error(`JSON parse failed: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function getCurrentPrice(symbol) {
  // Rate limit: wait 200ms between requests to avoid 429
  await new Promise(r => setTimeout(r, 200));
  
  try {
    // Use query2.finance.yahoo.com for quotes
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      }, (res) => {
        if (res.statusCode === 429) {
          reject(new Error('Rate limited'));
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const result = json.chart?.result?.[0];
            if (!result) {
              reject(new Error('No data'));
              return;
            }
            
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose;
            
            if (!currentPrice || !prevClose) {
              reject(new Error('Missing price'));
              return;
            }
            
            resolve({
              price: currentPrice,
              prevClose: prevClose,
              change: ((currentPrice - prevClose) / prevClose) * 100
            });
          } catch(e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  } catch(e) {
    logError(`Failed to fetch ${symbol}: ${e.message}`);
    return null;
  }
}

function loadPrices() {
  try {
    if (fs.existsSync(PRICE_FILE)) {
      return JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function savePrices(prices) {
  fs.writeFileSync(PRICE_FILE, JSON.stringify(prices, null, 2));
}

function loadAlertCooldowns() {
  try {
    if (fs.existsSync(ALERT_COOLDOWN_FILE)) {
      return JSON.parse(fs.readFileSync(ALERT_COOLDOWN_FILE, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveAlertCooldowns(cooldowns) {
  fs.writeFileSync(ALERT_COOLDOWN_FILE, JSON.stringify(cooldowns, null, 2));
}

function isAlertOnCooldown(symbol, cooldownMinutes, alertCooldowns) {
  const last = alertCooldowns[symbol];
  if (!last) return false;
  const minsSince = (Date.now() - last) / 60000;
  return minsSince < cooldownMinutes;
}

async function sendTelegram(message) {
  const args = [
    'message', 'send',
    '--channel', 'telegram',
    '--target', TELEGRAM_TARGET,
    '--message', message,
    '--json'
  ];
  
  try {
    const { execFileSync } = require('child_process');
    const result = execFileSync(CLAWDBOT_BIN, args, { 
      timeout: 15000, 
      stdio: 'pipe',
      env: { ...process.env, PATH: '/home/clawd/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin' }
    });
    log('Telegram notification sent');
    return true;
  } catch(e) {
    logError(`Telegram failed: ${e.message}`);
    // Fallback to email
    return await sendEmailFallback(message);
  }
}

async function sendEmailFallback(message) {
  const emailScript = '/home/clawd/clawd/lib/send-email.js';
  const subject = 'Watchlist Alert';
  const cleanMessage = message.replace(/[*_]/g, '').replace(/📈|📉/g, '');
  
  try {
    const { execSync } = require('child_process');
    execSync(`${NODE_BIN} ${emailScript} --to "terryhuangjr@gmail.com" --subject "${subject}" --body "${cleanMessage}"`, {
      timeout: 30000,
      env: { ...process.env, PATH: '/home/clawd/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin' }
    });
    log('Email fallback sent successfully');
    return true;
  } catch(e) {
    logError(`Email fallback also failed: ${e.message}`);
    return false;
  }
}

async function main() {
  log('Starting watchlist check');
  
  let tickers;
  try {
    const data = await fetchJson(`http://localhost:${WATCHLIST_PORT}/api/ticker`);
    tickers = data.tickers || [];
  } catch(e) {
    logError(`Failed to fetch tickers: ${e.message}`);
    process.exit(1);
  }
  
  if (!tickers.length) {
    log('No tickers configured');
    return;
  }
  
  const previousPrices = loadPrices();
  const alertCooldowns = loadAlertCooldowns();
  const currentPrices = {};
  let alertsTriggered = 0;
  
  for (const ticker of tickers) {
    const symbol = ticker.ticker;
    const alerts = ticker.alerts || {};
    const cooldownMins = ticker.cooldown_minutes || 90;
    
    const priceData = await getCurrentPrice(symbol);
    
    if (!priceData) {
      log(`No price data for ${symbol}, skipping`);
      continue;
    }
    
    // Always save current price (no cooldown on price checking)
    currentPrices[symbol] = {
      price: priceData.price,
      prevClose: priceData.prevClose,
      timestamp: Date.now()
    };
    
    // Check daily change vs thresholds
    const changePct = priceData.change;
    const breach =
      changePct >= (alerts.daily_gain_pct || 5) ||
      changePct <= -(alerts.daily_drop_pct || 5);

    log(`${symbol}: $${priceData.price} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%) threshold: ±${alerts.daily_gain_pct || 5}%`);

    if (breach) {
      // Check alert cooldown ONLY when breach detected
      if (isAlertOnCooldown(symbol, cooldownMins, alertCooldowns)) {
        const minsSince = Math.round((Date.now() - alertCooldowns[symbol]) / 60000);
        log(`${symbol}: Breach detected but alert on cooldown (${minsSince}/${cooldownMins}m)`);
        continue;
      }

      // Fire alert
      alertsTriggered++;
      
      const direction = changePct > 0 ? '📈' : '📉';
      const pctStr = changePct >= 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`;
      const msg = `${direction} *Watchlist Alert*\n\n` +
        `*${symbol}* (${ticker.name || ticker.sector || ''})\n` +
        `Current: $${priceData.price}\n` +
        `Change: ${pctStr} today\n` +
        `Threshold: ±${alerts.daily_gain_pct || 5}%`;

      const sent = await sendTelegram(msg);
      if (sent) {
        // Only set cooldown if alert was sent successfully
        alertCooldowns[symbol] = Date.now();
        log(`${symbol}: ALERT SENT - ${pctStr}`);
      } else {
        logError(`FAILED to send alert for ${symbol}`);
        // Don't set cooldown if failed - will retry next check
      }
    }
  }
  
  // Save prices and alert cooldowns after loop
  savePrices(currentPrices);
  saveAlertCooldowns(alertCooldowns);
  
  if (alertsTriggered === 0) {
    log(`No alerts triggered for ${tickers.length} tickers (zero token cost)`);
  } else {
    log(`Sent ${alertsTriggered} alert(s)`);
  }
}

main().catch(e => {
  logError(`Fatal: ${e.message}`);
  process.exit(1);
});
