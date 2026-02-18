/**
 * Smart Scanner with Enhanced Filters
 * Combines all filters for maximum accuracy
 *
 * Pipeline:
 * 1. Basic filters (advanced-filter.js) - Remove lots, reprints, etc.
 * 2. Title analysis (title-analyzer.js) - Check for damage/quality signals
 * 3. Scam detection (scam-detector.js) - Check for obvious scams
 * 4. Comp analysis (comp-analyzer.js) - Get market prices
 * 5. Outlier detection (outlier-detector.js) - Verify pricing is reasonable
 * 6. Deal scoring (deal-scorer.js) - Rate final opportunities
 */

const AdvancedFilter = require('./advanced-filter');
const TitleAnalyzer = require('./title-analyzer');
const ScamDetector = require('./scam-detector');
const CompAnalyzer = require('./comp-analyzer');
const OutlierDetector = require('./outlier-detector');
const DealScorer = require('./deal-scorer-v2');

class SmartScanner {
  constructor() {
    this.advancedFilter = new AdvancedFilter();
    this.titleAnalyzer = new TitleAnalyzer();
    this.compAnalyzer = new CompAnalyzer();
    this.outlierDetector = new OutlierDetector();
    this.dealScorer = new DealScorer();

    this.stats = {
      total: 0,
      passed: {
        basicFilter: 0,
        titleAnalysis: 0,
        scamCheck: 0,
        outlierCheck: 0,
        finalScore: 0
      },
      rejected: {
        basicFilter: 0,
        titleAnalysis: 0,
        scamCheck: 0,
        outlierCheck: 0,
        poorScore: 0
      }
    };
  }

  /**
   * Scan and filter items through complete pipeline
   * @param {Array} items - Raw items from eBay API
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Filtered and scored items
   */
  async scan(items, options = {}) {
    this.stats.total = items.length;
    console.log(`\n🔍 Scanning ${items.length} items through enhanced filter pipeline...\n`);

    // STAGE 1: Basic filtering (lots, reprints, sealed, etc.)
    console.log('STAGE 1: Basic filtering...');
    const basicFiltered = items.filter(item => {
      const result = this.advancedFilter.filter(item, options);
      if (result.passed) {
        this.stats.passed.basicFilter++;
        return true;
      } else {
        this.stats.rejected.basicFilter++;
        item.rejectionReason = result.reason;
        return false;
      }
    });
    console.log(`   ✅ Passed: ${basicFiltered.length} / ${items.length}`);
    console.log(`   ❌ Rejected: ${items.length - basicFiltered.length}`);

    // STAGE 2: Title analysis (damage/quality signals)
    console.log('\nSTAGE 2: Title analysis...');
    const titleFiltered = basicFiltered.filter(item => {
      const analysis = this.titleAnalyzer.analyze(item.title, item.description || '');
      item.titleAnalysis = analysis;

      if (analysis.passed) {
        this.stats.passed.titleAnalysis++;
        return true;
      } else {
        this.stats.rejected.titleAnalysis++;
        item.rejectionReason = `Title: ${analysis.verdict.reason}`;
        return false;
      }
    });
    console.log(`   ✅ Passed: ${titleFiltered.length} / ${basicFiltered.length}`);
    console.log(`   ❌ Rejected: ${basicFiltered.length - titleFiltered.length}`);

    // STAGE 3: Scam detection
    console.log('\nSTAGE 3: Scam detection...');
    const scamFiltered = titleFiltered.filter(item => {
      const scamCheck = ScamDetector.analyze(item);
      item.scamCheck = scamCheck;

      if (scamCheck.passed) {
        this.stats.passed.scamCheck++;
        return true;
      } else {
        this.stats.rejected.scamCheck++;
        item.rejectionReason = `Scam: ${scamCheck.reason}`;
        return false;
      }
    });
    console.log(`   ✅ Passed: ${scamFiltered.length} / ${titleFiltered.length}`);
    console.log(`   ❌ Rejected: ${titleFiltered.length - scamFiltered.length}`);

    // STAGE 4: Get comps for remaining items
    console.log('\nSTAGE 4: Fetching market comps...');
    const itemsWithComps = [];
    for (const item of scamFiltered) {
      try {
        const comps = await this.compAnalyzer.getComps(item.title);
        item.comps = comps;

        // Calculate profit analysis
        if (comps.foundComps) {
          const profitAnalysis = this.compAnalyzer.calculateProfit(item.totalPrice, comps);
          item.profitAnalysis = profitAnalysis;
        }

        itemsWithComps.push(item);
      } catch (error) {
        console.log(`   ⚠️  Error getting comps for ${item.title}: ${error.message}`);
        // Keep item even if comps fail (don't reject on API errors)
        item.comps = { foundComps: false };
        itemsWithComps.push(item);
      }
    }
    console.log(`   ✅ Comps found: ${itemsWithComps.filter(i => i.comps?.foundComps).length} / ${scamFiltered.length}`);

    // STAGE 5: Outlier detection (price vs market)
    console.log('\nSTAGE 5: Outlier detection...');
    const outlierFiltered = itemsWithComps.filter(item => {
      // Skip outlier check if no comps available
      if (!item.comps || !item.comps.foundComps) {
        this.stats.passed.outlierCheck++;
        return true;
      }

      const outlierAnalysis = this.outlierDetector.analyzeItem(item, item.comps);
      item.outlierAnalysis = outlierAnalysis;

      if (outlierAnalysis.passed) {
        this.stats.passed.outlierCheck++;
        return true;
      } else {
        this.stats.rejected.outlierCheck++;
        item.rejectionReason = `Outlier: ${outlierAnalysis.reason}`;
        return false;
      }
    });
    console.log(`   ✅ Passed: ${outlierFiltered.length} / ${itemsWithComps.length}`);
    console.log(`   ❌ Rejected: ${itemsWithComps.length - outlierFiltered.length}`);

    // STAGE 6: Score remaining deals
    console.log('\nSTAGE 6: Scoring deals...');
    const scored = outlierFiltered.map(item => {
      const dealScore = this.dealScorer.score(item, item.profitAnalysis);
      item.dealScore = dealScore;
      return item;
    });

    // Filter by minimum score (optional)
    const minScore = options.minScore || 5;
    const finalResults = scored.filter(item => {
      if (item.dealScore.score >= minScore) {
        this.stats.passed.finalScore++;
        return true;
      } else {
        this.stats.rejected.poorScore++;
        item.rejectionReason = `Score too low: ${item.dealScore.score}`;
        return false;
      }
    });

    // Sort by score (highest first)
    finalResults.sort((a, b) => b.dealScore.score - a.dealScore.score);

    console.log(`   ✅ Score ≥ ${minScore}: ${finalResults.length} / ${scored.length}`);
    console.log(`   ❌ Rejected: ${scored.length - finalResults.length}`);

    // Print summary
    this.printSummary(finalResults);

    return finalResults;
  }

