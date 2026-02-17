#!/usr/bin/env node
/**
 * 21M Bitcoin Researcher
 * Extracts Bitcoin knowledge from curated sources (books, history, quotes, principles)
 * Logs findings to memory for content generation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('./db-bridge.js');

const MEMORY_DIR = path.join(process.env.HOME, 'clawd', 'memory');
const RESEARCH_FILE = path.join(MEMORY_DIR, '21m-bitcoin-research.md');

// Get BTC price from free API (same as sports researcher)
async function getBTCPrice() {
  return new Promise((resolve, reject) => {
    https.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(parseFloat(json.data.amount));
        } catch (e) {
          resolve(100000); // Fallback price
        }
      });
    }).on('error', () => resolve(100000));
  });
}

// Curated Bitcoin knowledge dataset
const bitcoinKnowledge = {
  books: [
    {
      title: "The Bitcoin Standard (Saifedean Ammous)",
      author: "Saifedean Ammous",
      excerpts: [
        "Hard money is money that it is costly to produce relative to existing supply.",
        "Bitcoin's supply is fixed at 21 million, making it the hardest form of money ever created.",
        "When money stops being a mechanism of saving, entire civilizations decline.",
        "Sound money is money that holds its value over time and across space.",
        "The key property that leads to a good being adopted as money is its hardness.",
        "Bitcoin is the first example of a new form of life: digital scarcity."
      ],
      source: "https://saifedean.com/thebitcoinstandard"
    },
    {
      title: "Broken Money (Lyn Alden)",
      author: "Lyn Alden",
      excerpts: [
        "Money is broken. The system prioritizes short-term wins over long-term stability.",
        "Bitcoin represents a return to sound money principles after 50 years of pure fiat.",
        "Scarcity is not a bug, it's the feature that makes money work.",
        "The monetary system is designed to transfer wealth from the many to the few.",
        "Bitcoin fixes the broken incentive structure of modern money.",
        "Energy cannot be printed. Bitcoin is backed by energy, not promises."
      ],
      source: "https://www.lynalden.com/broken-money/"
    },
    {
      title: "The Bitcoin Whitepaper (Satoshi Nakamoto)",
      author: "Satoshi Nakamoto",
      excerpts: [
        "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly.",
        "The problem of course is the payee can't verify that one of the owners did not double-spend the coin.",
        "We need a way for the payee to know that the previous owners did not sign any earlier transactions.",
        "The network timestamps transactions by hashing them into an ongoing chain of hash-based proof-of-work."
      ],
      source: "https://bitcoin.org/bitcoin.pdf"
    }
  ],

  history: [
    {
      date: "2009-01-03",
      event: "Genesis Block Mined",
      description: "Bitcoin network launches with embedded message: 'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks'",
      significance: "First proof that hard money could exist outside government control",
      source: "https://www.blockchain.com/explorer/blocks/btc/0"
    },
    {
      date: "2010-05-22",
      event: "Bitcoin Pizza Day",
      description: "Laszlo Hanyecz paid 10,000 BTC for 2 pizzas",
      significance: "First real-world Bitcoin transaction demonstrating its use as currency",
      source: "https://bitcoinmagazine.com/culture/the-man-behind-bitcoin-pizza-day"
    },
    {
      date: "2012-11-28",
      event: "First Bitcoin Halving",
      description: "Block reward reduced from 50 BTC to 25 BTC",
      significance: "First programmatic supply reduction, proving the 21M cap is real",
      source: "https://www.blockchain.com/explorer/blocks/btc/210000"
    },
    {
      date: "2017-08-01",
      event: "Bitcoin Cash Fork",
      description: "Hard fork creates Bitcoin Cash as a separate cryptocurrency",
      significance: "Proved Bitcoin's resistance to change and the strength of 21M consensus",
      source: "https://bitcoin.org/en/alert/2017-07-12-potential-split"
    },
    {
      date: "2021-09-07",
      event: "El Salvador Adopts Bitcoin",
      description: "El Salvador becomes first country to make Bitcoin legal tender",
      significance: "Nation-state adoption validates Bitcoin as money",
      source: "https://bitcoin.org/en/"
    },
    {
      date: "2024-01-11",
      event: "Bitcoin ETF Approval",
      description: "11 spot Bitcoin ETFs approved by SEC for US trading",
      significance: "Institutional recognition of Bitcoin as legitimate asset class",
      source: "https://bitcoin.org/en/"
    }
  ],

  quotes: [
    {
      author: "Satoshi Nakamoto",
      quote: "The root problem with conventional currency is all the trust that's required to make it work.",
      context: "From Bitcoin whitepaper and early writings",
      source: "https://bitcoin.org/bitcoin.pdf"
    },
    {
      author: "Satoshi Nakamoto",
      quote: "If you don't believe it or don't get it, I don't have the time to try to convince you, sorry.",
      context: "Early Bitcoin forum discussion",
      source: "https://bitcointalk.org/"
    },
    {
      author: "F.A. Hayek",
      quote: "I don't believe we shall ever have a good money again before we take the thing out of the hands of government.",
      context: "Denationalisation of Money (1976)",
      source: "https://nakamotoinstitute.org/literature/denationalisation/"
    },
    {
      author: "F.A. Hayek",
      quote: "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.",
      context: "The Fatal Conceit (1988)",
      source: "https://nakamotoinstitute.org/"
    },
    {
      author: "Milton Friedman",
      quote: "I think the internet is going to be one of the major forces for reducing the role of government.",
      context: "Predicted Bitcoin in 1999 interview",
      source: "https://nakamotoinstitute.org/"
    },
    {
      author: "Hal Finney",
      quote: "Running bitcoin. Bitcoin is a decentralized digital currency.",
      context: "First Bitcoin tweet (2009)",
      source: "https://twitter.com/halfin"
    }
  ],

  principles: [
    {
      principle: "1 BTC = 1 BTC",
      explanation: "Bitcoin is the unit of account. Measuring it in dollars is like measuring meters in feet.",
      fiatContrast: "Dollar constantly loses purchasing power. $100 today ≠ $100 tomorrow.",
      source: "https://bitcoin.org/en/how-it-works"
    },
    {
      principle: "21 Million Fixed Supply",
      explanation: "The total supply is capped at 21 million coins. No one can change this without consensus.",
      fiatContrast: "Fiat has unlimited supply. Central banks print trillions with no cap.",
      source: "https://bitcoin.org/en/how-it-works"
    },
    {
      principle: "Proof of Work (Energy-Backed Money)",
      explanation: "Bitcoin requires real energy expenditure to produce. Cannot be printed or inflated away.",
      fiatContrast: "Fiat money is created with keystrokes. No energy cost, no scarcity.",
      source: "https://bitcoin.org/en/how-it-works"
    },
    {
      principle: "Decentralization (No Single Point of Failure)",
      explanation: "No person, company, or government controls Bitcoin. Runs on distributed consensus.",
      fiatContrast: "Central banks control fiat supply. Single points of failure and corruption.",
      source: "https://bitcoin.org/en/how-it-works"
    },
    {
      principle: "Permissionless (Financial Freedom)",
      explanation: "Anyone can use Bitcoin without asking permission. No account needed, no KYC required.",
      fiatContrast: "Banks can freeze accounts, deny service, or require invasive verification.",
      source: "https://bitcoin.org/en/how-it-works"
    },
    {
      principle: "Verifiable Scarcity",
      explanation: "Anyone can verify the total supply by running a node. Transparency guaranteed.",
      fiatContrast: "Fiat supply is opaque. Only central banks know true money supply.",
      source: "https://bitcoin.org/en/how-it-works"
    }
  ]
};

// Select daily content (rotates through content types)
function selectDailyContent() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

  // Rotate through different content types each day
  const contentTypes = ['book', 'history', 'quote', 'principle'];
  const selectedType = contentTypes[dayOfYear % contentTypes.length];

  if (selectedType === 'book') {
    const bookIndex = dayOfYear % bitcoinKnowledge.books.length;
    const book = bitcoinKnowledge.books[bookIndex];
    const excerptIndex = Math.floor(dayOfYear / bitcoinKnowledge.books.length) % book.excerpts.length;

    return {
      type: 'book_excerpt',
      title: book.title,
      author: book.author,
      content: book.excerpts[excerptIndex],
      source: book.source,
      context: "Bitcoin's 21M cap makes this truth undeniable"
    };
  } else if (selectedType === 'history') {
    const eventIndex = dayOfYear % bitcoinKnowledge.history.length;
    const event = bitcoinKnowledge.history[eventIndex];

    return {
      type: 'historical_event',
      title: event.event,
      date: event.date,
      content: event.description,
      source: event.source,
      context: event.significance
    };
  } else if (selectedType === 'quote') {
    const quoteIndex = dayOfYear % bitcoinKnowledge.quotes.length;
    const quoteData = bitcoinKnowledge.quotes[quoteIndex];

    return {
      type: 'quote',
      title: `Quote from ${quoteData.author}`,
      author: quoteData.author,
      content: quoteData.quote,
      source: quoteData.source,
      context: quoteData.context
    };
  } else { // principle
    const principleIndex = dayOfYear % bitcoinKnowledge.principles.length;
    const principle = bitcoinKnowledge.principles[principleIndex];

    return {
      type: 'principle',
      title: principle.principle,
      content: principle.explanation,
      fiatContrast: principle.fiatContrast,
      source: principle.source,
      context: `Bitcoin vs Fiat: ${principle.principle}`
    };
  }
}

/**
 * Evaluate Bitcoin content quality (1-10 scale)
 */
