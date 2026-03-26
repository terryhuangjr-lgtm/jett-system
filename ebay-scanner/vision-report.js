#!/usr/bin/env node
/**
 * vision-report.js
 * Review vision decisions from any scan
 * Usage: node vision-report.js
 * Usage: node vision-report.js 2026-03-24
 */

const { getVisionSummary } = require('./vision-logger');

const date = process.argv[2] || 
  new Date().toISOString().split('T')[0];

const summary = getVisionSummary(date);

if (!summary) {
  console.log(`No vision log found for ${date}`);
  console.log('Run a scan with vision enabled first.');
  process.exit(0);
}

console.log('\n' + '='.repeat(70));
console.log(`VISION REPORT — ${summary.date}`);
console.log('='.repeat(70));
console.log(`Total scanned:  ${summary.total}`);
console.log(`Passed:         ${summary.passed} (${summary.passRate})`);
console.log(`Rejected:       ${summary.rejected}`);
console.log('');
console.log('Rejection breakdown:');
console.log(`  Bad corners only:    ${summary.rejectionBreakdown.cornersOnly}`);
console.log(`  Bad centering only:  ${summary.rejectionBreakdown.centeringOnly}`);
console.log(`  Both issues:         ${summary.rejectionBreakdown.both}`);
console.log('');

if (summary.rejectedItems.length === 0) {
  console.log('No rejections today.');
} else {
  console.log('REJECTED CARDS:');
  console.log('-'.repeat(70));
  
  summary.rejectedItems.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.title}`);
    console.log(`   Price:     $${item.price}`);
    console.log(`   Corners:   ${item.corners}/10`);
    console.log(`   Centering: ${item.centering}/10`);
    console.log(`   Score:     ${item.score}/10`);
    console.log(`   Confidence: ${item.confidence || 'N/A'}`);
    if (item.issues && item.issues.length > 0) {
      console.log(`   Issues:    ${item.issues.join(', ')}`);
    }
    console.log(`   Image:     ${item.imageUrl}`);
    console.log(`   eBay:      ${item.ebayUrl}`);
  });
}

console.log('\n' + '='.repeat(70));
console.log('To review: copy any Image URL into your browser');
console.log('='.repeat(70) + '\n');
