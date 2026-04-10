/**
 * CardSight AI Client
 * Provides card pricing and identification for CardMiner
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from clawd root
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && match[1] && match[2]) process.env[match[1]] = match[2];
  });
} catch (e) {
  // .env may not exist, continue anyway
}

import { CardSightAI } from 'cardsightai';

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.CARDSIGHT_API_KEY;
    if (!apiKey) throw new Error('CARDSIGHT_API_KEY not found in .env');
    client = new CardSightAI({ apiKey });
  }
  return client;
}

/**
 * Get pricing data for a card
 * @param {string} player - Player name
 * @param {string} year - Card year  
 * @param {string} set - Set name (e.g. "Topps Finest")
 * @returns {Object} pricing data including raw and graded prices
 */
export async function getCardPricing(player, year, set) {
  try {
    const client = getClient();
    
    // Include year in search query for better results
    const searchQuery = set ? `${player} ${year} ${set}` : `${player} ${year}`;
    const results = await client.catalog.search({
      q: searchQuery,
      take: 50
    });

    if (!results.data?.results?.length) {
      return { found: false, reason: 'No cards found' };
    }

    // Filter to card results
    const cardResults = results.data.results.filter(r => r.type === 'card');
    if (!cardResults.length) {
      return { found: false, reason: 'No card results found' };
    }

    // Find card - prefer exact name match + year match
    let card = null;
    const playerLastName = player.split(' ').pop();
    const yearShort = year.slice(-2);
    
    // First: exact name match + year match (best for rookie cards)
    card = cardResults.find(c => c.name === player && c.year?.includes(yearShort));
    
    // Second: exact name match
    if (!card) {
      card = cardResults.find(c => c.name === player);
    }
    
    // Third: set match with player in name + year
    if (!card && set) {
      const setLower = set.toLowerCase();
      card = cardResults.find(c => 
        c.releaseName?.toLowerCase().includes(setLower) &&
        c.name.includes(playerLastName) &&
        c.year?.includes(yearShort)
      );
    }
    
    // Fourth: just set + year match
    if (!card && set) {
      const setLower = set.toLowerCase();
      card = cardResults.find(c => 
        c.releaseName?.toLowerCase().includes(setLower) &&
        c.year?.includes(yearShort)
      );
    }

    // Fall back to first result
    card = card || cardResults[0];
    
    // Get pricing using dedicated pricing endpoint
    const pricing = await client.pricing.get(card.id);
    
    return {
      found: true,
      cardId: card.id,
      cardName: card.name,
      set: card.setName,
      year: card.year,
      pricing: pricing.data
    };
  } catch (e) {
    console.error('CardSight pricing error:', e.message);
    return { found: false, reason: e.message };
  }
}

/**
 * Get PSA 9 and PSA 10 comp prices for a raw card
 * Used in email output for raw mode results
 */
export async function getPSAComps(player, year, set) {
  try {
    const result = await getCardPricing(player, year, set);
    
    if (!result.found) {
      return { psa9: null, psa10: null };
    }

    // Extract graded pricing from response
    const gradedData = result.pricing?.graded;
    if (!gradedData || !gradedData.length) {
      return { psa9: null, psa10: null, cardName: result.cardName, set: result.set, source: 'CardSight AI' };
    }

    // Parse graded data - collect PSA prices by grade
    const psaPrices = {};
    
    for (const company of gradedData) {
      if (company.company_name !== 'PSA') continue;
      
      for (const gradeGroup of company.grades || []) {
        const gradeVal = gradeGroup.grade_value;
        const records = gradeGroup.records || [];
        
        if (!psaPrices[gradeVal]) psaPrices[gradeVal] = [];
        
        for (const record of records) {
          psaPrices[gradeVal].push(record.price);
        }
      }
    }

    // Calculate average for PSA 9 and PSA 10
    let psa9 = null;
    let psa10 = null;
    
    if (psaPrices['9']?.length > 0) {
      psa9 = Math.round(psaPrices['9'].reduce((a, b) => a + b, 0) / psaPrices['9'].length);
    }
    if (psaPrices['10']?.length > 0) {
      psa10 = Math.round(psaPrices['10'].reduce((a, b) => a + b, 0) / psaPrices['10'].length);
    }

    return {
      psa9: psa9 ? `$${psa9}` : null,
      psa10: psa10 ? `$${psa10}` : null,
      cardName: result.cardName,
      set: result.set,
      source: 'CardSight AI'
    };
  } catch (e) {
    console.error('CardSight PSA comps error:', e);
    return { psa9: null, psa10: null };
  }
}

/**
 * Natural language card search
 * For future AI Scout summaries
 */
export async function aiCardQuery(query) {
  try {
    const client = getClient();
    const response = await client.ai.query({ query });
    return response.data;
  } catch (e) {
    console.error('CardSight AI query error:', e.message);
    return null;
  }
}