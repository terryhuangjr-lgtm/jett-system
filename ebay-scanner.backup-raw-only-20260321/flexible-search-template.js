#!/usr/bin/env node
/**
 * FLEXIBLE SEARCH TEMPLATE (Option 1 - Loosened Filters)
 *
 * This template demonstrates the improved filtering approach:
 * 1. Broad eBay search (let eBay do the heavy lifting)
 * 2. Smart filters (remove junk, keep opportunities)
 * 3. Price variance check (within 5% of comps)
 *
 * HOW TO USE:
 * 1. Copy this file
 * 2. Change the search keywords
 * 3. Adjust optional filters as needed
 * 4. Run the search
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const AdvancedFilter = require('./advanced-filter');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const fs = require('fs');
const path = require('path');

async function flexibleSearch() {
  const client = new EbayBrowseAPI();
  const advancedFilter = new AdvancedFilter();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    // ═══════════════════════════════════════════════════════
    // STEP 1: BROAD EBAY SEARCH
    // ═══════════════════════════════════════════════════════
    const search = {
      name: 'Flexible Search Example',
      keywords: 'dirk nowitzki chrome refractor',  // ← Change this
      categoryId: '212', // Sports trading cards
      minPrice: 10,
      maxPrice: 500,
      // Only exclude graded cards - let everything else through
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'CGC'],
      sortOrder: 'PricePlusShippingLowest'
    };

    console.log(`🔍 Searching eBay: "${search.keywords}"\n`);
    const items = await client.search(search);
    console.log(`   Found ${items.length} total listings\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 2: BASIC FILTERS (Seller, Images)
    // ═══════════════════════════════════════════════════════
    const basicFiltered = items.filter(item => {
      if (item.sellerPositivePercent < 98) return false;
      if (!item.imageUrl) return false;
      return true;
    });
    console.log(`   After seller/image filter: ${basicFiltered.length}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 3: ADVANCED FILTERS (Singles, no reprints, etc.)
    // ═══════════════════════════════════════════════════════
    const advancedFiltered = basicFiltered.filter(item => {
      const filterResult = advancedFilter.filter(item, {
        singlesOnly: true,      // PERMANENT: Singles only
        allowBase: true,        // Allow base cards (disable if searching inserts only)
        maxListingAge: 21       // 21 days (loosened from 7)
      });
      item.filterReason = filterResult.reason;
      return filterResult.passed;
    });
    console.log(`   After advanced filter: ${advancedFiltered.length}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 4: SCAM CHECK
    // ═══════════════════════════════════════════════════════
    const nonScamItems = advancedFiltered.filter(item => {
      const scamCheck = ScamDetector.analyze(item);
      item.scamCheck = scamCheck;
      return scamCheck.passed;
    });
    console.log(`   After scam check: ${nonScamItems.length}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 5: PHOTO QUALITY (Looser than before)
    // ═══════════════════════════════════════════════════════
    const gradingCandidates = nonScamItems.filter(item => {
      const photoAnalysis = photoChecker.analyzeListing(item);
      item.photoAnalysis = photoAnalysis;

      // LOOSENED: Pass if no obvious red flags
      // Don't require perfect corners/centering - just no obvious damage
      if (photoAnalysis.hasRedFlags) return false;

      return true; // Pass everything without red flags
    });
    console.log(`   After photo check: ${gradingCandidates.length}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 6: COMP ANALYSIS + PRICE VARIANCE CHECK
    // ═══════════════════════════════════════════════════════
    console.log(`📊 Analyzing comps for top candidates...\n`);
    console.log(`⚠️  NOTE: Comps are estimated from active listings (85% discount)\n`);

    // Sort by price and analyze top 20
    const topCandidates = gradingCandidates
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 20);

    const analyzedDeals = [];
    for (const item of topCandidates) {
      try {
        // Get comps
        const comps = await compAnalyzer.getComps(item.title);

        // Check price variance (within 5% of estimated raw value)
        const priceCheck = compAnalyzer.isPriceWithinVariance(item.totalPrice, comps, 5);

        // Calculate profit
        const profitAnalysis = comps.foundComps
          ? compAnalyzer.calculateProfit(item.totalPrice, comps)
          : { insufficientData: true };

        // Score the deal
        const dealScore = dealScorer.score(item, profitAnalysis);

        analyzedDeals.push({
          ...item,
          comps,
          priceCheck,
          profitAnalysis,
          dealScore
        });

      } catch (error) {
        console.error(`   Error analyzing "${item.title.substring(0, 50)}...": ${error.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 7: FILTER BY PRICE VARIANCE (NEW!)
    // ═══════════════════════════════════════════════════════
    const goodPricing = analyzedDeals.filter(deal => {
      // Keep deals where:
      // 1. Price is within variance (good deal)
      // 2. No comps found (needs manual review - don't auto-reject)
      return deal.priceCheck.withinRange !== false;
    });
    console.log(`   Within price variance or needs review: ${goodPricing.length}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 8: SORT BY SCORE
    // ═══════════════════════════════════════════════════════
    goodPricing.sort((a, b) => b.dealScore.score - a.dealScore.score);
    const top10 = goodPricing.slice(0, 10);

    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    // ═══════════════════════════════════════════════════════
    // SAVE REPORT
    // ═══════════════════════════════════════════════════════
    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      searchQuery: search.keywords,
      summary: {
        totalFound: items.length,
        afterBasicFilter: basicFiltered.length,
        afterAdvancedFilter: advancedFiltered.length,
        afterScamCheck: nonScamItems.length,
        afterPhotoCheck: gradingCandidates.length,
        analyzed: analyzedDeals.length,
        withinPriceVariance: goodPricing.length,
        top10: top10.length
      },
      filterSettings: {
        maxListingAge: 21,
        priceVariance: '5%',
        sellerFeedback: '98%+',
        yearMatchingRequired: false
      },
      top10Deals: top10,
      allDeals: analyzedDeals
    };

    const reportFile = path.join(__dirname, 'results', `flexible-search-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    printResults(top10, scanDuration, reportFile, report.summary);
    return { success: true, top10, reportFile };

  } catch (error) {
    console.error('Search failed:', error.message);
    return { success: false, error: error.message };
  }
}

function printResults(top10, duration, reportFile, summary) {
  console.log('═══════════════════════════════════════════════════');
  console.log('🏀 TOP 10 DEALS (FLEXIBLE SEARCH)');
  console.log('═══════════════════════════════════════════════════\n');

  if (top10.length === 0) {
    console.log('❌ No deals found matching criteria.\n');
    console.log('TROUBLESHOOTING:');
    console.log('  - Try different search keywords');
    console.log('  - Check if comps are available for this card');
    console.log('  - Review filtered items in JSON report\n');
    return;
  }

  top10.forEach((deal, i) => {
    console.log(`${i + 1}. ${deal.dealScore.rating} [Score: ${deal.dealScore.score}]`);
    console.log(`   ${deal.title}`);
    console.log(`   💰 Price: $${deal.totalPrice}`);

    // Price check status
    if (deal.priceCheck.withinRange === true) {
      console.log(`   ✅ Price OK: Within ${deal.priceCheck.maxAcceptable ? '$' + deal.priceCheck.maxAcceptable : 'range'}`);
    } else if (deal.priceCheck.withinRange === null) {
      console.log(`   ⚠️  ${deal.priceCheck.reason}`);
    }

    // Profit analysis
    if (!deal.profitAnalysis.insufficientData) {
      console.log(`   📈 Expected Value: $${deal.profitAnalysis.expectedValue} | ROI: ${deal.profitAnalysis.roi}%`);
      console.log(`   💎 ${deal.profitAnalysis.recommendation}`);
    }

    // Photo quality
    if (deal.photoAnalysis && deal.photoAnalysis.condition) {
      const bonus = [];
      if (deal.photoAnalysis.condition.corners === 'sharp') bonus.push('Sharp corners');
      if (deal.photoAnalysis.condition.centering === 'good') bonus.push('Good centering');
      if (bonus.length > 0) console.log(`   ✨ ${bonus.join(' | ')}`);
    }

    console.log(`   🔗 ${deal.viewItemURL}\n`);
  });

  console.log(`\n📊 FILTER SUMMARY:`);
  console.log(`   Total found: ${summary.totalFound}`);
  console.log(`   After basic filters: ${summary.afterBasicFilter}`);
  console.log(`   After advanced filters: ${summary.afterAdvancedFilter}`);
  console.log(`   After photo check: ${summary.afterPhotoCheck}`);
  console.log(`   Analyzed: ${summary.analyzed}`);
  console.log(`   Within price variance: ${summary.withinPriceVariance}`);
  console.log(`   Top 10: ${summary.top10}\n`);

  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  flexibleSearch()
    .then(result => {
      if (result.success) {
        console.log('✅ Search complete!\n');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = flexibleSearch;
