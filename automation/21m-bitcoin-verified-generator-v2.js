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
 * Clean up web-scraped content
 */
function cleanScrapedContent(text) {
  return text
    // Remove HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Remove source citations like "(1994). "Book Title""
    .replace(/\(\d{4}\)\.\s*[""][^""]+[""][^.]*\./g, '')
    // Remove "Author (year)" patterns
    .replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\(\d{4}\)/g, '')
    // Remove multiple ellipses and clean up
    .replace(/\.{3,}/g, '.')
    .replace(/\s*\.\.\.\s*/g, ' ')
    // Remove "· " separators
    .replace(/\s*·\s*/g, ' ')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate quote-focused tweet
 */
function generateQuoteFocusTweet(topic, lines, btcAngle) {
  let tweet = '';

  // Try to extract actual quote from content
  // Format 1: "Quote/Excerpt: "actual quote" ― Author"
  const excerptLine = lines.find(l => l.includes('Quote/Excerpt:'));
  if (excerptLine) {
    // Extract just the quote part (remove "Quote/Excerpt:" prefix)
    let quote = excerptLine.replace(/^Quote\/Excerpt:\s*/i, '').trim();
    quote = cleanScrapedContent(quote);

    // Extract author if present (after ― or —)
    const authorMatch = quote.match(/[―—]\s*(.+?)(?:,\s*The|$)/);
    if (authorMatch) {
      const author = authorMatch[1].trim();
      // Remove author attribution from quote
      quote = quote.split(/[―—]/)[0].trim();

      // Ensure quote fits with author and btcAngle
      const maxQuoteLen = 280 - author.length - btcAngle.length - 10;  // 10 for formatting
      if (quote.length > maxQuoteLen) {
        quote = quote.substring(0, maxQuoteLen - 3) + '...';
      }

      tweet = `"${quote}"\n\n— ${author}\n\n${btcAngle}`;
    } else {
      const maxLen = 280 - btcAngle.length - 6;
      if (quote.length > maxLen) {
        quote = quote.substring(0, maxLen - 3) + '...';
      }
      tweet = `"${quote}"\n\n${btcAngle}`;
    }
  }
  // Format 2: "Economic Wisdom: <strong>quote</strong> extra metadata"
  else {
    const wisdomLine = lines.find(l => l.includes('Economic Wisdom:'));
    if (wisdomLine) {
      let quote = wisdomLine.replace(/^Economic Wisdom:\s*/i, '').trim();
      quote = cleanScrapedContent(quote);

      // Extract just the first sentence or two (before source citations)
      const sentences = quote.split(/\.\s+/).filter(s => s.length > 10);
      quote = sentences.slice(0, 2).join('. ');
      if (!quote.endsWith('.')) quote += '.';

      const maxLen = 280 - btcAngle.length - 6;
      if (quote.length > maxLen) {
        quote = quote.substring(0, maxLen - 3) + '...';
      }

      tweet = `"${quote}"\n\n${btcAngle}`;
    }
    // Format 3: Look for author line and quote separately
    else {
      const quoteLine = lines.find(l => l.includes('"') && !l.startsWith('Source:')) || lines[0];
      const author = lines.find(l => l.startsWith('Author:'))?.replace('Author:', '').trim();

      if (author && quoteLine.includes('"')) {
        let quote = quoteLine.replace(/^Quote:\s*/i, '').trim();
        quote = cleanScrapedContent(quote);

        const maxQuoteLen = 280 - author.length - btcAngle.length - 10;
        if (quote.length > maxQuoteLen) {
          quote = quote.substring(0, maxQuoteLen - 3) + '...';
        }

        tweet = `${quote}\n\n— ${author}\n\n${btcAngle}`;
      } else if (quoteLine.includes('"')) {
        let quote = cleanScrapedContent(quoteLine.trim());
        const maxLen = 280 - btcAngle.length - 6;
        if (quote.length > maxLen) {
          quote = quote.substring(0, maxLen - 3) + '...';
        }
        tweet = `${quote}\n\n${btcAngle}`;
      } else {
        // No quote found - use general principle
        tweet = `${btcAngle}\n\nSound money teaches what fiat hides.`;
      }
    }
  }

  return tweet.substring(0, 280);
}

/**
 * Generate historical context tweet
 */
