#!/usr/bin/env node
/**
 * Dirk Nowitzki Topps Chrome/Finest Refractors 2004-2010
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const CompAnalyzer = require('./comp-analyzer');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const SinglesFilter = require('./singles-filter');
const fs = require('fs');
const path = require('path');

async function searchDirkChrome() {
  const client = new EbayBrowseAPI();
  const compAnalyzer = new CompAnalyzer();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    const search = {
      name: 'Dirk Nowitzki Topps Chrome/Finest 2004-2010',
      keywords: 'dirk nowitzki topps refractor',
      categoryId: '212',
      minPrice: 1,
      maxPrice: 1000,
      excludeKeywords: ['PSA', 'BGS', 'SGC', 'graded', 'slab', 'CGC'],
      sortOrder: 'PricePlusShippingLowest'
    };

    const items = await client.search(search);

    // Filter
    const filtered = items.filter(item => {
      const title = item.title.toLowerCase();
      
      // Seller feedback
      if (item.sellerPositivePercent < 98) return false;
      if (!item.imageUrl) return false;
      
      // SINGLES ONLY
      if (!SinglesFilter.isSingle(item)) return false;
      
      // Must be Topps Chrome OR Topps Finest
      const hasChrome = title.includes('chrome');
      const hasFinest = title.includes('finest');
      if (!hasChrome && !hasFinest) return false;
      
      // Must mention refractor (or colored variant)
      const coloredRefractors = [
        'refractor', 'black refractor', 'gold refractor', 'orange refractor',
        'red refractor', 'blue refractor', 'green refractor', 'purple refractor',
        'xfractor', 'x-fractor', 'atomic refractor', 'pulsar'
      ];
      const hasRefractor = coloredRefractors.some(term => title.includes(term));
      if (!hasRefractor) return false;
      
      // Year range 2004-2010
      const yearMatch = title.match(/200[4-9]|2010|2004|2005|2006|2007|2008|2009/);
      if (!yearMatch) return false;
      
      // Exclude graded
      if (title.includes('psa') || title.includes('bgs') || title.includes('sgc') ||
          title.includes('graded') || title.includes('gem mint') || 
          title.includes('pristine') || title.includes('authentic') || 
          title.includes('slab') || title.includes('cgc')) {
        return false;
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

    // Comp analysis - top 15
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
        afterFiltering: filtered.length,
        afterScamCheck: nonScamItems.length,
        afterPhotoCheck: gradingCandidates.length,
        analyzed: analyzedDeals.length,
        top10: top10.length
      },
      top10Deals: top10,
      allDeals: analyzedDeals
    };

    const reportFile = path.join(__dirname, 'results', `dirk-chrome-finest-${new Date().toISOString().split('T')[0]}.json`);
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
  console.log('🏀 TOP 10 DIRK CHROME/FINEST REFRACTORS (2004-2010)');
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

  console.log(`📊 SUMMARY:`);
  console.log(`   Total found: ${summary.totalFound}`);
  console.log(`   Chrome/Finest refractors: ${summary.afterFiltering}`);
  console.log(`   Grading candidates: ${summary.afterPhotoCheck}`);
  console.log(`   Analyzed: ${summary.analyzed}\n`);
  
  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  searchDirkChrome()
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

module.exports = searchDirkChrome;
