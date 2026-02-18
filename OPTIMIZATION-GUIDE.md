# ⚡ Clawdbot Optimization Guide

**ALWAYS use these tools. They save 60-80% tokens and reduce API calls by 50-70%.**

## Quick Commands

```bash
# Memory operations (fastest)
./quick.sh log "Your message"          # Append to today's memory
./quick.sh recent                      # Get today + yesterday
./quick.sh last 5                      # Show last 5 entries

# State tracking (avoid redundant work)
./quick.sh check email 30              # Check if 30min passed
./quick.sh mark email                  # Mark as checked now
./quick.sh state                       # Show current state

# Maintenance
./quick.sh health                      # System health check
./quick.sh clean 30                    # Clean files older than 30 days
./quick.sh size                        # Estimate current context tokens
```

## The 5 Rules of Efficiency

### 1️⃣ Check Before You Act
```javascript
const state = new StateManager();

// Don't spam APIs
if (state.shouldCheck('email', 30)) {
  await checkEmail();
  state.markChecked('email');
}
```

**Saves:** ~70% of redundant API calls

### 2️⃣ Cache Everything
```javascript
// Weather doesn't change every minute
const weather = state.getCache('weather', 120) || await fetchWeather();
state.setCache('weather', weather, 120);
```

**Saves:** ~60% of repeated fetches

### 3️⃣ Batch Operations
```javascript
const batch = new BatchOps();

// 1 operation instead of 3
await batch.batchHeartbeat(['email', 'calendar', 'weather']);
```

**Saves:** ~50% by running in parallel

### 4️⃣ Read Smart, Not Hard
```javascript
const TokenOptimizer = require('./lib/token-optimizer');

// Don't load 10,000 tokens when you need 1,000
const result = TokenOptimizer.readFileSmart('large.md', 1000);
```

**Saves:** ~80% on large files

### 5️⃣ Retry Failures
```javascript
const retry = new RetryHandler();

// Auto-retry instead of failing
const data = await retry.retry(() => callAPI(), 'API call');
```

**Saves:** Manual retries and debugging time

## Cache TTL Guide

| Data Type | TTL | Why |
|-----------|-----|-----|
| Weather | 120 min | Changes slowly |
| News | 30 min | Updates frequently |
| Calendar | 15 min | May change soon |
| Email | 5 min | Need fresh data |
| Bitcoin price | 10 min | High volatility |
| Static content | 24 hours | Rarely changes |

## Token Budgets

| Operation | Limit | Notes |
|-----------|-------|-------|
| Heartbeat | 500 | Keep it minimal |
| Memory read | 5,000 | Today + yesterday only |
| Single file | 2,000 | Use smart loading |
| Message | 2,000 | Be concise |
| Context | 100,000 | Hard limit |

## Common Mistakes

### ❌ Don't Do This
```javascript
// Reading full file every time
const content = fs.readFileSync('large.md', 'utf8');

// Checking API every few minutes
setInterval(() => checkEmail(), 300000); // Every 5 min

// Loading everything
const allMemory = loadAllMemoryFiles(); // Thousands of tokens
```

### ✅ Do This Instead
```javascript
// Smart loading with token limit
const result = TokenOptimizer.readFileSmart('large.md', 1000);

// State-based checking
if (state.shouldCheck('email', 30)) {
  await checkEmail();
  state.markChecked('email');
}

// Recent context only
const context = QuickMemory.getRecentContext(); // Just today + yesterday
```

## Real-World Examples

### Morning Brief (Optimized)
```javascript
const state = new StateManager();
const batch = new BatchOps();

// Only run if enough time passed
if (!state.shouldCheck('morning-brief', 60)) {
  return 'HEARTBEAT_OK';
}

// Load minimal context
const context = QuickMemory.getRecentContext();

// Batch all checks
const checks = [];

if (state.shouldCheck('weather', 120)) {
  const cached = state.getCache('weather', 120);
  if (!cached) {
    checks.push({ name: 'weather', fn: () => fetchWeather() });
  }
}

const results = await batch.runParallel(checks);
state.markChecked('morning-brief');

return formatBrief(results);
```

**Result:** ~500 tokens instead of ~5,000

### File Search (Optimized)
```javascript
// Bad: Load all files to search
const files = ['file1.md', 'file2.md', 'file3.md'];
const contents = files.map(f => fs.readFileSync(f)); // 15,000 tokens

// Good: Use token budget
const results = TokenOptimizer.batchRead(files, 3000); // 3,000 tokens
```

**Result:** 80% token reduction

## Performance Tracking

Check your efficiency:
```bash
./quick.sh size                # Current context size
./quick.sh state               # Cache hits, check intervals
node lib/example-integration.js  # See optimization in action
```

## Quick Reference

| Need to... | Use... | Command |
|------------|--------|---------|
| Log something | quick-memory | `./quick.sh log "text"` |
| Check timing | state-manager | `./quick.sh check key 30` |
| Read files | token-optimizer | `TokenOptimizer.readFileSmart()` |
| Run multiple | batch-ops | `batch.runParallel()` |
| Retry API | retry-handler | `retry.retry(fn)` |

## Monitoring

**Watch for:**
- Context approaching 80,000 tokens → Clean up
- Same API called <30min apart → Add state check
- Large file reads → Use smart loading
- Failed operations → Add retry logic

## More Info

- Full docs: `lib/README.md`
- Examples: `lib/example-integration.js`
- Config: `optimize.config.json`
- Updated: `AGENTS.md` (Optimization section)

---

**Bottom line:** Use these tools. Every time. Your token budget will thank you.
