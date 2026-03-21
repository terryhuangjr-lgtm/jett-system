#!/usr/bin/env node
/**
 * Dwyane Wade 2003 Refractors, Numbered, Autos
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const SinglesFilter = require('./singles-filter');
const fs = require('fs');
const path = require('path');

async function searchWadePremium() {
  const client = new EbayBrowseAPI();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    const search = {
      name: 'Dwyane Wade 2003 Refractors/Numbered/Autos',
      keywords: 'dwyane wade 2003',
      categoryId: '212',
      minPrice: 1,
      maxPrice: 2000,
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
      
      // Must be 2003-2004 or 2003-04
      const hasYear = title.match(/2003[-\/]?04|2003[-\/]?2004|2003\s?-\s?04/);
      if (!hasYear) return false;
      
      // Must be refractor OR serial numbered OR auto (MIXED RESULTS)
      const refractorKeywords = [
        'refractor', 'chrome', 'finest', 'pristine',
        'black refractor', 'gold refractor', 'orange refractor',
        'red refractor', 'blue refractor', 'green refractor', 
        'purple refractor', 'xfractor', 'x-fractor', 
        'atomic', 'pulsar', 'prism', 'aqua', 'wave'
      ];
      
      const hasRefractor = refractorKeywords.some(keyword => title.includes(keyword));
      
      // Check for serial numbering
      const hasSerial = /\/\d+/.test(title) || title.includes('numbered');
      
      // Check for autographs
      const hasAuto = title.includes('auto') || title.includes('autograph') || 
                      title.includes('signed') || title.includes('signature');
      
      // Accept if it has refractor OR serial OR auto
      if (!hasRefractor && !hasSerial && !hasAuto) return false;
      
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

    // Score ALL grading candidates first
    const analyzedDeals = [];
    for (const item of gradingCandidates) {
      try {
        const dealScore = dealScorer.score(item, { insufficientData: true });
        analyzedDeals.push({
          ...item,
          dealScore
        });
      } catch (error) {
        // Skip
      }
    }

    // Sort by score (highest first), then by price (lowest first) as tiebreaker
    analyzedDeals.sort((a, b) => {
      if (b.dealScore.score !== a.dealScore.score) {
        return b.dealScore.score - a.dealScore.score;
      }
      return a.totalPrice - b.totalPrice;
    });
    const top10 = analyzedDeals.slice(0, 20);

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

    const reportFile = path.join(__dirname, 'results', `wade-premium-${new Date().toISOString().split('T')[0]}.json`);
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
  console.log('🏀 TOP 20 WADE 2003 REFRACTORS/NUMBERED/AUTOS');
  console.log('═══════════════════════════════════════════════════\n');

  if (top10.length === 0) {
    console.log('No deals found.\n');
    return;
  }

  top10.forEach((deal, i) => {
    console.log(`${i + 1}. ${deal.dealScore.rating} [${deal.dealScore.score}]`);
    console.log(`   ${deal.title}`);
    console.log(`   💰 Price: $${deal.totalPrice}`);

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
  console.log(`   Refractors/Numbered/Autos: ${summary.afterFiltering}`);
  console.log(`   Grading candidates: ${summary.afterPhotoCheck}`);
  console.log(`   Analyzed: ${summary.analyzed}\n`);
  
  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  searchWadePremium()
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

module.exports = searchWadePremium;
