#!/usr/bin/env node
/**
 * Parse existing results and find top 5 refractors
 */

const fs = require('fs');
const path = require('path');

const resultsFile = path.join(__dirname, 'results', 'derik-queen-2026-02-02.json');
const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

// Refractor keywords to look for
const refractorKeywords = [
  'refractor', 'parallel', 'pulsar', 'prism', 'xfractor', 'x-fractor',
  'aqua', 'wave', 'hyper', 'purple', 'blue', 'green', 'gold', 'orange',
  'red', 'pink', 'speckle', 'ray wave', 'destiny', 'go time', '8-bit',
  '/199', '/150', '/99', '/75', '/50', '/25', '/10', '/5', '/1', '1/1'
];

// Rarity scoring
function getRefractorRarity(title) {
  const lower = title.toLowerCase();
  
  // Check for serial numbers first
  const serialMatch = lower.match(/\/(\d+)/);
  if (serialMatch) {
    const num = parseInt(serialMatch[1]);
    if (num === 1) return { score: 1, type: '1/1', serial: 1 };
    if (num <= 5) return { score: num, type: `/${num}`, serial: num };
    if (num <= 10) return { score: num, type: `/${num}`, serial: num };
    if (num <= 25) return { score: num, type: `/${num}`, serial: num };
    if (num <= 50) return { score: num, type: `/${num}`, serial: num };
    if (num <= 99) return { score: num, type: `/${num}`, serial: num };
    if (num <= 199) return { score: num, type: `/${num}`, serial: num };
    return { score: num, type: `/${num}`, serial: num };
  }
  
  // Named refractors (no specific serial)
  if (lower.includes('superfractor')) return { score: 1, type: 'Superfractor', serial: 1 };
  if (lower.includes('gold')) return { score: 50, type: 'Gold Refractor', serial: 50 };
  if (lower.includes('orange')) return { score: 25, type: 'Orange Refractor', serial: 25 };
  if (lower.includes('red')) return { score: 5, type: 'Red Refractor', serial: 5 };
  if (lower.includes('purple')) return { score: 299, type: 'Purple Refractor', serial: 299 };
  if (lower.includes('blue')) return { score: 150, type: 'Blue Refractor', serial: 150 };
  if (lower.includes('green')) return { score: 99, type: 'Green Refractor', serial: 99 };
  if (lower.includes('aqua') || lower.includes('ray wave')) return { score: 199, type: 'Aqua Ray Wave', serial: 199 };
  if (lower.includes('pink')) return { score: 399, type: 'Pink Refractor', serial: 399 };
  if (lower.includes('pulsar')) return { score: 500, type: 'Pulsar Refractor', serial: null };
  if (lower.includes('prism')) return { score: 600, type: 'Prism Refractor', serial: null };
  if (lower.includes('xfractor') || lower.includes('x-fractor')) return { score: 700, type: 'X-Fractor', serial: null };
  if (lower.includes('hyper')) return { score: 800, type: 'Hyper', serial: null };
  if (lower.includes('refractor')) return { score: 900, type: 'Base Refractor', serial: null };
  
  return null;
}

// Find refractors
const refractors = data.allDeals
  .map(deal => {
    const rarity = getRefractorRarity(deal.title);
    if (rarity) {
      return {
        ...deal,
        refractorType: rarity.type,
        rarityScore: rarity.score,
        serialNumber: rarity.serial
      };
    }
    return null;
  })
  .filter(x => x !== null);

// Sort by rarity (lower = more rare)
refractors.sort((a, b) => a.rarityScore - b.rarityScore);

// Get top 5
const top5 = refractors.slice(0, 5);

console.log('═══════════════════════════════════════════════════');
console.log('💎 TOP 5 RAREST DERIK QUEEN TOPPS CHROME REFRACTORS');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Found ${refractors.length} refractors/parallels total\n`);

top5.forEach((card, i) => {
  const rarityEmoji = card.rarityScore <= 5 ? '🔥🔥🔥🔥🔥' :
                     card.rarityScore <= 25 ? '🔥🔥🔥🔥' :
                     card.rarityScore <= 99 ? '🔥🔥🔥' :
                     card.rarityScore <= 199 ? '🔥🔥' : '🔥';
  
  console.log(`${i + 1}. ${rarityEmoji} ${card.refractorType}`);
  console.log(`   ${card.title}`);
  console.log(`   💰 Price: $${card.totalPrice}`);
  
  if (card.serialNumber) {
    console.log(`   🔢 Serial: /${card.serialNumber}`);
  }
  
  console.log(`   ⭐ Rarity Score: ${card.rarityScore} (lower = more rare)`);
  console.log(`   🔗 ${card.viewItemURL}\n`);
});

console.log('\n✅ Search complete!\n');
