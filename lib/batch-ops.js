#!/usr/bin/env node
/**
 * Batch Operations - Group similar operations to reduce API calls
 * Execute multiple checks in parallel with efficient error handling
 */

const StateManager = require('./state-manager');
const QuickMemory = require('./quick-memory');

class BatchOps {
  constructor() {
    this.state = new StateManager();
    this.results = {};
    this.errors = [];
  }

  // Run multiple checks in parallel with timeout
  async runParallel(tasks, timeout = 30000) {
    const promises = tasks.map(task =>
      Promise.race([
        task.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ])
      .then(result => ({ name: task.name, success: true, result }))
      .catch(error => ({ name: task.name, success: false, error: error.message }))
    );

    const results = await Promise.all(promises);

    results.forEach(r => {
      if (r.success) {
        this.results[r.name] = r.result;
      } else {
        this.errors.push({ task: r.name, error: r.error });
      }
    });

    return { results: this.results, errors: this.errors };
  }

  // Batch heartbeat checks (most common use case)
  async batchHeartbeat(checks = ['email', 'calendar', 'weather']) {
    const tasks = [];
    const now = Date.now();

    for (const check of checks) {
      // Only include if enough time has passed
      if (this.state.shouldCheck(check, 60)) {
        tasks.push({
          name: check,
          fn: async () => {
            // Placeholder - actual implementation would call real APIs
            this.state.markChecked(check);
            return { checked: true, timestamp: now };
          }
        });
      }
    }

    if (tasks.length === 0) {
      return { skipped: true, reason: 'All checks recent' };
    }

    return await this.runParallel(tasks);
  }

  // Log results efficiently
  logResults(writeToMemory = true) {
    const summary = {
      successful: Object.keys(this.results).length,
      failed: this.errors.length,
      timestamp: new Date().toISOString()
    };

    if (writeToMemory && (summary.successful > 0 || summary.failed > 0)) {
      const text = `Batch operation: ${summary.successful} succeeded, ${summary.failed} failed`;
      QuickMemory.append(text);
    }

    return summary;
  }
}

// Example usage
if (require.main === module) {
  const batch = new BatchOps();

  batch.batchHeartbeat(['email', 'calendar', 'weather'])
    .then(result => {
      console.log('Batch Results:', JSON.stringify(result, null, 2));
      console.log('Summary:', batch.logResults(false));
    })
    .catch(err => {
      console.error('Batch failed:', err);
    });
}

module.exports = BatchOps;
