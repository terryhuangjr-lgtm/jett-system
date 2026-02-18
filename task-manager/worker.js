#!/usr/bin/env node
/**
 * Task Worker
 * Background service that executes scheduled tasks
 * Uses robust file locking with PID verification
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { exec, fork } = require('child_process');
const TaskDatabase = require('./database');

const LOCK_FILE = path.join(os.tmpdir(), 'clawd-task-worker.lock');
const HEARTBEAT_FILE = path.join(os.tmpdir(), 'clawd-task-worker.heartbeat');
const STALE_THRESHOLD_MS = 120000;
const MAX_TASK_RUNTIME_MS = 300000;

class TaskWorker {
  constructor() {
    this.db = new TaskDatabase();
    this.running = false;
    this.checkInterval = 30000;
    this.currentJobs = new Map();
    this.workerId = `worker-${process.pid}-${Date.now()}`;
    this.lockHandle = null;
    this.isLeader = false;
    this.lastHeartbeat = null;
    this.healthCheckInterval = null;
  }

  async updateHeartbeat() {
    try {
      await fsp.writeFile(HEARTBEAT_FILE, JSON.stringify({
        pid: process.pid,
        workerId: this.workerId,
        lastBeat: Date.now()
      }));
      this.lastHeartbeat = Date.now();
    } catch (e) {
      console.error('Failed to update heartbeat:', e.message);
    }
  }

  async getHeartbeat() {
    try {
      const content = await fsp.readFile(HEARTBEAT_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  async isWorkerHealthy(heartbeat) {
    if (!heartbeat) return false;
    const elapsed = Date.now() - heartbeat.lastBeat;
    return elapsed < STALE_THRESHOLD_MS;
  }

  async killProcessTree(pid) {
    try {
      exec('ps -o pid= --ppid ' + pid, async (err, stdout) => {
        const childPids = stdout.trim().split('\n').filter(Boolean);
        for (const childPid of childPids) {
          try { process.kill(parseInt(childPid), 9); } catch(e) {}
        }
        try { process.kill(pid, 9); } catch(e) {}
      });
    } catch (e) {
      try { process.kill(pid, 9); } catch(e) {}
    }
  }

  isPidAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  async cleanupStaleLock(lockData) {
    if (!lockData || !lockData.pid) return false;

    if (!this.isPidAlive(lockData.pid)) {
      console.log(`Cleaning up stale lock from dead PID ${lockData.pid}`);
      try {
        await fsp.unlink(LOCK_FILE);
        return true;
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.warn('Could not clean stale lock:', e.message);
        }
      }
      return true;
    }

    const heartbeat = await this.getHeartbeat();
    if (heartbeat && heartbeat.pid === lockData.pid) {
      const healthy = await this.isWorkerHealthy(heartbeat);
      if (!healthy) {
        console.log(`Worker ${lockData.pid} is stale (no heartbeat for ${STALE_THRESHOLD_MS/1000}s), killing...`);
        await this.killProcessTree(lockData.pid);
        try { await fsp.unlink(LOCK_FILE); } catch(e) {}
        try { await fsp.unlink(HEARTBEAT_FILE); } catch(e) {}
        return true;
      }
    }

    return false;
  }

  async acquireLock(maxRetries = 3, retryDelayMs = 150) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // First, check if lock exists and if the holder is alive
        let lockData = null;
        try {
          const content = await fsp.readFile(LOCK_FILE, 'utf8');
          lockData = JSON.parse(content);
        } catch (e) {
          // Lock file doesn't exist, that's fine
        }

        // Clean up stale lock if holder is dead
        if (lockData) {
          const cleaned = await this.cleanupStaleLock(lockData);
          if (cleaned) {
            // Lock was cleaned, proceed to acquire
            lockData = null;
          }
        }

        // If lock still exists and holder is alive, we lost the race
        if (lockData && lockData.pid) {
          if (attempt < maxRetries - 1) {
            // Wait and retry (let the other worker establish lock)
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            continue;
          } else {
            console.log(`Another worker is running (PID ${lockData.pid}), exiting...`);
            return false;
          }
        }

        // Try to create lock atomically
        this.lockHandle = await fsp.open(LOCK_FILE, 'wx');
        await this.lockHandle.writeFile(JSON.stringify({
          pid: process.pid,
          workerId: this.workerId,
          started: new Date().toISOString()
        }));

        console.log(`✅ Worker lock acquired: ${LOCK_FILE} (PID ${process.pid})`);
        this.isLeader = true;
        return true;

      } catch (error) {
        if (error.code === 'EEXIST') {
          // Lock exists, another worker got it first
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            continue;
          }
          console.log(`Another worker holds the lock, exiting...`);
          return false;
        }
        throw error;
      }
    }
    return false;
  }

  async releaseLock() {
    if (this.lockHandle) {
      try {
        await this.lockHandle.close();
      } catch (e) {
      }
      this.lockHandle = null;
    }

    if (this.isLeader) {
      try {
        await fsp.unlink(LOCK_FILE);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.error('Error releasing lock:', e.message);
        }
      }
      try {
        await fsp.unlink(HEARTBEAT_FILE);
      } catch (e) {
      }
      console.log('Worker lock released');
    }
  }

  async start() {
    const acquired = await this.acquireLock();
    if (!acquired) {
      process.exit(0);
    }

    console.log(`Task Worker starting... (ID: ${this.workerId})`);
    
    // Alert on worker start/restart
    try {
      const { execSync } = require('child_process');
      const startMsg = `✅ Task Worker STARTED\nID: ${this.workerId}\nPID: ${process.pid}`;
      const slackCmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel slack --target "U0ABTP704QK" --message "${startMsg.replace(/"/g, '\\"')}" --json`;
      execSync(slackCmd, { timeout: 10000, stdio: 'ignore' });
    } catch (e) {}
    
    await this.db.init();
    console.log('Database initialized');

    this.running = true;
    this.healthCheckInterval = setInterval(() => this.updateHeartbeat(), 60000);
    this.updateHeartbeat();
    this.checkLoop();
    this.monitorTaskTimeouts();

    console.log(`Task Worker running (checking every ${this.checkInterval/1000}s)`);
  }

  async monitorTaskTimeouts() {
    setInterval(async () => {
      for (const [taskId, startTime] of this.currentJobs.entries()) {
        if (Date.now() - startTime > MAX_TASK_RUNTIME_MS) {
          console.log(`Task ${taskId} timed out after ${MAX_TASK_RUNTIME_MS/1000}s, forcing completion`);
          this.currentJobs.delete(taskId);
        }
      }
    }, 30000);
  }

  async checkLoop() {
    while (this.running) {
      try {
        await this.checkAndRunTasks();
      } catch (error) {
        console.error('Error in check loop:', error);
      }

      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }
  }

  async checkAndRunTasks() {
    const tasks = await this.db.getTasksReadyToRun();

    if (tasks.length > 0) {
      console.log(`Found ${tasks.length} task(s) ready to run`);
    }

    for (const task of tasks) {
      if (this.currentJobs.has(task.id)) {
        console.log(`Task ${task.id} already running, skipping`);
        continue;
      }

      console.log(`Starting task ${task.id}: ${task.name}`);
      this.runTask(task);
    }
  }

  async runTask(task) {
    const startTime = new Date();
    const logEntry = {
      status: 'running',
      started_at: startTime.toISOString()
    };

    await this.db.updateTask(task.id, {
      status: 'running',
      last_run: startTime.toISOString()
    });

    this.currentJobs.set(task.id, Date.now());

    // Set up environment with NVM Node v22 paths
    const execEnv = {
      ...process.env,
      PATH: `/home/clawd/.nvm/versions/node/v22.22.0/bin:${process.env.PATH}`,
      NODE_PATH: `/home/clawd/.nvm/versions/node/v22.22.0/lib/node_modules`,
      TZ: 'America/New_York'
    };

    exec(task.command, {
      cwd: path.dirname(require.main.filename),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000,
      env: execEnv
    }, async (error, stdout, stderr) => {
      const endTime = new Date();
      const duration = endTime - startTime;

      logEntry.completed_at = endTime.toISOString();
      logEntry.duration_ms = duration;
      logEntry.output = stdout;

      if (error) {
        logEntry.status = 'failed';
        logEntry.error = stderr || error.message;
        console.error(`Task ${task.id} failed:`, error.message);

        // Send alert to Slack and Telegram on ANY failure
        try {
          const { execSync } = require('child_process');
          const errorMsg = (stderr || error.message).substring(0, 300);
          const durationSec = Math.round(duration / 1000);
          
          const alertMsg = `🚨 Task FAILED: ${task.name}
📋 Task ID: #${task.id}
⏱ Duration: ${durationSec}s
🐛 Error: ${errorMsg}`;

          // Send to Slack
          const slackCmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel slack --target "U0ABTP704QK" --message "${alertMsg.replace(/"/g, '\\"')}" --json`;
          execSync(slackCmd, { timeout: 10000, stdio: 'ignore' });
          
          // Send to Telegram
          const telegramCmd = `/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel telegram --target "5867308866" --message "${alertMsg.replace(/"/g, '\\"')}" --json`;
          execSync(telegramCmd, { timeout: 10000, stdio: 'ignore' });
          
          console.log(`✅ Alerts sent for failed task ${task.id}`);
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError.message);
        }
      } else {
        logEntry.status = 'completed';
        console.log(`Task ${task.id} completed in ${duration}ms`);
      }

      await this.db.addLog(task.id, logEntry);

      const updates = {
        status: task.schedule ? 'pending' : logEntry.status,
        run_count: task.run_count + 1
      };

      if (task.schedule) {
        updates.next_run = this.db.calculateNextRun(task.schedule);
        console.log(`Task ${task.id} next run: ${updates.next_run}`);
      }

      await this.db.updateTask(task.id, updates);
      this.currentJobs.delete(task.id);
    });
  }

  async stop() {
    console.log('Task Worker stopping...');
    this.running = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const maxWait = 30000;
    const startWait = Date.now();
    while (this.currentJobs.size > 0 && (Date.now() - startWait) < maxWait) {
      console.log(`Waiting for ${this.currentJobs.size} job(s) to complete...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (this.currentJobs.size > 0) {
      console.log(`Forcibly stopping ${this.currentJobs.size} remaining jobs`);
    }

    await this.db.close();
    await this.releaseLock();
    console.log('Task Worker stopped');
  }
}

const worker = new TaskWorker();

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('exit', async () => {
  await worker.releaseLock();
});

if (require.main === module) {
  worker.start().catch(error => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}

module.exports = TaskWorker;
