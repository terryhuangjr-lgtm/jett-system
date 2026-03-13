#!/usr/bin/env node
/**
 * Task Manager Server
 * Web dashboard and REST API
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const TaskDatabase = require('./database');

const PORT = 3000;
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
    }

    // Proxy routes for iframes
    if (pathname.startsWith('/proxy/levelup')) {
      return this.proxyRequest(res, pathname.replace('/proxy/levelup', '/'), 5000);
    }
    if (pathname.startsWith('/proxy/podcast')) {
      return this.proxyRequest(res, pathname.replace('/proxy/podcast', '/'), 5001);
    }
    if (pathname.startsWith('/proxy/watchlist')) {
      return this.proxyRequest(res, pathname.replace('/proxy/watchlist', '/'), 5002);
    }

    // Direct routes for external services (for remote access)
    if (pathname === '/levelup' || pathname === '/levelup/') {
      return this.proxyRequest(res, '/', 5000);
    }
    if (pathname === '/podcast' || pathname === '/podcast/') {
      return this.proxyRequest(res, '/', 5001);
    }
    if (pathname === '/watchlist' || pathname === '/watchlist/') {
      return this.proxyRequest(res, '/', 5002);
    }

    // Watchlist API proxy
    if (pathname.startsWith('/watchlist-api/')) {
      const apiPath = '/api' + pathname.replace('/watchlist-api', '');
      const method = req.method;
      let body = null;
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        body = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
        });
      }
      return this.proxyRequest(res, apiPath, 5002, method, body);
    }

    // Also handle /api/ticker when accessed through /watchlist
    if (pathname === '/api/ticker' || pathname.startsWith('/api/ticker/')) {
      const tickerPath = pathname.replace('/api', '');
      const method = req.method;
      let body = null;
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        body = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
        });
      }
      // Check if it's a watchlist request (has proper headers or from same origin)
      return this.proxyRequest(res, tickerPath, 5002, method, body);
    }

    // Watchlist proxy - handle all routes
    if (pathname.startsWith('/watchlist') || pathname.startsWith('/static') && pathname.includes('watchlist')) {
      const watchlistPath = pathname.replace(/^\/watchlist/, '') || '/';
      return this.proxyRequest(res, watchlistPath, 5002, req.method);
    }

    // Podcast API proxy
    if (pathname.startsWith('/podcast-api/')) {
      const apiPath = '/api' + pathname.replace('/podcast-api', '');
      // Get request body for POST/PUT/DELETE
      const method = req.method;
      let body = null;
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        body = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
        });
      }
      return this.proxyRequest(res, apiPath, 5001, method, body);
    }

    // Podcast proxy - handle all routes including static files
    if (pathname.startsWith('/podcast') || pathname.startsWith('/style.css') || pathname.startsWith('/static/')) {
      const podcastPath = pathname.replace(/^\/podcast/, '') || '/';
      return this.proxyRequest(res, podcastPath, 5001, req.method);
    }

    // Level Up Cards proxy - catch-all for all routes on port 5000
    // Routes without /levelup prefix that need to go to Level Up
    console.log('PATHNAME:', pathname);
    const levelUpRoutes = [
      '/customers', '/orders', '/invoices', '/transactions',
      '/grading-submissions', '/marketplace', '/listings',
      '/pending-shipments', '/recent-orders', '/top-customers',
      '/financial-dashboard', '/portfolio', '/alerts',
      '/customer-insights', '/inventory-insights', '/saved-searches',
      '/insights', '/image-stats', '/marketplace-accounts', '/analytics'
    ];
    const isLevelUpRoute = levelUpRoutes.some(r => pathname.startsWith(r)) ||
      pathname.startsWith('/card/') ||
      pathname.startsWith('/cards/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/gallery') ||
      pathname === '/inventory' ||
      pathname === '/add' ||
      pathname === '/reports' ||
      pathname === '/export' ||
      pathname === '/seed' ||
      pathname === '/clear';
    
    if (pathname === '/levelup' || pathname === '/levelup/') {
      return this.proxyRequest(res, '/', 5000);
    }
    if (isLevelUpRoute || pathname.startsWith('/uploads/') || pathname.startsWith('/thumbnails/')) {
      console.log('PROXYING to Level Up:', pathname);
      // Read body for POST/PUT requests
      const contentType = req.headers['content-type'] || null;
      const body = (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') ? await this.readBody(req) : null;
      return this.proxyRequest(res, pathname, 5000, req.method, body, contentType);
    }

    // Routes with /levelup prefix
    if (pathname.startsWith('/levelup')) {
      const levelupPath = pathname.replace(/^\/levelup/, '') || '/';
      const contentType = req.headers['content-type'] || null;
      const body = (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') ? await this.readBody(req) : null;
      return this.proxyRequest(res, levelupPath, 5000, req.method, body, contentType);
    }

    // API routes
    if (pathname.startsWith('/api')) {
      return this.handleAPI(req, res, pathname, url);
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
  }

  async proxyRequest(res, targetUrl, port, method = 'GET', requestBody = null, contentType = null) {
    return new Promise((resolve) => {
      try {
        const http = require('http');
        const urlObj = new URL(targetUrl, `http://localhost:${port}`);
        console.log('PROXY target:', targetUrl, 'port:', port, 'path:', urlObj.pathname + urlObj.search);
        
        const headers = {
          'User-Agent': 'TaskServer-Proxy/1.0'
        };
        
        // Only set Content-Type if we have a body or it's explicitly provided
        if (requestBody) {
          headers['Content-Type'] = contentType || 'application/json';
        }
        
        const options = {
          hostname: 'localhost',
          port: port,
          path: urlObj.pathname + urlObj.search,
          method: method,
          headers: headers
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.on('data', chunk => res.write(chunk));
          proxyRes.on('end', () => res.end());
        });
        
        proxyReq.on('error', (error) => {
          res.writeHead(502);
          res.end('Proxy error: ' + error.message);
        });
        
        if (requestBody) {
          proxyReq.write(requestBody);
        }
        proxyReq.end();
      } catch (error) {
        res.writeHead(500);
        res.end('Proxy error: ' + error.message);
      }
    });
  }

  async handleAPI(req, res, pathname, url) {
    // GET /api/tasks - read from clawdbot cron list (source of truth)
    if (pathname === '/api/tasks' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const output = execSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot cron list --json', { encoding: 'utf8', timeout: 10000 });
        const jobs = JSON.parse(output);
        const tasks = jobs.jobs.map((job, idx) => ({
          id: idx,
          name: job.name,
          command: job.payload?.text || '',
          schedule: job.schedule?.expr || '',
          status: job.state?.lastStatus || 'pending',
          next_run: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
          last_run: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
          enabled: job.enabled
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

    // GET /api/cron-jobs - Fetch from Clawdbot
    if (pathname === '/api/cron-jobs' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const output = execSync('clawdbot cron list --json', { encoding: 'utf8' });
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
          source: 'clawdbot'
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

    // GET /api/health
    if (pathname === '/api/health' && req.method === 'GET') {
      const checks = [];
      
      // Check Gateway
      try {
        const { execSync } = require('child_process');
        const ps = execSync('ps aux | grep -E "openclaw-gateway|clawdbot-gateway" | grep -v grep', { encoding: 'utf8' });
        if (ps.includes('gateway')) {
          checks.push({ name: 'Gateway', status: 'healthy', message: 'openclaw-gateway running' });
        } else {
          checks.push({ name: 'Gateway', status: 'unhealthy', message: 'Gateway not running' });
        }
      } catch (e) {
        checks.push({ name: 'Gateway', status: 'unhealthy', message: 'Gateway not running' });
      }
      
      // Check Ollama (for memory embeddings + minimax)
      try {
        const http = require('http');
        const ollama = await new Promise((resolve) => {
          const req = http.get('http://localhost:11434/api/tags', (res) => {
            resolve({ status: 'healthy' });
          });
          req.on('error', () => resolve({ status: 'unhealthy' }));
          req.setTimeout(3000, () => resolve({ status: 'unhealthy' }));
        });
        checks.push({ name: 'Ollama', status: ollama.status, message: ollama.status === 'healthy' ? 'nomic-embed + minimax-m2.5 ready' : 'Ollama not responding' });
      } catch (e) {
        checks.push({ name: 'Ollama', status: 'unhealthy', message: 'Ollama not responding' });
      }
      
      // Check PM2 processes
      try {
        const { execSync } = require('child_process');
        const output = execSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/pm2 jlist', { encoding: 'utf8' });
        const apps = JSON.parse(output);
        const running = apps.filter(a => a.pm2_env?.status === 'online').length;
        const stopped = apps.filter(a => a.pm2_env?.status !== 'online').length;
        if (stopped === 0) {
          checks.push({ name: 'PM2', status: 'healthy', message: `${running} process(es) online` });
        } else {
          checks.push({ name: 'PM2', status: 'warning', message: `${running} online, ${stopped} stopped` });
        }
      } catch (e) {
        checks.push({ name: 'PM2', status: 'unhealthy', message: 'PM2 not responding' });
      }
      
      // Check disk space
      try {
        const { execSync } = require('child_process');
        const df = execSync('df -h / | tail -1', { encoding: 'utf8' });
        const match = df.match(/(\d+)%/);
        if (match) {
          const pct = parseInt(match[1]);
          if (pct < 80) {
            checks.push({ name: 'Disk', status: 'healthy', message: `${pct}% used` });
          } else if (pct < 90) {
            checks.push({ name: 'Disk', status: 'warning', message: `${pct}% used` });
          } else {
            checks.push({ name: 'Disk', status: 'unhealthy', message: `${pct}% used - low space` });
          }
        }
      } catch (e) {
        checks.push({ name: 'Disk', status: 'unhealthy', message: 'Could not check disk' });
      }
      
      // Check internet connectivity
      try {
        const { execSync } = require('child_process');
        execSync('curl -s --connect-timeout 5 https://api.anthropic.com > /dev/null', { encoding: 'utf8' });
        checks.push({ name: 'Internet', status: 'healthy', message: 'Connected to internet' });
      } catch (e) {
        checks.push({ name: 'Internet', status: 'unhealthy', message: 'No internet connection' });
      }
      
      // Check Clawdbot CLI
      try {
        const { execSync } = require('child_process');
        const version = execSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot --version', { encoding: 'utf8' });
        checks.push({ name: 'Clawdbot', status: 'healthy', message: 'CLI responding' });
      } catch (e) {
        checks.push({ name: 'Clawdbot', status: 'unhealthy', message: 'CLI not responding' });
      }
      
      // Check clawdbot cron (primary scheduler - source of truth)
      try {
        const { execSync } = require('child_process');
        const output = execSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot cron list', { encoding: 'utf8', timeout: 10000 });
        const jobCount = (output.match(/\n/g) || []).length;
        checks.push({ name: 'Cron Jobs', status: 'healthy', message: `${jobCount} jobs in clawdbot` });
      } catch (e) {
        checks.push({ name: 'Cron Jobs', status: 'unhealthy', message: 'Could not list cron jobs' });
      }
      
      // Check Level Up Cards (port 5000)
      try {
        const http = require('http');
        const levelup = await new Promise((resolve) => {
          const req = http.get('http://localhost:5000', (res) => {
            resolve({ status: 'healthy' });
          });
          req.on('error', () => resolve({ status: 'unhealthy' }));
          req.setTimeout(3000, () => resolve({ status: 'unhealthy' }));
        });
        checks.push({ name: 'Level Up Cards', status: levelup.status, message: levelup.status === 'healthy' ? 'Web app responding' : 'Not responding' });
      } catch (e) {
        checks.push({ name: 'Level Up Cards', status: 'unhealthy', message: 'Not responding' });
      }
      
      // Check Podcast Summarizer (port 5001)
      try {
        const http = require('http');
        const podcast = await new Promise((resolve) => {
          const req = http.get('http://localhost:5001', (res) => {
            resolve({ status: 'healthy' });
          });
          req.on('error', () => resolve({ status: 'unhealthy' }));
          req.setTimeout(3000, () => resolve({ status: 'unhealthy' }));
        });
        checks.push({ name: 'Podcast', status: podcast.status, message: podcast.status === 'healthy' ? 'Dashboard responding' : 'Not responding' });
      } catch (e) {
        checks.push({ name: 'Podcast', status: 'unhealthy', message: 'Not responding' });
      }
       
      const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
      const warningCount = checks.filter(c => c.status === 'warning').length;
      const healthStatus = unhealthyCount === 0 ? (warningCount === 0 ? 'healthy' : 'warning') : 'unhealthy';
      
      return this.sendJSON(res, { status: healthStatus, checks });
    }

    // GET /api/pm2-status
    if (pathname === '/api/pm2-status' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const output = execSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/pm2 jlist', { encoding: 'utf8' });
        const apps = JSON.parse(output);
        const formatted = apps.map(app => ({
          name: app.name,
          status: app.pm2_env?.status || 'unknown',
          pid: app.pid || null,
          restarts: app.pm2_env?.restart_time || 0,
          uptime: app.pm2_env?.pm_uptime || null,
          memory: app.monit?.memory || 0,
          cpu: app.monit?.cpu || 0,
          version: app.pm2_env?.version || null
        }));
        return this.sendJSON(res, formatted);
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
      }
    }

    // GET /api/cron-list
    if (pathname === '/api/cron-list' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const output = execSync('clawdbot cron list', { encoding: 'utf8', timeout: 10000 });
        return this.sendJSON(res, { output });
      } catch (e) {
        return this.sendJSON(res, { error: e.message }, 500);
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
        
        // Fix nested global_filters issue - save directly, not under another global_filters
        if (data.global_filters && !data.global_filters.graded_keywords) {
          // Data is wrapped in extra global_filters, unwrap it
          config.global_filters = data.global_filters;
        } else {
          config.global_filters = data.global_filters;
        }
        
        config.last_updated = new Date().toISOString();
        await fs.writeFile(EBAY_CONFIG_FILE, JSON.stringify(config, null, 2));
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
    
    if (pathname === '/api/ebay-deploy' && req.method === 'POST') {
      return this.sendJSON(res, { message: 'Deploy triggered', success: true });
    }

    // Mission Control API endpoints
    if (pathname === '/api/gateway-status' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const ps = execSync('ps aux | grep -E "openclaw-gateway|clawdbot gateway" | grep -v grep', { encoding: 'utf8' });
        return this.sendJSON(res, { running: ps.includes('gateway'), timestamp: new Date().toISOString() });
      } catch (e) {
        return this.sendJSON(res, { running: false, error: e.message });
      }
    }

    if (pathname === '/api/system-health' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        
        // Gateway
        let gateway = 'Offline';
        try {
          const ps = execSync('ps aux | grep -E "openclaw-gateway|clawdbot gateway" | grep -v grep', { encoding: 'utf8' });
          gateway = ps.includes('gateway') ? 'Online' : 'Offline';
        } catch (e) { gateway = 'Offline'; }
        
        // Telegram - check if bot responded recently
        let telegram = 'Unknown';
        try {
          const lastMsg = execSync('ls -t ~/.openclaw/telegram/ 2>/dev/null | head -1', { encoding: 'utf8' });
          telegram = lastMsg ? 'Connected' : 'No messages';
        } catch (e) { telegram = 'Disconnected'; }
        
        // Email (GWS)
        let email = 'Unknown';
        try {
          const gwsStatus = execSync('gws auth status --json 2>/dev/null', { encoding: 'utf8' });
          const parsed = JSON.parse(gwsStatus);
          email = parsed.token_valid === true ? 'Connected' : 'Disconnected';
        } catch (e) { email = 'Disconnected'; }
        
        // Cron jobs
        let cronCount = 0;
        try {
          const cronJobs = JSON.parse(execSync('clawdbot cron list --json', { encoding: 'utf8' }));
          cronCount = (cronJobs.jobs || []).filter(j => j.enabled).length;
        } catch (e) {}
        
        return this.sendJSON(res, { 
          gateway, telegram, email, cronCount,
          timestamp: new Date().toISOString() 
        });
      } catch (e) {
        return this.sendJSON(res, { error: e.message });
      }
    }

    if (pathname === '/api/health-check' && req.method === 'POST') {
      try {
        const { execSync } = require('child_process');
        
        const results = [];
        
        // Gateway
        try {
          const ps = execSync('ps aux | grep -E "openclaw-gateway|clawdbot gateway" | grep -v grep', { encoding: 'utf8' });
          results.push({ name: 'Gateway', status: ps.includes('gateway') ? 'healthy' : 'unhealthy', message: ps.includes('gateway') ? 'Running' : 'Not running' });
        } catch (e) {
          results.push({ name: 'Gateway', status: 'unhealthy', message: 'Not running' });
        }
        
        // PM2
        try {
          const pm2List = execSync('pm2 jlist', { encoding: 'utf8' });
          const apps = JSON.parse(pm2List);
          const running = apps.filter(a => a.pm2_env?.status === 'online').length;
          results.push({ name: 'PM2', status: 'healthy', message: `${running} processes online` });
        } catch (e) {
          results.push({ name: 'PM2', status: 'unhealthy', message: 'Error checking' });
        }
        
        // GWS Auth
        try {
          const gws = execSync('gws auth status --json', { encoding: 'utf8' });
          const parsed = JSON.parse(gws);
          results.push({ name: 'GWS (Email)', status: parsed.token_valid === true ? 'healthy' : 'unhealthy', message: parsed.token_valid === true ? 'Authenticated as ' + (parsed.user || 'OK') : 'Token invalid' });
        } catch (e) {
          results.push({ name: 'GWS (Email)', status: 'unhealthy', message: 'Not configured' });
        }
        
        // Cron
        try {
          const cron = JSON.parse(execSync('clawdbot cron list --json', { encoding: 'utf8' }));
          const enabled = (cron.jobs || []).filter(j => j.enabled).length;
          results.push({ name: 'Cron Jobs', status: 'healthy', message: `${enabled} active jobs` });
        } catch (e) {
          results.push({ name: 'Cron Jobs', status: 'unknown', message: 'Error checking' });
        }
        
        return this.sendJSON(res, { success: true, results, timestamp: new Date().toISOString() });
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message });
      }
    }

    if (pathname === '/api/mission-stats' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const cronOutput = execSync('clawdbot cron list --json', { encoding: 'utf8' });
        const jobs = JSON.parse(cronOutput).jobs || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        
        let runsToday = 0, successCount = 0;
        jobs.forEach(job => {
          if (job.state?.lastRunAtMs && job.state.lastRunAtMs >= todayMs) {
            runsToday++;
            if (job.state.lastStatus === 'ok') successCount++;
          }
        });
        
        let nextTask = '--:--';
        const upcoming = jobs.filter(j => j.state?.nextRunAtMs && j.enabled)
          .sort((a, b) => a.state.nextRunAtMs - b.state.nextRunAtMs);
        if (upcoming.length > 0) {
          nextTask = new Date(upcoming[0].state.nextRunAtMs).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
        }
        
        // Use process uptime (time since server started)
        const uptimeMs = process.uptime() * 1000;
        const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        
        return this.sendJSON(res, { today: runsToday, successRate: runsToday > 0 ? Math.round((successCount / runsToday) * 100) : 100, nextTask, uptime: uptimeDays + 'd' });
      } catch (e) {
        return this.sendJSON(res, { today: 0, successRate: 100, nextTask: '--:--', uptime: '0d' });
      }
    }

    if (pathname === '/api/activity' && req.method === 'GET') {
      try {
        const { execSync } = require('child_process');
        const jobs = JSON.parse(execSync('clawdbot cron list --json', { encoding: 'utf8' })).jobs || [];
        const activity = jobs.filter(j => j.state?.lastRunAtMs).slice(0, 15).map(job => ({
          name: job.name, status: job.state.lastStatus === 'ok' ? 'success' : 'error',
          time: new Date(job.state.lastRunAtMs).toLocaleString('en-US', { timeZone: 'America/New_York' })
        }));
        return this.sendJSON(res, activity);
      } catch (e) {
        return this.sendJSON(res, []);
      }
    }

    if (pathname === '/api/control/restart-gateway' && req.method === 'POST') {
      try {
        require('child_process').execSync('pkill -f "openclaw-gateway" || true; source /home/clawd/.nvm/nvm.sh && nvm use 22.22.0 && nohup clawdbot gateway >> /tmp/gateway.log 2>&1 &', { encoding: 'utf8' });
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/control/restart-worker' && req.method === 'POST') {
      try {
        require('child_process').execSync('pm2 restart task-manager-worker', { encoding: 'utf8' });
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message }, 500);
      }
    }

    if (pathname === '/api/logs' && req.method === 'GET') {
      const urlParams = new URL(req.url, 'http://localhost');
      const lines = urlParams.searchParams.get('lines') || 50;
      try {
        const { execSync } = require('child_process');
        const log = execSync(`tail -${lines} /tmp/openclaw/openclaw-2026-03-07.log 2>/dev/null | tail -${lines}`, { encoding: 'utf8' });
        return this.sendJSON(res, { logs: log });
      } catch (e) {
        return this.sendJSON(res, { logs: 'No logs found', error: e.message });
      }
    }

    if (pathname === '/api/run-task' && req.method === 'POST') {
      const body = await this.readBodyJSON(req);
      const { task } = body;
      try {
        const { execSync } = require('child_process');
        if (task === 'morning-brief') execSync('python3 /home/clawd/skills/notion-assistant/morning_brief.py --post', { encoding: 'utf8', timeout: 60000 });
        else if (task === 'ebay-scan') execSync('cd /home/clawd/clawd/ebay-scanner && node run-from-config.js', { encoding: 'utf8', timeout: 60000 });
        return this.sendJSON(res, { success: true });
      } catch (e) {
        return this.sendJSON(res, { success: false, error: e.message }, 500);
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
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        resolve(body);
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
}

module.exports = TaskServer;
