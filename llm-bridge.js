#!/usr/bin/env node
/**
 * LLM Bridge - Smart routing between Ollama and Claude API
 * Uses consolidated llm-router.js module (no Python dependency)
 */

const { LLMRouter } = require('./lib/llm-router');

const router = new LLMRouter();

async function route(message, sessionId, options = {}) {
  return router.route(message, sessionId, options);
}

function getStats() {
  return router.getStats();
}

async function checkIdle() {
  return router.checkIdle();
}

module.exports = { route, getStats, checkIdle, LLMRouter };

if (require.main === module) {
  const message = process.argv[2];
  const sessionId = process.argv[3] || 'cli-test';

  if (!message) {
    console.error('Usage: node llm-bridge.js "Your message here" [session-id]');
    process.exit(1);
  }

  if (message === '--stats') {
    console.log('📊 LLM Bridge Statistics:');
    console.log(JSON.stringify(getStats(), null, 2));
    process.exit(0);
  }

  console.log('LLM Bridge - Testing\n');

  route(message, sessionId)
    .then(result => {
      console.log('\n--- Result ---');
      console.log('Success:', result.success);
      console.log('Provider:', result.provider);
      console.log('Model:', result.model);
      console.log('Time:', result.time_ms + 'ms');
      if (result.savings_usd) {
        console.log('Savings: $' + result.savings_usd.toFixed(4));
      }
      console.log('\nResponse:');
      console.log(result.response);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
