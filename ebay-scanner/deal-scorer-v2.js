/**
 * Deal Scorer V2 - Comprehensive scoring system
 * Assigns 1-10 score based on multiple factors
 * 
 * UPDATED: Feb 6, 2026
 * - Search Relevance: 40% (HIGHEST PRIORITY)
 * - Listing Quality: 25% (NM-MT+ ONLY - AUTO-REJECT below)
 * - Seller Quality: 20%
 * - Listing Freshness: 15%
 */

class DealScorerV2 {
  constructor(searchKeywords = '') {
    this.searchKeywords = searchKeywords.toLowerCase();
    this.weights = {
      sellerQuality: 0.20,      // 20% - Trust matters
      listingQuality: 0.25,     // 25% - Photos/condition (NM-MT+ ONLY)
      searchRelevance: 0.40,    // 40% - Does it match what you want? (HIGHEST PRIORITY)
      listingFreshness: 0.15    // 15% - Age matters
    };
  }

  /**
   * Score a deal comprehensively
   * @param {Object} item - eBay listing
   * @param {Object} comps - Comp data (sold or active)
   * @returns {Object} - Score breakdown
   */
  score(item, comps) {
    const sellerScore = this.scoreSellerQuality(item);
    const qualityScore = this.scoreListingQuality(item);
    
    // If card is below NM-MT, auto-reject with score 0
    if (qualityScore.disqualified) {
      return {
        score: 0,
        rating: '❌ REJECTED - BELOW NM-MT',
        breakdown: {
          sellerQuality: sellerScore,
          listingQuality: qualityScore,
          searchRelevance: { points: 0, reason: 'Disqualified by condition' },
          listingFreshness: { points: 0, reason: 'Disqualified by condition' }
        },
        flags: ['❌ Card condition below NM-MT - AUTO-REJECTED'],
        disqualified: true
      };
    }
    
    const relevanceScore = this.scoreSearchRelevance(item);
    const freshnessScore = this.scoreListingFreshness(item);

    // Calculate weighted total
    const totalScore = (
      ((sellerScore.points || 0) * this.weights.sellerQuality) +
      ((qualityScore.points || 0) * this.weights.listingQuality) +
      ((relevanceScore.points || 0) * this.weights.searchRelevance) +
      ((freshnessScore.points || 0) * this.weights.listingFreshness)
    );

    // Normalize to 1-10 scale
    const finalScore = Math.max(0, Math.min(10, Math.round(totalScore * 10) / 10));

    return {
      score: finalScore,
      rating: this.getRating(finalScore),
      breakdown: {
        sellerQuality: sellerScore,
        listingQuality: qualityScore,
        searchRelevance: relevanceScore,
        listingFreshness: freshnessScore
      },
      flags: this.getFlags(item, null, {
        sellerScore,
        qualityScore,
        relevanceScore,
        freshnessScore
      })
    };
  }

  /**
   * CRITERION 1: Seller Quality (20% weight)
   * Trust signals from seller feedback
   */
  scoreSellerQuality(item) {
    const feedback = item.sellerPositivePercent || 0;
    const salesCount = item.sellerFeedbackScore || 0;

    let points = 0;
    let tier = '';
    let trust = '';

    if (feedback >= 99 && salesCount >= 1000) {
      points = 10;
      tier = 'Elite seller';
      trust = '✅ TRUSTED';
    } else if (feedback >= 98 && salesCount >= 500) {
      points = 7.5;
      tier = 'Established seller';
      trust = '✅ Good';
    } else if (feedback >= 95 && salesCount >= 100) {
      points = 5;
      tier = 'Decent seller';
      trust = 'OK';
    } else if (feedback >= 90 || salesCount < 100) {
      points = 2.5;
      tier = 'New/low feedback seller';
      trust = '⚠️ New seller';
    } else {
      points = 0;
      tier = 'Low trust seller';
      trust = '⚠️ Low trust';
    }

    return {
      points,
      maxPoints: 10,
      feedback,
      salesCount,
      tier,
      trust,
      reason: `${feedback}% (${salesCount} sales) - ${tier}`
    };
  }

