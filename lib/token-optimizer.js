#!/usr/bin/env node
/**
 * Token Optimizer - Minimize token usage in operations
 * Provides utilities to estimate, truncate, and optimize content
 */

const fs = require('fs');
const path = require('path');

class TokenOptimizer {
  // Estimate tokens (rough: 1 token ≈ 4 chars)
  static estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Truncate to max tokens
  static truncate(text, maxTokens = 1000) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n...[truncated]';
  }

  // Extract key lines (headers, important markers)
  static extractKeyLines(text, maxLines = 50) {
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;

    // Prioritize headers, timestamps, important markers
    const important = lines.filter(line =>
      line.startsWith('#') ||
      line.startsWith('##') ||
      line.match(/^\d{2}:\d{2}/) ||
      line.includes('TODO') ||
      line.includes('IMPORTANT') ||
      line.includes('❗')
    );

    if (important.length <= maxLines) return important.join('\n');
    return important.slice(0, maxLines).join('\n') + '\n...[truncated]';
  }

  // Summarize long content
  static summarize(text, maxTokens = 500) {
    const tokens = this.estimateTokens(text);
    if (tokens <= maxTokens) return text;

    // Take beginning and end
    const halfChars = (maxTokens * 4) / 2;
    const start = text.slice(0, halfChars);
    const end = text.slice(-halfChars);

    return `${start}\n\n...[content omitted, ${tokens - maxTokens} tokens]...\n\n${end}`;
  }

  // Get file content with smart loading
  static readFileSmart(filepath, maxTokens = 2000) {
    try {
      const stats = fs.statSync(filepath);
      const sizeKB = stats.size / 1024;
      const estimatedTokens = Math.ceil((stats.size / 4));

      if (estimatedTokens <= maxTokens) {
        // Small file, read fully
        return {
          content: fs.readFileSync(filepath, 'utf8'),
          truncated: false,
          tokens: estimatedTokens
        };
      } else {
        // Large file, read smartly
        const content = fs.readFileSync(filepath, 'utf8');
        const truncated = this.extractKeyLines(content, 100);
        return {
          content: truncated,
          truncated: true,
          tokens: this.estimateTokens(truncated),
          originalTokens: estimatedTokens
        };
      }
    } catch (err) {
      return { error: err.message };
    }
  }

  // Batch read multiple files efficiently
  static batchRead(filepaths, totalMaxTokens = 5000) {
    let remainingTokens = totalMaxTokens;
    const results = {};

    // First pass: get sizes
    const files = filepaths.map(fp => ({
      path: fp,
      size: fs.existsSync(fp) ? fs.statSync(fp).size : 0
    })).sort((a, b) => a.size - b.size); // Smallest first

    // Second pass: read with remaining budget
    for (const file of files) {
      if (remainingTokens <= 0) break;

      const tokensPerFile = Math.floor(remainingTokens / (files.length - Object.keys(results).length));
      const result = this.readFileSmart(file.path, tokensPerFile);

      if (!result.error) {
        results[file.path] = result;
        remainingTokens -= result.tokens;
      }
    }

    return results;
  }

  // Format for display with token count
  static format(text, showTokens = true) {
    const tokens = this.estimateTokens(text);
    if (!showTokens) return text;
    return `${text}\n\n[~${tokens} tokens]`;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'estimate':
      const text = args.slice(1).join(' ') || fs.readFileSync(0, 'utf8');
      console.log(TokenOptimizer.estimateTokens(text));
      break;

    case 'truncate':
      const input = fs.readFileSync(0, 'utf8');
      console.log(TokenOptimizer.truncate(input, parseInt(args[1]) || 1000));
      break;

    case 'smart':
      const result = TokenOptimizer.readFileSmart(args[1]);
      console.log(JSON.stringify(result, null, 2));
      break;

    default:
      console.log('Usage: token-optimizer.js [estimate|truncate|smart] <args>');
  }
}

module.exports = TokenOptimizer;
