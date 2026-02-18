/**
 * Smart Query Parser
 * Parses complex search queries and splits into optimized individual searches
 *
 * Supports:
 * 1. Multiple players: "kobe bryant, tim duncan, dirk nowitzki"
 * 2. Multiple card types: "wade refractors, numbered cards, and autos"
 * 3. Year ranges: "jordan 1990-1994" or "jordan between 1990 and 1994"
 * 4. Combined: "kobe, tim, dirk 1990-1992 refractors and autos"
 *
 * Example 1: "2003 dwyane wade refractors, numbered cards, and autos"
 * Becomes:
 *   - "2003 dwyane wade refractor"
 *   - "2003 dwyane wade numbered"
 *   - "2003 dwyane wade auto"
 *
 * Example 2: "jordan 1990-1992"
 * Becomes:
 *   - "1990 jordan"
 *   - "1991 jordan"
 *   - "1992 jordan"
 *
 * Example 3: "jordan 1990-1992 refractors and autos"
 * Becomes:
 *   - "1990 jordan refractor"
 *   - "1991 jordan refractor"
 *   - "1992 jordan refractor"
 *   - "1990 jordan auto"
 *   - "1991 jordan auto"
 *   - "1992 jordan auto"
 *
 * Example 4: "kobe bryant, tim duncan, dirk nowitzki topps refractor"
 * Becomes:
 *   - "kobe bryant topps refractor"
 *   - "tim duncan topps refractor"
 *   - "dirk nowitzki topps refractor"
 */

class SmartQueryParser {
  constructor() {
    // Card type keywords that indicate separate searches
    this.cardTypes = {
      refractor: ['refractor', 'refractors', 'xfractor', 'xfractors'],
      prizm: ['prizm', 'silver prizm'],
      chrome: ['chrome'],
      auto: ['auto', 'autos', 'autograph', 'autographs', 'signed'],
      patch: ['patch', 'patches', 'jersey', 'memorabilia'],
      rookie: ['rookie', 'rookies', 'rc'],
      numbered: ['numbered', 'numbered card', 'numbered cards', '/25', '/99', '/10'],
      parallel: ['parallel', 'parallels', 'variation', 'variations'],
      insert: ['insert', 'inserts']
    };

    // Year range patterns
    this.yearRangePatterns = [
      /(\d{4})\s*-\s*(\d{4})/,  // "1990-1994" or "1990 - 1994"
      /between\s+(\d{4})\s+and\s+(\d{4})/i,  // "between 1990 and 1994"
      /(\d{4})\s+to\s+(\d{4})/i  // "1990 to 1994"
    ];

    // Common player name patterns (for detection)
    this.commonFirstNames = [
      'michael', 'kobe', 'lebron', 'tim', 'dirk', 'dwyane', 'shaquille', 'shaq',
      'kevin', 'stephen', 'steph', 'larry', 'magic', 'kareem', 'wilt', 'bill',
      'allen', 'ray', 'paul', 'chris', 'carmelo', 'tracy', 'vince', 'jason',
      'steve', 'john', 'charles', 'scottie', 'dennis', 'hakeem', 'patrick',
      'derik', 'derrick', 'kyrie', 'russell', 'james', 'anthony', 'damian'
    ];
  }

  /**
   * Parse a query into multiple optimized searches
   * @param {String} query - User's search query
   * @returns {Array} - Array of optimized search strings
   */
  parse(query) {
    const normalized = query.toLowerCase().trim();

    // STEP 1: Check for multiple players first
    const players = this.detectMultiplePlayers(normalized);

    if (players) {
      // Multiple players detected - split into separate searches for each player
      const remainder = this.extractQueryRemainder(normalized, players);
      const allSearches = [];

      players.forEach(player => {
        // Reconstruct query for this player with the remainder
        const playerQuery = `${player} ${remainder}`.trim();

        // Parse this player's query (may have year ranges, card types)
        const playerSearches = this.parseSinglePlayer(playerQuery);
        allSearches.push(...playerSearches);
      });

      return allSearches;
    }

    // No multiple players - use single player parsing
    return this.parseSinglePlayer(normalized);
  }