  /**
   * CRITERION 2: Listing Quality (25% weight)
   * Photo and description signals
   * 
   * ⚠️  NM-MT+ ONLY - AUTO-REJECT BELOW
   */
  scoreListingQuality(item) {
    let points = 0;
    let signals = [];
    let redFlags = [];

    // Title/description analysis
    const title = (item.title || '').toLowerCase();
    const condition = (item.condition || '').toLowerCase();

    // ═══════════════════════════════════════════════════════════════
    // CONDITION FILTER: NM-MT+ ONLY (CRITICAL - RETURN 0 IF BELOW)
    // ═══════════════════════════════════════════════════════════════
    
    // Red flag keywords that indicate below NM-MT
    const belowNMMT = [
      'poor', 'fair', 'good', 'very good', 'vg', 'ex', 'excellent',
      'damaged', 'crease', 'creased', 'tear', 'torn', 'corner wear',
      'edge wear', 'surface wear', 'scratched', 'stained', 'marked',
      'writing', 'worn', 'played', 'well-loved', 'vintage condition',
      'as-is', 'as is', 'see photos for condition', 'lower grade',
      'graded poor', 'graded fair', 'graded good', 'psa 1', 'psa 2',
      'psa 3', 'psa 4', 'psa 5', 'psa 6', 'bgs 1', 'bgs 2', 'bgs 3',
      'bgs 4', 'bgs 5', 'bgs 6', 'sgc 1', 'sgc 2', 'sgc 3', 'sgc 4',
      'sgc 5', 'sgc 6'
    ];

    // Check title and condition field for disqualifying keywords
    const hasBelowNMMT = belowNMMT.some(keyword => 
      title.includes(keyword) || condition.includes(keyword)
    );

    if (hasBelowNMMT) {
      return {
        points: 0,
        maxPoints: 10,
        signals: [],
        redFlags: ['❌ BELOW NM-MT - AUTO-REJECTED'],
        hasPhotos: !!item.imageUrl,
        disqualified: true,
        reason: '❌ Condition below NM-MT - AUTO-REJECT'
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // If we got here, card passes NM-MT+ filter - continue scoring
    // ═══════════════════════════════════════════════════════════════

    // Photo count (estimate from image presence)
    const hasImage = !!item.imageUrl;
    if (hasImage) {
      points += 5;
      signals.push('Has photos');
    } else {
      redFlags.push('No photos');
    }

    // Positive signals (only score if NM-MT+)
    if (title.includes('pack fresh') || title.includes('investment')) {
      points += 2.5;
      signals.push('Investment grade');
    }

    if (title.includes('mint') || title.includes('gem')) {
      points += 1;
      signals.push('Mint condition claimed');
    }

    if (title.includes('nm') || title.includes('near mint') || title.includes('nm-mt')) {
      points += 1;
      signals.push('NM-MT condition');
    }

    if (title.includes('psa 7') || title.includes('psa 8') || title.includes('psa 9') || title.includes('psa 10')) {
      points += 2;
      signals.push('High grade (PSA 7+)');
    }

    if (title.includes('bgs 7') || title.includes('bgs 8') || title.includes('bgs 9')) {
      points += 2;
      signals.push('High grade (BGS 7+)');
    }

    // Clamp to 0-10
    points = Math.max(0, Math.min(10, points));

    return {
      points,
      maxPoints: 10,
      signals,
      redFlags,
      hasPhotos: hasImage,
      disqualified: false,
      reason: redFlags.length > 0
        ? `⚠️ ${redFlags.join(', ')}`
        : signals.length > 0
          ? `✅ ${signals.join(', ')}`
          : 'Standard NM-MT listing'
    };
  }

  /**
   * CRITERION 3: Search Relevance (40% weight - HIGHEST PRIORITY)
   * How well does the listing match your search?
   */
  scoreSearchRelevance(item) {
    const title = (item.title || '').toLowerCase();
    const search = this.searchKeywords;

    let points = 0;
    let matches = [];
    let mismatches = [];

    // If no search keywords, can't score relevance
    if (!search || search.trim() === '') {
      return {
        points: 5,
        maxPoints: 10,
        matches: [],
        mismatches: [],
        reason: 'No search keywords to compare'
      };
    }

    // PART 0: Player Name Validation (CRITICAL - -5 to +3 points)
    // This is the MOST important check - wrong player = severe penalty

    // Exclude brand/card type keywords that shouldn't be treated as names
    const excludeKeywords = [
      'topps', 'chrome', 'finest', 'bowman', 'panini', 'prizm', 'optic', 'select',
      'upper', 'deck', 'fleer', 'ultra', 'donruss', 'stadium', 'club', 'refractor',
      'auto', 'patch', 'jersey', 'rookie', 'serial', 'parallel', 'numbered', 'insert',
      'base', 'prizm', 'silver', 'gold', 'black', 'orange', 'green', 'blue', 'red',
      'rated', 'prospect', 'future', 'stars', 'legends', 'vintage', 'retro', 'throwback',
      'card', 'cards', 'graded', 'raw', 'mint', 'near', 'excellent', 'good', 'fair',
      'psa', 'bgs', 'sgc', 'cgc', 'authenticated', 'certified', 'slab', 'graded'
    ];

    let playerNamePoints = 0;
    let playerMatches = [];
    let playerMismatches = [];

    // Extract potential player names from search query
    const searchPlayers = [];

    // Method 1: Look for common full name patterns (first + last name)
    const fullNamePattern = /\b([a-z]{3,})\s+([a-z]{3,})(?:\s+(jr|sr|iii|ii|iv))?\b/gi;
    const fullNameMatches = [...search.matchAll(fullNamePattern)];

    fullNameMatches.forEach(match => {
      const firstName = match[1].toLowerCase();
      const lastName = match[2].toLowerCase();
      const suffix = match[3] ? match[3].toLowerCase() : '';

      // Skip if either part is a brand/card keyword
      if (excludeKeywords.includes(firstName) || excludeKeywords.includes(lastName)) {
        return;
      }

      const fullName = `${firstName} ${lastName}${suffix ? ' ' + suffix : ''}`;
      searchPlayers.push({ fullName, firstName, lastName, type: 'full' });
    });

    // Method 2: Well-known distinctive last names (only use if no full name found)
    if (searchPlayers.length === 0) {
      const knownPlayers = [
        'jordan', 'lebron', 'kobe', 'shaq', 'giannis', 'jokic', 'luka', 'tatum',
        'curry', 'durant', 'embiid', 'harden', 'westbrook', 'griffin', 'wade',
        'nowitzki', 'duncan', 'garnett', 'pierce', 'iverson', 'mcgrady', 'carter',
        'kidd', 'nash', 'howard', 'gasol', 'doncic', 'morant', 'zion', 'wembanyama',
        'trout', 'judge', 'ohtani', 'betts', 'harper', 'tatis', 'guerrero', 'acuna',
        'soto', 'lindor', 'machado', 'freeman', 'degrom', 'scherzer', 'kershaw',
        'verlander', 'arenado', 'altuve', 'bregman', 'mahomes', 'allen', 'burrow',
        'herbert', 'jackson', 'hurts', 'lawrence', 'rodgers', 'brady', 'brees',
        'manning', 'favre', 'marino', 'elway', 'montana', 'griffey', 'mantle',
        'mays', 'aaron', 'williams', 'ruth', 'gehrig', 'dimaggio', 'clemente'
      ];

      for (const name of knownPlayers) {
        const regex = new RegExp(`\\b${name}\\b`, 'i');
        if (regex.test(search)) {
          searchPlayers.push({ fullName: name, lastName: name, type: 'last' });
          break; // Only take first match
        }
      }
    }

    // Check if player names appear in title
    if (searchPlayers.length > 0) {
      let foundMatch = false;

      for (const player of searchPlayers) {
        // If firstName exists (full name extracted), require BOTH first and last name
        if (player.firstName) {
          const firstNameInTitle = title.includes(player.firstName);
          const lastNameInTitle = title.includes(player.lastName);

          if (firstNameInTitle && lastNameInTitle) {
            playerNamePoints += 3;
            playerMatches.push(`✓ Player: ${player.fullName}`);
            matches.push(`Player match: ${player.fullName}`);
            foundMatch = true;
            break;
          }
        } else {
          // Only lastName available (known player fallback) - allow last name only
          const lastNameInTitle = title.includes(player.lastName);
          if (lastNameInTitle) {
            playerNamePoints += 2;
            playerMatches.push(`✓ Player (last name): ${player.lastName}`);
            matches.push(`Last name match: ${player.lastName}`);
            foundMatch = true;
            break;
          }
        }
      }

      // SEVERE PENALTY if player not found
      if (!foundMatch) {
        playerNamePoints = -5;
        const searchedFor = searchPlayers.map(p => p.fullName).join(', ');
        playerMismatches.push(`❌ WRONG PLAYER (searched: ${searchedFor})`);
        mismatches.push(`WRONG PLAYER - searched for: ${searchedFor}`);
      }
    }

    points += playerNamePoints;

    // PART 1: Card Type Match (0-4 points)
    const cardTypes = {
      refractor: ['refractor', 'xfractor', 'x-fractor', 'atomic refractor', 'pulsar'],
      prizm: ['prizm', 'silver prizm', 'prizm silver'],
      chrome: ['chrome', 'topps chrome', 'bowman chrome'],
      auto: ['auto', 'autograph', 'signed', 'signature'],
      patch: ['patch', 'jersey', 'memorabilia', 'game used', 'game worn'],
      rookie: ['rookie', 'rc', 'rookie card', '1st year'],
      serial: ['/99', '/25', '/10', '/5', 'numbered', 'serial numbered'],
      parallel: ['parallel', 'variation', 'short print', 'sp', 'ssp']
    };

    let cardTypePoints = 0;
    let requestedTypes = [];
    let foundTypes = [];

    // Check what card types user is searching for
    for (const [type, patterns] of Object.entries(cardTypes)) {
      const searchHasType = patterns.some(p => search.includes(p));
      const titleHasType = patterns.some(p => title.includes(p));

      if (searchHasType) {
        requestedTypes.push(type);
        if (titleHasType) {
          cardTypePoints += 4 / requestedTypes.length;
          foundTypes.push(type);
          matches.push(`${type} match`);
        } else {
          mismatches.push(`Missing: ${type}`);
        }
      }
    }

    // If no specific type requested, check if it's at least a premium card
    if (requestedTypes.length === 0) {
      const hasPremiumType = Object.values(cardTypes).flat().some(p => title.includes(p));
      if (hasPremiumType) {
        cardTypePoints = 2;
        matches.push('Premium card type');
      } else {
        cardTypePoints = 1;
        mismatches.push('Likely base card');
      }
    }

    points += Math.min(4, cardTypePoints);

    // PART 2: Year/Era Match (0-3 points)
    const searchYears = search.match(/\b(19\d{2}|20\d{2})\b/g) || [];
    const titleYears = title.match(/\b(19\d{2}|20\d{2})\b/g) || [];

    if (searchYears.length > 0) {
      if (titleYears.length > 0) {
        const searchYear = parseInt(searchYears[0]);
        const titleYear = parseInt(titleYears[0]);
        const yearDiff = Math.abs(searchYear - titleYear);

        if (yearDiff === 0) {
          points += 3;
          matches.push(`Exact year: ${titleYear}`);
        } else if (yearDiff <= 2) {
          points += 2;
          matches.push(`Close year: ${titleYear} (±2 of ${searchYear})`);
        } else if (yearDiff <= 5) {
          points += 1;
          matches.push(`Same era: ${titleYear} (±5 of ${searchYear})`);
        } else {
          mismatches.push(`Wrong year: ${titleYear} vs ${searchYear}`);
        }
      } else {
        points += 1;
        mismatches.push('Year not specified in title');
      }
    } else {
      points += 1.5;
    }

    // PART 3: Brand/Set Match (0-3 points)
    const brands = {
      topps: ['topps', 'topps chrome', 'topps finest', 'stadium club'],
      panini: ['panini', 'prizm', 'optic', 'select', 'donruss'],
      'upper deck': ['upper deck', 'ud', 'sp authentic', 'spx'],
      bowman: ['bowman', 'bowman chrome'],
      fleer: ['fleer', 'ultra', 'flair'],
      skybox: ['skybox']
    };

    let brandPoints = 0;
    let requestedBrands = [];
    let foundBrands = [];

    for (const [brand, patterns] of Object.entries(brands)) {
      const searchHasBrand = patterns.some(p => search.includes(p));
      const titleHasBrand = patterns.some(p => title.includes(p));

      if (searchHasBrand) {
        requestedBrands.push(brand);
        if (titleHasBrand) {
          brandPoints += 3 / requestedBrands.length;
          foundBrands.push(brand);
          matches.push(`${brand} match`);
        } else {
          mismatches.push(`Not ${brand}`);
        }
      }
    }

    // If no specific brand requested, give partial credit for premium brands
    if (requestedBrands.length === 0) {
      const hasPremiumBrand = Object.values(brands).flat().some(p => title.includes(p));
      if (hasPremiumBrand) {
        brandPoints = 1.5;
        matches.push('Premium brand');
      } else {
        brandPoints = 0.5;
      }
    }

    points += Math.min(3, brandPoints);

    // Clamp to 0-10
    points = Math.max(0, Math.min(10, points));

    return {
      points,
      maxPoints: 10,
      matches,
      mismatches,
      requestedTypes,
      foundTypes,
      reason: matches.length > 0
        ? `✅ ${matches.join(', ')}`
        : mismatches.length > 0
          ? `⚠️ ${mismatches.join(', ')}`
          : 'Partial match'
    };
  }

  /**
   * CRITERION 4: Listing Freshness (15% weight)
   * How recently listed
   */
  scoreListingFreshness(item) {
    if (!item.itemCreationDate && !item.itemEndDate) {
      return {
        points: 5,
        maxPoints: 10,
        ageInDays: null,
        reason: 'Unknown listing age'
      };
    }

    const now = Date.now();
    let listingDate;

    if (item.itemCreationDate) {
      listingDate = new Date(item.itemCreationDate).getTime();
    } else if (item.itemEndDate) {
      const endDate = new Date(item.itemEndDate).getTime();
      listingDate = endDate - (7 * 24 * 60 * 60 * 1000);
    }

    const ageInDays = (now - listingDate) / (1000 * 60 * 60 * 24);
    let points = 0;
    let tier = '';

    if (ageInDays < 1) {
      points = 10;
      tier = 'Listed <24 hours - FRESH';
    } else if (ageInDays <= 7) {
      points = 5;
      tier = 'Listed this week';
    } else if (ageInDays <= 30) {
      points = 2.5;
      tier = 'Listed this month';
    } else {
      points = 0;
      tier = 'Old listing - why still available?';
    }

    return {
      points,
      maxPoints: 10,
      ageInDays: Math.round(ageInDays),
      tier,
      reason: tier
    };
  }

  /**
   * Get rating text from score
   */
  getRating(score) {
    if (score >= 9) return '🔥 POTENTIAL STEAL';
    if (score >= 8) return '⚡ GREAT DEAL';
    if (score >= 7) return '💰 SOLID DEAL';
    if (score >= 6) return '✓ DECENT';
    if (score >= 5) return '~ MAYBE';
    if (score >= 4) return '⚠️ QUESTIONABLE';
    return '❌ SKIP';
  }

  /**
   * Get contextual flags
   */
  getFlags(item, comps, scores) {
    const flags = [];

    if (!scores || !scores.sellerScore || !scores.qualityScore || !scores.freshnessScore) {
      return flags;
    }

    const relevanceScore = scores.relevanceScore;

    // Condition disqualification
    if (scores.qualityScore.disqualified) {
      flags.push('❌ REJECTED - Condition below NM-MT');
      return flags;
    }

    // Low relevance = wrong card
    if (relevanceScore && relevanceScore.points < 5) {
      flags.push('⚠️ May not match your search - check details');
    }

    // Perfect relevance = exactly what you want
    if (relevanceScore && relevanceScore.points >= 9) {
      flags.push('✅ Perfect match for your search');
    }

    // Red flags in listing
    if (scores.qualityScore.redFlags && scores.qualityScore.redFlags.length > 0) {
      flags.push(`⚠️ ${scores.qualityScore.redFlags.join(', ')}`);
    }

    // Old listing at good price
    if (scores.freshnessScore.ageInDays !== null && scores.freshnessScore.ageInDays > 30) {
      flags.push('⚠️ Old listing - investigate why still available');
    }

    // Trusted seller + perfect match
    if (scores.sellerScore.points >= 8 && relevanceScore && relevanceScore.points >= 8) {
      flags.push('✅ Trusted seller + perfect match - HIGH CONFIDENCE');
    }

    return flags;
  }
}

module.exports = DealScorerV2;
