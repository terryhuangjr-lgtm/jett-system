#!/usr/bin/env node
/**
 * LLM Router - Smart routing between Ollama and Claude API
 * Consolidated from llm-bridge.js and llm_router.py
 * No Python dependencies - pure JavaScript implementation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', 'memory', 'llm-memory.json');
const METRICS_FILE = path.join(__dirname, '..', 'memory', 'metrics.json');

class TaskComplexityAnalyzer {
  constructor() {
    this.COMPLEX_INDICATORS = [
      'analyze', 'analysis', 'strategic', 'implications', 'evaluate',
      'assess', 'compare', 'contrast', 'reasoning', 'justify',
      'draft', 'write', 'compose', 'create', 'blog post', 'article',
      'thread', 'essay', 'story', 'creative',
      'code', 'program', 'function', 'debug', 'implement',
      'algorithm', 'refactor', 'optimize',
      'multi-step', 'complex', 'detailed plan', 'comprehensive',
      'in-depth', 'nuanced', 'sophisticated',
      'recommend', 'decide', 'choose', 'best approach', 'strategy'
    ];

    this.SIMPLE_INDICATORS = [
      'summarize', 'summary', 'brief', 'tldr', 'overview',
      'key points', 'main ideas',
      'extract', 'list', 'find', 'get', 'show', 'what is',
      'who is', 'when', 'where',
      'how many', 'count', 'total', 'search', 'lookup',
      'query', 'filter', 'sort',
      'format', 'convert', 'parse', 'clean'
    ];

    this.DB_QUERY_PATTERNS = [
      /athletes?\s+(with|over|under|have)/i,
      /(find|show|get|list)\s+athletes?/i,
      /(how many|count)\s+/i,
      /contracts?\s+(over|under|above|below)/i,
      /(search|query|filter)\s+(for|by|in)/i,
      /database|db|query|sql/i
    ];
  }

  analyze(prompt) {
    const promptLower = prompt.toLowerCase();
    const words = prompt.split(/\s+/);

    let complexScore = this.COMPLEX_INDICATORS.filter(k => promptLower.includes(k)).length;
    let simpleScore = this.SIMPLE_INDICATORS.filter(k => promptLower.includes(k)).length;

    const isDbQuery = this.DB_QUERY_PATTERNS.some(p => p.test(promptLower));

    const wordCount = words.length;
    const lengthFactor = Math.min(wordCount / 100, 1.0);

    let complexity = (complexScore * 0.4 +
               lengthFactor * 0.2 +
               (isDbQuery ? 0 : 0.2) -
               simpleScore * 0.2);

    complexity = Math.max(0, Math.min(1, complexity));

    if (isDbQuery) {
      return { useLocal: true, confidence: 0.95, reason: 'Database query detected', complexityScore: 0.2 };
    } else if (simpleScore > complexScore && complexity < 0.4) {
      return { useLocal: true, confidence: 0.8, reason: 'Simple task detected', complexityScore: complexity };
    } else if (complexScore > simpleScore && complexity > 0.6) {
      return { useLocal: false, confidence: 0.85, reason: 'Complex task requiring advanced reasoning', complexityScore: complexity };
    } else if (wordCount > 200) {
      return { useLocal: false, confidence: 0.7, reason: 'Long prompt requiring Claude API', complexityScore: complexity };
    }
    return { useLocal: true, confidence: 0.6, reason: 'Borderline task - trying local first', complexityScore: complexity };
  }
}

class MetricsCollector {
  constructor() {
    this.metrics = this.load();
  }

  load() {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
      }
    } catch {}
    return { requests: [], daily: {} };
  }

  save() {
    try {
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
    } catch {}
  }

  log(provider, success, durationMs, tokens, costUsd) {
    const entry = {
      timestamp: Date.now(),
      provider,
      success,
      durationMs,
      tokens,
      costUsd
    };
    this.metrics.requests.push(entry);

    const today = new Date().toISOString().split('T')[0];
    if (!this.metrics.daily[today]) {
      this.metrics.daily[today] = { ollama: 0, claude: 0, cost: 0, errors: 0 };
    }

    if (provider === 'ollama') this.metrics.daily[today].ollama++;
    if (provider === 'claude') {
      this.metrics.daily[today].claude++;
      this.metrics.daily[today].cost += costUsd;
    }
    if (!success) this.metrics.daily[today].errors++;

    this.save();
  }

  getStats(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recent = this.metrics.requests.filter(r => r.timestamp > cutoff);

    const totals = { ollama: 0, claude: 0, errors: 0, totalDuration: 0, totalCost: 0 };
    recent.forEach(r => {
      if (r.provider === 'ollama') totals.ollama++;
      if (r.provider === 'claude') totals.claude++;
      if (!r.success) totals.errors++;
      totals.totalDuration += r.durationMs;
      totals.totalCost += r.costUsd;
    });

    return {
      ...totals,
      avgResponseTime: recent.length ? Math.round(totals.totalDuration / recent.length) : 0,
      successRate: recent.length ? ((recent.length - totals.errors) / recent.length * 100).toFixed(1) : 100,
      daily: this.metrics.daily
    };
  }
}

class OllamaManager {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.defaultModel = 'llama3.1:8b';
    this.lastActivity = Date.now();
    this.idleTimeoutMs = 30 * 60 * 1000;
    this.systemContext = this.loadSystemContext();
  }

  loadSystemContext() {
    const MAX_CONTEXT = 4000;

    const soul = () => {
      try {
        const f = path.join(__dirname, '..', 'SOUL.md');
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').substring(0, 800) : '';
      } catch { return ''; }
    };

    const user = () => {
      try {
        const f = path.join(__dirname, '..', 'USER.md');
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').substring(0, 600) : '';
      } catch { return ''; }
    };

    const agents = () => {
      try {
        const f = path.join(__dirname, '..', 'AGENTS.md');
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').substring(0, 800) : '';
      } catch { return ''; }
    };

    const system = `SYSTEM: Terry's Jett Automation
- 21M Sports: Auto research contracts → tweets
- 21M Bitcoin: Auto Bitcoin education content  
- eBay Scanner: Daily card deals (Mon-Sun)
- Health Monitor: Auto-fix every 15 min
- Task Manager: localhost:3000
- Slack: Primary interface

SCHEDULE:
- 2:00 AM - Sports research
- 2:30 AM - Bitcoin research
- 3:00 AM - Content gen
- 8:00 AM - eBay scan
- Continuous - Health checks`;

    let context = `You are Jett, Terry Huang Jr.'s AI assistant.

=== SOUL (Identity) ===
${soul()}

=== USER (Terry) ===
${user()}

=== RULES ===
${agents()}

=== SYSTEM ===
${system}

Respond: concise, never fabricate, Jett's voice.

USER: {prompt}`;

    if (context.length > MAX_CONTEXT) {
      context = context.substring(0, MAX_CONTEXT - 100) + '...\n(Truncated)';
    }

    return context;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  async isAvailable() {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/tags`, { timeout: 2000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  async getLoadedModels() {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/tags`, { timeout: 2000 }, (res) => {
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
    });
  }

  async unloadModel(modelName) {
    this.touch();
    return new Promise((resolve) => {
      const postData = JSON.stringify({ name: modelName });
      const req = http.request(`${this.baseUrl}/api/unload`, {
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

  async checkIdleAndUnload() {
    const models = await this.getLoadedModels();
    if (models.length > 0 && (Date.now() - this.lastActivity) > this.idleTimeoutMs) {
      for (const model of models) {
        if (model.name !== this.defaultModel) {
          console.log(`[Ollama Manager] Unloading idle model: ${model.name}`);
          await this.unloadModel(model.name);
        }
      }
    }
  }

  async query(prompt, options = {}) {
    this.touch();
    const targetModel = options.model || this.defaultModel;

    const enhancedPrompt = options.skipContext
      ? prompt
      : this.systemContext.replace('{prompt}', prompt);

    const postData = JSON.stringify({
      model: targetModel,
      prompt: enhancedPrompt,
      stream: false,
      options: { temperature: options.temperature || 0.7 }
    });

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = http.request({
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: 180000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const elapsed = Date.now() - startTime;
            if (response.response) {
              resolve({ success: true, response: response.response, model: targetModel, timeMs: elapsed, tokens: response.eval_count || 0 });
            } else {
              reject(new Error('No response from Ollama'));
            }
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(postData);
      req.end();
    });
  }
}

class LLMRouter {
  constructor() {
    this.analyzer = new TaskComplexityAnalyzer();
    this.ollama = new OllamaManager();
    this.metrics = new MetricsCollector();
  }

  async queryClaude(message, sessionId) {
    const startTime = Date.now();
    const escapedMessage = message.replace(/'/g, "'\\''");
    const cmd = `${process.env.HOME}/.nvm/versions/node/v22.22.0/bin/clawdbot agent --session-id "${sessionId}" --message '${escapedMessage}' --json`;

    try {
      const output = require('child_process').execSync(cmd, {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      });

      const result = JSON.parse(output.trim());
      const elapsed = Date.now() - startTime;

      if (result.status === 'ok' && result.result?.payloads?.length > 0) {
        const costEstimate = (message.length / 1000) * 0.003;
        this.metrics.log('claude', true, elapsed, 0, costEstimate);
        return { success: true, response: result.result.payloads[0].text, provider: 'claude', model: 'claude-sonnet-4.5', timeMs: elapsed };
      }
      throw new Error('No payload');
    } catch (error) {
      this.metrics.log('claude', false, Date.now() - startTime, 0, 0);
      return { success: false, error: error.message, provider: 'claude' };
    }
  }

  async route(message, sessionId, options = {}) {
    if (options.forceAPI) {
      console.log('🔵 Forced to Claude API');
      return this.queryClaude(message, sessionId);
    }

    if (options.forceLocal) {
      console.log('🟢 Forced to Ollama');
      const available = await this.ollama.isAvailable();
      if (available) {
        try {
          return await this.ollama.query(message, options);
        } catch (error) {
          console.log(`⚠️ Ollama failed: ${error.message}, falling back`);
          return this.queryClaude(message, sessionId);
        }
      }
      return this.queryClaude(message, sessionId);
    }

    console.log('🔍 Analyzing message complexity...');
    const analysis = this.analyzer.analyze(message);
    console.log(`   Complexity: ${analysis.complexityScore.toFixed(2)}, Confidence: ${analysis.confidence.toFixed(2)}`);
    console.log(`   Decision: ${analysis.useLocal ? 'LOCAL (Ollama)' : 'API (Claude)'}`);

    if (analysis.useLocal) {
      const ollamaAvailable = await this.ollama.isAvailable();
      if (ollamaAvailable) {
        try {
          console.log('🟢 Routing to Ollama...');
          const result = await this.ollama.query(message, options);
          console.log(`   ✓ Response in ${result.timeMs}ms`);
          this.metrics.log('ollama', true, result.timeMs, result.tokens, 0);
          result.routingReason = analysis.reason;
          result.complexityScore = analysis.complexityScore;
          return result;
        } catch (error) {
          console.log(`   ✗ Ollama failed: ${error.message}, falling back`);
          return this.queryClaude(message, sessionId);
        }
      }
      console.log('⚠️ Ollama not available');
      return this.queryClaude(message, sessionId);
    }

    console.log('🔵 Routing to Claude API...');
    const result = await this.queryClaude(message, sessionId);
    if (result.success) {
      console.log(`   ✓ Response in ${result.timeMs}ms`);
    } else {
      console.log(`   ✗ Claude failed: ${result.error}`);
    }
    result.routingReason = analysis.reason;
    result.complexityScore = analysis.complexityScore;
    return result;
  }

  getStats() {
    return this.metrics.getStats();
  }

  async checkIdle() {
    await this.ollama.checkIdleAndUnload();
  }
}

module.exports = { LLMRouter, TaskComplexityAnalyzer, MetricsCollector, OllamaManager };

if (require.main === module) {
  const router = new LLMRouter();
  const message = process.argv[2];
  const sessionId = process.argv[3] || 'cli-test';

  if (!message) {
    console.error('Usage: node llm-router.js "Your message" [session-id]');
    process.exit(1);
  }

  if (process.argv[2] === '--stats') {
    console.log('📊 LLM Router Statistics:');
    console.log(JSON.stringify(router.getStats(), null, 2));
    process.exit(0);
  }

  if (process.argv[2] === '--check-idle') {
    router.checkIdle().then(() => process.exit(0));
    return;
  }

  router.route(message, sessionId).then(result => {
    console.log('\n--- Result ---');
    console.log(`Success: ${result.success}`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Time: ${result.timeMs}ms`);
    if (result.response) console.log(`\n${result.response}`);
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
