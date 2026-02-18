#!/usr/bin/env node

/**
 * Morning Report Generator
 * Compiles overnight automation results
 */

const fs = require('fs');
const path = require('path');

function generateMorningReport() {
  const report = {
    date: new Date().toISOString().split('T')[0],
    sections: []
  };

  // Check eBay results (if they exist)
  const ebayDir = '/tmp';
  const ebayFiles = fs.readdirSync(ebayDir).filter(f => f.startsWith('ebay-'));
  
  if (ebayFiles.length > 0) {
    report.sections.push({
      title: '🛒 eBay Gem Finder Results',
      content: `Found ${ebayFiles.length} searches completed`,
      files: ebayFiles.map(f => path.join(ebayDir, f))
    });
  }

  // Check 21M contract research
  const contractDir = '/home/clawd/clawd/21m-research/contracts';
  if (fs.existsSync(contractDir)) {
    const contractFiles = fs.readdirSync(contractDir).filter(f => f.includes(report.date));
    if (contractFiles.length > 0) {
      report.sections.push({
        title: '🏀 21M Sports Contract Research',
        content: `New contract data collected`,
        files: contractFiles.map(f => path.join(contractDir, f))
      });
    }
  }

  // Check opportunities
  const oppDir = '/home/clawd/clawd/opportunities';
  if (fs.existsSync(oppDir)) {
    const oppFiles = fs.readdirSync(oppDir).filter(f => f.includes(report.date));
    if (oppFiles.length > 0) {
      report.sections.push({
        title: '💡 Opportunity Scanner Results',
        content: `Found new opportunities to review`,
        files: oppFiles.map(f => path.join(oppDir, f))
      });
    }
  }

  // Generate report
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 MORNING AUTOMATION REPORT');
  console.log(`📅 ${report.date}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (report.sections.length === 0) {
    console.log('No results yet - tasks may still be running or scheduled for later.\n');
  } else {
    report.sections.forEach(section => {
      console.log(`${section.title}`);
      console.log(`${section.content}`);
      console.log(`Files: ${section.files.length}`);
      section.files.forEach(f => console.log(`  - ${f}`));
      console.log();
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');
  
  // Save report
  const reportFile = path.join('/home/clawd/clawd', `morning-report-${report.date}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`✅ Full report saved: ${reportFile}\n`);

  return report;
}

generateMorningReport();
