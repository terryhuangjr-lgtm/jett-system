#!/usr/bin/env node
/**
 * Dwyane Wade 2003-2004 Rookie Refractors & Serial Numbered
 */

const EbayBrowseAPI = require('./ebay-browse-api');
const DealScorer = require('./deal-scorer-v2');
const PhotoQualityChecker = require('./photo-quality-checker');
const ScamDetector = require('./scam-detector');
const SinglesFilter = require('./singles-filter');
const fs = require('fs');
const path = require('path');

async function searchDWadeRookie() {
  const client = new EbayBrowseAPI();
  const dealScorer = new DealScorer();
  const photoChecker = new PhotoQualityChecker();
  const startTime = Date.now();

  try {
    const search = {
      name: 'Dwyane Wade 2003-2004 Refractors & Serial Numbered',
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
      
      // Must be refractor OR serial numbered OR jersey/patch OR base rookie
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
      
      // Check for jersey/patch cards
      const hasJersey = title.includes('jersey') || title.includes('patch') || 
                        title.includes('jsy') || title.includes('memorabilia') ||
                        title.includes('game-used') || title.includes('game used');
      
      // Check for rookie designation (base rookies)
      const hasRookie = title.includes('rookie') || title.includes(' rc ') || 
                        title.includes(' rc') || title.match(/\brc\b/);
      
      // Accept if it has ANY of these characteristics
      if (!hasRefractor && !hasSerial && !hasJersey && !hasRookie) return false;
      
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

    // Comp analysis - top 25 (more inclusive search now)
    const topCandidates = gradingCandidates
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 25);
    
    const analyzedDeals = [];
    for (const item of topCandidates) {
      try {
        // Skip comp analysis - just score the deal based on item characteristics
        const dealScore = dealScorer.score(item, { insufficientData: true });

        analyzedDeals.push({
          ...item,
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

    const reportFile = path.join(__dirname, 'results', `dwade-rookie-${new Date().toISOString().split('T')[0]}.json`);
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
  console.log('🏀 TOP 10 DWYANE WADE ROOKIE REFRACTORS (2003-04)');
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
  console.log(`   Refractors/Serial numbered: ${summary.afterFiltering}`);
  console.log(`   Grading candidates: ${summary.afterPhotoCheck}`);
  console.log(`   Analyzed: ${summary.analyzed}\n`);
  
  console.log(`💾 Full report: ${reportFile}\n`);
}

if (require.main === module) {
  searchDWadeRookie()
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

module.exports = searchDWadeRookie;
