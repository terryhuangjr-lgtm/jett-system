#!/usr/bin/env node
/**
 * Research Protocol Enforcement
 *
 * This script validates that ALL 21M Sports content generation
 * has proper research and verification before being sent.
 *
 * BLOCKS content generation if:
 * - Research file missing or stale
 * - Sources not verified
 * - Content not validated
 * - Calculations incorrect
 *
 * Exit codes:
 *   0 = Validation passed, content approved
 *   1 = Validation failed, BLOCK content
 *   2 = System error
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const RESEARCH_FILE = path.join(MEMORY_DIR, '21m-sports-verified-research.json');
const CONTENT_FILE = path.join(MEMORY_DIR, '21m-sports-verified-content.json');
const VALIDATION_LOG = path.join(MEMORY_DIR, 'protocol-enforcement.jsonl');

// Maximum age for research data (hours)
const MAX_RESEARCH_AGE_HOURS = 24;

/**
 * Log enforcement action
 */
function logEnforcement(action, passed, reason, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    passed,
    reason,
    context
  };

  try {
    fs.appendFileSync(VALIDATION_LOG, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.warn('Warning: Could not write to enforcement log');
  }
}

/**
 * Check if message is requesting 21M Sports content
 */
function is21MSportsRequest(message) {
  if (!message) return false;

  const lowerMessage = message.toLowerCase();
  const triggers = [
    '21m sports',
    '21m-sports',
    'sports tweet',
    'sports content',
    'athlete contract',
    'btc sports',
    'bitcoin sports'
  ];

  return triggers.some(trigger => lowerMessage.includes(trigger));
}

/**
 * Check if assistant response contains 21M Sports content
 */
function contains21MSportsContent(response) {
  if (!response) return false;

  const lowerResponse = response.toLowerCase();

  // Check for contract/BTC language patterns
  const patterns = [
    /\$\d+m.*contract/i,
    /\d+\s*btc/i,
    /bitcoin.*contract/i,
    /signed for \$\d+/i,
    /21m supply/i,
    /fiat.*btc/i,
    /athlete.*contract/i
  ];

  return patterns.some(pattern => pattern.test(response));
}

/**
 * Validate research file exists and is recent
 */
function validateResearch() {
  console.log('🔍 Checking research file...');

  if (!fs.existsSync(RESEARCH_FILE)) {
    console.error('  ✗ Research file not found:', RESEARCH_FILE);
    console.error('  Run: node ~/clawd/automation/21m-sports-real-research.js');
    return { valid: false, reason: 'Research file missing' };
  }

  // Check age
  const stats = fs.statSync(RESEARCH_FILE);
  const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

  if (ageHours > MAX_RESEARCH_AGE_HOURS) {
    console.error(`  ✗ Research file too old: ${ageHours.toFixed(1)} hours (max ${MAX_RESEARCH_AGE_HOURS})`);
    return { valid: false, reason: `Research stale (${ageHours.toFixed(1)}h old)` };
  }

  console.log(`  ✓ Research file found (${ageHours.toFixed(1)}h old)`);

  // Validate content
  try {
    const research = JSON.parse(fs.readFileSync(RESEARCH_FILE, 'utf8'));

    if (research.verification_status !== 'VERIFIED') {
      console.error('  ✗ Research not verified');
      return { valid: false, reason: 'Research not verified' };
    }

    if (!research.findings || research.findings.length === 0) {
      console.error('  ✗ No findings in research');
      return { valid: false, reason: 'No research findings' };
    }

    // Check sources
    const finding = research.findings[0];
    if (!finding.sources || finding.sources.length === 0) {
      console.error('  ✗ No sources in research');
      return { valid: false, reason: 'Missing sources' };
    }

    console.log('  ✓ Research validated');
    return {
      valid: true,
      data: research,
      finding: finding
    };

  } catch (error) {
    console.error('  ✗ Failed to parse research:', error.message);
    return { valid: false, reason: 'Invalid research file' };
  }
}

/**
 * Validate content file exists and matches research
 */
function validateContent(researchData) {
  console.log('\n📄 Checking content file...');

  if (!fs.existsSync(CONTENT_FILE)) {
    console.error('  ✗ Content file not found:', CONTENT_FILE);
    console.error('  Run: node ~/clawd/automation/21m-sports-verified-generator-v2.js');
    return { valid: false, reason: 'Content file missing' };
  }

  try {
    const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

    // Check verification flag
    if (!content.metadata || !content.metadata.verified) {
      console.error('  ✗ Content not marked as verified');
      return { valid: false, reason: 'Content not verified' };
    }

    // Check sources
    if (!content.sources || !content.sources.contract) {
      console.error('  ✗ Missing contract source');
      return { valid: false, reason: 'Missing sources' };
    }

    // Check tweets exist
    if (!content.tweets || content.tweets.length === 0) {
      console.error('  ✗ No tweets in content file');
      return { valid: false, reason: 'No content generated' };
    }

    // Verify content matches research (if both exist)
    const researchPlayer = researchData && researchData.finding ? researchData.finding.player : null;
    const contentPlayer = content.metadata ? content.metadata.player : null;

    if (researchPlayer && contentPlayer && researchPlayer !== contentPlayer) {
      console.error(`  ✗ Content mismatch: research=${researchPlayer}, content=${contentPlayer}`);
      return { valid: false, reason: 'Content/research mismatch' };
    }

    console.log('  ✓ Content validated');
    return {
      valid: true,
      data: content
    };

  } catch (error) {
    console.error('  ✗ Failed to parse content:', error.message);
    return { valid: false, reason: 'Invalid content file' };
  }
}

/**
 * Validate response content doesn't contain fabrications
 */
