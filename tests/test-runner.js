#!/usr/bin/env node
/**
 * Simple Test Framework
 * Minimal test runner for Jett's unit tests
 */

let passed = 0;
let failed = 0;

function describe(name, fn) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUITE: ${name}`);
  console.log('='.repeat(50));
  fn();
}

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${description}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected "${expected}", got "${actual}"`);
  }
}

function assertTrue(value, message = 'Expected true') {
  if (!value) {
    throw new Error(message);
  }
}

function assertFalse(value, message = 'Expected false') {
  if (value) {
    throw new Error(message);
  }
}

function assertMatch(text, regex, message = 'Pattern not found') {
  if (!regex.test(text)) {
    throw new Error(message);
  }
}

function assertThrows(fn, message = 'Expected function to throw') {
  try {
    fn();
    throw new Error(message);
  } catch (e) {
    if (e.message === message) throw e;
  }
}

module.exports = { describe, it, assertEqual, assertTrue, assertFalse, assertMatch, assertThrows };

console.log('JETT UNIT TESTS\n');

const tests = require('./validator.test.js');

console.log(`\n${'='.repeat(50)}`);
console.log('RESULTS');
console.log('='.repeat(50));
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
  process.exit(0);
}