  /**
   * Print scan summary
   */
  printSummary(results) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('SCAN SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Items Scanned: ${this.stats.total}`);
    console.log(`Final Results: ${results.length} opportunities found`);
    console.log(`Pass Rate: ${Math.round((results.length / this.stats.total) * 100)}%\n`);

    console.log('Pipeline Results:');
    console.log(`  Stage 1 (Basic Filter):    ${this.stats.passed.basicFilter} passed, ${this.stats.rejected.basicFilter} rejected`);
    console.log(`  Stage 2 (Title Analysis):  ${this.stats.passed.titleAnalysis} passed, ${this.stats.rejected.titleAnalysis} rejected`);
    console.log(`  Stage 3 (Scam Detection):  ${this.stats.passed.scamCheck} passed, ${this.stats.rejected.scamCheck} rejected`);
    console.log(`  Stage 4 (Outlier Check):   ${this.stats.passed.outlierCheck} passed, ${this.stats.rejected.outlierCheck} rejected`);
    console.log(`  Stage 5 (Deal Scoring):    ${this.stats.passed.finalScore} passed, ${this.stats.rejected.poorScore} rejected`);

    if (results.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('TOP OPPORTUNITIES');
      console.log('═══════════════════════════════════════════════════════\n');

      results.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.dealScore.rating} (${item.dealScore.score}/10)`);
        console.log(`   ${item.title}`);
        console.log(`   Price: $${item.totalPrice}`);

        if (item.profitAnalysis && !item.profitAnalysis.insufficientData) {
          console.log(`   Expected Value: $${item.profitAnalysis.expectedValue}`);
          console.log(`   ROI: ${item.profitAnalysis.roi}%`);
        }

        if (item.outlierAnalysis?.stats) {
          console.log(`   Market Mean: $${item.outlierAnalysis.stats.marketMean} (${item.outlierAnalysis.stats.percentOfMean}% of market)`);
        }

        if (item.titleAnalysis) {
          if (item.titleAnalysis.signals.length > 0) {
            console.log(`   ✨ Signals: ${item.titleAnalysis.signals.map(s => s.keyword).join(', ')}`);
          }
        }

        console.log(`   URL: ${item.viewItemURL || 'N/A'}`);
        console.log('');
      });
    }
  }
}

// Export for use in other scanners
module.exports = SmartScanner;

// If run directly, demonstrate with mock data
if (require.main === module) {
  console.log('🚀 Smart Scanner Demo\n');

  const mockItems = [
    {
      title: '1997 Skybox Metal Universe Michael Jordan #23 - Pack Fresh Investment Grade',
      description: 'Straight to sleeve. Perfect centering.',
      totalPrice: 150,
      viewItemURL: 'https://ebay.com/item/123',
      sellerPositivePercent: 99.8,
      sellerFeedbackScore: 1500,
      returnsAccepted: true,
      shippingCost: 0
    },
    {
      title: '1997 Skybox Metal Universe Michael Jordan #23 - AS-IS',
      description: 'See photos. No returns.',
      totalPrice: 80,
      viewItemURL: 'https://ebay.com/item/124',
      sellerPositivePercent: 98.5,
      sellerFeedbackScore: 300,
      returnsAccepted: false,
      shippingCost: 5
    },
    {
      title: '1997 Skybox Metal Universe Michael Jordan #23 - Gem Mint',
      description: 'Pristine condition. Climate controlled storage.',
      totalPrice: 200,
      viewItemURL: 'https://ebay.com/item/125',
      sellerPositivePercent: 100,
      sellerFeedbackScore: 2000,
      sellerTopRated: true,
      returnsAccepted: true,
      shippingCost: 0
    },
    {
      title: '1997 Topps Finest Michael Jordan #23 Refractor',
      description: 'Great centering. No visible flaws.',
      totalPrice: 120,
      viewItemURL: 'https://ebay.com/item/126',
      sellerPositivePercent: 99.5,
      sellerFeedbackScore: 800,
      returnsAccepted: true,
      shippingCost: 4
    }
  ];

  const scanner = new SmartScanner();

  // Run scan (without comp fetching for demo)
  scanner.scan(mockItems, { minScore: 5 })
    .then(results => {
      console.log(`\n✅ Demo complete! Found ${results.length} opportunities.`);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
    });
}