  /**
   * Parse a single player query (handles year ranges and card types)
   * @param {String} query - Query for a single player
   * @returns {Array} - Array of search strings
   */
  parseSinglePlayer(query) {
    const normalized = query.toLowerCase().trim();

    // Check for year ranges first
    const yearRange = this.detectYearRange(normalized);
    const detectedTypes = this.detectCardTypes(normalized);

    // If no year range and single/no card type, return as-is
    if (!yearRange && detectedTypes.length <= 1) {
      return [query];
    }

    // Extract base query (without card types and year ranges)
    let baseQuery = normalized;

    // Remove card type keywords if we have multiple types OR if we have a year range
    if (detectedTypes.length > 1 || (yearRange && detectedTypes.length > 0)) {
      baseQuery = this.extractBaseQuery(normalized, detectedTypes);
    }

    // Remove year range pattern
    if (yearRange) {
      baseQuery = this.removeYearRange(baseQuery, yearRange);
    }

    // Expand year range into individual years
    const years = yearRange ? this.expandYearRange(yearRange) : [null];

    // Build all search combinations
    const searches = [];

    if (detectedTypes.length > 1) {
      // Multiple card types - create search for each type and each year
      years.forEach(year => {
        detectedTypes.forEach(type => {
          const yearPart = year ? `${year} ` : '';
          const search = `${yearPart}${baseQuery} ${type.keyword}`.trim();
          searches.push(search);
        });
      });
    } else if (yearRange) {
      // Year range only - create search for each year
      const cardType = detectedTypes[0] ? ` ${detectedTypes[0].keyword}` : '';
      years.forEach(year => {
        const search = `${year} ${baseQuery}${cardType}`.trim();
        searches.push(search);
      });
    } else {
      // Only card types (no year range) - original behavior
      detectedTypes.forEach(type => {
        const search = `${baseQuery} ${type.keyword}`.trim();
        searches.push(search);
      });
    }

    return searches;
  }

  /**
   * Detect year range in query
   * @param {String} query - Normalized query
   * @returns {Object|null} - Year range object or null if not found
   */
  detectYearRange(query) {
    for (const pattern of this.yearRangePatterns) {
      const match = query.match(pattern);
      if (match) {
        const startYear = parseInt(match[1]);
        const endYear = parseInt(match[2]);

        // Validate years are reasonable (1900-2100)
        if (startYear >= 1900 && startYear <= 2100 &&
            endYear >= 1900 && endYear <= 2100 &&
            startYear <= endYear) {
          return {
            start: startYear,
            end: endYear,
            match: match[0],
            position: match.index
          };
        }
      }
    }
    return null;
  }

  /**
   * Expand year range into array of individual years
   * @param {Object} yearRange - Year range object from detectYearRange
   * @returns {Array} - Array of years
   */
  expandYearRange(yearRange) {
    const years = [];
    for (let year = yearRange.start; year <= yearRange.end; year++) {
      years.push(year);
    }
    return years;
  }

  /**
   * Remove year range from query
   * @param {String} query - Query string
   * @param {Object} yearRange - Year range object
   * @returns {String} - Query without year range
   */
  removeYearRange(query, yearRange) {
    let cleaned = query.replace(yearRange.match, ' ');

    // Remove orphaned keywords and years from the range pattern
    cleaned = cleaned
      .replace(/\bbetween\b\s*/gi, ' ')
      .replace(/\s*\bto\b\s*/gi, ' ')
      // Remove any standalone 4-digit years that were part of the range
      .replace(new RegExp(`\\b${yearRange.start}\\b`, 'g'), ' ')
      .replace(new RegExp(`\\b${yearRange.end}\\b`, 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Detect which card types are mentioned in query
   * @param {String} query - Normalized query
   * @returns {Array} - Array of detected types with keywords
   */
  detectCardTypes(query) {
    const detected = [];

    for (const [typeName, keywords] of Object.entries(this.cardTypes)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          detected.push({
            type: typeName,
            keyword: keyword,
            position: query.indexOf(keyword)
          });
          break; // Only add each type once
        }
      }
    }

    // Sort by position in query
    detected.sort((a, b) => a.position - b.position);

    return detected;
  }

  /**
   * Extract the base query (player, year, brand)
   * Removes card type keywords
   * @param {String} query - Normalized query
   * @param {Array} detectedTypes - Detected card types
   * @returns {String} - Base query without card types
   */
  extractBaseQuery(query, detectedTypes) {
    let base = query;

    // Remove card type keywords
    detectedTypes.forEach(type => {
      // Remove the keyword and surrounding commas/conjunctions
      base = base.replace(new RegExp(`\\b${type.keyword}s?\\b`, 'gi'), '');
    });

    // Clean up punctuation and conjunctions
    base = base
      .replace(/\b(and|or)\b/gi, ' ')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return base;
  }

  /**
   * Detect if query contains multiple comma-separated players
   * @param {String} query - Normalized query
   * @returns {Array|null} - Array of player names or null if not detected
   */
  detectMultiplePlayers(query) {
    // Look for comma-separated patterns that look like player names
    // Pattern: "first last, first last" or "last, last, last"

    // First, check if there are commas followed by potential names
    const parts = query.split(',').map(p => p.trim());

    if (parts.length < 2) {
      return null; // No commas, can't be multiple players
    }

    // Check if the parts before commas look like player names
    // A player name part should:
    // 1. Come early in the query (before card types, years, brands)
    // 2. Contain 1-3 words (first name, last name, or nickname)
    // 3. Not be a card type keyword

    const potentialPlayers = [];
    const brandKeywords = ['topps', 'prizm', 'chrome', 'finest', 'select', 'panini', 'upper', 'deck'];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      // Skip empty parts
      if (!part) continue;

      // For the first part, we need to extract just the player name
      // (might have brand/year at the beginning)
      let playerPart = part;

      // Remove leading years (e.g., "2003 wade" -> "wade")
      playerPart = playerPart.replace(/^\d{4}\s+/, '');

      // Remove year ranges (e.g., "lebron 2000-2001" -> "lebron")
      playerPart = playerPart.replace(/\s+\d{4}\s*-\s*\d{4}.*$/, '');
      playerPart = playerPart.replace(/\s+between\s+\d{4}\s+and\s+\d{4}.*$/i, '');
      playerPart = playerPart.replace(/\s+\d{4}\s+to\s+\d{4}.*$/i, '');

      // Split into words
      const words = playerPart.split(/\s+/);

      // Extract player name (first 1-3 words before hitting brand/card type keywords)
      const playerWords = [];
      for (const word of words) {
        // Check if this word is a brand keyword
        if (brandKeywords.includes(word.toLowerCase())) {
          break; // Stop here, rest is brand/card type info
        }

        // Check if this word is a card type keyword
        const isCardType = Object.values(this.cardTypes).some(keywords =>
          keywords.some(kw => kw.toLowerCase() === word.toLowerCase())
        );
        if (isCardType) {
          break; // Stop here, rest is card type info
        }

        // This word is part of the player name
        playerWords.push(word);

        // Stop after 3 words (e.g., "shaquille o'neal")
        if (playerWords.length >= 3) {
          break;
        }
      }

      // If we found 1-3 words that could be a player name, add it
      if (playerWords.length >= 1 && playerWords.length <= 3) {
        potentialPlayers.push(playerWords.join(' '));
      } else if (potentialPlayers.length === 0) {
        // First part didn't look like a player - probably not a player list
        break;
      }
    }

    // We need at least 2 players to consider it a multi-player search
    if (potentialPlayers.length >= 2) {
      return potentialPlayers;
    }

    return null;
  }

