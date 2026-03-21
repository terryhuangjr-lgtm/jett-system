#!/usr/bin/env node
/**
 * Michael Jordan 90s-2005 Vintage Inserts/Parallels Search
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const fs = require('fs');
const path = require('path');

async function searchMJVintage() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();

  const startTime = Date.now();

  try {
    const search = {
      name: 'Michael Jordan Vintage Inserts/Parallels',
      keywords: 'michael jordan',
      categoryId: '212', // Basketball cards
      minPrice: 25,
      maxPrice: 500,
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab'],
      sortOrder: 'PricePlusShippingLowest'
    };

    const items = await client.search(search);

    // Filter
    const filtered = items.filter(item => {
      if (item.sellerPositivePercent < 98) return false;
      if (!item.imageUrl) return false;
      
      const title = item.title.toLowerCase();
      
      // Exclude graded cards (more comprehensive)
      if (title.includes('psa') || title.includes('bgs') || title.includes('sgc') ||
          title.includes('graded') || title.includes('gem mint') || title.includes('pristine') ||
          title.includes('authentic') || title.includes('slab')) {
        return false;
      }
      
      // Exclude non-card items
      if (title.includes('jersey') || title.includes('shirt') || title.includes('comforter') ||
          title.includes('poster') || title.includes('figure') || title.includes('bobblehead') ||
          title.includes('photo') || title.includes('autograph') || title.includes('signed')) {
        return false;
      }
      
      // Must mention card-related terms
      if (!title.includes('card') && !title.includes('insert') && !title.includes('refractor') &&
          !title.includes('parallel') && !title.includes('chrome') && !title.includes('prizm') &&
          !title.includes('optic') && !title.includes('select')) {
        return false;
      }
      
      // Check for vintage years (1990-2005)
      const hasVintageYear = /199\d|200[0-5]/.test(title);
      if (!hasVintageYear) {
        // If no year in title, be permissive but flag for manual review
        item.needsYearVerification = true;
      }
      
      return true;
    });

    // Scam check
    const nonScamItems = filtered.filter(item => {
      const scamCheck = ScamDetector.analyze(item);
      return scamCheck.passed;
    });

    // Photo quality
    const gradingCandidates = nonScamItems.filter(item => {
      const photoAnalysis = photoChecker.analyzeListing(item);
      item.photoAnalysis = photoAnalysis;
      return photoAnalysis.passed;
    });

    // Comp analysis - only top 20 candidates (sorted by price)
    const topCandidates = gradingCandidates
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 20);
    
    const analyzedDeals = [];
    for (const item of topCandidates) {
      try {
        const comps = await compAnalyzer.getComps(item.title);
        const profitAnalysis = comps.foundComps
          ? compAnalyzer.calculateProfit(item.totalPrice, comps)
          : { insufficientData: true };
        const dealScore = dealScorer.score(item, profitAnalysis);

        analyzedDeals.push({
          ...item,
          comps,
          profitAnalysis,
          dealScore
        });
      } catch (error) {
        // Skip on error
      }
    }

    // Sort by score
    analyzedDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);

    // Get top 10
    const top10 = analyzedDeals.slice(0, 10);

    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      summary: {
        totalFound: items.length,
        afterFiltering: filtered.length,
        afterScamCheck: nonScamItems.length,
        afterPhotoCheck: gradingCandidates.length,
        analyzed: analyzedDeals.length,
        top10: top10.length
      },
      top10Deals: top10,
      allDeals: analyzedDeals
    };

    const reportFile = path.join(__dirname, 'results', `mj-vintage-${new Date().toISOString().split('T')[0]}.json`);
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
  console.log('🐐 TOP 10 MICHAEL JORDAN VINTAGE DEALS');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🔍 Items analyzed: ${summary.analyzed}\n`);

  if (top10.length === 0) {
    console.log('No deals found.\n');
    return;
  }

  top10.forEach((deal, i) => {
    console.log(`${i + 1}. ${deal.dealScore.rating} [${deal.dealScore.score}]`);
    console.log(`   ${deal.title}`);
    console.log(`   💰 Price: $${deal.totalPrice}`);

    if (!deal.profitAnalysis.insufficientData) {
      console.log(`   📈 Expected Value: $${deal.profitAnalysis.expectedValue}`);
      console.log(`   💵 ROI: ${deal.profitAnalysis.roi}%`);
    }

    if (deal.photoAnalysis && deal.photoAnalysis.condition) {
      const bonus = [];
      if (deal.photoAnalysis.condition.corners === 'sharp') bonus.push('✅ Sharp corners');
      if (deal.photoAnalysis.condition.centering === 'good') bonus.push('✅ Good centering');
      if (bonus.length > 0) console.log(`   ${bonus.join(' | ')}`);
    }

    console.log(`   🔗 ${deal.viewItemURL}\n`);
  });

  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  searchMJVintage()
    .then(result => {
      if (result.success) {
        console.log('✅ Search complete!\n');
        process.exit(0);
      } else {
        console.log('❌ Search failed.\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = searchMJVintage;