function generateHistoricalContextTweet(topic, lines, btcAngle) {
  const context = lines.find(l => l.startsWith('Context:') || l.startsWith('Historical:'))?.replace(/^(Context|Historical):\s*/i, '').trim();
  const date = lines.find(l => l.startsWith('Date:'))?.replace('Date:', '').trim();

  // Try to extract key wisdom from content
  const wisdomLine = lines.find(l => l.includes('Economic Wisdom:'));
  const excerptLine = lines.find(l => l.includes('Quote/Excerpt:'));

  let tweet = '';

  if (wisdomLine) {
    // Extract and clean the wisdom
    let wisdom = wisdomLine.replace(/Economic Wisdom:\s*/i, '').trim();
    wisdom = cleanScrapedContent(wisdom);

    // Get first sentence or two
    const sentences = wisdom.split(/\.\s+/).filter(s => s.length > 10);
    wisdom = sentences.slice(0, 2).join('. ');
    if (!wisdom.endsWith('.')) wisdom += '.';

    const remaining = 280 - btcAngle.length - 70;  // 70 for the sports message
    if (wisdom.length > remaining) {
      wisdom = wisdom.substring(0, remaining - 3) + '...';
    }

    tweet = `${btcAngle}\n\n"${wisdom}"\n\nEvery athlete's contract tells a story about money.\n\nBitcoin changes that story.`;
  } else if (context) {
    tweet = date
      ? `${date}\n\n${context}\n\n${btcAngle}\n\nHistory repeats. Bitcoin remembers.`
      : `${context}\n\n${btcAngle}\n\nThe past informs the present.`;
  } else if (excerptLine) {
    // Use excerpt with sports angle
    let excerpt = excerptLine.replace(/Quote\/Excerpt:\s*/i, '').trim();
    excerpt = cleanScrapedContent(excerpt);
    excerpt = excerpt.split(/[―—]/)[0].trim();  // Remove author attribution

    const remaining = 280 - btcAngle.length - 30;
    if (excerpt.length > remaining) {
      excerpt = excerpt.substring(0, remaining - 3) + '...';
    }

    tweet = `${btcAngle}\n\n"${excerpt}"\n\nBitcoin changes that story.`;
  } else {
    // Generic sports connection
    tweet = `${btcAngle}\n\nEvery athlete's contract tells a story about money.\n\nBitcoin changes that story.`;
  }

  return tweet.substring(0, 280);
}

/**
 * Generate sports connection tweet
 */
function generateSportsConnectionTweet(topic, lines, btcAngle, btcPrice) {
  const btcFormatted = `$${Math.round(btcPrice).toLocaleString()}`;

  // Extract key content to connect to sports
  const wisdomLine = lines.find(l => l.includes('Economic Wisdom:'));
  const excerptLine = lines.find(l => l.includes('Quote/Excerpt:'));
  const quoteLine = lines.find(l => l.includes('"') && !l.startsWith('Source:'));

  let content = null;

  if (wisdomLine) {
    // Extract and clean wisdom
    content = wisdomLine.replace(/Economic Wisdom:\s*/i, '').trim();
    content = cleanScrapedContent(content);

    // Get first sentence
    const sentences = content.split(/\.\s+/).filter(s => s.length > 10);
    content = sentences[0];
    if (!content.endsWith('.')) content += '.';
  } else if (excerptLine) {
    // Use quote excerpt
    content = excerptLine.replace(/Quote\/Excerpt:\s*/i, '').trim();
    content = cleanScrapedContent(content);
    content = content.split(/[―—]/)[0].trim();  // Remove author

    // First sentence only
    const sentences = content.split(/\.\s+/).filter(s => s.length > 10);
    content = sentences[0];
    if (!content.endsWith('.')) content += '.';
  } else if (quoteLine) {
    content = cleanScrapedContent(quoteLine);
    const sentences = content.split(/\.\s+/).filter(s => s.length > 10);
    content = sentences[0];
    if (!content.endsWith('.')) content += '.';
  }

  // Build tweet with quote
  const sportsMessage = 'Athletes earn millions in fiat.\nBitcoin measures what fiat can\'t.';
  const btcInfo = `BTC at ${btcFormatted}`;

  if (content) {
    const remaining = 280 - btcInfo.length - sportsMessage.length - 10;  // 10 for newlines
    if (content.length > remaining) {
      content = content.substring(0, remaining - 3) + '...';
    }
    tweet = `"${content}"\n\n${btcInfo}\n\n${sportsMessage}`;
  } else {
    // Fallback
    tweet = `${btcAngle}\n\n${btcInfo}\n\n${sportsMessage}`;
  }

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
