#!/usr/bin/env node
/**
 * 21M Sports Tweet Deployment Script
 * Reads tweet variations and posts to #21msports channel
 */

const fs = require('fs');
const { execSync } = require('child_process');

const TWEET_FILE = process.argv[2] || '/tmp/21m-sports-tweet.json';
const SLACK_CHANNEL = 'C0ABK99L0B1'; // #21msports

// Audit log file
const AUDIT_LOG = '/home/clawd/clawd/memory/21m-sports-deployments.log';

// Check for --dry-run flag
const DRY_RUN = process.argv.includes('--dry-run');

try {
  console.log('📨 Deploying 21M Sports tweet to #21msports...');
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No actual posting\n');
  }

  // Check if file exists
  if (!fs.existsSync(TWEET_FILE)) {
    console.error(`✗ Tweet file not found: ${TWEET_FILE}`);
    process.exit(1);
  }

  // Read the tweets
  const data = JSON.parse(fs.readFileSync(TWEET_FILE, 'utf8'));

  // VERIFICATION CHECK: Ensure content is verified
  console.log('\n🔒 Running verification checks...');

  if (!data.metadata || !data.metadata.verified) {
    console.error('❌ VERIFICATION FAILED: Content is not marked as verified');
    console.error('   metadata.verified must be true');
    console.error('\n🚫 DEPLOYMENT BLOCKED - Content must be verified before posting\n');
    process.exit(1);
  }
  console.log('✓ Content is marked as verified');

  // Check for either contract (sports) or knowledge (bitcoin) source
  const primarySource = data.sources.contract || data.sources.knowledge;

  if (!data.sources || !primarySource || !data.sources.btc_price) {
    console.error('❌ VERIFICATION FAILED: Missing source URLs');
    console.error('   Required: sources.contract (or knowledge) and sources.btc_price');
    console.error('\n🚫 DEPLOYMENT BLOCKED - All sources must be documented\n');
    process.exit(1);
  }
  console.log('✓ Source URLs present:');
  if (data.sources.contract) {
    console.log(`   Contract: ${data.sources.contract}`);
  } else {
    console.log(`   Knowledge: ${data.sources.knowledge}`);
  }
  console.log(`   BTC Price: ${data.sources.btc_price}`);

  if (!primarySource.startsWith('http') || !data.sources.btc_price.startsWith('http')) {
    console.error('❌ VERIFICATION FAILED: Invalid source URLs');
    console.error('   URLs must start with http:// or https://');
    console.error('\n🚫 DEPLOYMENT BLOCKED - Source URLs must be valid\n');
    process.exit(1);
  }
  console.log('✓ Source URLs are valid');

  console.log('\n✅ All verification checks passed\n');

  if (!data.tweets || data.tweets.length === 0) {
    console.error('✗ No tweets found in file');
    process.exit(1);
  }

  // Format message with all 3 variations
  let message = `🏈 *21M Sports - Tweet Options*\n`;
  message += `_Generated at ${new Date(data.timestamp).toLocaleString()}_\n`;
  message += `✅ _Verified sources included_\n\n`;

  data.tweets.forEach((tweet, index) => {
    message += `*Option ${index + 1}* (${data.metadata.pillars_used[index]})\n`;
    message += `${tweet}\n`;
    message += `_Length: ${tweet.length} chars_\n\n`;
  });

  message += `\n📚 *Sources:*\n`;
  if (data.sources.contract) {
    message += `• Contract: ${data.sources.contract}\n`;
  } else {
    message += `• Knowledge: ${data.sources.knowledge}\n`;
  }
  message += `• BTC Price: ${data.sources.btc_price}\n`;
  message += `\n💡 Pick your favorite and post to X!`;

  console.log('\n--- Message Preview ---');
  console.log(message.substring(0, 400));
  console.log('...(truncated)\n');

  // Log deployment to audit trail
  const auditEntry = {
    timestamp: new Date().toISOString(),
    content_type: data.type, // "21m_sports_tweets" or "21m_bitcoin_tweets"
    player: data.metadata.player || null,
    contract_value: data.metadata.contract_value || null,
    btc_equivalent: data.metadata.btc_equivalent || null,
    bitcoin_content_type: data.metadata.content_type || null,
    bitcoin_title: data.metadata.title || null,
    sources: data.sources,
    verified: data.metadata.verified,
    dry_run: DRY_RUN
  };

  try {
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(auditEntry) + '\n');
    console.log('✓ Deployment logged to audit trail\n');
  } catch (err) {
    console.warn('⚠ Warning: Could not write to audit log:', err.message);
  }

  if (DRY_RUN) {
    console.log('✅ DRY RUN COMPLETE - Verification passed, would deploy to Slack\n');
    process.exit(0);
  }

  // Escape single quotes for shell
  const escapedMessage = message.replace(/'/g, "'\\''");

  // Post to Slack channel using clawdbot
  const cmd = `clawdbot message send --channel slack --target "${SLACK_CHANNEL}" --message '${escapedMessage}' --json`;

  const output = execSync(cmd, {
    encoding: 'utf8',
    timeout: 30000
  });

  const result = JSON.parse(output.trim());

  if (result.payload && result.payload.ok) {
    console.log('✓ Tweet options posted to #21msports');
    console.log('✓ Deployment complete with verified sources\n');
  } else {
    console.error('✗ Failed to post:', result.error || 'Unknown error');
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying tweet:', error.message);
  process.exit(1);
}
