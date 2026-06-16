#!/usr/bin/env node
/**
 * Task Manager Server
 * Web dashboard and REST API
 */

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const TaskDatabase = require('./database');
const financeIntel = require('./services/financeIntel');
const hermes = require('./services/hermes');
const articleReader = require('./services/article-reader');
const qwenChat = require('./services/qwen-chat');
const podcast = require('./services/podcast-processor');

const PORT = 3000;
// ── SIENNA: load .env for Anthropic key ──────────────────────────
const _siennaEnv = (() => {
  const out = {};
  try {
    require('fs').readFileSync('/home/terry/clawd/.env', 'utf8')
      .split('\n').forEach(line => {
        const eq = line.indexOf('=');
        if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      });
  } catch(e) {}
  return out;
})();
const SIENNA_API_KEY = _siennaEnv['ANTHROPIC_API_KEY'] || process.env.ANTHROPIC_API_KEY || '';
const FINNHUB_API_KEY = _siennaEnv['FINNHUB_API_KEY'] || process.env.FINNHUB_API_KEY || '';
process.env.FINNHUB_API_KEY = FINNHUB_API_KEY;

// CardMiner session cookie helpers (shared with auth server on port 3004)
const _cardminerSessionSecret = _siennaEnv['CARDMINER_SESSION_SECRET'] || '';
function decryptCardminerSession(token) {
  if (!_cardminerSessionSecret || !token) return null;
  try {
    const crypto = require('crypto');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encrypted, authTag, iv] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm',
      crypto.createHash('sha256').update(_cardminerSessionSecret).digest(),
      Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────
const db = new TaskDatabase();

class TaskServer {
  constructor() {
    this.server = null;
  }

  async start() {
    await db.init();
    console.log('Database initialized');

    this.server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (error) {
        console.error('Request error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    this.server.listen(PORT, () => {
      console.log(`Task Manager Dashboard: http://localhost:${PORT}`);
      console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
    });
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Serve dashboard files
    if (pathname === '/' || pathname === '/index.html') {
      // Redirect root to Mission Control
      res.writeHead(302, { 'Location': '/mission-control' });
      return res.end();
    } else if (pathname === '/health.html') {
      return this.serveFile(res, 'dashboard/health.html', 'text/html');
    } else if (pathname === '/ebay') {
      return this.serveFile(res, 'dashboard/ebay.html', 'text/html');
    } else if (pathname === '/style.css') {
      return this.serveFile(res, 'dashboard/style.css', 'text/css');
    } else if (pathname === '/app.js') {
      return this.serveFile(res, 'dashboard/app.js', 'application/javascript');
    } else if (pathname === '/mission-control' || pathname === '/mission-control.html') {
      return this.serveFile(res, 'dashboard/mission-control.html', 'text/html');
    } else if (pathname === '/sienna' || pathname === '/sienna.html') {
      return this.serveFile(res, 'dashboard/sienna.html', 'text/html');
    } else if (pathname === '/finance' || pathname === '/finance.html') {
      return this.serveFile(res, 'dashboard/finance.html', 'text/html');
    } else if (pathname === '/jett-ai' || pathname === '/jett-ai.html') {
      return this.serveFile(res, 'dashboard/jett-ai.html', 'text/html');
    } else if (pathname === '/podcast' || pathname === '/podcast.html') {
      return this.serveFile(res, 'dashboard/podcast.html', 'text/html');
    } else if (pathname === '/card-lister' || pathname === '/card-lister.html') {
      return this.serveFile(res, 'dashboard/card-lister.html', 'text/html');
    } else if (pathname.startsWith('/uploads/')) {
      const filename = pathname.replace('/uploads/', '');
      const filePath = path.join(__dirname, 'uploads', filename);
      try {
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
        const contentType = mimeMap[ext] || 'application/octet-stream';
        const content = require('fs').readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'max-age=3600' });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }

    // Finance API routes (must come before generic proxy routes)
    if (pathname.startsWith('/finance/api/')) {
      return this.handleAPI(req, res, pathname, url);
    }

    // Deprecated service placeholders (not yet migrated from old WSL)
    if (pathname === '/levelup' || pathname === '/levelup/' || pathname.startsWith('/levelup') ||
        pathname === '/podcast' || pathname === '/podcast/' || pathname.startsWith('/podcast-') ||
        pathname === '/gemma' || pathname === '/gemma/' || pathname.startsWith('/gemma/') ||
        pathname.startsWith('/proxy/levelup') || pathname.startsWith('/proxy/podcast') || pathname.startsWith('/proxy/gemma') ||
        pathname === '/api/gemma' || pathname.startsWith('/gemma/api/') ||
        pathname.startsWith('/card/') || pathname.startsWith('/cards/') ||
        pathname.startsWith('/images/') || pathname.startsWith('/gallery') ||
        pathname.startsWith('/uploads/') || pathname.startsWith('/thumbnails/') ||
        pathname.startsWith('/customers') || pathname.startsWith('/orders') || pathname.startsWith('/invoices') ||
        pathname.startsWith('/transactions') || pathname.startsWith('/grading-submissions') ||
        pathname.startsWith('/marketplace') || pathname.startsWith('/listings') ||
        pathname.startsWith('/pending-shipments') || pathname.startsWith('/recent-orders') ||
        pathname.startsWith('/top-customers') || pathname.startsWith('/financial-dashboard') ||
        pathname.startsWith('/portfolio') || pathname.startsWith('/alerts') ||
        pathname.startsWith('/customer-insights') || pathname.startsWith('/inventory-insights') ||
        pathname.startsWith('/saved-searches') || pathname.startsWith('/insights') ||
        pathname.startsWith('/image-stats') || pathname.startsWith('/marketplace-accounts') ||
        pathname.startsWith('/analytics') ||
        pathname === '/inventory' || pathname === '/add' || pathname === '/reports' ||
        pathname === '/export' || pathname === '/seed' || pathname === '/clear') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Service not deployed on this machine', code: 'NOT_DEPLOYED' }));
    }

    // ── SHOPIFY WEBHOOK RECEIVER ─────────────────────────────────────────
    if (pathname === '/webhooks/shopify' && req.method === 'POST') {
      // Read raw body for HMAC verification
      const rawBody = await this.readBody(req);

      // Verify HMAC if secret is set
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
      if (secret) {
        const hmacHeader = req.headers['x-shopify-hmac-sha256'];
        const crypto = require('crypto');
        const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
        if (computed !== hmacHeader) {
          console.log('⚠️ Shopify webhook: invalid HMAC — rejected');
          res.writeHead(401); res.end('Unauthorized'); return;
        }
      }

      const topic = req.headers['x-shopify-topic'] || '';
      const eventId = req.headers['x-shopify-webhook-id'];

      if (eventId) {
        const supabaseKey = _siennaEnv['SUPABASE_SERVICE_KEY'] || process.env.SUPABASE_SERVICE_KEY;
        const supabaseUrl = _siennaEnv['VITE_SUPABASE_URL'] || _siennaEnv['SUPABASE_URL'] || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

        if (supabaseKey && supabaseUrl) {
          try {
            const data = JSON.stringify({
              id: eventId,
              topic: topic,
              store: req.headers['x-shopify-store'] || ''
            });

            const parsedUrl = new URL(supabaseUrl + '/rest/v1/shopify_events');
            const options = {
              hostname: parsedUrl.hostname,
              path: parsedUrl.pathname,
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=ignore-duplicates, return=representation',
                'Content-Length': Buffer.byteLength(data)
              }
            };

            const isNew = await new Promise((resolve) => {
              const reqOut = https.request(options, (resOut) => {
                let resData = '';
                resOut.on('data', chunk => resData += chunk);
                resOut.on('end', () => {
                  if (resOut.statusCode >= 200 && resOut.statusCode < 300) {
                    try {
                      const parsed = JSON.parse(resData);
                      if (Array.isArray(parsed) && parsed.length === 0) {
                        resolve(false);
                        return;
                      }
                    } catch (e) {}
                  }
                  resolve(true);
                });
              });
              reqOut.on('error', (e) => resolve(true));
              reqOut.write(data);
              reqOut.end();
            });

            if (!isNew) {
              console.log('⏭️ Webhook dedup: already processed');
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('ok');
              return;
            }
          } catch (err) {
            console.error('Supabase check exception:', err);
          }
        }
      }

      // Respond 200 immediately (Shopify requires fast response)
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');

      console.log(`📦 Shopify webhook: ${topic}`);

      const isInventoryOnly = topic === 'inventory_levels/update';
      const args = isInventoryOnly
        ? ['/home/terry/clawd/automation/hermes-to-supabase.js', '--alerts']
        : ['/home/terry/clawd/automation/hermes-to-supabase.js'];

      // Run sync asynchronously (don't block the response)
      const { execFile } = require('child_process');
      execFile('/home/terry/.nvm/versions/node/v22.22.0/bin/node', args,
        { timeout: 120000, cwd: '/home/terry/clawd/automation' },
        (err) => {
          if (err) console.error('❌ Webhook sync failed:', err.message);
          else console.log('✅ Webhook sync complete');
        }
      );
      return;
    }

    // API routes
    if (pathname.startsWith('/api')) {
      return this.handleAPI(req, res, pathname, url);
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
  }

  async proxyRequest(res, targetUrl, port, method = 'GET', requestBody = null, contentType = null, originalReq = null) {
    return new Promise((resolve) => {
      try {
        const http = require('http');
        const urlObj = new URL(targetUrl, `http://localhost:${port}`);
        console.log('PROXY target:', targetUrl, 'port:', port, 'path:', urlObj.pathname + urlObj.search);
        
        const headers = {
          'User-Agent': 'TaskServer-Proxy/1.0',
          'Host': `localhost:${port}`
        };
        
        // Pass through original headers for multipart uploads
        if (requestBody) {
          headers['Content-Type'] = contentType || 'application/json';
          headers['Content-Length'] = Buffer.isBuffer(requestBody)
            ? requestBody.length
            : Buffer.byteLength(requestBody);
        }
        
        // Copy relevant headers from original request if provided
        if (originalReq && originalReq.headers) {
          if (originalReq.headers['cookie']) headers['Cookie'] = originalReq.headers['cookie'];
          if (originalReq.headers['authorization']) headers['Authorization'] = originalReq.headers['authorization'];
          if (originalReq.headers['accept']) headers['Accept'] = originalReq.headers['accept'];
        }
        
        const options = {
          hostname: 'localhost',
          port: port,
          path: urlObj.pathname + urlObj.search,
          method: method,
          headers: headers
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
          // Rewrite Location headers to remove localhost references
          const headers = { ...proxyRes.headers };
          if (headers.location && headers.location.includes('localhost:5000')) {
            headers.location = headers.location.replace('http://localhost:5000', '');
            console.log('Rewrote Location header:', headers.location);
          }
          if (headers.location && headers.location.includes('localhost:3000')) {
            headers.location = headers.location.replace('http://localhost:3000', '');
          }
          if (headers.location && headers.location.includes('localhost:5001')) {
            headers.location = headers.location.replace('http://localhost:5001', '');
          }
          res.writeHead(proxyRes.statusCode, headers);
          proxyRes.on('data', chunk => res.write(chunk));
          proxyRes.on('end', () => res.end());
        });
        
        proxyReq.on('error', (error) => {
          res.writeHead(502);
          res.end('Proxy error: ' + error.message);
        });
        
        // Write body - works for both string and binary
        if (requestBody) {
          proxyReq.write(requestBody);
        }
        proxyReq.end();
        proxyReq.end();
      } catch (error) {
        res.writeHead(500);
        res.end('Proxy error: ' + error.message);
      }
    });
  }

  async handleAPI(req, res, pathname, url) {
    // ── SIENNA LESSON LAUNCHER ──────────────────────────────────────
    const SIENNA_SESSIONS = path.join(__dirname, 'dashboard', 'sienna-sessions.json');

    if (pathname === '/api/sienna/history' && req.method === 'GET') {
      try {
        const raw = await fs.readFile(SIENNA_SESSIONS, 'utf-8').catch(() => '[]');
        return this.sendJSON(res, JSON.parse(raw).slice(0, 20));
      } catch(e) {
        return this.sendJSON(res, []);
      }
    }

    if (pathname === '/api/sienna/generate' && req.method === 'POST') {
      const body = await this.readBodyJSON(req);
      const { theme, focus } = body;
      if (!theme) return this.sendJSON(res, { error: 'Theme required' }, 400);

      // Load recent themes to avoid content repeats
      let recentThemes = [];
      try {
        const existing = JSON.parse(await fs.readFile(SIENNA_SESSIONS, 'utf-8').catch(() => '[]'));
        recentThemes = existing.slice(0, 5).map(s => s.theme);
      } catch(e) {}

      const focusList = (focus && focus.length) ? focus.join(', ') : 'letters, counting, vocabulary, drawing';

      const prompt = `You are designing a short at-home learning session for Sienna, a 3-year-old girl. She is verbally advanced for her age but just beginning with letters, reading, writing, and numbers. Her parent will do these activities with her at home — no special materials needed beyond what is typically found in a house (crayons, paper, household objects).

Theme: ${theme}
Learning focus: ${focusList}
${recentThemes.length > 0 ? `Recent themes used (avoid repeating the same content): ${recentThemes.join(', ')}` : ''}

Generate exactly 4 activities. Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences, just raw JSON starting with [ and ending with ].

Format:
[
  {
    "type": "story",
    "title": "short catchy title",
    "description": "2-3 sentences written TO the parent — exactly what to do, say, and ask. Warm, specific, playful.",
    "learning": "one short phrase: what skill this builds",
    "tip": "one follow-up question to ask Sienna, or a fun variation to try"
  }
]

Activity types — use exactly one of each, in this order:
1. "story" — A 5-7 sentence read-aloud story themed around ${theme}. Naturally weave in 2-3 simple words tied to the focus areas (e.g. a number, a letter sound, a shape). End with one open question for Sienna.
2. "letters" — A letter recognition or early phonics activity using ${theme} as the hook. No pencil needed — just pointing, saying sounds, finding letters on objects around the room, or clapping syllables.
3. "numbers" — A counting or number recognition activity using imagination or household objects tied to ${theme}. Keep numbers between 1 and 10. Make it feel like a game.
4. "create" — A drawing, tracing (shapes or wavy lines, not letters), or imaginative play activity. Simple enough for a 3-year-old with one crayon and a piece of paper.

Rules: Keep all language simple. Every activity 3-6 minutes. Make it feel like play, not school. Never use the word "worksheet".`;

      try {
        const https = require('https');

        const apiBody = JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }]
        });

        const responseText = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': SIENNA_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Length': Buffer.byteLength(apiBody)
            }
          };

          const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => resolve(data));
          });
          apiReq.on('error', reject);
          apiReq.setTimeout(120000, () => reject(new Error('Anthropic API timeout')));
          apiReq.write(apiBody);
          apiReq.end();
        });

        const parsed = JSON.parse(responseText);
        if (parsed.error) throw new Error(parsed.error.message || 'API error');

        const text = (parsed.content || []).map(b => b.text || '').join('');
        const clean = text.replace(/```json|```/g, '').trim();
        const activities = JSON.parse(clean);

        const session = {
          id: Date.now(),
          theme,
          focus: focus || [],
          activities,
          date: new Date().toISOString()
        };

        // Save session to history (keep last 50)
        try {
          const existing = JSON.parse(await fs.readFile(SIENNA_SESSIONS, 'utf-8').catch(() => '[]'));
          existing.unshift(session);
          await fs.writeFile(SIENNA_SESSIONS, JSON.stringify(existing.slice(0, 50), null, 2));
        } catch(e) {
          console.error('Sienna: could not save session:', e.message);
        }

        return this.sendJSON(res, session);

      } catch(e) {
        console.error('Sienna generate error:', e.message);
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    // ── END SIENNA ──────────────────────────────────────────────────

    // ── CARD LISTER API ──────────────────────────────────────────────
    if (pathname === '/api/card-lister/analyze' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        const images = body.images || (body.image ? [body.image] : []);
        if (!images.length) {
          console.error('Card Lister Analyze: no images in body, keys:', Object.keys(body), 'typeof images:', typeof body.images);
          return this.sendJSON(res, { error: 'No image provided' }, 400);
        }

        const https = require('https');
        const labels = body.labels || images.map((_, i) => `image_${i + 1}`);
        const isMulti = images.length > 1;

        const prompt = `I'm showing you ${isMulti ? images.length + ' photos of the SAME trading card. Figure out which is front, back, or detail shots — combine info from ALL of them' : 'a photo of a trading card'}. The back of the card often has the year, set name, card number, brand, and serial number. The front has the player name, team, and parallel/insert info.

IMPORTANT — Return ONLY a valid JSON object. No markdown, no \`\`\`json. Exact fields:

{
  "player": "Full player name",
  "year": "Year of the card (4 digits)",
  "brand": "Card brand — Topps, Panini, Upper Deck, Bowman, Donruss, Fleer, etc",
  "set_name": "Set name — e.g. Prizm, Topps Chrome, Stadium Club, SPx, Optic",
  "card_number": "Card number from the set (e.g. 57, 150, #1)",
  "sport": "Basketball, Baseball, Football, Hockey, Soccer, etc.",
  "parallel": "If it's a parallel/insert/variation, describe it concisely (e.g. 'Gold parallel', 'Green Refractor', 'Red Wave', 'Holo', 'SP', 'Retail'). Empty string if base card.",
  "is_auto": false,
  "is_serialized": false,
  "serial_number": "If serial numbered, the exact number (e.g. 24/50, 003/199). Empty string if not.",
  "is_graded": false,
  "grader": "PSA/BGS/SGC/CGC (only if graded)",
  "grade": "Numeric grade (only if graded)",
  "cert_number": "Certification number (only if visible on slab)",
  "estimated_condition": "Near mint or better",
  "condition_value": "400010",
  "title_suggestion": "eBay title (80 chars max, strict format)"
}

TITLE FORMAT RULES (strict, non-negotiable):
  Format: {Year} {Brand} {Set} #{Card#} {Player} {Parallel} {Auto} {/Serial}
  Examples:
  - "2023 Topps Chrome #198 Shohei Ohtani"
  - "2023 Topps Chrome #198 Shohei Ohtani Gold Refractor /50"
  - "2021 Panini Prizm #240 Ja Morant Green Prizm Auto /25"
  - "1986 Fleer #57 Michael Jordan PSA 9"
  Rules: MAX 80 CHARS. No quotes. No doubled words. "Auto" for autographed. "/50" format for serial. "PSA 9" after player for graded. Keep it tight — drop words that don't add value.

Condition values: "400010" = Near mint or better, "400011" = Excellent, "400012" = Very good, "400013" = Poor.
For graded cards set is_graded=true and fill grader/grade/cert_number.
DO NOT set parallel for base/common cards. Only set parallel, is_auto, is_serialized when visible on the card.
Return ONLY raw JSON.`;

        // Build Anthropic content array with all images + prompt
        const content = images.map(img => {
          const base64Data = img.split(',')[1] || img;
          const mediaType = img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
          return {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data }
          };
        });
        content.push({ type: 'text', text: prompt });

        const apiBody = JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{ role: 'user', content }]
        });

        const responseText = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': SIENNA_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Length': Buffer.byteLength(apiBody)
            }
          };

          const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => resolve(data));
          });
          apiReq.on('error', reject);
          apiReq.setTimeout(120000, () => reject(new Error('Anthropic API timeout')));
          apiReq.write(apiBody);
          apiReq.end();
        });

        const parsed = JSON.parse(responseText);
        if (parsed.error) throw new Error(parsed.error.message || 'API error');

        const text = (parsed.content || []).map(b => b.text || '').join('');
        const clean = text.replace(/```json|```/g, '').trim();
        const extractedData = JSON.parse(clean);

        return this.sendJSON(res, extractedData);
      } catch (e) {
        console.error('Card Lister Analyze error:', e.message);
        if (e.stack) console.error('Stack:', e.stack.split('\n').slice(0,3).join('\n'));
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    if (pathname === '/api/card-lister/list' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        const { title, player, year, brand, set_name, card_number, sport, parallel, is_auto, is_serialized, serial_number, condition_value, is_graded, grader, grade, cert_number, price, categoryId, images, image, format, duration, start_price, best_offer } = body;

        console.log(`[card-lister list] RAW body: format=${format}, duration=${duration}, start_price=${start_price}, price=${price}, is_graded=${is_graded}`);

        // Bust require cache so server picks up client changes without restart
        delete require.cache[require.resolve('../ebay-scanner/ebay-listing-client-v2')];
        const listingClient = require('../ebay-scanner/ebay-listing-client-v2');
        const fsSync = require('fs');

        const sku = `CARD-${Date.now()}`;
        const condition = is_graded ? 'LIKE_NEW' : 'USED_VERY_GOOD';
        
        // Save uploaded images to disk and serve via /uploads/
        let imageUrls = [];
        const imagesArray = images || (image ? [image] : []);
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fsSync.existsSync(uploadDir)) fsSync.mkdirSync(uploadDir, { recursive: true });
        for (let i = 0; i < imagesArray.length; i++) {
          const imgData = imagesArray[i];
          if (!imgData || typeof imgData !== 'string') continue;
          const ext = imgData.startsWith('data:image/png') ? 'png' : 'jpg';
          const filename = i === 0 ? `${sku}.${ext}` : `${sku}_${i}.${ext}`;
          const base64Data = imgData.split(',')[1] || imgData;
          fsSync.writeFileSync(path.join(uploadDir, filename), Buffer.from(base64Data, 'base64'));
          imageUrls.push(`https://jettmissioncontrol.com/uploads/${filename}`);
        }
        
        // Build condition descriptors
        // Graded: grader (27501), grade (27502), cert# (27503)
        // Ungraded: card condition (40001)
        let conditionDescriptors = [];
        console.log(`[card-lister] is_graded=${is_graded}, grader="${grader}", grade="${grade}", cert="${cert_number}"`);
        if (is_graded) {
          // Map grader name to eBay numeric ID
          const graderMap = { 'psa': '275010', 'bgs': '275013', 'sgc': '275015', 'cgc': '275014', 'bccg': '275011', 'bvg': '275012', 'tag': '275016' };
          const graderId = graderMap[(grader || '').toLowerCase()] || '275010';
          conditionDescriptors.push({ name: '27501', values: [graderId] });
          if (grade && String(grade).trim() && grade !== 'null') {
            conditionDescriptors.push({ name: '27502', values: [String(grade).trim()] });
          }
          if (cert_number && String(cert_number).trim() && cert_number !== 'null' && String(cert_number).trim() !== 'null') {
            conditionDescriptors.push({ name: '27503', additionalInfo: String(cert_number).trim() });
          }
        } else {
          conditionDescriptors.push({ name: '40001', values: [condition_value || '400010'] });
        }

        const effectivePrice = format === 'AUCTION' ? (parseFloat(start_price) || 0) : price;
        const cardData = {
          sku,
          title,
          description: `${title}\nPlayer: ${player}\nYear: ${year}\nBrand: ${brand}\nSet: ${set_name}\nCard #: ${card_number}\nSport: ${sport}${parallel ? '\nParallel: ' + parallel : ''}${is_auto ? '\nAuto: Yes' : ''}${serial_number ? '\nSerial #: ' + serial_number : ''}`,
          price: effectivePrice,
          quantity: 1,
          condition,
          categoryId: categoryId || '261328',
          imageUrls,
          aspects: { 
            "Sport": [sport],
            ...(brand ? { "Brand": [brand] } : {}),
            ...(player ? { "Player": [player] } : {}),
            ...(year ? { "Year": [year] } : {}),
            ...(parallel ? { "Parallel/Variation": [parallel] } : {}),
            ...(is_auto ? { "Autographed": ["Yes"] } : {}),
          },
          conditionDescriptors,
          format: format || 'FIXED_PRICE',
          startPrice: start_price || price,
          listingDuration: duration,
          bestOfferEnabled: best_offer === true
        };

        // Multi-tenant token: check for CardMiner session cookie
        const cookies = {};
        if (req.headers.cookie) {
          req.headers.cookie.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts.length >= 2) cookies[parts[0]] = parts.slice(1).join('=');
          });
        }
        const session = cookies.cardminer_session ? decryptCardminerSession(cookies.cardminer_session) : null;
        if (session && session.ebay_user_id) {
          console.log(`[card-lister] Multi-tenant: listing for eBay user ${session.ebay_user_id}`);
          try {
            // Bust cache for token manager too
            delete require.cache[require.resolve('../cardminer/cardminer-token-manager')];
            const tokenManager = require('../cardminer/cardminer-token-manager');
            const userToken = await tokenManager.getUserToken(session.ebay_user_id);
            cardData.accessToken = userToken;
          } catch (tokenErr) {
            console.error(`[card-lister] Token fetch failed for user ${session.ebay_user_id}: ${tokenErr.message}`);
            // Fall through — cardData.accessToken stays undefined, uses default refresh token
          }
        } else {
          console.log('[card-lister] Single-user mode (no session) — using default eBay account');
        }

        console.log(`[card-lister] Sending to listCard: format=${cardData.format}, startPrice=${cardData.startPrice}, price=${cardData.price}, duration=${cardData.listingDuration}`);

        const result = await listingClient.listCard(cardData);
        
        return this.sendJSON(res, { success: true, url: result.url, listingId: result.listingId });
      } catch (e) {
        console.error('Card Lister List error:', e.message);
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    // ── SCAN HISTORY API ─────────────────────────────────────────────
    if (pathname === '/api/card-lister/save-scan' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        const https = require('https');
        const fsSync = require('fs');
        
        // Try _siennaEnv first, then fallback to .hermes/.env
        let projectRef = _siennaEnv['CARDMINER_SUPABASE_PROJECT'];
        let serviceKey = _siennaEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        if (!projectRef || !serviceKey) {
          const hermesRaw = fsSync.readFileSync(require('os').homedir() + '/.hermes/.env', 'utf8');
          const hEnv = {};
          hermesRaw.split('\n').forEach(line => {
            const eq = line.indexOf('=');
            if (eq > 0) hEnv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          });
          projectRef = projectRef || hEnv['CARDMINER_SUPABASE_PROJECT'] || 'aznypaghnrbrsgsvevat';
          serviceKey = serviceKey || hEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        }
        
        const scanData = {
          title: body.title || '',
          player: body.player || null,
          year: body.year || null,
          brand: body.brand || null,
          set_name: body.set_name || null,
          card_number: body.card_number || null,
          sport: body.sport || null,
          parallel: body.parallel || null,
          is_auto: body.is_auto === true,
          is_serialized: body.is_serialized === true,
          serial_number: body.serial_number || null,
          is_graded: body.is_graded === true,
          grader: body.grader || null,
          grade: body.grade || null,
          cert_number: body.cert_number || null,
          condition_value: body.condition_value || null,
          price: typeof body.price === 'number' ? body.price : null,
          format: body.format || 'FIXED_PRICE',
          duration: body.duration || null,
          best_offer: body.best_offer === true,
          listing_id: body.listing_id || null,
          listing_url: body.listing_url || null,
          status: body.status || 'draft',
          error_message: body.error_message || null
        };

        const postBody = JSON.stringify(scanData);
        
        const result = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: projectRef + '.supabase.co',
            path: '/rest/v1/cardminer_scans',
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
              catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
          });
          req.on('error', reject);
          req.write(postBody);
          req.end();
        });

        return this.sendJSON(res, { success: true, scan: result.body });
      } catch (e) {
        console.error('Save scan error:', e.message);
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    if (pathname === '/api/card-lister/scans' && req.method === 'GET') {
      try {
        const https = require('https');
        const fsSync = require('fs');
        
        let projectRef = _siennaEnv['CARDMINER_SUPABASE_PROJECT'];
        let serviceKey = _siennaEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        if (!projectRef || !serviceKey) {
          const hermesRaw = fsSync.readFileSync(require('os').homedir() + '/.hermes/.env', 'utf8');
          const hEnv = {};
          hermesRaw.split('\n').forEach(line => {
            const eq = line.indexOf('=');
            if (eq > 0) hEnv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          });
          projectRef = projectRef || hEnv['CARDMINER_SUPABASE_PROJECT'] || 'aznypaghnrbrsgsvevat';
          serviceKey = serviceKey || hEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        }
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        
        const result = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: projectRef + '.supabase.co',
            path: `/rest/v1/cardminer_scans?select=id,created_at,title,player,brand,set_name,card_number,price,format,status,listing_url&order=created_at.desc&limit=${limit}&offset=${offset}`,
            method: 'GET',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
              catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
          });
          req.on('error', reject);
          req.end();
        });

        return this.sendJSON(res, { scans: result.body });
      } catch (e) {
        console.error('Get scans error:', e.message);
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    // ── END SCAN HISTORY API ────────────────────────────────────────

    // ── CARD MINER SESSION API ───────────────────────────────────────
    if (pathname === '/api/card-lister/session' && req.method === 'GET') {
      try {
        const cookies = {};
        if (req.headers.cookie) {
          req.headers.cookie.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts.length >= 2) cookies[parts[0]] = parts.slice(1).join('=');
          });
        }
        const session = cookies.cardminer_session ? decryptCardminerSession(cookies.cardminer_session) : null;
        return this.sendJSON(res, { logged_in: !!session, user: session || null });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    // ── END CARD MINER SESSION API ───────────────────────────────────

    // ── CARD MINER ACCOUNTS API ─────────────────────────────────────
    if (pathname === '/api/card-lister/accounts' && req.method === 'GET') {
      try {
        const https = require('https');
        const fsSync = require('fs');

        let projectRef = _siennaEnv['CARDMINER_SUPABASE_PROJECT'];
        let serviceKey = _siennaEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        if (!projectRef || !serviceKey) {
          const hermesRaw = fsSync.readFileSync(require('os').homedir() + '/.hermes/.env', 'utf8');
          const hEnv = {};
          hermesRaw.split('\n').forEach(line => {
            const eq = line.indexOf('=');
            if (eq > 0) hEnv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          });
          projectRef = projectRef || hEnv['CARDMINER_SUPABASE_PROJECT'] || 'aznypaghnrbrsgsvevat';
          serviceKey = serviceKey || hEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        }

        const result = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: projectRef + '.supabase.co',
            path: '/rest/v1/cardminer_users?select=ebay_user_id,ebay_username,subscription_status,last_seen&order=last_seen.desc',
            method: 'GET',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
              catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
          });
          req.on('error', reject);
          req.end();
        });

        return this.sendJSON(res, { accounts: Array.isArray(result.body) ? result.body : [] });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // ── CARD MINER SWITCH ACCOUNT API ───────────────────────────────
    if (pathname === '/api/card-lister/switch-account' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        const { ebay_user_id } = body;
        if (!ebay_user_id) {
          return this.sendJSON(res, { error: 'ebay_user_id is required' }, 400);
        }

        // Fetch tokens for this user from cardminer token manager
        try {
          delete require.cache[require.resolve('../cardminer/cardminer-token-manager')];
          const tokenManager = require('../cardminer/cardminer-token-manager');
          await tokenManager.getUserToken(ebay_user_id); // Verify token exists
        } catch (tokenErr) {
          return this.sendJSON(res, { error: 'No valid token for this account: ' + tokenErr.message }, 400);
        }

        // Get user info from Supabase
        const https = require('https');
        const fsSync = require('fs');
        let projectRef = _siennaEnv['CARDMINER_SUPABASE_PROJECT'];
        let serviceKey = _siennaEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        if (!projectRef || !serviceKey) {
          const hermesRaw = fsSync.readFileSync(require('os').homedir() + '/.hermes/.env', 'utf8');
          const hEnv = {};
          hermesRaw.split('\n').forEach(line => {
            const eq = line.indexOf('=');
            if (eq > 0) hEnv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          });
          projectRef = projectRef || hEnv['CARDMINER_SUPABASE_PROJECT'] || 'aznypaghnrbrsgsvevat';
          serviceKey = serviceKey || hEnv['CARDMINER_SUPABASE_SERVICE_KEY'];
        }

        const userResult = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: projectRef + '.supabase.co',
            path: `/rest/v1/cardminer_users?ebay_user_id=eq.${encodeURIComponent(ebay_user_id)}`,
            method: 'GET',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
              catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
          });
          req.on('error', reject);
          req.end();
        });

        const users = Array.isArray(userResult.body) ? userResult.body : [];
        if (users.length === 0) {
          return this.sendJSON(res, { error: 'User not found in database' }, 404);
        }

        // Build new session cookie
        const crypto = require('crypto');
        const now = new Date().toISOString();
        const sessionData = {
          ebay_user_id: users[0].ebay_user_id,
          ebay_username: users[0].ebay_username,
          logged_in_at: now
        };

        // Encrypt session (same pattern as cardminer server)
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
          'aes-256-gcm',
          crypto.createHash('sha256').update(_cardminerSessionSecret).digest(),
          iv
        );
        let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const sessionCookie = encrypted + '.' + cipher.getAuthTag().toString('hex') + '.' + iv.toString('hex');

        res.setHeader('Set-Cookie', `cardminer_session=${sessionCookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=jettmissioncontrol.com; Max-Age=86400`);
        return this.sendJSON(res, { success: true, user: sessionData });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    // ── END CARD MINER ACCOUNTS API ────────────────────────────────

    // GET /api/tasks - read from Hermes cron jobs.json (source of truth)
    if (pathname === '/api/tasks' && req.method === 'GET') {
      try {
        const fsSync = require('fs');
        const cronFile = path.join(process.env.HOME, '.hermes', 'profiles', 'coder', 'cron', 'jobs.json');
        if (!fsSync.existsSync(cronFile)) {
          return this.sendJSON(res, []);
        }
        const raw = fsSync.readFileSync(cronFile, 'utf8');
        const data = JSON.parse(raw);
        const tasks = (data.jobs || []).map((job, idx) => ({
          id: idx,
          name: job.name,
          command: job.script || job.prompt?.slice(0, 80) || '',
          schedule: job.schedule?.expr || job.schedule?.display || '',
          status: job.last_status || 'pending',
          next_run: job.next_run_at || null,
          last_run: job.last_run_at || null,
          enabled: job.enabled !== false
        }));
        return this.sendJSON(res, tasks);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // GET /api/tasks/:id
    if (pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'GET') {
      const id = parseInt(pathname.split('/')[3]);
      const task = await db.getTask(id);
      return this.sendJSON(res, task || {});
    }

    // POST /api/tasks
    if (pathname === '/api/tasks' && req.method === 'POST') {
      const body = await this.readBodyJSON(req);
      const task = await db.createTask(body);
      return this.sendJSON(res, task, 201);
    }

    // PUT /api/tasks/:id
    if (pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3]);
      const body = await this.readBodyJSON(req);
      await db.updateTask(id, body);
      return this.sendJSON(res, { success: true });
    }

    // DELETE /api/tasks/:id
    if (pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'DELETE') {
      const id = parseInt(pathname.split('/')[3]);
      await db.deleteTask(id);
      return this.sendJSON(res, { success: true });
    }

    // GET /api/tasks/:id/logs
    if (pathname.match(/^\/api\/tasks\/\d+\/logs$/) && req.method === 'GET') {
      const id = parseInt(pathname.split('/')[3]);
      const logs = await db.getLogs(id);
      return this.sendJSON(res, logs);
    }

    // GET /api/cron-jobs - Read from cached file
    if (pathname === '/api/cron-jobs' && req.method === 'GET') {
      try {
        const fs = require('fs');
        if (!fs.existsSync('/tmp/cron-jobs.json')) {
          return this.sendJSON(res, []);
        }
        const output = fs.readFileSync('/tmp/cron-jobs.json', 'utf8');
        const data = JSON.parse(output);
        const jobs = data.jobs || data || [];
        
        // Transform to match dashboard format
        const transformed = jobs.map(job => ({
          id: job.id,
          name: job.name,
          description: job.description || '',
          schedule: `cron ${job.schedule?.expr || '* * * * *'}`,
          status: job.state?.lastRunAtMs ? 'completed' : 'pending',
          priority: 5,
          enabled: job.enabled ? 1 : 0,
          last_run: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
          next_run: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
          run_count: job.state?.runCount || 0,
          command: job.payload?.text || '',
          source: 'openclaw'
        }));
        
        return this.sendJSON(res, transformed);
      } catch (e) {
        console.error('Error fetching cron jobs:', e.message);
        return this.sendJSON(res, []);
      }
    }
    
    // GET /api/stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      const allTasks = await db.getTasks();
      const stats = {
        total: allTasks.length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        running: allTasks.filter(t => t.status === 'running').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        failed: allTasks.filter(t => t.status === 'failed').length,
        scheduled: allTasks.filter(t => t.schedule).length
      };
      return this.sendJSON(res, stats);
    }

    // ─────────────────────────────────────────────────────────────
    // HERMES-AWARE HEALTH API
    // ─────────────────────────────────────────────────────────────

    // GET /api/health — full system health (replaces dead clawdbot checks)
    if (pathname === '/api/health' && req.method === 'GET') {
      try {
        const status = hermes.getHealthStatus();
        
        // Build legacy-format checks for backwards compat with frontend
        const checks = [];
        
        // Per-profile gateway status
        for (const [profile, meta] of Object.entries(status.profiles)) {
          const st = meta.gatewayRunning ? 'healthy' : 'unhealthy';
          checks.push({
            name: `${meta.label} (${profile})`,
            status: st,
            message: st === 'healthy'
              ? `🚀 ${meta.config.model} via ${meta.tg}`
              : `Stopped — ${meta.config.model}`,
          });
        }
        
        // Ollama
        const ollamaOk = status.ollama.running.length > 0;
        checks.push({
          name: 'Ollama',
          status: ollamaOk ? 'healthy' : 'warning',
          message: ollamaOk
            ? status.ollama.running.map(m => `${m.name} (${(m.size_vram/1e9).toFixed(1)}GB)`).join(', ')
            : `${status.ollama.models.length} models available, none loaded`,
        });
        
        // Cron
        checks.push({
          name: 'Cron Jobs',
          status: status.cronStats.enabled > 0 ? 'healthy' : 'warning',
          message: `${status.cronStats.enabled} active / ${status.cronStats.total} total across ${Object.keys(status.profiles).length} profiles`,
        });
        
        // Disk
        const diskMatch = status.system.disk.match(/(\d+)%/);
        const diskPct = diskMatch ? parseInt(diskMatch[1]) : 0;
        checks.push({
          name: 'Disk',
          status: diskPct < 80 ? 'healthy' : (diskPct < 90 ? 'warning' : 'unhealthy'),
          message: status.system.disk,
        });
        
        // System
        checks.push({
          name: 'System',
          status: 'healthy',
          message: `Up ${status.system.uptimeDays.toFixed(1)}d · RAM ${status.system.memory} · CPU ${status.system.cpuLoad}`,
        });
        
        const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
        const warningCount = checks.filter(c => c.status === 'warning').length;
        const healthStatus = unhealthyCount === 0 ? (warningCount === 0 ? 'healthy' : 'warning') : 'unhealthy';
        
        return this.sendJSON(res, {
          status: healthStatus,
          checks,
          raw: status, // full data for frontend to use
          timestamp: status.timestamp,
        });
      } catch (e) {
        console.error('Health check error:', e);
        return this.sendJSON(res, { status: 'error', checks: [], error: e.message });
      }
    }

    // GET /api/gateway-status — aggregated per-profile gateway statuses
    if (pathname === '/api/gateway-status' && req.method === 'GET') {
      try {
        const gateways = hermes.findGateways();
        const profiles = {};
        for (const [profile, running] of Object.entries(gateways)) {
          const meta = hermes.PROFILE_META[profile] || { label: profile, icon: 'unknown', tg: '' };
          profiles[profile] = { running, ...meta };
        }
        return this.sendJSON(res, {
          profiles,
          running: Object.values(gateways).filter(Boolean).length,
          total: Object.keys(gateways).length,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // GET /api/metrics — gateway activity and token usage analytics
    if (pathname === '/api/metrics' && req.method === 'GET') {
      try {
        const ACTIVE_PROFILES = ['coder', 'huangfam', 'finance', 'personal', 'superare', 'vision', 'maggiepm'];
        const LOG_DIR = '/home/terry/.hermes/profiles';
        const today = new Date().toISOString().slice(0, 10);
        const firstOfMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const profileStats = {};
        const providerTotals = {};
        let grandTotalApiCalls = 0;

        for (const profile of ACTIVE_PROFILES) {
          const logPath = path.join(LOG_DIR, profile, 'logs', 'gateway.log');
          let logData = '';
          try {
            logData = require('fs').readFileSync(logPath, 'utf8');
          } catch { continue; }

          const lines = logData.split('\n');

          // Count all-time responses
          const allResponses = lines.filter(l => l.includes('response ready'));
          // Today's responses
          const todayResponses = allResponses.filter(l => l.includes(today));
          // This month
          const monthResponses = allResponses.filter(l => l.includes(firstOfMonth));

          // Parse today's API call counts
          let todayApiCalls = 0;
          let monthApiCalls = 0;
          let allApiCalls = 0;

          for (const l of allResponses) {
            const m = l.match(/api_calls=(\d+)/);
            if (m) {
              const n = parseInt(m[1]);
              allApiCalls += n;
              if (l.includes(today)) todayApiCalls += n;
              if (l.includes(firstOfMonth)) monthApiCalls += n;
            }
          }

          grandTotalApiCalls += allApiCalls;

          // Parse response times for latency stats
          const times = allResponses
            .map(l => { const m = l.match(/time=([\d.]+)s/); return m ? parseFloat(m[1]) : null; })
            .filter(t => t !== null);

          const avgTime = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : 0;
          const sortedTimes = [...times].sort((a, b) => a - b);
          const p95Time = sortedTimes.length ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;

          // Parse session hygiene tokens for rough estimate
          const tokenLines = lines.filter(l => l.includes('Session hygiene') && l.includes('actual'));
          let estimatedTokens = 0;
          let tokenSampleCount = 0;
          for (const tl of tokenLines) {
            const m = tl.match(/~([\d,]+) tokens/);
            if (m) { estimatedTokens += parseInt(m[1].replace(/,/g, '')); tokenSampleCount++; }
          }

          profileStats[profile] = {
            totalResponses: allResponses.length,
            todayResponses: todayResponses.length,
            monthResponses: monthResponses.length,
            todayApiCalls: todayApiCalls,
            monthApiCalls: monthApiCalls,
            totalApiCalls: allApiCalls,
            avgResponseTime: Math.round(avgTime * 10) / 10,
            p95ResponseTime: Math.round(p95Time * 10) / 10,
            avgTokensPerSession: tokenSampleCount ? Math.round(estimatedTokens / tokenSampleCount) : 0,
          };
        }

        // System-level metrics
        const disk = require('child_process').execSync("df -h / | awk 'NR==2{print $2,$3,$4,$5}'", { encoding: 'utf8', timeout: 5000 }).trim();
        const memInfo = require('child_process').execSync("free -h | awk '/Mem:/{print $2,$3,$4}'", { encoding: 'utf8', timeout: 5000 }).trim();
        const cpuLoad = require('child_process').execSync("cat /proc/loadavg | awk '{print $1,$2,$3}'", { encoding: 'utf8', timeout: 5000 }).trim();
        const uptimeDays = parseFloat(require('child_process').execSync("cat /proc/uptime | awk '{printf \"%.1f\", $1/86400}'", { encoding: 'utf8', timeout: 5000 }).trim());

        // Ollama VRAM usage
        let ollamaVram = 'unknown';
        try {
          const psRaw = require('child_process').execSync('curl -sf http://127.0.0.1:11434/api/ps', { encoding: 'utf8', timeout: 5000 });
          const psData = JSON.parse(psRaw);
          const modelsVram = (psData.models || []).map(m => ({ name: m.name, vram: m.size_vram || 0 }));
          const totalVram = modelsVram.reduce((s, m) => s + m.vram, 0);
          ollamaVram = { models: modelsVram, totalVramGb: Math.round(totalVram / 1e9 * 10) / 10 };
        } catch {}

        // Gateway log file sizes
        const logSizes = {};
        for (const profile of ACTIVE_PROFILES) {
          const logPath = path.join(LOG_DIR, profile, 'logs', 'gateway.log');
          try {
            const stat = require('fs').statSync(logPath);
            logSizes[profile] = Math.round(stat.size / 1024); // KB
          } catch { logSizes[profile] = 0; }
        }

        return this.sendJSON(res, {
          profiles: profileStats,
          system: {
            disk,
            memory: memInfo,
            cpu: cpuLoad,
            uptimeDays,
            ollamaVram,
            logSizes,
          },
          totals: {
            apiCalls: grandTotalApiCalls,
            activeProfiles: Object.keys(profileStats).length,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // GET /api/hermes/crons — aggregated cron jobs across all active profiles
    if (pathname === '/api/hermes/crons' && req.method === 'GET') {
      try {
        return this.sendJSON(res, hermes.loadAllCronJobs());
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // GET /api/hermes/ollama — running models
    if (pathname === '/api/hermes/ollama' && req.method === 'GET') {
      try {
        return this.sendJSON(res, { running: hermes.queryOllamaRunning() });
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // POST /api/gateway/restart/:profile — restart a specific profile's gateway
    const gatewayRestartMatch = pathname.match(/^\/api\/gateway\/restart(?:\/(\w+))?$/);
    if (gatewayRestartMatch && req.method === 'POST') {
      const profile = gatewayRestartMatch[1];
      try {
        if (profile) {
          const result = hermes.restartGateway(profile);
          return this.sendJSON(res, result);
        } else {
          const results = hermes.restartAllGateways();
          return this.sendJSON(res, { success: true, results });
        }
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message });
      }
    }

    // POST /api/gateway/restart (no profile = restart all)
    if (pathname === '/api/gateway/restart' && req.method === 'POST') {
      try {
        const results = hermes.restartAllGateways();
        return this.sendJSON(res, { ok: true, results });
      } catch (e) {
        return this.sendJSON(res, { ok: false, error: e.message });
      }
    }

    // ── JETT AI / ARTICLE READER ───────────────────────────────────
    
    // GET /api/jett-ai/model — info about the model being used
    if (pathname === '/api/jett-ai/model' && req.method === 'GET') {
      return this.sendJSON(res, qwenChat.getModelInfo());
    }

    // POST /api/jett-ai/fetch-article — fetch article from URL
    if (pathname === '/api/jett-ai/fetch-article' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        if (!body.url) {
          return this.sendJSON(res, { error: 'URL is required' }, 400);
        }
        const article = await articleReader.fetchArticle(body.url);
        return this.sendJSON(res, article);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // POST /api/jett-ai/chat — send message to Qwen for summarization
    if (pathname === '/api/jett-ai/chat' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        if (!body.message) {
          return this.sendJSON(res, { error: 'Message is required' }, 400);
        }
        const result = await qwenChat.chat(body.message, body.history || [], {
          mode: body.mode || 'summary',
          maxTokens: body.maxTokens || 2048,
        });
        return this.sendJSON(res, result);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // POST /api/jett-ai/summarize — one-shot: fetch URL + summarize
    if (pathname === '/api/jett-ai/summarize' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        if (!body.url) {
          return this.sendJSON(res, { error: 'URL is required' }, 400);
        }

        // Fetch the article
        const article = await articleReader.fetchArticle(body.url);
        if (article.error) {
          return this.sendJSON(res, { error: article.error }, 502);
        }
        if (!article.content || article.content.length < 100) {
          return this.sendJSON(res, { error: 'Could not extract meaningful content from that URL' });
        }

        // Build the prompt with full article content
        const prompt = `Please read and digest this article. Provide:\n\n## Summary (detailed, capture 80%+)\n## Key Points (bullet list)\n\n---\n\nTitle: ${article.title || 'Untitled'}\n${article.author ? 'Author: ' + article.author + '\n' : ''}${article.date ? 'Published: ' + article.date + '\n' : ''}\nURL: ${body.url}\n\nArticle content:\n\n${article.content}`;

        const result = await qwenChat.chat(prompt, [], { maxTokens: body.maxTokens || 3072 });
        
        if (result.error) {
          return this.sendJSON(res, { error: result.error }, 502);
        }

        return this.sendJSON(res, {
          summary: result.response,
          article: {
            title: article.title,
            author: article.author || null,
            date: article.date || null,
            url: body.url,
          },
          model: result.model,
          usage: result.usage,
        });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // ── PODCAST SUMMARIZER ─────────────────────────────────────────

    // GET /api/podcast/queue — list queue
    if (pathname === '/api/podcast/queue' && req.method === 'GET') {
      try {
        const items = await podcast.getQueue();
        return this.sendJSON(res, { queue: items, status: podcast.getStatus() });
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // POST /api/podcast/queue/add — add URL to queue
    if (pathname === '/api/podcast/queue/add' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        if (!body.url) return this.sendJSON(res, { error: 'URL is required' }, 400);
        const pos = podcast.addToQueue({ url: body.url, title: body.title || 'Unknown' });
        return this.sendJSON(res, { success: true, position: pos });
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // DELETE /api/podcast/queue/:pos — remove from queue
    const queueRemoveMatch = pathname.match(/^\/api\/podcast\/queue\/(\d+)$/);
    if (queueRemoveMatch && req.method === 'DELETE') {
      try {
        const pos = parseInt(queueRemoveMatch[1]);
        const removed = podcast.removeFromQueue(pos);
        if (removed) {
          return this.sendJSON(res, { success: true });
        }
        return this.sendJSON(res, { error: 'Invalid position' }, 400);
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // POST /api/podcast/queue/move — reorder queue items
    if (pathname === '/api/podcast/queue/move' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        if (!body.position || !body.direction) {
          return this.sendJSON(res, { error: 'position and direction are required' }, 400);
        }
        
        const queue = podcast.loadQueue();
        const index = body.position - 1;
        const targetIndex = body.direction === 'up' ? index - 1 : index + 1;
        
        if (index >= 0 && index < queue.length && targetIndex >= 0 && targetIndex < queue.length) {
          const temp = queue[index];
          queue[index] = queue[targetIndex];
          queue[targetIndex] = temp;
          podcast.saveQueue(queue);
          return this.sendJSON(res, { success: true });
        }
        return this.sendJSON(res, { error: 'Invalid position or direction' }, 400);
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // POST /api/podcast/process — run the pipeline on the next URL
    if (pathname === '/api/podcast/process' && req.method === 'POST') {
      // Respond immediately, process in background
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'processing' }));

      const queueItem = podcast.popQueue();
      if (!queueItem) {
        console.log('Podcast queue is empty, nothing to process');
        return;
      }

      console.log(`🎧 Starting podcast processing for: ${queueItem.title}`);
      try {
        const result = await podcast.processPodcast(queueItem.url);
        console.log(`✅ Podcast processed: ${result.title}`);
      } catch (e) {
        console.error(`❌ Podcast processing failed: ${e.message}`);
      }
      return; // already responded 202
    }

    // GET /api/podcast/status
    if (pathname === '/api/podcast/status' && req.method === 'GET') {
      try {
        return this.sendJSON(res, podcast.getStatus());
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    // eBay Scans API
    const EBAY_CONFIG_FILE = path.join(__dirname, 'ebay-scans-config.json');
    
    if (pathname === '/api/ebay-scans' && req.method === 'GET') {
      try {
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        return this.sendJSON(res, JSON.parse(content));
      } catch (e) {
        return this.sendJSON(res, { error: 'Config not found' }, 404);
      }
    }
    
    if (pathname === '/api/ebay-scans/global-rules' && req.method === 'GET') {
      try {
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        return this.sendJSON(res, config.global_filters);
      } catch (e) {
        return this.sendJSON(res, { error: 'Config not found' }, 404);
      }
    }
    
    if (pathname === '/api/ebay-scans/global-rules' && req.method === 'PUT') {
      try {
        const data = await this.readBodyJSON(req);
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        const incoming = data.global_filters || data;

        // Map ALL possible dashboard field names to config fields
        const cardOverride = 
          incoming.card_condition_override !== undefined ? incoming.card_condition_override :
          incoming.card_condition !== undefined ? incoming.card_condition :
          config.global_filters?.card_condition_override;

        const listingOverride =
          incoming.listing_type_override !== undefined ? incoming.listing_type_override :
          incoming.listingMode !== undefined ? incoming.listingMode :
          incoming.listing_type !== undefined ? incoming.listing_type :
          config.global_filters?.listing_type;

        config.global_filters = {
          ...config.global_filters,
          ...incoming,
          card_condition_override: cardOverride,
          listing_type_override: listingOverride
        };

        config.last_updated = new Date().toISOString();
        await fs.writeFile(EBAY_CONFIG_FILE, 
          JSON.stringify(config, null, 2));
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    
    const ebayScanMatch = pathname.match(/^\/api\/ebay-scans\/(\w+)$/);
    if (ebayScanMatch && req.method === 'GET') {
      const day = ebayScanMatch[1];
      try {
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        if (config.scans && config.scans[day]) {
          return this.sendJSON(res, config.scans[day]);
        }
        return this.sendJSON(res, { error: 'Day not found' }, 404);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    
    if (ebayScanMatch && req.method === 'PUT') {
      const day = ebayScanMatch[1];
      try {
        const data = await this.readBodyJSON(req);
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        if (!config.scans) config.scans = {};
        config.scans[day] = { ...config.scans[day], ...data, last_updated: new Date().toISOString() };
        config.last_updated = new Date().toISOString();
        await fs.writeFile(EBAY_CONFIG_FILE, JSON.stringify(config, null, 2));
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    
    // Run scan: POST /api/ebay-scans/{day}/run
    const ebayScanRunMatch = pathname.match(/^\/api\/ebay-scans\/(\w+)\/run$/);
    if (ebayScanRunMatch && req.method === 'POST') {
      const day = ebayScanRunMatch[1].toLowerCase();
      const validDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      if (!validDays.includes(day)) {
        return this.sendJSON(res, { success: false, error: 'Invalid day' });
      }
      try {
        const { execSync } = require('child_process');
        const output = execSync(`node /home/terry/clawd/ebay-scanner/run-from-config.js ${day}`, {
          encoding: 'utf8',
          timeout: 300000,
          cwd: '/home/terry/clawd/ebay-scanner'
        });
        return this.sendJSON(res, { success: true, output: output.slice(-1000) });
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message, output: e.stdout?.slice(-500) });
      }
    }

    if (pathname === '/api/ebay-deploy' && req.method === 'POST') {
      return this.sendJSON(res, { message: 'Deploy triggered', success: true });
    }

    // ── EBAY CONFIG proxy ──────────────────────────────────────────

    if (pathname === '/api/logs' && req.method === 'GET') {
      const urlParams = new URL(req.url, 'http://localhost');
      const lines = urlParams.searchParams.get('lines') || 50;
      try {
        const { execSync } = require('child_process');
        const log = execSync(`journalctl --user -u jett-task-manager.service --no-pager -n ${lines} 2>/dev/null || tail -${lines} /tmp/dashboard.log 2>/dev/null`, { encoding: 'utf8' });
        return this.sendJSON(res, { logs: log });
      } catch (e) {
        return this.sendJSON(res, { logs: 'No logs found', error: e.message });
      }
    }

    // ── LEVEL UP CARDS proxy ───────────────────────────────────────
    if (pathname === '/api/levelup/inventory' && req.method === 'GET') {
      return this.proxyRequest(res, '/api/inventory', 5000);
    }
    if (pathname === '/api/levelup/stats' && req.method === 'GET') {
      return this.proxyRequest(res, '/api/stats', 5000);
    }

    // ── WATCHLIST proxy ────────────────────────────────────────────
    if (pathname === '/api/watchlist/tickers' && req.method === 'GET') {
      return this.proxyRequest(res, '/api/ticker', 5002);
    }
    if (pathname === '/api/watchlist/ticker' && req.method === 'POST') {
      const body = await this.readBody(req);
      return this.proxyRequest(res, '/api/ticker', 5002, 'POST', body, 'application/json');
    }
    if (pathname.startsWith('/api/watchlist/ticker/') && req.method === 'DELETE') {
      const symbol = pathname.split('/').pop();
      return this.proxyRequest(res, `/api/ticker/${symbol}`, 5002, 'DELETE');
    }
    if (pathname.startsWith('/api/watchlist/ticker/') && req.method === 'PUT') {
      const symbol = pathname.split('/').pop();
      const body = await this.readBody(req);
      return this.proxyRequest(res, `/api/ticker/${symbol}`, 5002, 'PUT', body, 'application/json');
    }

    // ── EBAY proxy ─────────────────────────────────────────────────
    if (pathname === '/api/ebay/results' && req.method === 'GET') {
      try {
        const configPath = path.join(__dirname, 'ebay-scans-config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = dayNames[new Date().getDay()];
        const results = config.scans[today]?.results || [];
        return this.sendJSON(res, { results });
      } catch (e) {
        return this.sendJSON(res, { error: e.message, results: [] });
      }
    }
    if (pathname === '/api/ebay/scan' && req.method === 'POST') {
      try {
        const { execSync } = require('child_process');
        execSync('cd /home/terry/clawd/ebay-scanner && node run-from-config.js', { encoding: 'utf8', timeout: 120000 });
        return this.sendJSON(res, { ok: true });
      } catch (e) {
        return this.sendJSON(res, { ok: false, error: e.message });
      }
    }

    // Scan specific day: POST /api/ebay/scan/:day
    if (pathname.startsWith('/api/ebay/scan/') && req.method === 'POST') {
      const day = pathname.split('/').pop().toLowerCase();
      const validDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      if (!validDays.includes(day)) {
        return this.sendJSON(res, { ok: false, error: 'Invalid day' });
      }
      try {
        const { execSync } = require('child_process');
        const output = execSync(`node /home/terry/clawd/ebay-scanner/run-from-config.js ${day}`, { 
          encoding: 'utf8', 
          timeout: 300000 
        });
        return this.sendJSON(res, { ok: true, output: output.slice(-1000) });
      } catch (e) {
        return this.sendJSON(res, { ok: false, error: e.message, output: e.stdout?.slice(-500) });
      }
    }

    // ── EBAY CONFIG proxy ──────────────────────────────────────────
    const EBAY_CONFIG_PATH = '/home/terry/clawd/task-manager/ebay-scans-config.json';
    
    if (pathname === '/api/ebay/config' && req.method === 'GET') {
      try {
        const config = JSON.parse(await fs.readFile(EBAY_CONFIG_PATH, 'utf-8'));
        return this.sendJSON(res, config);
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }
    if (pathname === '/api/ebay/config' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const current = JSON.parse(await fs.readFile(EBAY_CONFIG_PATH, 'utf-8'));
        const updated = { ...current, ...JSON.parse(body), last_updated: new Date().toISOString() };
        await fs.writeFile(EBAY_CONFIG_PATH, JSON.stringify(updated, null, 2));
        return this.sendJSON(res, { ok: true });
      } catch (e) {
        return this.sendJSON(res, { ok: false, error: e.message });
      }
    }

    // ── CRONS proxy ────────────────────────────────────────────────
    if (pathname === '/api/crons' && req.method === 'GET') {
      try {
        const fsSync = require('fs');
        const cronFile = path.join(process.env.HOME, '.hermes', 'profiles', 'coder', 'cron', 'jobs.json');
        if (!fsSync.existsSync(cronFile)) {
          return this.sendJSON(res, { jobs: [], source: 'hermes', error: 'No cron file' });
        }
        const raw = fsSync.readFileSync(cronFile, 'utf8');
        const data = JSON.parse(raw);
        const jobs = (data.jobs || []).map(job => ({
          id: job.id,
          name: job.name,
          schedule: {
            expr: job.schedule?.expr || job.schedule?.display || '',
            display: job.schedule?.display || job.schedule?.expr || ''
          },
          enabled: job.enabled !== false,
          script: job.script || null,
          noAgent: job.no_agent || false,
          state: {
            nextRunAtMs: job.next_run_at ? new Date(job.next_run_at).getTime() : null,
            lastRunAtMs: job.last_run_at ? new Date(job.last_run_at).getTime() : null,
            lastStatus: job.last_status || 'pending'
          },
          workdir: job.workdir || null,
          deliver: job.deliver || 'origin'
        }));
        return this.sendJSON(res, { jobs, source: 'hermes' });
      } catch(e) {
        return this.sendJSON(res, { jobs: [], source: 'hermes-error', error: e.message });
      }
    }

    // ── VPS HEALTH ─────────────────────────────────────────────────
    if (pathname === '/api/vps/health' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const SSH = 'ssh -i /home/terry/.ssh/vps -o StrictHostKeyChecking=no -o ConnectTimeout=5';
        const HOST = '167.172.135.39';

        // Run all checks, collect results (non-fatal for API view)
        const results = [];

        // SSH
        try {
          const uptime = execSync(`${SSH} root@${HOST} "uptime -p"`, { timeout: 10000 }).toString().trim();
          results.push({ name: 'SSH / System', status: 'ok', detail: `Up ${uptime}` });
        } catch (e) {
          results.push({ name: 'SSH / System', status: 'fail', detail: e.message });
        }

        // n8n
        try {
          const code = execSync(`${SSH} root@${HOST} "curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/"`, { timeout: 10000 }).toString().trim();
          results.push({ name: 'n8n (port 5678)', status: code === '200' ? 'ok' : 'fail', detail: `HTTP ${code}` });
        } catch (e) {
          results.push({ name: 'n8n (port 5678)', status: 'fail', detail: e.message });
        }

        // MaggiePM Gateway
        try {
          const ps = execSync(`${SSH} root@${HOST} "ps aux | grep 'hermes.*maggiepm.*gateway' | grep -v grep | head -1"`, { timeout: 10000 }).toString().trim();
          if (ps) {
            const parts = ps.split(/\s+/);
            results.push({ name: 'MaggiePM Gateway', status: 'ok', detail: `PID ${parts[1]} | CPU ${parts[2]}% | MEM ${parts[3]}%` });
          } else {
            results.push({ name: 'MaggiePM Gateway', status: 'fail', detail: 'Process not found' });
          }
        } catch (e) {
          results.push({ name: 'MaggiePM Gateway', status: 'fail', detail: e.message });
        }

        // Caddy
        try {
          const caddy = execSync(`${SSH} root@${HOST} "systemctl is-active caddy"`, { timeout: 10000 }).toString().trim();
          results.push({ name: 'Caddy (reverse proxy)', status: caddy === 'active' ? 'ok' : 'fail', detail: caddy });
        } catch (e) {
          results.push({ name: 'Caddy (reverse proxy)', status: 'fail', detail: e.message });
        }

        // Disk
        try {
          const disk = execSync(`${SSH} root@${HOST} "df -h / | tail -1"`, { timeout: 10000 }).toString().trim();
          const parts = disk.split(/\s+/);
          const pct = parseInt(parts[4]?.replace('%', '')) || 0;
          results.push({ name: 'Disk usage', status: pct > 90 ? 'warn' : 'ok', detail: `${pct}% (${parts[2]} / ${parts[1]})` });
        } catch (e) {
          results.push({ name: 'Disk usage', status: 'warn', detail: e.message });
        }

        return this.sendJSON(res, {
          vps: HOST,
          timestamp: new Date().toISOString(),
          healthy: results.filter(r => r.status === 'fail').length === 0,
          results,
        });
      } catch (e) {
        return this.sendJSON(res, { error: e.message, healthy: false, results: [] });
      }
    }

    // ── OPENCLAW MEMORY (bonus) ───────────────────────────────────
    if (pathname === '/api/jett/memory' && req.method === 'GET') {
      try {
        const memDir = '/home/terry/clawd/memory';
        const files = (await fs.readdir(memDir))
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse()
          .slice(0, 7);
        const memories = await Promise.all(files.map(async f => ({
          date: f.replace('.md', ''),
          content: (await fs.readFile(path.join(memDir, f), 'utf-8')).slice(0, 500)
        })));
        return this.sendJSON(res, { memories });
      } catch (e) {
        return this.sendJSON(res, { error: e.message, memories: [] });
      }
    }

    // ── OPENCLAW TOKEN COST (bonus) ────────────────────────────────
    if (pathname === '/api/jett/costs' && req.method === 'GET') {
      try {
        const { execFileSync } = require('child_process');
        const fsSync = require('fs');
        const dbPath = path.join(process.env.HOME, '.openclaw/sessions.db');
        if (!fsSync.existsSync(dbPath)) {
          return this.sendJSON(res, { empty: true });
        }
        const result = execFileSync('sqlite3', [
          dbPath,
          'SELECT name, ROUND(SUM(cost),6) as total_cost, COUNT(*) as runs FROM sessions GROUP BY name ORDER BY total_cost DESC LIMIT 10;'
        ]);
        const raw = Buffer.isBuffer(result) ? result.toString('utf8') : String(result);
        return this.sendJSON(res, { raw: raw.trim() });
      } catch(e) {
        return this.sendJSON(res, { empty: true, message: e.message });
      }
    }

    // ── STOREIQ SYNC ────────────────────────────────────────────────
    if (pathname === '/api/storeiq-sync' && req.method === 'POST') {
      try {
        const { execFileSync } = require('child_process');
        const output = execFileSync(
          '/home/terry/.nvm/versions/node/v22.22.0/bin/node',
          ['/home/terry/clawd/automation/hermes-to-supabase.js'],
          { encoding: 'utf8', timeout: 120000 }
        );
        return this.sendJSON(res, { success: true, message: 'Sync completed', output: output.slice(-500) });
      } catch (e) {
        const stderr = e.stderr || '';
        const stdout = e.stdout || '';
        return this.sendJSON(res, { success: false, error: e.message, details: (stdout + stderr).slice(-500) });
      }
    }

    // ── FINANCE INTELLIGENCE API ──────────────────────────────────────
    if (pathname === '/finance/api/watchlist' && req.method === 'GET') {
      try {
        return this.sendJSON(res, financeIntel.loadWatchlist());
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname === '/finance/api/watchlist' && req.method === 'POST') {
      try {
        const body = await this.readBodyJSON(req);
        const wl = financeIntel.loadWatchlist();
        if (wl.find(t => t.symbol === body.symbol)) {
          return this.sendJSON(res, { error: body.symbol + ' already in watchlist' }, 400);
        }
        wl.push({
          symbol: body.symbol.toUpperCase(),
          type: body.type || 'stock',
          name: body.name || body.symbol.toUpperCase(),
          notes: body.notes || '',
          alertThresholds: body.alertThresholds || { priceChangePercent: 5, volumeMultiplier: 2 },
          addedAt: new Date().toISOString()
        });
        financeIntel.saveWatchlist(wl);
        return this.sendJSON(res, { success: true, symbol: body.symbol.toUpperCase() });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname.startsWith('/finance/api/watchlist/') && req.method === 'DELETE') {
      try {
        const symbol = decodeURIComponent(pathname.split('/')[4]);
        const wl = financeIntel.loadWatchlist();
        financeIntel.saveWatchlist(wl.filter(t => t.symbol !== symbol));
        return this.sendJSON(res, { success: true, symbol });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname.startsWith('/finance/api/watchlist/') && req.method === 'PUT') {
      try {
        const symbol = decodeURIComponent(pathname.split('/')[4]);
        const body = await this.readBodyJSON(req);
        const wl = financeIntel.loadWatchlist();
        const idx = wl.findIndex(t => t.symbol === symbol);
        if (idx === -1) return this.sendJSON(res, { error: 'Not found' }, 404);
        Object.assign(wl[idx], body);
        financeIntel.saveWatchlist(wl);
        return this.sendJSON(res, { success: true, symbol });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname === '/finance/api/brief' && req.method === 'GET') {
      try {
        return this.sendJSON(res, financeIntel.loadBrief());
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname === '/finance/api/brief/generate' && req.method === 'POST') {
      try {
        const result = await financeIntel.generateFullBrief(SIENNA_API_KEY);
        return this.sendJSON(res, result);
      } catch (e) {
        console.error('Brief generation error:', e.message);
        return this.sendJSON(res, { error: e.message || 'Generation failed' }, 500);
      }
    }
    if (pathname.startsWith('/finance/api/quote/') && req.method === 'GET') {
      try {
        const symbol = decodeURIComponent(pathname.split('/')[4]);
        const quote = await financeIntel.fetchQuote(symbol);
        return this.sendJSON(res, quote);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname.startsWith('/finance/api/news/') && req.method === 'GET') {
      try {
        const symbol = decodeURIComponent(pathname.split('/')[4]);
        const news = await financeIntel.fetchNews(symbol);
        return this.sendJSON(res, news);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }
    if (pathname === '/finance/api/alerts-config' && req.method === 'GET') {
      try {
        const fsSync = require('fs');
        const ac = JSON.parse(fsSync.readFileSync(path.join(__dirname, 'data', 'finance', 'alerts-config.json'), 'utf8'));
        return this.sendJSON(res, ac);
      } catch (e) {
        return this.sendJSON(res, {});
      }
    }
    if (pathname === '/finance/api/alerts-config' && req.method === 'PUT') {
      try {
        const body = await this.readBodyJSON(req);
        const fsSync = require('fs');
        fsSync.writeFileSync(path.join(__dirname, 'data', 'finance', 'alerts-config.json'), JSON.stringify(body, null, 2));
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }

  async serveFile(res, filePath, contentType) {
    try {
      const fullPath = path.join(__dirname, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(404);
      res.end('File not found');
    }
  }

  sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  async readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', reject);
    });
  }

  async readBodyJSON(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    }
  }
}

// Start server
const server = new TaskServer();

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await server.stop();
  await db.close();
  process.exit(0);
});

if (require.main === module) {
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // ── Finance Intel Crons ────────────────────────────────────────────
  // Morning brief: weekdays at 7:00 AM ET
  // After-market summary: weekdays at 4:30 PM ET
  const CRON_INTERVAL = 60000; // Check every minute

  function scheduleFinanceBrief() {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', {timeZone:'America/New_York'}));
    const day = et.getDay();
    const minutes = et.getHours() * 60 + et.getMinutes();

    // Skip weekends
    if (day === 0 || day === 6) return;

    // Morning brief at 7:00 AM
    if (minutes === 420) {
      console.log('[Finance Cron] Running morning brief...');
      financeIntel.generateFullBrief(SIENNA_API_KEY).then(result => {
        console.log('[Finance Cron] Morning brief generated');
        sendFinanceBriefTelegram(result, 'morning');
      }).catch(e => console.error('[Finance Cron] Morning brief error:', e.message));
    }

    // After-market at 4:30 PM
    if (minutes === 990) {
      console.log('[Finance Cron] Running after-market brief...');
      financeIntel.generateFullBrief(SIENNA_API_KEY).then(result => {
        console.log('[Finance Cron] After-market brief generated');
        sendFinanceBriefTelegram(result, 'aftermarket');
      }).catch(e => console.error('[Finance Cron] After-market error:', e.message));
    }

    // Signal scan every 2 hours during market hours (9:30 AM - 4:00 PM)
    if (minutes >= 570 && minutes <= 960 && minutes % 120 === 0) {
      checkFinanceAlerts().catch(e => console.error('[Finance Cron] Alert scan error:', e.message));
    }
  }

  async function sendFinanceBriefTelegram(result, type) {
    try {
      const https = require('https');
      const token = process.env.TELEGRAM_BOT_TOKEN || '';
      const chatId = process.env.TELEGRAM_CHAT_ID || '';
      if (!token || !chatId) {
        console.log('[Finance Cron] No Telegram credentials');
        return;
      }

      // Use the finance bot token + chat from env
      const financeToken = '8802358712:AAHF8OBwmP9Y7eb04RHetK3fD6RTan8ZLuw';
      const financeChat = '5867308866';

      // Build brief text for Telegram
      const header = type === 'morning' ? '🌅 Morning Brief' : '🌆 After-Market Summary';
      const ts = new Date().toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'});
      const text = encodeURIComponent(`${header} — ${ts}\n\n${result.brief || 'No brief generated.'}`);
      const url = `https://api.telegram.org/bot${financeToken}/sendMessage?chat_id=${financeChat}&text=${text}&parse_mode=Markdown`;

      await new Promise((resolve, reject) => {
        https.get(url, {timeout: 15000}, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        }).on('error', reject);
      });
    } catch(e) {
      console.error('[Finance Cron] Telegram send error:', e.message);
    }
  }

  async function checkFinanceAlerts() {
    try {
      const result = await financeIntel.generateFullBrief(SIENNA_API_KEY);
      if (result.alerts && result.alerts.length > 0) {
        for (const alert of result.alerts) {
          const text = encodeURIComponent(
            `🔍 Signal Alert: ${alert.symbol}\n\n` +
            `${alert.conditions.join('\n')}\n\n` +
            `Price: $${alert.price} (${alert.changePercent >= 0 ? '+' : ''}${alert.changePercent}%)`
          );
          const token = '8802358712:AAHF8OBwmP9Y7eb04RHetK3fD6RTan8ZLuw';
          const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=5867308866&text=${text}&parse_mode=Markdown`;
          const https = require('https');
          await new Promise((resolve, reject) => {
            https.get(url, {timeout: 10000}, (res) => {
              let d = '';
              res.on('data', c => d += c);
              res.on('end', () => resolve(d));
            }).on('error', reject);
          });
        }
      }
    } catch(e) {
      console.error('[Finance Cron] Alert check error:', e.message);
    }
  }

  // Start cron checker
  setInterval(scheduleFinanceBrief, CRON_INTERVAL);
  console.log('[Finance Cron] Scheduler started (checking every 60s)');
}

module.exports = TaskServer;
