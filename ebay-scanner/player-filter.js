/**
 * Player Quality Filter
 * Only allow cards from star players or top prospects
 */

class PlayerFilter {
  
  constructor() {
    // Star players worth buying (update this list as needed)
    this.starPlayers = [
      // NBA
      'michael jordan', 'lebron james', 'kobe bryant', 'luka doncic',
      'stephen curry', 'kevin durant', 'giannis', 'nikola jokic',
      'anthony davis', 'jayson tatum', 'joel embiid', 'damian lillard',
      'victor wembanyama', 'chet holmgren', 'paolo banchero',
      
      // NFL  
      'patrick mahomes', 'tom brady', 'joe burrow', 'justin herbert',
      'josh allen', 'lamar jackson', 'cj stroud', 'bryce young',
      'caleb williams', 'jayden daniels',
      
      // MLB
      'mike trout', 'shohei ohtani', 'aaron judge', 'mookie betts',
      'ronald acuna', 'ken griffey', 'derek jeter', 'bryce harper',
      'juan soto', 'vladimir guerrero',
      
      // NHL
      'connor mcdavid', 'sidney crosby', 'alex ovechkin', 'nathan mackinnon',
      'auston matthews', 'connor bedard', 'alexis lafreniere'
    ];
    
    // Exception: Allow ANY rookie if numbered low enough
    this.autoPassThresholds = {
      serialNumbered: 25,  // /25 or less = auto-pass
      onCardAuto: 10      // On-card auto /10 or less = auto-pass
    };
  }
  
  /**
   * Check if player is a star or worthy of buying
   */
  isStarPlayer(title) {
    const titleLower = title.toLowerCase();
    
    // Check if any star player is mentioned
    for (const player of this.starPlayers) {
      if (titleLower.includes(player)) {
        return {
          passed: true,
          player: player,
          reason: 'Star player card'
        };
      }
    }
    
    return {
      passed: false,
      reason: 'Player not in star player list'
    };
  }
  
  /**
   * Check if card auto-passes due to rarity (regardless of player)
   */
  isRareEnough(title, breakdown) {
    const titleLower = title.toLowerCase();
    
    // Extract serial number (e.g., "/15", "/25", "1/10")
    const serialMatch = titleLower.match(/\/(\d+)/) || titleLower.match(/\d+\/(\d+)/);
    
    if (serialMatch) {
      const serialNumber = parseInt(serialMatch[1]);
      
      // /10 or less on-card auto = auto-pass
      if (titleLower.includes('auto') && serialNumber <= this.autoPassThresholds.onCardAuto) {
        return {
          passed: true,
          reason: `Ultra-rare: On-card auto /${serialNumber}`,
          serialNumber
        };
      }
      
      // /25 or less = auto-pass
      if (serialNumber <= this.autoPassThresholds.serialNumbered) {
        return {
          passed: true,
          reason: `Ultra-rare: Numbered /${serialNumber}`,
          serialNumber
        };
      }
    }
    
    return {
      passed: false,
      reason: 'Not rare enough to override player filter'
    };
  }
  
  /**
   * Master filter - check if card should pass
   */
  shouldPass(item) {
    // Check 1: Is it a star player?
    const starCheck = this.isStarPlayer(item.title);
    if (starCheck.passed) {
      return starCheck;
    }
    
    // Check 2: Is it rare enough to not matter who the player is?
    const rarityCheck = this.isRareEnough(item.title, item.dealScore?.breakdown);
    if (rarityCheck.passed) {
      return rarityCheck;
    }
    
    // Failed both checks - reject
    return {
      passed: false,
      reason: 'Not a star player and not rare enough'
    };
  }
}

module.exports = PlayerFilter;
