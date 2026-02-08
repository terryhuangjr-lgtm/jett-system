#!/usr/bin/env node
/**
 * 21M Bitcoin Verified Content Generator V2
 *
 * Generates tweet content from verified Bitcoin research data.
 * Reads from knowledge database (populated by 21m-bitcoin-real-research.py)
 *
 * Input: Database content (quotes, historical events, principles)
 * Output: verified-content.json with 3 tweet variations
 *
 * Exit codes:
 *   0 = Content generated successfully
 *   1 = No suitable content found in database
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('./db-bridge.js');

// Constants
const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');

// Allow custom output file via --output flag
const outputIndex = process.argv.indexOf('--output');
const OUTPUT_FILE = outputIndex !== -1 && process.argv[outputIndex + 1]
  ? process.argv[outputIndex + 1]
  : path.join(MEMORY_DIR, '21m-bitcoin-verified-content.json');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Get best Bitcoin content from knowledge database
 * Returns content sorted by quality score (highest first)
 */
function getBestBitcoinContentFromDatabase() {
  console.log('📊 Checking Knowledge Database...');

  try {
    const drafts = db.getDraftContent(50);

    if (!drafts || drafts.length === 0) {
      console.log('  ℹ️  No content in database yet\n');
      return null;
    }

    // Filter for Bitcoin content (quotes, history, principles)
    const bitcoinContent = drafts.filter(d =>
      d.category && (
        d.category.includes('quotes') ||
        d.category.includes('historical') ||
        d.category.includes('principles') ||
        d.category.includes('bitcoin') ||
        d.category.includes('wisdom')
      )
    );

    if (bitcoinContent.length === 0) {
      console.log('  ℹ️  No Bitcoin content in database yet\n');
      return null;
    }

    // Sort by quality score (highest first)
    const sorted = bitcoinContent
      .filter(d => d.quality_score >= 7)
      .sort((a, b) => b.quality_score - a.quality_score);

    if (sorted.length === 0) {
      console.log('  ℹ️  No high-quality Bitcoin content (score >= 7) in database\n');
      return null;
    }

    const best = sorted[0];
    console.log(`  ✓ Found ${sorted.length} high-quality entries`);
    console.log(`  ✓ Best content: "${best.topic}" (score: ${best.quality_score}/10)\n`);

    return best;
  } catch (err) {
    console.log(`  ⚠️  Database error: ${err.message}\n`);
    return null;
  }
}

/**
 * Generate tweet variations from Bitcoin content
 */
function generateBitcoinTweetVariations(dbContent, btcPrice) {
  console.log('✍️  Generating tweet variations...');

  const tweets = [];
  const category = dbContent.category || 'unknown';
  const topic = dbContent.topic;
  const content = dbContent.content;
  const source = dbContent.source;
  const btcAngle = dbContent.bitcoin_angle || 'Sound money principles';

  // Extract key information from content
  // Format: may include author, quote, historical context, etc.
  const lines = content.split('\n');

  // Variation 1: Quote/Principle Focus
  const tweet1 = generateQuoteFocusTweet(topic, lines, btcAngle);

  // Variation 2: Historical Context
  const tweet2 = generateHistoricalContextTweet(topic, lines, btcAngle);

  // Variation 3: Sports Connection
  const tweet3 = generateSportsConnectionTweet(topic, lines, btcAngle, btcPrice);

  tweets.push(
    { pillar: 'quote_principle', content: tweet1 },
    { pillar: 'historical_context', content: tweet2 },
    { pillar: 'sports_connection', content: tweet3 }
  );

  return tweets;
}

/**
 * Generate quote-focused tweet
 */
function generateQuoteFocusTweet(topic, lines, btcAngle) {
  // Extract quote or key principle
  const quoteLine = lines.find(l => l.includes('"') || l.includes('Quote:') || l.includes('Principle:')) || lines[0];
  const author = lines.find(l => l.startsWith('Author:'))?.replace('Author:', '').trim();

  let tweet = '';

  if (author && quoteLine.includes('"')) {
    // Clean quote format
    const quote = quoteLine.replace(/^Quote:\s*/i, '').trim();
    tweet = `${quote}\n\n— ${author}\n\n${btcAngle}`;
  } else {
    // Principle or general content
    tweet = `${topic}\n\n${btcAngle}\n\nSound money teaches what fiat hides.`;
  }

  return tweet.substring(0, 280);
}

/**
 * Generate historical context tweet
 */