  /**
   * Extract the rest of the query after removing player names
   * @param {String} query - Original query
   * @param {Array} players - Detected player names
   * @returns {String} - Query remainder (brands, card types, years, etc.)
   */
  extractQueryRemainder(query, players) {
    let remainder = query;

    // Remove all player names from the query
    players.forEach(player => {
      // Remove player name and the comma after it
      remainder = remainder.replace(new RegExp(`${this.escapeRegex(player)}\\s*,?`, 'gi'), '');
    });

    // Clean up extra spaces and commas
    remainder = remainder
      .replace(/,+/g, ',')  // Multiple commas -> single comma
      .replace(/\s*,\s*/g, ' ')  // Remove remaining commas
      .replace(/\s+/g, ' ')  // Multiple spaces -> single space
      .trim();

    return remainder;
  }

  /**
   * Escape special regex characters
   * @param {String} str - String to escape
   * @returns {String} - Escaped string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Parse and explain what searches will be run
   * @param {String} query - User's query
   * @returns {Object} - Parsed query with explanation
   */
  explain(query) {
    const searches = this.parse(query);
    const normalized = query.toLowerCase();
    const players = this.detectMultiplePlayers(normalized);
    const detectedTypes = this.detectCardTypes(normalized);
    const yearRange = this.detectYearRange(normalized);

    let baseQuery = normalized;

    // If multiple players, extract remainder
    if (players) {
      baseQuery = this.extractQueryRemainder(normalized, players);
    }

    // Remove card type keywords if we have multiple types OR if we have a year range
    if (detectedTypes.length > 1 || (yearRange && detectedTypes.length > 0)) {
      baseQuery = this.extractBaseQuery(baseQuery, detectedTypes);
    }

    // Remove year range pattern
    if (yearRange) {
      baseQuery = this.removeYearRange(baseQuery, yearRange);
    }

    // Build explanation
    let explanation = '';
    if (searches.length > 1) {
      const parts = [];
      if (players) {
        parts.push(`${players.length} players (${players.join(', ')})`);
      }
      if (yearRange) {
        const yearCount = yearRange.end - yearRange.start + 1;
        parts.push(`${yearCount} years (${yearRange.start}-${yearRange.end})`);
      }
      if (detectedTypes.length > 1) {
        parts.push(`${detectedTypes.length} card types (${detectedTypes.map(t => t.type).join(', ')})`);
      }
      explanation = `Split into ${searches.length} searches: ${parts.join(' × ')}`;
    } else {
      explanation = 'Single search (no splitting needed)';
    }

    return {
      original: query,
      isComplex: searches.length > 1,
      baseQuery: baseQuery.trim(),
      players: players || null,
      yearRange: yearRange ? {
        start: yearRange.start,
        end: yearRange.end,
        years: this.expandYearRange(yearRange)
      } : null,
      detectedTypes: detectedTypes.map(t => t.type),
      searches,
      searchCount: searches.length,
      explanation
    };
  }
}

module.exports = SmartQueryParser;
