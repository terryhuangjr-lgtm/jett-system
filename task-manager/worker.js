#!/usr/bin/env node
/**
 * Task Worker
 * Background service that executes scheduled tasks
 */

const TaskDatabase = require('./database');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TaskWorker {
  constructor() {
    this.db = new TaskDatabase();
    this.running = false;
    this.checkInterval = 30000; // Check every 30 seconds
    this.currentJobs = new Map();
  }

  async start() {
    console.log('Task Worker starting...');
    await this.db.init();
    console.log('Database initialized');

    this.running = true;
    this.checkLoop();

    console.log(`Task Worker running (checking every ${this.checkInterval/1000}s)`);
  }

  async checkLoop() {
    while (this.running) {
      try {
        await this.checkAndRunTasks();
      } catch (error) {
        console.error('Error in check loop:', error);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }
  }

  async checkAndRunTasks() {
    const tasks = await this.db.getTasksReadyToRun();

    if (tasks.length > 0) {
      console.log(`Found ${tasks.length} task(s) ready to run`);
    }

    for (const task of tasks) {
      // Skip if already running
      if (this.currentJobs.has(task.id)) {
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

    // Mark as running
    await this.db.updateTask(task.id, {
      status: 'running',
      last_run: startTime.toISOString()
    });

    this.currentJobs.set(task.id, true);

    // Execute command
    exec(task.command, {
      cwd: path.dirname(require.main.filename),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 600000 // 10 minute timeout
    }, async (error, stdout, stderr) => {
      const endTime = new Date();
      const duration = endTime - startTime;

      // Build log entry
      logEntry.completed_at = endTime.toISOString();
      logEntry.duration_ms = duration;
      logEntry.output = stdout;

      if (error) {
        logEntry.status = 'failed';
        logEntry.error = stderr || error.message;
        console.error(`Task ${task.id} failed:`, error.message);
      } else {
        logEntry.status = 'completed';
        console.log(`Task ${task.id} completed in ${duration}ms`);
      }

      // Save log
      await this.db.addLog(task.id, logEntry);

      // Update task
      const updates = {
        status: task.schedule ? 'pending' : logEntry.status,
        run_count: task.run_count + 1
      };

      // Calculate next run if scheduled
      if (task.schedule) {
        updates.next_run = this.db.calculateNextRun(task.schedule);
        console.log(`Task ${task.id} next run: ${updates.next_run}`);
      }

      await this.db.updateTask(task.id, updates);

      // Remove from current jobs
      this.currentJobs.delete(task.id);
    });
  }

  async stop() {
    console.log('Task Worker stopping...');
    this.running = false;
    await this.db.close();
    console.log('Task Worker stopped');
  }
}

// Handle graceful shutdown
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

// Start worker
if (require.main === module) {
  worker.start().catch(error => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}

module.exports = TaskWorker;
