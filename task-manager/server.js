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
      return this.serveFile(res, 'dashboard/index.html', 'text/html');
    } else if (pathname === '/health.html') {
      return this.serveFile(res, 'dashboard/health.html', 'text/html');
    } else if (pathname === '/ebay') {
      return this.serveFile(res, 'dashboard/ebay.html', 'text/html');
    } else if (pathname === '/style.css') {
      return this.serveFile(res, 'dashboard/style.css', 'text/css');
    } else if (pathname === '/app.js') {
      return this.serveFile(res, 'dashboard/app.js', 'application/javascript');
    }

    // API routes
    if (pathname.startsWith('/api')) {
      return this.handleAPI(req, res, pathname, url);
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
  }

  async handleAPI(req, res, pathname, url) {
    // GET /api/tasks
    if (pathname === '/api/tasks' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const filter = status ? { status } : {};
      const tasks = await db.getTasks(filter);
      return this.sendJSON(res, tasks);
    }

    // GET /api/tasks/:id
    if (pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'GET') {
      const id = parseInt(pathname.split('/')[3]);
      const task = await db.getTask(id);
      return this.sendJSON(res, task || {});
    }

    // POST /api/tasks
    if (pathname === '/api/tasks' && req.method === 'POST') {
      const body = await this.readBody(req);
      const task = await db.createTask(body);
      return this.sendJSON(res, task, 201);
    }

    // PUT /api/tasks/:id
    if (pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3]);
      const body = await this.readBody(req);
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
      
      // Check Slack Bridge
      try {
        const { execSync } = require('child_process');
        const ps = execSync('ps aux | grep clawdbot | grep -v grep', { encoding: 'utf8' });
        if (ps.includes('gateway') || ps.includes('bridge')) {
          checks.push({ status: 'healthy', message: 'Slack Bridge running' });
        } else {
          checks.push({ status: 'unhealthy', message: 'Slack Bridge not running' });
        }
      } catch (e) {
        checks.push({ status: 'unhealthy', message: 'Slack Bridge not running' });
      }
      
      // Check Gateway
      try {
        const { execSync } = require('child_process');
        const ps = execSync('ps aux | grep clawdbot-gateway | grep -v grep', { encoding: 'utf8' });
        checks.push({ status: 'healthy', message: 'Gateway running' });
      } catch (e) {
        checks.push({ status: 'unhealthy', message: 'Gateway not running' });
      }
      
      // Check Ollama
      try {
        const http = require('http');
        const ollama = await new Promise((resolve) => {
          const req = http.get('http://localhost:11434/api/tags', (res) => {
            resolve({ status: 'healthy' });
          });
          req.on('error', () => resolve({ status: 'unhealthy' }));
          req.setTimeout(3000, () => resolve({ status: 'unhealthy' }));
        });
        checks.push({ status: ollama.status, message: ollama.status === 'healthy' ? 'Ollama responding' : 'Ollama not responding' });
      } catch (e) {
        checks.push({ status: 'unhealthy', message: 'Ollama not responding' });
      }
      
      // Check running tasks
      const allTasks = await db.getTasks();
      const running = allTasks.filter(t => t.status === 'running').length;
      checks.push({ status: 'healthy', message: `${running} task${running !== 1 ? 's' : ''} running` });
      
      const unhealthyCount = checks.filter(c => c.status !== 'healthy').length;
      const healthStatus = unhealthyCount === 0 ? 'healthy' : unhealthyCount <= 2 ? 'warning' : 'unhealthy';
      
      return this.sendJSON(res, { status: healthStatus, checks });
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
        const data = await this.readBody(req);
        const content = await fs.readFile(EBAY_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(content);
        config.global_filters = data;
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
        const data = await this.readBody(req);
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