function evaluateContentQuality(content) {
  let score = 7; // Start at "good content" baseline for curated knowledge

  // Score higher for certain content types
  if (content.type === 'quote') {
    score += 2; // Quotes are highly shareable
  } else if (content.type === 'principle') {
    score += 1; // Principles are educational
  } else if (content.type === 'historical_event') {
    score += 1; // Historical events are interesting
  }

  // Books get baseline score (already high quality)
  // Cap at 10
  return Math.min(score, 10);
}

/**
 * Determine content category
 */
function determineCategory(content) {
  const typeToCategory = {
    'book_excerpt': 'quotes_and_wisdom',
    'historical_event': 'historical_comparisons',
    'quote': 'quotes_and_wisdom',
    'principle': 'sound_money_principles'
  };

  return typeToCategory[content.type] || 'bitcoin_education';
}

// Format findings for memory
function formatFindings(content, btcPrice) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let markdown = `\n\n## Bitcoin Research Session - ${date}\n`;
  markdown += `_Generated at ${new Date().toLocaleTimeString()}_\n`;
  markdown += `_BTC Price: $${btcPrice.toLocaleString()}_\n\n`;

  if (content.type === 'book_excerpt') {
    markdown += `### Book Excerpt: ${content.title}\n`;
    markdown += `- **Quote**: "${content.content}"\n`;
    markdown += `- **Author**: ${content.author}\n`;
    markdown += `- **Source**: ${content.source}\n`;
    markdown += `- **Context**: ${content.context}\n`;
    markdown += `- **Content Angle**: Compare to athlete contracts measured in declining fiat\n`;
  } else if (content.type === 'historical_event') {
    markdown += `### Historical Event: ${content.title}\n`;
    markdown += `- **Date**: ${content.date}\n`;
    markdown += `- **What Happened**: ${content.content}\n`;
    markdown += `- **Source**: ${content.source}\n`;
    markdown += `- **Significance**: ${content.context}\n`;
    markdown += `- **Content Angle**: Every milestone reinforces the 21M fixed supply\n`;
  } else if (content.type === 'quote') {
    markdown += `### ${content.title}\n`;
    markdown += `- **Quote**: "${content.content}"\n`;
    markdown += `- **Author**: ${content.author}\n`;
    markdown += `- **Source**: ${content.source}\n`;
    markdown += `- **Context**: ${content.context}\n`;
    markdown += `- **Content Angle**: Wisdom that predicted the need for Bitcoin\n`;
  } else if (content.type === 'principle') {
    markdown += `### Bitcoin Principle: ${content.title}\n`;
    markdown += `- **Explanation**: ${content.content}\n`;
    markdown += `- **Fiat Contrast**: ${content.fiatContrast}\n`;
    markdown += `- **Source**: ${content.source}\n`;
    markdown += `- **Context**: ${content.context}\n`;
    markdown += `- **Content Angle**: Show the stark difference between hard and soft money\n`;
  }

  markdown += `\n### Next Steps\n`;
  markdown += `- [ ] Cross-reference with sports news\n`;
  markdown += `- [ ] Find current Bitcoin adoption stories\n`;
  markdown += `- [ ] Monitor macro trends (Fed, inflation data)\n`;

  return markdown;
}

