#!/usr/bin/env node
/**
 * Jett Watchlist Monitor
 * Polls price/volume data + news for all tickers in config
 * Sends tiered Telegram alerts on threshold crossings
 *
 * Run: node jett-watchlist-monitor.js
 * Cron: every 15 min via clawdbot cron
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

// ── Config paths ─────────────────────────────────────────────────────────────
const OPENCLAW_CONFIG = path.join(process.env.HOME, '.openclaw/openclaw.json');
const SCRIPT_DIR      = path.dirname(require.main.filename);
const WATCHLIST_CONFIG = path.join(SCRIPT_DIR, 'jett-watchlist-config.yaml');
const STATE_FILE      = path.join(SCRIPT_DIR, 'jett-watchlist-state.json');
const CLAWDBOT_BIN    = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
const TELEGRAM_TARGET = '5867308866';
const LOG_PREFIX      = '[jett-watchlist]';

// ── Load API keys from openclaw config ───────────────────────────────────────
let NEWSAPI_KEY = '';
let XAI_API_KEY = '';

try {
  const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
  const xaiProvider = config?.models?.providers?.xai;
  if (xaiProvider?.apiKey) XAI_API_KEY = xaiProvider.apiKey;
} catch (e) {
  log(`WARN: Could not load openclaw config: ${e.message}`);
}

// NewsAPI key — add to openclaw config or hardcode here
// To add: edit ~/.openclaw/openclaw.json and add "newsApiKey" under a "custom" section
// OR just set it directly:
try {
  const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
  NEWSAPI_KEY = '93fa1f99a49249a9926c41983255c67e';
} catch (e) {
  NEWSAPI_KEY = '93fa1f99a49249a9926c41983255c67e';
}

// ── Simple YAML parser (no deps needed for this structure) ────────────────────
function parseYaml(content) {
  // We'll use a lightweight approach since the yaml structure is predictable
  // For production you could: npm install js-yaml
  try {
    const yaml = require('js-yaml');
    return yaml.load(content);
  } catch (e) {
    log('js-yaml not found, attempting install...');
    try {
      execFileSync('npm', ['install', '-g', 'js-yaml'], { stdio: 'pipe' });
      const yaml = require('js-yaml');
      return yaml.load(content);
    } catch (e2) {
      log(`ERROR: Could not parse yaml config: ${e2.message}`);
      process.exit(1);
    }
  }
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} ${msg}`);
}

// ── State management (cooldowns + seen news) ──────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return { cooldowns: {}, seenNews: {}, lastPrices: {} };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log(`WARN: Could not save state: ${e.message}`);
  }
}

function isOnCooldown(state, key, cooldownMinutes) {
  const last = state.cooldowns[key];
  if (!last) return false;
  const elapsed = (Date.now() - last) / 60000;
  return elapsed < cooldownMinutes;
}

function setCooldown(state, key) {
  state.cooldowns[key] = Date.now();
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const options = new URL(url); const req = https.get({ hostname: options.hostname, path: options.pathname + options.search, timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ── Yahoo Finance price fetcher ───────────────────────────────────────────────
async function fetchPrice(ticker) {
  try {
    // Yahoo Finance v8 API — no key needed, 15-min delayed for stocks
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`;
    const data = await httpGet(url);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta in response');

    const price         = meta.regularMarketPrice || 0;
    const prevClose     = meta.chartPreviousClose || meta.previousClose || price;
    const dayChangePct  = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume        = meta.regularMarketVolume || 0;

    // Get 30-day avg volume from summary
    await new Promise(r => setTimeout(r, 500));
    const summaryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
    const summaryData = await httpGet(summaryUrl);
    const volumes = summaryData?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume || [];
    const validVolumes = volumes.filter(v => v > 0);
    const avgVolume = validVolumes.length
      ? validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length
      : 0;

    return {
      ticker,
      price,
      prevClose,
      dayChangePct,
      volume,
      avgVolume,
      volumeMultiple: avgVolume > 0 ? volume / avgVolume : 0,
      currency: meta.currency || 'USD',
      marketState: meta.marketState || 'REGULAR',
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    log(`WARN: Could not fetch price for ${ticker}: ${e.message}`);
    return null;
  }
}

// ── News fetcher ──────────────────────────────────────────────────────────────
async function fetchNews(query, hoursBack = 2) {
  try {
    const from = new Date(Date.now() - hoursBack * 3600000).toISOString();
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${from}&sortBy=publishedAt&pageSize=3&language=en&apiKey=${NEWSAPI_KEY}`;
    const data = await httpGet(url);
    return data?.articles || [];
  } catch (e) {
    log(`WARN: News fetch failed for "${query}": ${e.message}`);
    return [];
  }
}

// ── Telegram sender ───────────────────────────────────────────────────────────
function sendTelegram(message) {
  try {
    execFileSync(CLAWDBOT_BIN, [
      'message', 'send',
      '--channel', 'telegram',
      '--target', TELEGRAM_TARGET,
      '--message', message,
      '--json'
    ], { timeout: 15000, stdio: 'pipe' });
    log(`Telegram sent: ${message.substring(0, 60)}...`);
    return true;
  } catch (e) {
    log(`ERROR: Telegram send failed: ${e.message}`);
    return false;
  }
}

// ── Alert formatter ───────────────────────────────────────────────────────────
function formatAlert(tier, priceData, triggers, newsItems) {
  const { ticker, name } = triggers;
  const { price, dayChangePct, volumeMultiple, currency, marketState } = priceData;

  const tierEmoji = {
    urgent: '🚨',
    alert:  '🔴',
    watch:  '🟡',
    info:   '🟢'
  }[tier] || '📊';

  const dirEmoji = dayChangePct >= 0 ? '📈' : '📉';
  const sign = dayChangePct >= 0 ? '+' : '';
  const marketTag = marketState !== 'REGULAR' ? ` [${marketState}]` : '';
  const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });

  let lines = [
    `${tierEmoji} ${tier.toUpperCase()} — ${ticker} (${name || ticker})`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `${dirEmoji} ${currency} ${price.toFixed(2)} (${sign}${dayChangePct.toFixed(2)}% today)${marketTag}`
  ];

  if (triggers.volumeSpike) {
    lines.push(`📊 Volume: ${volumeMultiple.toFixed(1)}x 30-day avg`);
  }

  if (triggers.reason) {
    lines.push(`⚡ ${triggers.reason}`);
  }

  if (newsItems && newsItems.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    newsItems.slice(0, 2).forEach(article => {
      const source = article.source?.name || 'News';
      const age = getNewsAge(article.publishedAt);
      lines.push(`📰 ${source} (${age}): ${truncate(article.title, 80)}`);
    });
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⏱ ${timeStr} ET`);

  return lines.join('\n');
}

function getNewsAge(publishedAt) {
  if (!publishedAt) return 'unknown';
  const mins = Math.floor((Date.now() - new Date(publishedAt)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '…' : str;
}

// ── Alert tier logic ──────────────────────────────────────────────────────────
function determineTier(triggers, hasNews) {
  const { priceDrop, priceGain, dailyDrop, dailyGain, volumeSpike } = triggers;

  // Urgent: extreme move + news together
  if ((dailyDrop || dailyGain) && hasNews && volumeSpike) return 'urgent';

  // Alert: clear threshold crossed
  if (dailyDrop || dailyGain) return 'alert';
  if (volumeSpike && hasNews) return 'alert';

  // Watch: moderate signal
  if (volumeSpike || priceDrop || priceGain) return 'watch';

  return 'info';
}

// ── Main check for one ticker ─────────────────────────────────────────────────
async function checkTicker(tickerConfig, state, settings) {
  const { ticker, name, alerts, cooldown_minutes } = tickerConfig;
  const cooldown = cooldown_minutes || settings.default_cooldown_minutes || 120;

  const priceData = await fetchPrice(ticker);
  if (!priceData) return;

  const { price, dayChangePct, volumeMultiple } = priceData;

  // Calculate intra-poll change (vs last known price)
  const lastPrice = state.lastPrices[ticker];
  const pollChangePct = lastPrice ? ((price - lastPrice) / lastPrice) * 100 : 0;
  state.lastPrices[ticker] = price;

  // Evaluate triggers
  const triggers = {
    ticker,
    name,
    priceDrop:   lastPrice && pollChangePct < -(alerts.price_drop_pct || 999),
    priceGain:   lastPrice && pollChangePct >  (alerts.price_gain_pct || 999),
    dailyDrop:   dayChangePct < -(alerts.daily_drop_pct || 999),
    dailyGain:   dayChangePct >  (alerts.daily_gain_pct || 999),
    volumeSpike: volumeMultiple >= (alerts.volume_spike_x || 999),
    reason: null
  };

  const anyTrigger = triggers.priceDrop || triggers.priceGain ||
                     triggers.dailyDrop || triggers.dailyGain ||
                     triggers.volumeSpike;

  if (!anyTrigger) return;

  // Build reason string
  const reasons = [];
  if (triggers.priceDrop)   reasons.push(`Down ${Math.abs(pollChangePct).toFixed(1)}% in last 15min`);
  if (triggers.priceGain)   reasons.push(`Up ${pollChangePct.toFixed(1)}% in last 15min`);
  if (triggers.dailyDrop)   reasons.push(`Down ${Math.abs(dayChangePct).toFixed(1)}% today`);
  if (triggers.dailyGain)   reasons.push(`Up ${dayChangePct.toFixed(1)}% today`);
  if (triggers.volumeSpike) reasons.push(`Volume ${volumeMultiple.toFixed(1)}x avg`);
  triggers.reason = reasons.join(' · ');

  // Check cooldown
  const cooldownKey = `${ticker}_alert`;
  if (isOnCooldown(state, cooldownKey, cooldown)) {
    log(`${ticker}: triggers fired but on cooldown, skipping`);
    return;
  }

  // Fetch relevant news
  const news = await fetchNews(name || ticker, settings.news_lookback_hours || 2);
  const tier = determineTier(triggers, news.length > 0);

  // Only send watch+ to Telegram (skip info tier to reduce noise)
  if (tier === 'info') {
    log(`${ticker}: info-level trigger, not sending (${triggers.reason})`);
    return;
  }

  const message = formatAlert(tier, priceData, triggers, news);
  sendTelegram(message);
  setCooldown(state, cooldownKey);

  log(`${ticker}: ${tier.toUpperCase()} alert sent — ${triggers.reason}`);
}

// ── Global news scan ──────────────────────────────────────────────────────────
async function scanGlobalNews(keywords, state, lookbackHours) {
  for (const keyword of keywords.slice(0, 5)) { // limit to avoid rate limits
    const articles = await fetchNews(keyword, lookbackHours);
    for (const article of articles) {
      const newsKey = `news_${article.url}`;
      if (state.seenNews[newsKey]) continue;
      state.seenNews[newsKey] = Date.now();

      // Only surface high-confidence macro news
      const title = (article.title || '').toLowerCase();
      const isMacro = ['fed', 'federal reserve', 'rate', 'cpi', 'inflation', 'sec', 'bitcoin etf']
        .some(k => title.includes(k));

      if (!isMacro) continue;

      const source = article.source?.name || 'News';
      const age = getNewsAge(article.publishedAt);
      const message = [
        `📰 MACRO NEWS ALERT`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `${source} (${age})`,
        `${truncate(article.title, 120)}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `⏱ ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} ET`
      ].join('\n');

      sendTelegram(message);
      log(`Macro news alert sent: ${article.title?.substring(0, 60)}`);
      break; // one macro alert per cycle max
    }
  }

  // Prune old seen news (keep 24 hours)
  const cutoff = Date.now() - 86400000;
  for (const key of Object.keys(state.seenNews)) {
    if (state.seenNews[key] < cutoff) delete state.seenNews[key];
  }
}

// ── Startup banner ────────────────────────────────────────────────────────────
function logBanner(tickers) {
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`Jett Watchlist Monitor — ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
  log(`Watching ${tickers.length} tickers: ${tickers.join(', ')}`);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Load config
  const rawConfig = fs.readFileSync(WATCHLIST_CONFIG, 'utf8');
  const config = parseYaml(rawConfig);
  const { settings, watchlist, global_keywords } = config;

  logBanner(watchlist.map(t => t.ticker));

  // Load state
  const state = loadState();

  // Check all tickers in parallel (with small delay to avoid rate limits)
  const results = [];
  for (const tickerConfig of watchlist) {
    await new Promise(r => setTimeout(r, 1500)); // 300ms between requests
    results.push(checkTicker(tickerConfig, state, settings));
  }
  await Promise.all(results);

  // Global news scan
  log('Running global news scan...');
  await scanGlobalNews(global_keywords || [], state, settings.news_lookback_hours || 2);

  // Save state
  saveState(state);

  log('Cycle complete.');
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  log(e.stack);
  process.exit(1);
});
