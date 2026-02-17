#!/usr/bin/env node
/**
 * Worker Recovery Test Suite
 * Tests health checks, stale PID detection, and auto-recovery
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const LOCK_FILE = path.join(os.tmpdir(), 'clawd-task-worker.lock');
const HEARTBEAT_FILE = path.join(os.tmpdir(), 'clawd-task-worker.heartbeat');
const STALE_THRESHOLD_MS = 120000;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function cleanup() {
  try { fs.unlinkSync(LOCK_FILE); } catch(e) {}
  try { fs.unlinkSync(HEARTBEAT_FILE); } catch(e) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('=== Worker Recovery Tests ===\n');
cleanup();

// Test 1: Heartbeat file creation
test('Heartbeat file created', () => {
  const heartbeat = {
    pid: 12345,
    workerId: 'test-worker',
    lastBeat: Date.now()
  };
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat));
  const content = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
  const parsed = JSON.parse(content);
  assertEqual(parsed.pid, 12345, 'PID mismatch');
});

// Test 2: Stale detection
test('Detects stale heartbeat', () => {
  const heartbeat = {
    pid: 12345,
    workerId: 'test-worker',
    lastBeat: Date.now() - STALE_THRESHOLD_MS - 1000
  };
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat));
  const content = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
  const parsed = JSON.parse(content);
  const stale = Date.now() - parsed.lastBeat > STALE_THRESHOLD_MS;
  if (!stale) throw new Error('Should detect stale heartbeat');
});

// Test 3: Fresh heartbeat not stale
test('Fresh heartbeat not marked stale', () => {
  const heartbeat = {
    pid: 12345,
    workerId: 'test-worker',
    lastBeat: Date.now()
  };
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat));
  const content = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
  const parsed = JSON.parse(content);
  const stale = Date.now() - parsed.lastBeat > STALE_THRESHOLD_MS;
  if (stale) throw new Error('Fresh heartbeat should not be stale');
});

// Test 4: PID file with matching heartbeat
test('Recognizes healthy worker (lock+heartbeat match)', () => {
  const pid = process.pid;
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid, workerId: 'test' }));
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({ pid, lastBeat: Date.now() }));
  
  const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
  const hbContent = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
  const lock = JSON.parse(lockContent);
  const hb = JSON.parse(hbContent);
  
  if (lock.pid !== hb.pid) throw new Error('Lock and heartbeat PIDs should match');
});

// Test 5: Orphaned lock detection
test('Detects orphaned lock (no heartbeat)', () => {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: 99999, workerId: 'dead' }));
  try { fs.unlinkSync(HEARTBEAT_FILE); } catch(e) {}
  
  let hasHeartbeat = true;
  try {
    fs.readFileSync(HEARTBEAT_FILE, 'utf8');
  } catch(e) {
    hasHeartbeat = false;
  }
  if (hasHeartbeat) throw new Error('Should detect missing heartbeat');
});

// Test 6: Kill stale worker simulation
test('Kills stale worker process tree', async () => {
  const staleHeartbeat = {
    pid: process.pid,
    workerId: 'stale-test',
    lastBeat: Date.now() - STALE_THRESHOLD_MS - 10000
  };
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(staleHeartbeat));
  fs.writeFileSync(LOCK_FILE, JSON.stringify(staleHeartbeat));
  
  exec(`kill -9 $(ps -o pid= --ppid ${staleHeartbeat.pid} 2>/dev/null) 2>/dev/null; kill -9 ${staleHeartbeat.pid} 2>/dev/null`);
  await sleep(100);
  
  let killed = false;
  try {
    process.kill(staleHeartbeat.pid, 0);
  } catch(e) {
    killed = true;
  }
  if (!killed) throw new Error('Process should be killed');
  
  cleanup();
});

// Test 7: API /api/worker-health endpoint exists
test('Worker health API returns valid JSON', async () => {
  cleanup();
  
  const http = require('http');
  const result = await new Promise((resolve) => {
    http.get('http://localhost:3000/api/worker-health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
  
  if (!result || !result.timestamp) {
    throw new Error('API should return timestamp');
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  console.log('Some tests failed!');
  process.exit(1);
} else {
  console.log('All tests passed!');
  cleanup();
  process.exit(0);
}
