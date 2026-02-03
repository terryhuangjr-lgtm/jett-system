#!/usr/bin/env node
/**
 * LLM Bridge - Smart routing between Ollama and Claude API
 * Integrates Python LLM router with Node.js clawdbot system
 */

const { execSync } = require('child_process');
const https = require('https');

class LLMBridge {
  constructor() {
    this.OLLAMA_URL = 'http://localhost:11434';
    this.DEFAULT_MODEL = 'llama3.2:1b'; // Fast, lightweight model
    this.FALLBACK_MODEL = 'llama3.2:3b'; // More capable fallback
  }

  /**
   * Analyze message complexity using Python router
   */
  analyzeComplexity(message) {
    try {
      const escapedMessage = message.replace(/'/g, "'\\''").replace(/\n/g, ' ');

      const result = execSync(`python3 -c "
from llm_router import TaskComplexityAnalyzer
import json
analyzer = TaskComplexityAnalyzer()
result = analyzer.analyze('${escapedMessage}')
print(json.dumps(result))
"`, { encoding: 'utf8', timeout: 5000 });

      return JSON.parse(result.trim());
    } catch (error) {
      console.error('⚠️  Complexity analysis failed:', error.message);
      // Default to API on error
      return {
        use_local: false,
        confidence: 0.5,
        reason: 'Analysis failed, using Claude API',
        complexity_score: 1.0
      };
    }
  }

  /**
   * Check if Ollama is available
   */
  async isOllamaAvailable() {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get(`${this.OLLAMA_URL}/api/tags`, { timeout: 2000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Query Ollama local LLM
   */
  async queryOllama(message, model = null) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const targetModel = model || this.DEFAULT_MODEL;

      const postData = JSON.stringify({
        model: targetModel,
        prompt: message,
        stream: false,
        options: {
          temperature: 0.7
        }
      });

      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 60000
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const elapsed = Date.now() - startTime;

            if (response.response) {
              resolve({
                success: true,
                response: response.response,
                provider: 'ollama',
                model: targetModel,
                time_ms: elapsed,
                tokens: response.eval_count || 0
              });
            } else {
              reject(new Error('No response from Ollama'));
            }
          } catch (err) {
            reject(new Error(`Failed to parse Ollama response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Query Claude API via clawdbot
   */
  async queryClaudeAPI(message, sessionId) {
    try {
      const startTime = Date.now();

      // Escape single quotes for shell
      const escapedMessage = message.replace(/'/g, "'\\''");

      const cmd = `clawdbot agent --channel slack --session-id "${sessionId}" --message '${escapedMessage}' --json`;

      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      const result = JSON.parse(output.trim());
      const elapsed = Date.now() - startTime;

      if (result.status === 'ok' && result.result && result.result.payloads && result.result.payloads.length > 0) {
        return {
          success: true,
          response: result.result.payloads[0].text,
          provider: 'claude',
          model: 'claude-sonnet-4.5',
          time_ms: elapsed
        };
      } else {
        return {
          success: false,
          error: 'No response payload from Claude API',
          provider: 'claude'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'claude'
      };
    }
  }

  /**
   * Main routing function - analyzes and routes to appropriate LLM
   */
  async route(message, sessionId, options = {}) {
    const startTime = Date.now();

    // Check if we should force a specific provider
    if (options.forceAPI) {
      console.log('🔵 Forced to Claude API');
      return await this.queryClaudeAPI(message, sessionId);
    }

    if (options.forceLocal) {
      console.log('🟢 Forced to Ollama');
      const ollamaAvailable = await this.isOllamaAvailable();
      if (ollamaAvailable) {
        try {
          return await this.queryOllama(message, options.model);
        } catch (error) {
          console.log('⚠️  Ollama failed, falling back to Claude API');
          return await this.queryClaudeAPI(message, sessionId);
        }
      } else {
        console.log('⚠️  Ollama not available, using Claude API');
        return await this.queryClaudeAPI(message, sessionId);
      }
    }

    // Analyze complexity
    console.log('🔍 Analyzing message complexity...');
    const analysis = this.analyzeComplexity(message);

    console.log(`   Complexity: ${analysis.complexity_score.toFixed(2)}`);
    console.log(`   Confidence: ${analysis.confidence.toFixed(2)}`);
    console.log(`   Decision: ${analysis.use_local ? 'LOCAL (Ollama)' : 'API (Claude)'}`);
    console.log(`   Reason: ${analysis.reason}`);

    // Route based on analysis
    if (analysis.use_local) {
      // Try Ollama first
      const ollamaAvailable = await this.isOllamaAvailable();

      if (ollamaAvailable) {
        try {
          console.log('🟢 Routing to Ollama (local LLM)...');
          const result = await this.queryOllama(message, options.model);

          console.log(`   ✓ Response from Ollama in ${result.time_ms}ms`);

          // Calculate estimated savings
          const estimatedClaudeCost = (message.length / 1000) * 0.003; // Rough estimate
          result.savings_usd = estimatedClaudeCost;
          result.routing_reason = analysis.reason;
          result.complexity_score = analysis.complexity_score;

          return result;
        } catch (error) {
          console.log(`   ✗ Ollama failed: ${error.message}`);
          console.log('   ↪ Falling back to Claude API');
          return await this.queryClaudeAPI(message, sessionId);
        }
      } else {
        console.log('⚠️  Ollama not available, using Claude API');
        return await this.queryClaudeAPI(message, sessionId);
      }
    } else {
      // Route to Claude API
      console.log('🔵 Routing to Claude API (complex task)...');
      const result = await this.queryClaudeAPI(message, sessionId);

      if (result.success) {
        console.log(`   ✓ Response from Claude API in ${result.time_ms}ms`);
      } else {
        console.log(`   ✗ Claude API failed: ${result.error}`);
      }

      result.routing_reason = analysis.reason;
      result.complexity_score = analysis.complexity_score;
      result.savings_usd = 0;

      return result;
    }
  }

  /**
   * Log usage statistics
   */
  logUsage(result) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: result.provider,
        model: result.model || 'unknown',
        success: result.success,
        time_ms: result.time_ms,
        savings_usd: result.savings_usd || 0,
        complexity: result.complexity_score || 0
      };

      // Append to usage log
      const fs = require('fs');
      const logFile = '/tmp/llm-usage.jsonl';
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Fail silently - logging shouldn't break main flow
    }
  }
}

// Export for use in other modules
module.exports = LLMBridge;

// CLI usage
if (require.main === module) {
  const message = process.argv[2];
  const sessionId = process.argv[3] || 'cli-test';

  if (!message) {
    console.error('Usage: node llm-bridge.js "Your message here" [session-id]');
    process.exit(1);
  }

  console.log('LLM Bridge - Testing\n');

  const bridge = new LLMBridge();

  bridge.route(message, sessionId)
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