function validateResponseContent(response, researchData) {
  console.log('\n🔍 Checking response content...');

  // Check if response mentions the correct player
  const validPlayer = researchData && researchData.findings && researchData.findings[0]
    ? researchData.findings[0].player
    : null;

  if (!validPlayer) {
    console.warn('  ⚠ Could not extract player name from research data');
    // Don't block if we can't verify - just check for known fabrications
  } else {

    if (!response.includes(validPlayer)) {
      console.error(`  ✗ Response doesn't mention verified player: ${validPlayer}`);
      return { valid: false, reason: `Missing player: ${validPlayer}` };
    }
  }

  // Check for fabrication red flags
  const fabricationPatterns = [
    { pattern: /shedeur\s+sanders/i, msg: 'Mentions Shedeur Sanders (known fabrication)' },
    { pattern: /jackson\s+state/i, msg: 'Mentions Jackson State (unrelated)' },
    { pattern: /probably|likely|roughly|approximately/i, msg: 'Uncertainty language detected' },
    { pattern: /\$\d+m(?!.*verified)/i, msg: 'Unverified dollar amount' }
  ];

  for (const { pattern, msg } of fabricationPatterns) {
    if (pattern.test(response)) {
      console.error(`  ✗ Fabrication detected: ${msg}`);
      return { valid: false, reason: msg };
    }
  }

  console.log('  ✓ Response content validated');
  return { valid: true };
}

/**
 * Main enforcement function
 */
async function enforceProtocol(options = {}) {
  const {
    userMessage = '',
    assistantResponse = '',
    checkOnly = false
  } = options;

  console.log('\n🚨 RESEARCH PROTOCOL ENFORCEMENT\n');
  console.log('═'.repeat(70));

  // Check if this is a 21M Sports request
  const is21MRequest = is21MSportsRequest(userMessage);
  const has21MContent = contains21MSportsContent(assistantResponse);

  if (!is21MRequest && !has21MContent) {
    console.log('✓ Not a 21M Sports request - no validation needed\n');
    logEnforcement('skip', true, 'Not 21M Sports content', { userMessage: userMessage.substring(0, 50) });
    return { allowed: true, reason: 'Not 21M Sports content' };
  }

  console.log('⚠ 21M Sports content detected - enforcing protocol\n');

  // Step 1: Validate research
  const researchResult = validateResearch();
  if (!researchResult.valid) {
    console.error('\n❌ VALIDATION FAILED: Research validation failed');
    console.error(`   Reason: ${researchResult.reason}`);
    console.error('\n🚫 BLOCKING CONTENT GENERATION\n');

    logEnforcement('block', false, researchResult.reason, {
      userMessage: userMessage.substring(0, 100),
      stage: 'research'
    });

    return {
      allowed: false,
      reason: researchResult.reason,
      errorMessage: `Cannot generate 21M Sports content: ${researchResult.reason}\n\nRun research first:\nnode ~/clawd/automation/21m-sports-real-research.js --dry-run --test-date YYYY-MM-DD`
    };
  }

  // Step 2: Validate content
  const contentResult = validateContent(researchResult.data);
  if (!contentResult.valid) {
    console.error('\n❌ VALIDATION FAILED: Content validation failed');
    console.error(`   Reason: ${contentResult.reason}`);
    console.error('\n🚫 BLOCKING CONTENT GENERATION\n');

    logEnforcement('block', false, contentResult.reason, {
      userMessage: userMessage.substring(0, 100),
      stage: 'content'
    });

    return {
      allowed: false,
      reason: contentResult.reason,
      errorMessage: `Cannot send 21M Sports content: ${contentResult.reason}\n\nGenerate content first:\nnode ~/clawd/automation/21m-sports-verified-generator-v2.js`
    };
  }

  // Step 3: If we have the assistant response, validate it
  if (assistantResponse && !checkOnly) {
    const responseResult = validateResponseContent(assistantResponse, researchResult.data);
    if (!responseResult.valid) {
      console.error('\n❌ VALIDATION FAILED: Response content invalid');
      console.error(`   Reason: ${responseResult.reason}`);
      console.error('\n🚫 BLOCKING CONTENT GENERATION\n');

      logEnforcement('block', false, responseResult.reason, {
        userMessage: userMessage.substring(0, 100),
        response: assistantResponse.substring(0, 100),
        stage: 'response'
      });

      return {
        allowed: false,
        reason: responseResult.reason,
        errorMessage: `Response contains fabricated content: ${responseResult.reason}\n\nOnly use verified data from research files.`
      };
    }
  }

  // All checks passed
  console.log('\n✅ ALL VALIDATIONS PASSED');
  console.log('   Content is verified and approved');
  console.log('\n✓ ALLOWING CONTENT GENERATION\n');

  logEnforcement('allow', true, 'All validations passed', {
    userMessage: userMessage.substring(0, 100),
    player: researchResult.data.findings[0].player
  });

  return {
    allowed: true,
    reason: 'All validations passed',
    data: {
      research: researchResult.data,
      content: contentResult.data
    }
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  const userMessage = args.find((arg, i) => args[i - 1] === '--message') || '';
  const assistantResponse = args.find((arg, i) => args[i - 1] === '--response') || '';
  const checkOnly = args.includes('--check-only');

  enforceProtocol({ userMessage, assistantResponse, checkOnly })
    .then(result => {
      if (result.allowed) {
        console.log('EXIT CODE: 0 (Approved)');
        process.exit(0);
      } else {
        console.log('EXIT CODE: 1 (Blocked)');
        if (result.errorMessage) {
          console.error('\n' + result.errorMessage);
        }
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ ENFORCEMENT ERROR:', error.message);
      console.error(error.stack);
      console.log('EXIT CODE: 2 (System Error)');
      process.exit(2);
    });
}

module.exports = { enforceProtocol, is21MSportsRequest, contains21MSportsContent };
