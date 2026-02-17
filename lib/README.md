# Clawdbot Optimization Library

Efficient utilities to minimize token usage, reduce API calls, and speed up operations.

## Quick Start

Use the main helper script for common operations:

```bash
./quick.sh log "Your message here"    # Append to today's memory
./quick.sh recent                     # Show recent context
./quick.sh check email 30             # Check if 30min passed since last email check
./quick.sh health                     # System health check
```

## Modules

### 1. State Manager (`state-manager.js`)
Tracks what's been checked/processed to avoid redundant operations.

**Key Features:**
- Check intervals (avoid checking email every 5 minutes)
- Caching with TTL (store API responses temporarily)
- Counters and flags
- Auto-cleanup of expired cache

**Usage:**
```javascript
const StateManager = require('./lib/state-manager');
const state = new StateManager();

// Check if enough time passed
if (state.shouldCheck('email', 30)) {
  // Do email check
  state.markChecked('email');
}

// Cache expensive operations
const weather = state.getCache('weather', 120);
if (!weather) {
  const fresh = await fetchWeather();
  state.setCache('weather', fresh, 120);
}
```

### 2. Quick Memory (`quick-memory.js`)
Fast memory file operations without reading full files.

**Key Features:**
- Append to today's file (most common)
- Get recent context (today + yesterday)
- List files with sizes
- Auto-cleanup old files

**Usage:**
```javascript
const QuickMemory = require('./lib/quick-memory');

// Append entry
QuickMemory.append('Task completed successfully');

// Get context for AI
const context = QuickMemory.getRecentContext();

// Get last 5 entries
const recent = QuickMemory.getLastEntries(5);
```

### 3. Token Optimizer (`token-optimizer.js`)
Minimize token usage in file reads and context.

**Key Features:**
- Estimate token count
- Smart truncation (keep important parts)
- Extract key lines (headers, timestamps)
- Batch file reading with token budget

**Usage:**
```javascript
const TokenOptimizer = require('./lib/token-optimizer');

// Read large file smartly
const result = TokenOptimizer.readFileSmart('big-file.md', 1000);
console.log(`Loaded ${result.tokens} tokens (${result.truncated ? 'truncated' : 'full'})`);

// Batch read with budget
const files = ['file1.md', 'file2.md', 'file3.md'];
const results = TokenOptimizer.batchRead(files, 5000);
```

### 4. Batch Operations (`batch-ops.js`)
Execute multiple operations in parallel efficiently.

**Key Features:**
- Parallel execution with timeout
- Error handling per task
- Common heartbeat batching
- Auto-logging results

**Usage:**
```javascript
const BatchOps = require('./lib/batch-ops');
const batch = new BatchOps();

// Run multiple checks
const result = await batch.batchHeartbeat(['email', 'calendar', 'weather']);

// Custom batch
await batch.runParallel([
  { name: 'task1', fn: async () => { /* ... */ } },
  { name: 'task2', fn: async () => { /* ... */ } }
]);
```

### 5. Retry Handler (`retry-handler.js`)
Automatic retry with exponential backoff.

**Key Features:**
- Configurable retries
- Exponential backoff
- Retryable error detection
- Fallback support

**Usage:**
```javascript
const RetryHandler = require('./lib/retry-handler');
const retry = new RetryHandler({ maxRetries: 3 });

// Retry flaky operation
const result = await retry.retry(
  async () => fetchFromAPI(),
  'API call'
);

// With fallback
const result = await retry.retryWithFallback(
  async () => fetchFromAPI(),
  async (error) => getCachedValue(),
  'API call'
);
```

## Configuration

Edit `optimize.config.json` to adjust:
- Token limits per operation
- Cache TTL for different data types
- Check intervals
- Retry settings
- Feature flags

## Best Practices

### 1. Use State Tracking
Always check before expensive operations:
```javascript
if (state.shouldCheck('expensive-api', 60)) {
  // Only runs once per hour
  const data = await callExpensiveAPI();
  state.markChecked('expensive-api');
}
```

### 2. Cache Aggressively
Store results that don't change often:
```javascript
// Weather changes slowly
const weather = state.getCache('weather', 120) || await fetchWeather();
state.setCache('weather', weather, 120);
```

### 3. Batch Operations
Group similar operations:
```javascript
// Instead of checking email, calendar, weather separately
// Do them all at once with batch.batchHeartbeat()
```

### 4. Smart File Loading
Don't load full files if you don't need them:
```javascript
// Bad: Load entire file
const content = fs.readFileSync('large.md', 'utf8');

// Good: Load smartly with token limit
const result = TokenOptimizer.readFileSmart('large.md', 1000);
```

### 5. Retry Network Operations
Wrap network calls in retry handler:
```javascript
const data = await retry.retry(
  () => fetch('https://api.example.com'),
  'API fetch'
);
```

## Token Savings Examples

**Without optimization:**
- Read 3 memory files: ~15,000 tokens
- Check email 10 times/day: 10 API calls
- Load full context each time: 30,000+ tokens/session

**With optimization:**
- Smart file reads: ~5,000 tokens (extract key parts)
- Check email when needed: 3-4 API calls (state tracking)
- Cached responses: Save 50-70% redundant operations
- Batch operations: Combine 3 calls into 1

**Estimated savings: 60-80% reduction in token usage**

## Maintenance

Run cleanup periodically:
```bash
./quick.sh clean 30    # Clean files older than 30 days
```

Or programmatically:
```javascript
QuickMemory.cleanOld(30);
state.cleanCache();
```
