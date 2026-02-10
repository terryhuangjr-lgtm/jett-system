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
    this.DEFAULT_MODEL = 'llama3.1:8b'; // Llama 3.1 8B - better quality
    this.FALLBACK_MODEL = 'llama3.1:8b'; // Same model for now
  }

  /**
   * Analyze message complexity using Python router
   * Uses base64 encoding to safely pass messages with quotes/special chars
   */
  analyzeComplexity(message) {
    try {
      // Use base64 to safely pass message (handles quotes, newlines, etc.)
      const messageBase64 = Buffer.from(message).toString('base64');

      const result = execSync(`python3 -c "
import base64
from llm_router import TaskComplexityAnalyzer
import json
# Decode base64 message
message = base64.b64decode('${messageBase64}').decode('utf-8')
analyzer = TaskComplexityAnalyzer()
result = analyzer.analyze(message)
print(json.dumps(result))
"`, {
        encoding: 'utf8',
        timeout: 5000,
        cwd: '/home/clawd/clawd'  // Run from correct directory to find llm_router.py
      });

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
  async queryOllama(message, model = null, queryOptions = {}) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const targetModel = model || this.DEFAULT_MODEL;

      // Inject context about Terry's setup (unless disabled)
      let enhancedPrompt = message;
      if (!queryOptions.skipContext) {
        const systemContext = `You are Jett, Terry's AI assistant with knowledge of his systems:

SYSTEMS & TOOLS:
- Task Manager: Terry uses a custom task management system to track work
- Athlete Database: Database tracking athletes, contracts, NIL deals, and sports data
- Contract Tracking: System for monitoring athlete contracts and values
- Sports Focus: College football, NFL, MLB, basketball (Shedeur Sanders, Juan Soto, etc.)

CONTEXT: Terry is a sports industry professional tracking athletes and contracts.
When he asks questions, he may be referring to HIS data, HIS systems, or previous conversations.

USER QUESTION: ${message}

Respond as Jett, considering the context above:`;

        enhancedPrompt = systemContext;
      }

      const postData = JSON.stringify({
        model: targetModel,
        prompt: enhancedPrompt,
        stream: false,
        options: {
          temperature: 0.7
        }
      });

      const requestOptions = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 180000 // 3 minutes - allows model load on first request
      };

      const req = http.request(requestOptions, (res) => {
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

      // Set socket timeout explicitly
      req.setTimeout(180000, () => {
        req.destroy();
        reject(new Error('Ollama socket timeout'));
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

      // Remove --channel slack to prevent clawdbot from auto-posting (slack-bridge handles posting)
      const cmd = `${process.env.HOME}/.nvm/versions/node/v22.22.0/bin/clawdbot agent --session-id "${sessionId}" --message '${escapedMessage}' --json`;

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
          return await this.queryOllama(message, options.model, options);
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
          console.log('🟢 Routing to Ollama (local LLM with context injection)...');
          const result = await this.queryOllama(message, options.model, options);

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
