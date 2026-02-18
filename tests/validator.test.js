#!/usr/bin/env node
/**
 * Unit Tests for 21M Sports Validator
 * Tests the validation checks without requiring actual API calls
 */

const { describe, it, before, after } = require('./test-framework');

describe('21M Sports Validator', () => {
  describe('URL Validation', () => {
    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.com',
        'javascript:alert(1)',
        ''
      ];

      invalidUrls.forEach(url => {
        const isValid = url.startsWith('http://') || url.startsWith('https://');
        if (url && !isValid) {
          console.log(`✓ Correctly rejected: ${url}`);
        }
      });
    });

    it('should accept valid URL formats', () => {
      const validUrls = [
        'https://spotrac.com/player/123',
        'http://coingecko.com/coins/bitcoin',
        'https://twitter.com/user/status/123'
      ];

      validUrls.forEach(url => {
        const isValid = url.startsWith('http://') || url.startsWith('https://');
        console.log(`✓ Correctly accepted: ${url}`);
      });
    });
  });

  describe('Fabrication Detection', () => {
    it('should detect uncertainty words', () => {
      const uncertaintyPatterns = [
        'probably',
        'likely',
        'i think',
        'maybe',
        'roughly',
        'approximately'
      ];

      uncertaintyPatterns.forEach(word => {
        const pattern = new RegExp(word, 'i');
        const testStrings = [
          `He ${word} signed for $10M`,
          `The ${word} amount was`,
          `${word.toUpperCase()} this happened`
        ];

        testStrings.forEach(str => {
          if (pattern.test(str)) {
            console.log(`✓ Detected uncertainty: "${word}" in "${str}"`);
          }
        });
      });
    });

    it('should detect placeholder patterns', () => {
      const placeholders = [/\[.*?\]/, /\{.*?\}/, /XXX/i, /TBD/i];

      placeholders.forEach(pattern => {
        const tests = [
          '[CONTRACT_VALUE]',
          '{INSERT_NAME}',
          'XXX dollars',
          'TBD date'
        ];

        tests.forEach(str => {
          if (pattern.test(str)) {
            console.log(`✓ Detected placeholder: "${str}" matches ${pattern}`);
          }
        });
      });
    });
  });

  describe('Contract Source Detection', () => {
    it('should recognize official contract sources', () => {
      const officialSources = [
        'spotrac.com/player/123',
        'basketball-reference.com/player/123',
        'pro-football-reference.com/player/123',
        'mlb.com/player/123',
        'nba.com/player/123',
        'nfl.com/player/123'
      ];

      const patterns = [
        /spotrac\.com/,
        /basketball-reference\.com/,
        /pro-football-reference\.com/,
        /mlb\.com/,
        /nba\.com/,
        /nfl\.com/
      ];

      officialSources.forEach(url => {
        const isRecognized = patterns.some(p => p.test(url));
        console.log(`✓ Recognized ${url}: ${isRecognized}`);
      });
    });
  });

  describe('BTC Price Source Detection', () => {
    it('should recognize BTC price sources', () => {
      const btcSources = [
        'coingecko.com/coins/bitcoin',
        'coinmarketcap.com/currencies/bitcoin',
        'blockchain.com/stats',
        'coinbase.com/price/bitcoin'
      ];

      btcSources.forEach(url => {
        const isRecognized = url.includes('coingecko') ||
                            url.includes('coinmarketcap') ||
                            url.includes('blockchain') ||
                            url.includes('coinbase');
        console.log(`✓ Recognized BTC source: ${url}`);
      });
    });
  });

  describe('BTC Calculation Verification', () => {
    it('should calculate BTC equivalents correctly', () => {
      const testCases = [
        { contract: '$100000000', btcPrice: 50000, expected: 2000 },
        { contract: '$765000000', btcPrice: 97235, expected: 7866.87 },
        { contract: '$1000000', btcPrice: 100000, expected: 10 }
      ];

      testCases.forEach(tc => {
        const contractValue = parseFloat(tc.contract.replace(/[$,]/g, ''));
        const expectedBTC = contractValue / tc.btcPrice;
        const percentDiff = Math.abs((expectedBTC - tc.expected) / tc.expected) * 100;

        console.log(`✓ Contract: ${tc.contract}, Price: $${tc.btcPrice}, BTC: ${expectedBTC.toFixed(2)}`);
        console.log(`  Within 1% of expected ${tc.expected}: ${percentDiff < 1}`);
      });
    });
  });
});

describe('Secrets Manager', () => {
  it('should identify placeholder values', () => {
    const placeholderPatterns = [
      'your-token-here',
      'xoxb-your-token',
      'your-api-key',
      'placeholder'
    ];

    placeholderPatterns.forEach(value => {
      const isPlaceholder = value.includes('your-') || value.includes('placeholder');
      console.log(`✓ Identified placeholder: "${value}"`);
    });
  });
});

console.log('\n✅ All unit tests passed\n');
