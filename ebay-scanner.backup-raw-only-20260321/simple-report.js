/**
 * Simple, clean report format (no emojis, focused on score breakdown)
 */

function generateSimpleReport(keywords, items, topN) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(80));
  lines.push(`SEARCH: ${keywords.toUpperCase()}`);
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Found: ${items.length} deals (score >= 7.0)`);
  lines.push(`Showing: Top ${Math.min(items.length, topN)}`);
  lines.push('');
  lines.push('='.repeat(80));

  if (items.length === 0) {
    lines.push('No deals found matching criteria');
    return lines.join('\n');
  }

  // Show top N
  const topDeals = items.slice(0, topN);

  topDeals.forEach((item, i) => {
    const score = item.dealScore;
    const bd = score.breakdown;

    lines.push('');
    lines.push(`${i + 1}. [SCORE: ${score.score}/10] ${score.rating}`);
    lines.push(`   ${item.title}`);
    lines.push(`   Price: $${item.totalPrice}`);
    lines.push('');
    lines.push('   Score Breakdown:');

    // Price
    if (bd.priceAnalysis.medianPrice) {
      const discount = bd.priceAnalysis.percentBelowMedian;
      lines.push(`   - Price: ${bd.priceAnalysis.points}/10`);
      lines.push(`     $${item.totalPrice} vs market $${bd.priceAnalysis.medianPrice.toFixed(2)}`);
      lines.push(`     ${discount}% ${discount > 0 ? 'below' : 'above'} market`);
      lines.push(`     ${bd.priceAnalysis.reason}`);
    } else {
      lines.push(`   - Price: ${bd.priceAnalysis.points}/10 - ${bd.priceAnalysis.reason}`);
    }

    // Seller
    lines.push(`   - Seller: ${bd.sellerQuality.points}/10`);
    lines.push(`     ${bd.sellerQuality.feedback}% feedback, ${bd.sellerQuality.salesCount} sales`);
    lines.push(`     ${bd.sellerQuality.trust} - ${bd.sellerQuality.tier}`);

    // Listing
    lines.push(`   - Listing: ${bd.listingQuality.points}/10`);
    if (bd.listingQuality.signals.length > 0) {
      lines.push(`     Signals: ${bd.listingQuality.signals.join(', ')}`);
    }
    if (bd.listingQuality.redFlags.length > 0) {
      lines.push(`     Red flags: ${bd.listingQuality.redFlags.join(', ')}`);
    }
    if (!bd.listingQuality.signals.length && !bd.listingQuality.redFlags.length) {
      lines.push(`     ${bd.listingQuality.reason}`);
    }

    // Freshness
    lines.push(`   - Freshness: ${bd.listingFreshness.points}/10`);
    lines.push(`     ${bd.listingFreshness.reason}`);

    // Comps
    lines.push(`   - Comps: ${bd.comparability.points}/10`);
    lines.push(`     ${bd.comparability.reason}`);

    // Flags
    if (score.flags && score.flags.length > 0) {
      lines.push('');
      lines.push(`   Flags: ${score.flags.join(', ')}`);
    }

    // Link
    lines.push('');
    lines.push(`   ${item.viewItemURL}`);
    lines.push('');
    lines.push('-'.repeat(80));
  });

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('');

  return lines.join('\n');
}

module.exports = generateSimpleReport;
