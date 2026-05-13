/**
 * financeIntel.js — Core Finance Intelligence Service
 * Data fetching, news aggregation, sentiment analysis, and AI brief synthesis.
 * All external API calls wrapped in try/catch with graceful fallbacks.
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'finance');
function getFinnhubKey() { return process.env.FINNHUB_API_KEY || ''; }

// ── Stubs for Phase 3 ──────────────────────────────────────────────
// TODO Phase 3: Options flow monitoring
// async function fetchOptionsFlow(symbol) { return { error: 'Not implemented' }; }
// TODO Phase 3: Insider transaction monitoring
// async function fetchInsiderTransactions(symbol) { return { error: 'Not implemented' }; }
// TODO Phase 3: Technical indicators
// async function calculateTechnicals(symbol) { return { error: 'Not implemented' }; }

// ── HTTP Helpers ───────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
      timeout: 30000
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function fetchJSON(url) {
  return httpsGet(url).then(JSON.parse);
}

// ── Watchlist I/O ──────────────────────────────────────────────────

function loadWatchlist() {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'watchlist.json'), 'utf8');
    return JSON.parse(raw).tickers || [];
  } catch (e) {
    return [];
  }
}

function saveWatchlist(tickers) {
  fs.writeFileSync(path.join(DATA_DIR, 'watchlist.json'), JSON.stringify({ tickers }, null, 2));
}

function loadBrief() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'latest-brief.json'), 'utf8'));
  } catch (e) {
    return { generatedAt: null, type: null, brief: 'No brief', tickerSnapshots: [] };
  }
}

function saveBrief(brief) {
  fs.writeFileSync(path.join(DATA_DIR, 'latest-brief.json'), JSON.stringify(brief, null, 2));
}

// ── Quote Fetchers ─────────────────────────────────────────────────

async function fetchQuote(symbol, type = 'stock') {
  if (type === 'crypto' || symbol === 'BTC-USD' || symbol === 'ETH-USD') {
    return fetchCryptoQuote(symbol);
  }
  return fetchStockQuote(symbol);
}

async function fetchStockQuote(symbol) {
  try {
    const data = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`);
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data');
    const meta = result.meta || {};
    const qd = result.indicators?.quote?.[0] || {};
    const closes = qd.close || [];
    const volumes = qd.volume || [];
    const current = meta.regularMarketPrice;
    const prevClose = meta.previousClose;
    const change = current - prevClose;
    const changePct = prevClose ? (change / prevClose * 100) : 0;
    const avgVol = closes.length > 1 ? closes.slice(0, -1).filter(Boolean).reduce((a, b) => a + b, 0) / closes.slice(0, -1).filter(Boolean).length : 0;
    const lastVol = volumes[volumes.length - 1] || 0;
    return {
      symbol: symbol.toUpperCase(), type: 'stock', price: +current?.toFixed(2),
      change: +change?.toFixed(2), changePercent: +changePct?.toFixed(2),
      volume: lastVol, avgVolume: Math.round(avgVol),
      volumeMultiplier: avgVol > 0 ? +(lastVol / avgVol).toFixed(1) : 1,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      high52w: meta.fiftyTwoWeekHigh, low52w: meta.fiftyTwoWeekLow,
      marketCap: meta.marketCap || null,
      marketStatus: 'open', source: 'yahoo'
    };
  } catch (e) {
    // Fallback to Finnhub
    try {
      const data = await fetchJSON(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${getFinnhubKey()}`);
      if (data.error) throw new Error(data.error);
      return {
        symbol: symbol.toUpperCase(), type: 'stock', price: data.c,
        change: data.d, changePercent: data.dp,
        volume: data.v || 0, avgVolume: 0, volumeMultiplier: 1,
        high: data.h, low: data.l, high52w: null, low52w: null,
        marketCap: null, marketStatus: 'open', source: 'finnhub'
      };
    } catch (e2) {
      return { symbol: symbol.toUpperCase(), type: 'stock', error: e2.message || 'Failed to fetch' };
    }
  }
}

async function fetchCryptoQuote(symbol) {
  try {
    const data = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`);
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data');
    const meta = result.meta || {};
    const qd = result.indicators?.quote?.[0] || {};
    const current = meta.regularMarketPrice;
    let prevClose = meta.previousClose;
    // Crypto needs close-from-history fallback
    if (!prevClose) {
      const closes = qd.close || [];
      for (let i = closes.length - 2; i >= 0; i--) {
        if (closes[i]) { prevClose = closes[i]; break; }
      }
    }
    const change = current - prevClose;
    const changePct = prevClose ? (change / prevClose * 100) : 0;
    const volume = meta.regularMarketVolume || qd.volume?.[qd.volume.length - 1] || 0;
    return {
      symbol: symbol.toUpperCase(), type: 'crypto', price: +current?.toFixed(2),
      change: +change?.toFixed(2), changePercent: +changePct?.toFixed(2),
      volume, avgVolume: 0, volumeMultiplier: 1,
      high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
      high52w: meta.fiftyTwoWeekHigh, low52w: meta.fiftyTwoWeekLow,
      marketCap: null, marketStatus: 'open', source: 'yahoo',
      // BTC enrichment
      ...(symbol.toUpperCase().startsWith('BTC') ? {
        btcStackValue: +(current * 13).toFixed(0),
        satsPerDollar: current > 0 ? +(100000000 / current).toFixed(2) : 0
      } : {})
    };
  } catch (e) {
    return { symbol: symbol.toUpperCase(), type: 'crypto', error: e.message || 'Failed to fetch' };
  }
}

// ── News Fetchers ──────────────────────────────────────────────────

async function fetchNews(symbol, limit = 5) {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const from = weekAgo.toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);
    const data = await fetchJSON(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${getFinnhubKey()}`);
    if (!Array.isArray(data)) return [];
    // Deduplicate
    const seen = new Set();
    return data.filter(a => {
      const h = (a.headline || '').toLowerCase();
      if (!h || seen.has(h)) return false;
      seen.add(h);
      return true;
    }).slice(0, limit).map(a => ({
      headline: a.headline || '',
      summary: (a.summary || '').slice(0, 200),
      source: a.source || '',
      url: a.url || '',
      datetime: a.datetime,
      timeAgo: timeAgo(a.datetime),
      urgent: ['earnings','lawsuit','sec','downgrade','upgrade','acquisition','partnership','guidance','offering']
        .some(kw => (a.headline || '').toLowerCase().includes(kw))
    }));
  } catch (e) {
    return [];
  }
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts * 1000;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ── Reddit Sentiment ────────────────────────────────────────────────

async function fetchRedditSentiment(symbol) {
  try {
    const html = await httpsGet(`https://www.reddit.com/search.rss?q=${symbol}&sort=hot&limit=5`);
    const posts = [];
    const titleRegex = /<title>(.*?)<\/title>/g;
    const linkRegex = /<link>(.*?)<\/link>/g;
    const links = [];
    let m;
    while ((m = linkRegex.exec(html)) !== null) links.push(m[1]);
    let idx = 0;
    while ((m = titleRegex.exec(html)) !== null) {
      const title = m[1];
      if (title && !title.startsWith('Reddit') && !title.startsWith('Search') && idx < 5) {
        posts.push({ title, url: links[idx * 2 + 1] || `https://reddit.com/search?q=${symbol}` });
        idx++;
      }
    }
    const mentionCount = posts.length;
    return { mentionCount, posts, sentiment: mentionCount > 2 ? 'active' : 'quiet' };
  } catch (e) {
    return { mentionCount: 0, posts: [], sentiment: 'unavailable', error: e.message };
  }
}

// ── X/Twitter Sentiment via Nitter ──────────────────────────────────

async function fetchXSentiment(symbol) {
  try {
    const html = await httpsGet(`https://nitter.net/search?f=tweets&q=${encodeURIComponent('$' + symbol)}&since=1d`);
    // Parse tweet count and recent tweets
    const tweetRegex = /<div class="tweet-content[^"]*"[^>]*>(.*?)<\/div>/gs;
    const tweets = [];
    let m;
    while ((m = tweetRegex.exec(html)) !== null && tweets.length < 5) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text) tweets.push(text.slice(0, 200));
    }
    const trending = tweets.length > 3;
    return { recentTweets: tweets.slice(0, 5), trending };
  } catch (e) {
    return { recentTweets: [], trending: false, error: 'unavailable' };
  }
}

// ── AI Brief Synthesis ──────────────────────────────────────────────

async function synthesizeBrief(allData, anthropicKey) {
  if (!anthropicKey) {
    return '⚠️ No Anthropic API key configured. Brief synthesis unavailable. Set ANTHROPIC_API_KEY in .env.';
  }

  // Build per-ticker summary for the prompt
  const tickerLines = allData.map(t => {
    let line = `${t.symbol} (${t.name || t.symbol}): $${t.price || 'N/A'} (${t.changePercent != null ? t.changePercent.toFixed(1) : 'N/A'}%)`;
    if (t.news?.length) line += ` | News: ${t.news[0].headline.slice(0, 100)}`;
    if (t.reddit?.mentionCount) line += ` | Reddit: ${t.reddit.mentionCount} posts`;
    return line;
  }).join('\n');

  const prompt = `You are a finance intelligence assistant for Terry, a value investor and Bitcoin maximalist based on Long Island, NY. He holds long-term positions in BTC (13 BTC stack), IREN, MSTR, CIFR, NOW, RKLB and others. He is NOT a day trader — he looks for swing opportunities (15-50% moves) and long-term value. Be direct, data-driven, and skip generic disclaimers.

Flag: 1) anything that changes the long-term thesis on any holding, 2) swing trade setups where multiple signals converge, 3) macro news affecting BTC or AI infrastructure. Format output as clean text for Telegram — use emoji sparingly for signal strength.

Current data for Terry's watchlist:
${tickerLines}

Provide a brief synthesis (2-4 paragraphs). Start with a one-line macro/overall assessment. Then flag anything notable per ticker. End with a single action item or key takeaway for Terry.`;

  try {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });
    const response = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      body,
      {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      }
    );
    const parsed = JSON.parse(response);
    if (parsed.error) throw new Error(parsed.error.message || 'API error');
    return (parsed.content || []).map(b => b.text || '').join('');
  } catch (e) {
    return `⚠️ Brief generation failed: ${e.message}`;
  }
}

// ── Alert Checking ──────────────────────────────────────────────────

function checkAlerts(tickerData, watchlist) {
  const alerts = [];
  for (const ticker of tickerData) {
    if (ticker.error) continue;
    const config = watchlist.find(t => t.symbol === ticker.symbol)?.alertThresholds;
    if (!config) continue;

    const conditions = [];
    // Price move
    if (Math.abs(ticker.changePercent || 0) >= (config.priceChangePercent || 99)) {
      conditions.push(`Price ${ticker.changePercent > 0 ? 'up' : 'down'} ${Math.abs(ticker.changePercent)}%`);
    }
    // Volume spike
    if ((ticker.volumeMultiplier || 0) >= (config.volumeMultiplier || 99)) {
      conditions.push(`Volume ${ticker.volumeMultiplier}x average`);
    }
    // Fresh urgent news
    const urgentNews = (ticker.news || []).filter(n => n.urgent);
    if (urgentNews.length) {
      conditions.push(`Urgent news: ${urgentNews[0].headline.slice(0, 80)}`);
    }

    if (conditions.length >= 2) {
      alerts.push({
        symbol: ticker.symbol,
        type: 'convergence',
        conditions,
        price: ticker.price,
        changePercent: ticker.changePercent,
        timestamp: new Date().toISOString()
      });
    }
  }
  return alerts;
}

// ── Generate Full Brief (orchestrator) ──────────────────────────────

async function generateFullBrief(anthropicKey) {
  const watchlist = loadWatchlist();
  const tickerData = [];

  for (const t of watchlist) {
    const quote = await fetchQuote(t.symbol, t.type);
    const news = await fetchNews(t.symbol, 5);
    const reddit = await fetchRedditSentiment(t.symbol);
    const xdata = await fetchXSentiment(t.symbol);
    tickerData.push({ ...t, ...quote, news, reddit, xdata });
  }

  const brief = await synthesizeBrief(tickerData, anthropicKey);
  const alerts = checkAlerts(tickerData, watchlist);

  const result = {
    generatedAt: new Date().toISOString(),
    type: 'manual',
    brief,
    tickerSnapshots: tickerData.map(t => ({
      symbol: t.symbol, price: t.price, changePercent: t.changePercent,
      volumeMultiplier: t.volumeMultiplier, newsCount: t.news?.length || 0,
      redditMentions: t.reddit?.mentionCount || 0, redditSentiment: t.reddit?.sentiment,
      tweets: t.xdata?.recentTweets?.length || 0
    })),
    alerts
  };

  saveBrief(result);
  return result;
}

// ── Exports ─────────────────────────────────────────────────────────

module.exports = {
  loadWatchlist,
  saveWatchlist,
  loadBrief,
  saveBrief,
  fetchQuote,
  fetchNews,
  fetchRedditSentiment,
  fetchXSentiment,
  synthesizeBrief,
  checkAlerts,
  generateFullBrief
};
