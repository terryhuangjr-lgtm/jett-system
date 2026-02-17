#!/usr/bin/env node
/**
 * LLM Router Complexity Tests
 * Tests the complexity analyzer logic
 */

const { describe, it, assertEqual, assertTrue, assertFalse } = require('./test-runner');

class TaskComplexityAnalyzer {
  analyze(prompt) {
    const promptLower = prompt.toLowerCase();
    const complexIndicators = [
      'analyze', 'analysis', 'strategic', 'implications', 'evaluate',
      'assess', 'compare', 'contrast', 'reasoning', 'justify',
      'draft', 'write', 'compose', 'create', 'blog post',
      'article', 'thread', 'essay', 'story', 'creative',
      'code', 'program', 'function', 'debug', 'implement',
      'algorithm', 'refactor', 'optimize',
      'multi-step', 'complex', 'detailed plan', 'comprehensive',
      'in-depth', 'nuanced', 'sophisticated',
      'recommend', 'decide', 'choose', 'best approach', 'strategy'
    ];

    const simpleIndicators = [
      'summarize', 'summary', 'brief', 'tldr', 'overview',
      'key points', 'main ideas',
      'extract', 'list', 'find', 'get', 'show', 'what is',
      'who is', 'when', 'where',
      'how many', 'count', 'total', 'search', 'lookup',
      'query', 'filter', 'sort',
      'format', 'convert', 'parse', 'clean'
    ];

    const dbPatterns = [
      /athletes?\s+(with|over|under|have)/i,
      /(find|show|get|list)\s+athletes?/i,
      /(how many|count)\s+/i,
      /contracts?\s+(over|under|above|below)/i
    ];

    let complexScore = complexIndicators.filter(k => promptLower.includes(k)).length;
    let simpleScore = simpleIndicators.filter(k => promptLower.includes(k)).length;
    const isDbQuery = dbPatterns.some(p => p.test(promptLower));
    const wordCount = prompt.split(/\s+/).length;
    const lengthFactor = Math.min(wordCount / 100, 1.0);

    let complexity = (complexScore * 0.4 + lengthFactor * 0.2 + (isDbQuery ? 0 : 0.2) - simpleScore * 0.2);
    complexity = Math.max(0, Math.min(1, complexity));

    if (isDbQuery) return { useLocal: true, confidence: 0.95, reason: 'Database query', complexityScore: 0.2 };
    if (simpleScore > complexScore && complexity < 0.4) return { useLocal: true, confidence: 0.8, reason: 'Simple', complexityScore: complexity };
    if (complexScore > simpleScore && complexity > 0.6) return { useLocal: false, confidence: 0.85, reason: 'Complex', complexityScore: complexity };
    if (wordCount > 200) return { useLocal: false, confidence: 0.7, reason: 'Long prompt', complexityScore: complexity };
    return { useLocal: true, confidence: 0.6, reason: 'Borderline', complexityScore: complexity };
  }
}

const analyzer = new TaskComplexityAnalyzer();

describe('LLM Router Complexity Analyzer', () => {
  describe('Simple Queries', () => {
    it('should route "what is Bitcoin" to local', () => {
      const result = analyzer.analyze('What is Bitcoin?');
      assertTrue(result.useLocal, 'Simple query should use local LLM');
    });

    it('should route "summarize my notes" to local', () => {
      const result = analyzer.analyze('Summarize my notes');
      assertTrue(result.useLocal, 'Summarize should use local LLM');
    });

    it('should route "list athletes with contracts over 10M" to local', () => {
      const result = analyzer.analyze('List athletes with contracts over $10M');
      assertTrue(result.useLocal, 'DB query should use local LLM');
    });
  });

  describe('Complex Queries', () => {
    it('should route "analyze the strategic implications" to Claude API', () => {
      const result = analyzer.analyze('Analyze the strategic implications');
      assertFalse(result.useLocal, 'Complex analysis should use Claude API');
    });

    it('should route "write a blog post" to Claude API', () => {
      const result = analyzer.analyze('Write a comprehensive blog post');
      assertFalse(result.useLocal, 'Creative writing should use Claude API');
    });

    it('should route "debug this code" to Claude API', () => {
      const result = analyzer.analyze('Debug this function and optimize it');
      assertFalse(result.useLocal, 'Code debugging should use Claude API');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = analyzer.analyze('');
      assertTrue(result.useLocal, 'Empty string should default to local');
    });

    it('should handle very long prompts', () => {
      const longPrompt = 'word '.repeat(250);
      const result = analyzer.analyze(longPrompt);
      assertFalse(result.useLocal, 'Very long prompts should use Claude API');
    });

    it('should return confidence scores', () => {
      const result = analyzer.analyze('What is Bitcoin?');
      assertTrue(result.confidence > 0 && result.confidence <= 1, 'Confidence should be between 0 and 1');
    });
  });
});

console.log('\n✅ Complexity analyzer tests complete\n');
