#!/usr/bin/env node
/**
 * Ollama Memory Manager
 * Unloads idle models to free RAM
 * Run via cron: */30 * * * * node /home/clawd/clawd/scripts/ollama-memory-manager.js
 */

const http = require('http');

const OLLAMA_URL = 'http://localhost:11434';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MODEL = 'llama3.1:8b';
const KEEP_MODELS = ['llama3.1:8b'];

async function getLoadedModels() {
  return new Promise((resolve) => {
    const req = http.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.models || []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

async function getModelInfo(modelName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ name: modelName });
    const req = http.request(`${OLLAMA_URL}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(postData);
    req.end();
  });
}

async function unloadModel(modelName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ name: modelName });
    const req = http.request(`${OLLAMA_URL}/api/unload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

async function getSystemInfo() {
  return new Promise((resolve) => {
    const { execSync } = require('child_process');
    try {
      const memInfo = execSync('free -h', { encoding: 'utf8' }).split('\n')[1].split(/\s+/);
      resolve({
        total: memInfo[1],
        used: memInfo[2],
        free: memInfo[3]
      });
    } catch {
      resolve(null);
    }
  });
}

async function manageMemory() {
  console.log(`[${new Date().toISOString()}] Ollama Memory Manager running...`);

  const systemInfo = await getSystemInfo();
  if (systemInfo) {
    console.log(`  RAM: ${systemInfo.used} used / ${systemInfo.total} total`);
  }

  const models = await getLoadedModels();
  console.log(`  Loaded models: ${models.length}`);

  if (models.length === 0) {
    console.log('  No models loaded. Exiting.');
    return;
  }

  let unloaded = 0;
  for (const model of models) {
    const name = model.name || model.model;
    if (KEEP_MODELS.includes(name)) {
      console.log(`  Keeping: ${name}`);
      continue;
    }

    console.log(`  Checking: ${name}`);
    const info = await getModelInfo(name);
    const lastAccess = info?.modified_at || model.modified_at;

    const lastAccessTime = new Date(lastAccess).getTime();
    const idleTime = Date.now() - lastAccessTime;

    console.log(`    Last access: ${new Date(lastAccess).toLocaleString()}`);
    console.log(`    Idle time: ${Math.round(idleTime / 60000)} minutes`);

    if (idleTime > IDLE_TIMEOUT_MS) {
      console.log(`    Unloading idle model...`);
      const success = await unloadModel(name);
      if (success) {
        console.log(`    ✓ Unloaded: ${name}`);
        unloaded++;
      } else {
        console.log(`    ✗ Failed to unload: ${name}`);
      }
    } else {
      console.log(`    Still active, keeping loaded`);
    }
  }

  console.log(`  Summary: ${unloaded} models unloaded`);
  console.log('');
}

if (require.main === module) {
  manageMemory().catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { manageMemory, getLoadedModels, unloadModel };