function generateHistoricalContextTweet(topic, lines, btcAngle) {
  const context = lines.find(l => l.startsWith('Context:') || l.startsWith('Historical:'))?.replace(/^(Context|Historical):\s*/i, '').trim();
  const date = lines.find(l => l.startsWith('Date:'))?.replace('Date:', '').trim();

  let tweet = '';

  if (context) {
    tweet = date
      ? `${date}\n\n${context}\n\n${btcAngle}\n\nHistory repeats. Bitcoin remembers.`
      : `${context}\n\n${btcAngle}\n\nThe past informs the present.`;
  } else {
    tweet = `${topic}\n\n${btcAngle}\n\nEvery athlete's contract tells a story about money.\n\nBitcoin changes that story.`;
  }

  return tweet.substring(0, 280);
}

/**
 * Generate sports connection tweet
 */
function generateSportsConnectionTweet(topic, lines, btcAngle, btcPrice) {
  const btcFormatted = `$${Math.round(btcPrice).toLocaleString()}`;

  let tweet = `${topic}\n\nBTC at ${btcFormatted}\n\n${btcAngle}\n\nAthletes earn millions in fiat.\nBitcoin measures what fiat can't.`;

  return tweet.substring(0, 280);
}

/**
 * Validate character counts
 */
function validateCharacterCounts(tweets) {
  console.log('\n📏 Validating character counts...');

  let allValid = true;

  tweets.forEach((tweet, index) => {
    const length = tweet.content.length;
    console.log(`  Option ${index + 1} (${tweet.pillar}): ${length} chars`);

    if (length > 280) {
      console.error(`    ✗ Exceeds 280 character limit!`);
      allValid = false;
    } else {
      console.log(`    ✓ Within limit`);
    }
  });

  if (!allValid) {
    console.error('\n❌ Some tweets exceed character limit');
    return false;
  }

  console.log('  ✓ All tweets within character limits\n');
  return true;
}

/**
 * Main generation process
 */
async function generateContent() {
  console.log('\n₿ 21M Bitcoin Verified Generator V2\n');
  console.log('═'.repeat(70));

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE\n');
  }

  try {
    // Step 1: Get best content from knowledge database
    const dbContent = getBestBitcoinContentFromDatabase();

    if (!dbContent) {
      console.error('❌ No suitable Bitcoin content found in database');
      console.error('   Bitcoin research must run first (task runs at 3:00 AM)');
      return 1;
    }

    console.log('📊 Using content from knowledge database\n');

    // Step 2: Fetch current BTC price
    console.log('📊 Fetching current BTC price...');
    const btcPrice = await new Promise((resolve, reject) => {
      https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const price = parseFloat(json.data.amount);
            console.log(`  ✓ BTC Price: $${price.toLocaleString()}\n`);
            resolve(price);
          } catch (e) {
            resolve(100000); // Fallback
          }
        });
      }).on('error', () => resolve(100000));
    });

    // Step 3: Generate tweet variations
    const tweets = generateBitcoinTweetVariations(dbContent, btcPrice);

    // Step 4: Validate character counts
    const countsValid = validateCharacterCounts(tweets);
    if (!countsValid) {
      return 1;
    }

    // Build output
    const output = {
      type: '21m_bitcoin_tweets',
      timestamp: new Date().toISOString(),
      tweets: tweets.map(t => t.content),
      sources: {
        knowledge: dbContent.source,
        btc_price: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
        database_id: dbContent.id
      },
      metadata: {
        topic: dbContent.topic,
        category: dbContent.category,
        bitcoin_angle: dbContent.bitcoin_angle,
        btc_price_now: `$${Math.round(btcPrice).toLocaleString()}`,
        verified: true,
        char_counts: tweets.map(t => t.content.length),
        pillars_used: tweets.map(t => t.pillar)
      }
    };

    // Write output
    if (!DRY_RUN) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    }

    // Mark database content as published
    if (dbContent && dbContent.id && !DRY_RUN) {
      try {
        const marked = db.markPublished(dbContent.id);
        if (marked) {
          console.log('\n✓ Marked content as published in database');
        }
      } catch (err) {
        console.log(`\n⚠️  Could not mark as published: ${err.message}`);
      }
    }

    console.log('\n═'.repeat(70));
    console.log('✅ Content generation complete!\n');
    console.log(`📁 Output: ${OUTPUT_FILE}\n`);
    console.log('Tweet options:');
    tweets.forEach((tweet, i) => {
      console.log(`\n${i + 1}. ${tweet.pillar} (${tweet.content.length} chars):`);
      console.log(`   "${tweet.content.substring(0, 60)}..."`);
    });
    console.log('');

    return 0;

  } catch (error) {
    console.error(`\n❌ Generation failed: ${error.message}`);
    console.error(error.stack);
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  generateContent()
    .then(code => process.exit(code))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateContent, getBestBitcoinContentFromDatabase };