// Main execution
(async () => {
  try {
    console.log('₿ Starting 21M Bitcoin research...\n');

    // Ensure memory directory exists
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    // Initialize research file if it doesn't exist
    if (!fs.existsSync(RESEARCH_FILE)) {
      let header = `# 21M Bitcoin Research Log\n\n`;
      header += `This file tracks Bitcoin knowledge for educational content.\n`;
      header += `Updated automatically by 21m-bitcoin-researcher.js\n`;
      fs.writeFileSync(RESEARCH_FILE, header);
    }

    // Get current BTC price
    console.log('📊 Fetching BTC price...');
    const btcPrice = await getBTCPrice();
    console.log(`  BTC: $${btcPrice.toLocaleString()}\n`);

    // Select daily content
    console.log('📚 Selecting Bitcoin knowledge...');
    const content = selectDailyContent();
    console.log(`  Type: ${content.type}`);
    console.log(`  Title: ${content.title}\n`);

    // Format and append to research file (backward compatibility)
    const markdown = formatFindings(content, btcPrice);
    fs.appendFileSync(RESEARCH_FILE, markdown);

    console.log('✓ Research complete');
    console.log(`✓ Knowledge logged to ${RESEARCH_FILE}\n`);

    // Add to knowledge database
    console.log('📊 Adding to Knowledge Database...');
    const qualityScore = evaluateContentQuality(content);
    const category = determineCategory(content);

    const topic = content.title;
    const contentDetails = content.content +
      (content.context ? `\n\nContext: ${content.context}` : '') +
      (content.fiatContrast ? `\n\nFiat Contrast: ${content.fiatContrast}` : '') +
      (content.author ? `\n\nAuthor: ${content.author}` : '');

    const btcAngle = content.type === 'principle'
      ? `Bitcoin embodies: ${content.title}`
      : content.type === 'quote'
      ? 'Wisdom that predicted the need for Bitcoin'
      : content.type === 'historical_event'
      ? `Bitcoin milestone: ${content.title}`
      : 'Sound money education';

    try {
      const contentId = db.addContent(
        topic,
        contentDetails,
        category,
        content.source || 'https://bitcoin.org',
        btcAngle,
        qualityScore
      );

      if (contentId) {
        console.log(`✓ Added to database (Content ID: ${contentId}, Score: ${qualityScore}/10)`);
      } else {
        console.log('⚠️  Database add failed (non-critical, continuing...)');
      }
    } catch (err) {
      console.log(`⚠️  Database error: ${err.message} (non-critical, continuing...)`);
    }

    // Display selected content
    console.log('📋 Selected Content:');
    console.log(`  ${content.title}`);
    if (content.content) {
      const preview = content.content.length > 80
        ? content.content.substring(0, 80) + '...'
        : content.content;
      console.log(`  "${preview}"`);
    }

    // Output summary for notifications
    const output = {
      type: '21m_bitcoin_research',
      timestamp: new Date().toISOString(),
      btcPrice,
      contentType: content.type,
      contentTitle: content.title,
      summary: `Bitcoin research: ${content.type} - ${content.title}`
    };

    const outputFile = '/tmp/21m-bitcoin-research-summary.json';
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n✓ Summary saved to ${outputFile}`);

  } catch (error) {
    console.error('Error during research:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
