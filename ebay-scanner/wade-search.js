#!/usr/bin/env node
/**
 * Dwyane Wade 2003-04 Rookie Search
 * Include graded cards (most Wade rookies are graded)
 */

const scoredSearch = require('./scored-search');

async function searchWade() {
  await scoredSearch({
    keywords: 'dwyane wade refractor 2003',
    categoryId: '212',
    minPrice: 10,
    maxPrice: 5000,
    rawOnly: false,  // Include graded cards
    minScoreToShow: 6.0,  // Show decent+ deals
    topN: 30  // Top 30
  });
}

searchWade().catch(console.error);
