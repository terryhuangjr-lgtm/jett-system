#!/usr/bin/env node
/**
 * Michael Jordan 90s-2005 Singles - Grading Candidates
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const fs = require('fs');
const path = require('path');

async function searchMJSingles() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    const search = {
      name: 'Michael Jordan Singles',
      keywords: 'michael jordan',
      categoryId: '212',
      minPrice: 1, // API filter unreliable, will filter manually
      maxPrice: 1000,
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab'],
      sortOrder: 'PricePlusShippingLowest'
    };

    const items = await client.search(search);

    // Comprehensive filtering
    const filtered = items.filter(item => {
      const title = item.title.toLowerCase();
      
      // Price range filter (manual)
      if (item.totalPrice < 25 || item.totalPrice > 500) return false;
      
      // Seller feedback
      if (item.sellerPositivePercent < 98) return false;
      if (!item.imageUrl) return false;
      
      // Exclude LOTS aggressively
      if (title.includes(' lot') || title.includes('lot of') || 
          title.includes('bulk') || title.includes('collection') ||
          title.match(/\d+\s*card/) || title.match(/\d+\+/) ||
          title.includes('mixed') || title.includes('bundle')) {
        return false;
      }
      
      // Exclude graded
      if (title.includes('psa') || title.includes('bgs') || title.includes('sgc') ||
          title.includes('graded') || title.includes('gem mint') || 
          title.includes('pristine') || title.includes('authentic') || 
          title.includes('slab') || title.includes('cgc')) {
        return false;
      }
      
      // Exclude non-cards
      if (title.includes('jersey') || title.includes('shirt') || 
          title.includes('comforter') || title.includes('poster') || 
          title.includes('figure') || title.includes('bobblehead') ||
          title.includes('photo') || title.includes('autograph') || 
          title.includes('signed')) {
        return false;
      }
      
      // Must be card-related
      if (!title.includes('card') && !title.includes('insert') && 
          !title.includes('refractor') && !title.includes('parallel') && 
          !title.includes('chrome') && !title.includes('prizm') &&
          !title.includes('optic') && !title.includes('select') &&
          !title.includes('fleer') && !title.includes('upper deck') &&
          !title.includes('skybox') && !title.includes('topps')) {
        return false;
      }
      
      // Vintage year check (1990-2005)
      const hasVintageYear = /199\d|200[0-5]/.test(title);
      if (!hasVintageYear) return false;
      
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

    // Comp analysis - top 15 by price
    const topCandidates = gradingCandidates
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 15);
    
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
        // Skip
      }
    }

    // Sort by score
    analyzedDeals.sort((a, b) => b.dealScore.score - a.dealScore.score);
    const top10 = analyzedDeals.slice(0, 10);

    const scanDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      scanDuration: `${scanDuration}s`,
      summary: {
        totalFound: items.length,
        afterPriceFilter: filtered.length,
        afterScamCheck: nonScamItems.length,
        afterPhotoCheck: gradingCandidates.length,
        analyzed: analyzedDeals.length,
        top10: top10.length
      },
      top10Deals: top10,
      allDeals: analyzedDeals
    };

    const reportFile = path.join(__dirname, 'results', `mj-singles-${new Date().toISOString().split('T')[0]}.json`);
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
  console.log('🐐 TOP 10 MICHAEL JORDAN SINGLES (1990-2005)');
  console.log('═══════════════════════════════════════════════════\n');

  if (top10.length === 0) {
    console.log('No deals found.\n');
    return;
  }

  top10.forEach((deal, i) => {
    console.log(`${i + 1}. ${deal.dealScore.rating} [${deal.dealScore.score}]`);
    console.log(`   ${deal.title}`);
    console.log(`   💰 Price: $${deal.totalPrice}`);

    if (!deal.profitAnalysis.insufficientData) {
      console.log(`   📈 EV: $${deal.profitAnalysis.expectedValue} | ROI: ${deal.profitAnalysis.roi}%`);
    }

    if (deal.photoAnalysis && deal.photoAnalysis.condition) {
      const bonus = [];
      if (deal.photoAnalysis.condition.corners === 'sharp') bonus.push('✅ Sharp corners');
      if (deal.photoAnalysis.condition.centering === 'good') bonus.push('✅ Good centering');
      if (bonus.length > 0) console.log(`   ${bonus.join(' | ')}`);
    }

    console.log(`   🔗 ${deal.viewItemURL}\n`);
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total found: ${summary.totalFound}`);
  console.log(`   In price range ($25-$500): ${summary.afterPriceFilter}`);
  console.log(`   Grading candidates: ${summary.afterPhotoCheck}`);
  console.log(`   Analyzed: ${summary.analyzed}\n`);
  
  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  searchMJSingles()
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

module.exports = searchMJSingles;
