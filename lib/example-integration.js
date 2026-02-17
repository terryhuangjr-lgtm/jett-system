#!/usr/bin/env node
/**
 * Example Integration - How to use optimization tools together
 * This shows best practices for efficient operations
 */

const StateManager = require('./state-manager');
const QuickMemory = require('./quick-memory');
const TokenOptimizer = require('./token-optimizer');
const BatchOps = require('./batch-ops');
const RetryHandler = require('./retry-handler');

// Example: Optimized Morning Brief Check
async function optimizedMorningBriefCheck() {
  console.log('=== Optimized Morning Brief Check ===\n');

  const state = new StateManager();
  const batch = new BatchOps();
  const retry = new RetryHandler();

  // 1. Check if we should even run (avoid spam)
  if (!state.shouldCheck('morning-brief', 60)) {
    console.log('⏭️  Skipped: Morning brief checked recently');
    return { skipped: true };
  }

  // 2. Load context efficiently (only recent, not everything)
  console.log('📖 Loading context...');
  const recentContext = QuickMemory.getRecentContext();
  const contextTokens = TokenOptimizer.estimateTokens(recentContext);
  console.log(`   Loaded ${contextTokens} tokens from recent memory\n`);

  // 3. Batch check multiple things at once
  console.log('🔍 Running batch checks...');
  const checks = [];

  // Check weather (cache for 2 hours)
  if (state.shouldCheck('weather', 120)) {
    checks.push({
      name: 'weather',
      fn: async () => {
        const cached = state.getCache('weather', 120);
        if (cached) return cached;

        console.log('   Fetching weather...');
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        const weather = { temp: 45, condition: 'Sunny', location: 'Long Island' };

        state.setCache('weather', weather, 120);
        state.markChecked('weather');
        return weather;
      }
    });
  }

  // Check email (cache for 5 minutes)
  if (state.shouldCheck('email', 5)) {
    checks.push({
      name: 'email',
      fn: async () => retry.retry(async () => {
        console.log('   Checking email...');
        await new Promise(resolve => setTimeout(resolve, 100));
        const emails = { unread: 3, urgent: 0 };

        state.markChecked('email');
        return emails;
      }, 'email check')
    });
  }

  // Check calendar (cache for 15 minutes)
  if (state.shouldCheck('calendar', 15)) {
    checks.push({
      name: 'calendar',
      fn: async () => {
        const cached = state.getCache('calendar', 15);
        if (cached) return cached;

        console.log('   Fetching calendar...');
        await new Promise(resolve => setTimeout(resolve, 100));
        const events = { today: 2, upcoming: 5 };

        state.setCache('calendar', events, 15);
        state.markChecked('calendar');
        return events;
      }
    });
  }

  // 4. Execute all checks in parallel
  const batchResult = await batch.runParallel(checks);
  console.log(`   ✅ ${Object.keys(batchResult.results).length} checks completed`);
  if (batchResult.errors.length > 0) {
    console.log(`   ⚠️  ${batchResult.errors.length} checks failed`);
  }
  console.log('');

  // 5. Log to memory efficiently
  const summary = `Morning brief: ${Object.keys(batchResult.results).length} checks completed`;
  QuickMemory.append(summary);
  console.log('💾 Logged to memory\n');

  // 6. Mark overall check as done
  state.markChecked('morning-brief');

  // 7. Show results
  console.log('📊 Results:');
  console.log(JSON.stringify(batchResult.results, null, 2));
  console.log('');

  // 8. Show token savings
  const tokensUsed = contextTokens + 500; // Estimated for operations
  const naiveTokens = 5000; // What it would cost without optimization
  const savings = Math.round((1 - tokensUsed / naiveTokens) * 100);

  console.log(`⚡ Efficiency:`);
  console.log(`   Tokens used: ~${tokensUsed}`);
  console.log(`   Tokens saved: ~${savings}% vs naive approach`);

  return batchResult;
}

// Example: Optimized File Reading
function optimizedFileReading() {
  console.log('\n=== Optimized File Reading ===\n');

  const files = [
    'AGENTS.md',
    'MEMORY.md',
    'USER.md'
  ].map(f => `/home/clawd/clawd/${f}`);

  // Bad way: Read all files fully
  console.log('❌ Naive approach:');
  let totalTokens = 0;
  files.forEach(file => {
    try {
      const content = require('fs').readFileSync(file, 'utf8');
      const tokens = TokenOptimizer.estimateTokens(content);
      totalTokens += tokens;
      console.log(`   ${file.split('/').pop()}: ${tokens} tokens`);
    } catch (err) {
      // File might not exist
    }
  });
  console.log(`   Total: ${totalTokens} tokens\n`);

  // Good way: Smart batch reading with budget
  console.log('✅ Optimized approach:');
  const results = TokenOptimizer.batchRead(files, 5000);
  let optimizedTokens = 0;
  Object.entries(results).forEach(([file, result]) => {
    optimizedTokens += result.tokens;
    const truncated = result.truncated ? ' (truncated)' : '';
    console.log(`   ${file.split('/').pop()}: ${result.tokens} tokens${truncated}`);
  });
  console.log(`   Total: ${optimizedTokens} tokens`);

  const savings = Math.round((1 - optimizedTokens / totalTokens) * 100);
  console.log(`   Savings: ${savings}%`);
}

// Example: Smart State Checking
function smartStateChecking() {
  console.log('\n=== Smart State Checking ===\n');

  const state = new StateManager();

  // Simulate multiple checks over time
  const operations = [
    { name: 'email', interval: 30 },
    { name: 'weather', interval: 120 },
    { name: 'calendar', interval: 60 }
  ];

  console.log('Without state tracking:');
  console.log('   Every operation runs every time = lots of API calls\n');

  console.log('With state tracking:');
  operations.forEach(op => {
    const should = state.shouldCheck(op.name, op.interval);
    console.log(`   ${op.name}: ${should ? '✅ Run' : '⏭️  Skip'} (interval: ${op.interval}min)`);
  });

  console.log('\n   Result: Only necessary operations run, saving API calls & tokens');
}

// Run examples
if (require.main === module) {
  (async () => {
    await optimizedMorningBriefCheck();
    optimizedFileReading();
    smartStateChecking();
  })();
}

module.exports = {
  optimizedMorningBriefCheck,
  optimizedFileReading,
  smartStateChecking
};
