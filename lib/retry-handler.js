#!/usr/bin/env node
/**
 * Retry Handler - Automatic retry logic for failed operations
 * Reduces manual intervention and improves reliability
 */

class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network',
      'Timeout'
    ];
  }

  // Check if error is retryable
  isRetryable(error) {
    const errorStr = error.toString();
    return this.retryableErrors.some(e => errorStr.includes(e));
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry with exponential backoff
  async retry(fn, context = 'operation') {
    let lastError;
    let delay = this.initialDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          throw error;
        }

        console.error(`${context} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);
        console.log(`Retrying in ${delay}ms...`);

        await this.sleep(delay);
        delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
      }
    }

    throw lastError;
  }

  // Retry with fallback
  async retryWithFallback(fn, fallbackFn, context = 'operation') {
    try {
      return await this.retry(fn, context);
    } catch (error) {
      console.error(`${context} failed after retries, using fallback`);
      return await fallbackFn(error);
    }
  }

  // Batch retry - retry multiple operations independently
  async retryBatch(operations) {
    const results = await Promise.allSettled(
      operations.map(op =>
        this.retry(op.fn, op.name || 'unnamed operation')
      )
    );

    return {
      successful: results.filter(r => r.status === 'fulfilled').map(r => r.value),
      failed: results.filter(r => r.status === 'rejected').map(r => r.reason),
      total: results.length
    };
  }
}

// Example usage
if (require.main === module) {
  const handler = new RetryHandler({ maxRetries: 3 });

  // Test with a flaky function
  let attemptCount = 0;
  const flakyFunction = async () => {
    attemptCount++;
    if (attemptCount < 2) {
      throw new Error('ETIMEDOUT: Connection timeout');
    }
    return 'Success!';
  };

  handler.retry(flakyFunction, 'test operation')
    .then(result => console.log('Result:', result))
    .catch(err => console.error('Final error:', err));
}

module.exports = RetryHandler;
