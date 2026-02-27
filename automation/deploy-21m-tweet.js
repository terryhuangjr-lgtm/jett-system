#!/usr/bin/env node
/**
 * 21M Sports Tweet Deployment Script
 * Reads tweet variations and posts to #21msports channel
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const db = require(path.join(__dirname, 'db-bridge.js'));

// Can pass multiple potential filenames - will use the first that exists
const POTENTIAL_FILES = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const SLACK_CHANNEL = '#21msports'; // 21msports channel

// Audit log file
const AUDIT_LOG = '/home/clawd/clawd/memory/21m-sports-deployments.log';

// Check for --dry-run flag
const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
try {
  console.log('📨 Deploying 21M Sports tweet to #21msports...');
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No actual posting\n');
  }

  // Find first file that exists
  let TWEET_FILE = null;
  for (const file of POTENTIAL_FILES) {
    if (fs.existsSync(file)) {
      TWEET_FILE = file;
      console.log(`✓ Found content file: ${file}\n`);
      break;
    }
  }

  // Check if any file exists
  if (!TWEET_FILE) {
    console.error(`✗ No tweet files found. Checked:`);
    POTENTIAL_FILES.forEach(f => console.error(`   - ${f}`));
    console.error('\nContent generation may have failed. Check task logs.');
    process.exit(1);
  }

  // PRE-DEPLOYMENT VALIDATION
  console.log('🔒 Running pre-deployment validation...\n');

  const VALIDATOR = require('path').join(__dirname, '21m-sports-validator.js');
  try {
    execSync(`node "${VALIDATOR}" --content-file="${TWEET_FILE}"`, {
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('\n✓ Pre-deployment validation passed\n');
  } catch (validationError) {
    console.error('\n❌ PRE-DEPLOYMENT VALIDATION FAILED');
    console.error('🚫 DEPLOYMENT BLOCKED - Content must pass validation\n');
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

  // Check URLs - but allow "Database" and "Manual entry" as valid non-URL sources
  const validNonUrlSources = ['Database', 'Manual entry', 'N/A'];
  const isPrimarySourceValid = validNonUrlSources.includes(primarySource) || primarySource.startsWith('http');
  const isBtcPriceValid = data.sources.btc_price.startsWith('http');

  if (!isPrimarySourceValid || !isBtcPriceValid) {
    console.error('❌ VERIFICATION FAILED: Invalid source');
    if (!isPrimarySourceValid) {
      console.error('   Primary source must be a URL or "Database"/"Manual entry"');
    }
    if (!isBtcPriceValid) {
      console.error('   BTC price source must be a valid URL');
    }
    console.error('\n🚫 DEPLOYMENT BLOCKED - Invalid sources\n');
    process.exit(1);
  }
  console.log('✓ Source verification passed');

  console.log('\n✅ All verification checks passed\n');

  if (!data.tweets || data.tweets.length === 0) {
    console.error('✗ No tweets found in file');
    process.exit(1);
  }

  // Format message with all 3 variations
  let message = `🏈 *21M Sports - Tweet Options*\n`;
  message += `_Generated at ${new Date(data.timestamp).toLocaleString()}_\n`;
  message += `✅ *VERIFIED SOURCES* (web_search + API verification)\n\n`;

  data.tweets.forEach((tweet, index) => {
    const pillar = data.metadata.pillars_used ? data.metadata.pillars_used[index] : 'default';
    message += `*Option ${index + 1}* (${pillar}):\n`;
    message += `${tweet}\n`;
    message += `_Length: ${tweet.length} chars_\n\n`;
  });

  message += `\n📚 *VERIFIED SOURCES:*\n`;
  if (data.sources.contract) {
    message += `• Contract: ${data.sources.contract} ✓\n`;
  } else if (data.sources.knowledge) {
    message += `• Knowledge: ${data.sources.knowledge} ✓\n`;
  }
  message += `• BTC Price: ${data.sources.btc_price} ✓\n`;

  // Add additional sources if present
  if (data.sources.additional && data.sources.additional.length > 0) {
    data.sources.additional.forEach(src => {
      message += `• Additional: ${src} ✓\n`;
    });
  }

  message += `\n🔒 *Verification Method:* web_search + coingecko_api + url_check\n`;
  message += `💡 Pick your favorite and post to X!`;

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

  // Update usage tracking (only after real deployment)
  if (!DRY_RUN) {
    try {
      const { execSync } = require('child_process');
      execSync(`node "${path.join(__dirname, 'update-usage.js')}" "${TWEET_FILE}"`, { encoding: 'utf8' });
    } catch (e) {
      console.warn('⚠ Could not update usage tracking:', e.message);
    }
  }

  // Note: Usage tracking is now handled by 21m-generator.js --mark-used
  // Content is marked as used immediately after generation

  if (DRY_RUN) {
    console.log('✅ DRY RUN COMPLETE - Verification passed, would deploy to Slack\n');
    process.exit(0);
  }

  // Post to Slack channel using clawdbot
  function postToSlack(msg) {
    return new Promise((resolve, reject) => {
      const CLAWDBOT = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot';
      const escaped = msg.replace(/"/g, '\\"').replace(/`/g, '\\`');
      const { exec } = require('child_process');
      exec(
        `${CLAWDBOT} message send --channel slack --target "#21msports" --message "${escaped}" --json`,
        { timeout: 15000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('✗ Failed to post:', stderr || error.message);
            reject(error);
          } else {
            console.log('✓ Tweet options posted to #21msports');
            resolve(stdout);
          }
        }
      );
    });
  }

  try {
    await postToSlack(message);

    // Mark content as published in database (so it won't be reused)
    if (data.sources && data.sources.database_id) {
      const dbId = data.sources.database_id;
      console.log(`📝 Marking content ID ${dbId} as published in database...`);

      const marked = db.markPublished(dbId);
      if (marked) {
        console.log('✓ Content marked as published (will not be selected again)');
      } else {
        console.warn('⚠️  Warning: Could not mark content as published');
      }
    } else {
      console.log('ℹ️  No database_id found (manual content, not tracked)');
    }

    console.log('✓ Deployment complete with verified sources\n');
  } catch (postError) {
    console.error('Error posting to Slack:', postError.message);
    process.exit(1);
  }

} catch (error) {
  console.error('Error deploying tweet:', error.message);
  process.exit(1);
}
})().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
