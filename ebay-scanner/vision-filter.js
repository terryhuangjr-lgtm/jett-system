/**
 * Vision Filter - Claude Haiku Image Analysis
 * Analyzes card images for condition issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { logVisionDecision } = require('./vision-logger');

function upgradeImageUrl(url) {
  if (!url) return url;
  return url
    .replace('s-l225.jpg', 's-l500.jpg')
    .replace('s-l140.jpg', 's-l500.jpg')
    .replace('s-l64.jpg',  's-l500.jpg');
}

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  console.error('Failed to load @anthropic-ai/sdk:', e.message);
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  } catch (e) {
    // Ignore - env file may not exist
  }
}
loadEnv();

class VisionFilter {
  constructor() {
    if (!Anthropic) {
      throw new Error('@anthropic-ai/sdk not installed. Run: npm install @anthropic-ai/sdk');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment. Check .env file.');
    }

    this.client = new Anthropic({ apiKey });
    this.model = 'claude-3-5-haiku-20241022';
  }

  /**
   * Analyze a single card listing image for condition issues
   * Returns a condition assessment object
   */
  async analyzeCardImage(imageUrl, title = '') {
    if (!imageUrl) {
      return { 
        score: 5, 
        skip: false, 
        reason: 'No image available',
        issues: []
      };
    }

    try {
      const upgradedUrl = upgradeImageUrl(imageUrl);
      const imageBase64 = await this.fetchImageAsBase64(upgradedUrl);
      if (!imageBase64) {
        return { score: 5, skip: false, reason: 'Could not fetch image', issues: [] };
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Analyze this sports card listing photo for obvious condition problems.
Return ONLY valid JSON, no other text:
{
  "corners": 1-10,
  "centering": 1-10,
  "overall": 1-10,
  "issues": ["describe SPECIFIC things you actually see, not generic statements. Do NOT specify which side (left/right/top/bottom) is off-center or worn - just describe WHAT you see. BAD: 'Left border noticeably wider than right'. GOOD: 'Off-center alignment visible'. BAD: 'Top-left corner shows wear'. GOOD: 'Corner wear visible'. If card looks genuinely clean, say exactly what looks good: e.g. 'corners appear sharp', 'borders look even'"],
  "skip": true/false,
  "confidence": "high/medium/low"
}

SCORING RULES - you MUST use the full 1-10 range:

corners scoring (be specific and honest):
- 9-10: Perfect sharp corners, no visible wear at all
- 7-8: Very minor wear only visible up close
- 5-6: Clearly visible corner wear or slight rounding
- 3-4: Obvious corner rounding, white edges visible  
- 1-2: Badly damaged corners

centering scoring (measure the border ratio):
- 9-10: Borders appear equal on all sides (60/40 or better)
- 7-8: Slightly off but barely noticeable (65/35)
- 5-6: Noticeably off-center, one border clearly wider (70/30)
- 3-4: Badly off-center, major border difference (80/20)
- 1-2: Severely miscut

DISTRIBUTION REQUIREMENT: Across a batch of cards you 
MUST vary your scores. Most raw eBay cards have real 
flaws. If you are giving every card the same score you
are not analyzing carefully enough. 

CALIBRATION GUIDE for raw eBay card listings:
- Most raw cards on eBay score 6-8 for corners
- A score of 9-10 means genuinely exceptional condition
- A score of 5 or below means clearly visible problems
- Do not cluster scores around 7 - this is meaningless
- If you cannot clearly see the corners due to image 
  quality, score 6 and note low confidence
- Centering: most cards are slightly off, score 6-7 
  is normal. Score 8+ means visibly well-centered. 

A score of 7 means "above average condition" - most cards
should NOT score 7. Be honest and critical.

SKIP RULES - only set skip:true for OBVIOUS problems:
- Corners are CLEARLY white, rounded, or worn (score 5 or below)
- Centering is OBVIOUSLY bad - worse than 65/35 ratio (score 4 or below)
- Visible creases, folds, or writing on card face
- Card is clearly damaged or heavily worn

CRITICAL: Topps Finest cards (1993-1999) have a protective 
plastic coating/film that is FACTORY APPLIED. This coating 
IS NOT a defect. If the coating is still intact (unpeeled) 
this is actually MORE valuable, not less. 
NEVER penalize for protective coating or film.
NEVER list coating as an issue.
If you see a shiny plastic layer covering the card surface,
ignore it completely when scoring.

When in doubt, set skip:false and give an honest score.
If image is too small or dark to assess, return 
overall:6 skip:false confidence:low`
            }
          ]
        }]
      });

      const text = response.content[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { score: 5, skip: false, reason: 'Could not parse vision response', issues: [] };
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Calculate overall score based ONLY on corners and centering (50/50)
      // Surface is ignored per user's request
      let cornersScore = result.corners || 5;
      let centeringScore = result.centering || 5;
      
      // Apply stricter penalties for bad corners/centering
      if (cornersScore < 6) {
        cornersScore = cornersScore * 0.7; // Heavy penalty for bad corners
      }
      if (centeringScore < 6) {
        centeringScore = centeringScore * 0.7; // Heavy penalty for bad centering
      }
      
      const rawScore = (cornersScore + centeringScore) / 2;

      // Apply confidence multiplier
      const confidenceMultiplier = 
        result.confidence === 'high' ? 1.0 :
        result.confidence === 'medium' ? 0.85 :
        0.7;

      const overallScore = Math.round(rawScore * confidenceMultiplier);

      return {
        score: overallScore,
        confidence: result.confidence || 'medium',
        corners: result.corners || 5,
        centering: result.centering || 5,
        overall: result.overall || ((result.corners || 5 + result.centering || 5) / 2),
        surface: 7, // Ignored - always neutral
        skip: result.skip || false,
        issues: result.issues || [],
        reason: result.issues?.join(', ') || 'Passed vision check'
      };

    } catch (e) {
      console.error(`Vision analysis error for "${title}": ${e.message}`);
      return { score: 5, skip: false, reason: `Vision error: ${e.message}`, issues: [] };
    }
  }

  /**
   * Analyze multiple items and filter/score them
   * Only scans top N items by deal score to control costs
   */
  async filterItems(items, topN = 200) {
    const toScan = items.slice(0, topN);
    console.log(`\n👁️  Vision scanning ${toScan.length} listings with Claude Haiku (parallel)...`);

    const BATCH_SIZE = 8; // 8 concurrent API calls
    const results = [];
    let skipped = 0;
    let passed = 0;
    let totalCost = 0;
    let processed = 0;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
      const batch = toScan.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toScan.length / BATCH_SIZE);
      
      process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} cards)...`);

      // Fire all batch requests simultaneously
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const vision = await this.analyzeCardImage(item.imageUrl, item.title);
          totalCost += 0.002;
          processed++;
          return { item, vision };
        })
      );

      // Process batch results
      let batchPassed = 0;
      let batchSkipped = 0;
      for (const { item, vision } of batchResults) {
        // Only reject on explicit skip:true from Haiku
        // Score-based penalization happens in deal scoring, not here
        const cornerScore = vision.corners || 6;
        const centerScore = vision.centering || 6;
        const overallScore = vision.overall || 
          ((cornerScore + centerScore) / 2);
        const confidenceMult = vision.confidence === 'high' ? 1.0 :
                             vision.confidence === 'medium' ? 0.9 : 0.75;
        const finalScore = parseFloat((overallScore * confidenceMult).toFixed(1));

        if (vision.skip) {
          skipped++;
          batchSkipped++;
          logVisionDecision(item, vision, 'REJECT');
          process.stdout.write(` ❌ SKIP (${vision.issues?.join(', ') || 'obvious defect'})\n`);
        } else {
          passed++;
          batchPassed++;
          logVisionDecision(item, vision, 'PASS');
          // Cards with issues get lower scores but still appear in results
          const label = finalScore >= 7 ? '✅' : finalScore >= 5.5 ? '⚠️' : '🔶';
          process.stdout.write(` ${label} PASS (corners:${cornerScore} center:${centerScore} score:${finalScore})\n`);
          results.push({
            ...item,
            visionScore: finalScore,
            visionCorners: cornerScore,
            visionCentering: centerScore,
            visionIssues: vision.issues || [],
            visionReason: vision.issues?.join(', ') || 'Passed vision check',
            visionConfidence: vision.confidence || 'medium'
          });
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < toScan.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const estimatedCost = (totalCost / 100).toFixed(4);
    console.log(`\n👁️  Vision complete: ${passed} passed, ${skipped} skipped`);
    console.log(`💰 Estimated cost: ~$${estimatedCost}`);
    console.log(`⚡ Scanned ${processed} cards in parallel batches of ${BATCH_SIZE}`);

    return results.sort((a, b) => (b.visionScore || 0) - (a.visionScore || 0));
  }

  /**
   * Scan items for AI Scout - adds vision data to ALL cards without filtering
   */
  async scanItems(items, topN = 200) {
    const toScan = items.slice(0, topN);
    console.log(`\n👁  AI Scout scanning ${toScan.length} listings...`);

    const BATCH_SIZE = 8;
    const results = [];
    let processed = 0;
    let totalCost = 0;

    for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
      const batch = toScan.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toScan.length / BATCH_SIZE);
      
      process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);

      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const vision = await this.analyzeCardImage(item.imageUrl, item.title);
          totalCost += 0.002;
          processed++;
          return { item, vision };
        })
      );

      for (const { item, vision } of batchResults) {
        const cornerScore = vision.corners || 6;
        const centerScore = vision.centering || 6;
        const avg = (cornerScore + centerScore) / 2;
        const confidenceMult = 
          vision.confidence === 'high' ? 1.0 :
          vision.confidence === 'medium' ? 0.9 : 0.75;
        const finalScore = parseFloat((avg * confidenceMult).toFixed(1));
        
        // Keep ALL cards regardless of vision score
        results.push({
          ...item,
          visionScore: finalScore,
          visionCorners: cornerScore,
          visionCentering: centerScore,
          visionIssues: vision.issues || [],
          visionReason: vision.issues?.join(', ') || 'Passed vision check',
          visionConfidence: vision.confidence || 'medium',
          visionSkipped: vision.skip || false
        });
      }

      process.stdout.write(' done\n');
      
      if (i + BATCH_SIZE < toScan.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const estimatedCost = (totalCost / 100).toFixed(4);
    console.log(`\n👁  Scout complete: ${processed} cards analyzed`);
    console.log(`💰 Estimated cost: ~$${estimatedCost}`);

    return results.sort((a, b) => (b.visionScore || 0) - (a.visionScore || 0));
  }

  /**
   * Fetch an image URL and return as base64
   */
  async fetchImageAsBase64(url) {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'image/*'
          },
          timeout: 8000
        };

        const protocol = urlObj.protocol === 'https:' ? require('https') : require('http');
        const req = protocol.get(options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            this.fetchImageAsBase64(res.headers.location).then(resolve);
            return;
          }
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.toString('base64'));
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
      } catch (e) {
        resolve(null);
      }
    });
  }

  generateScoutReport(vision) {
    if (!vision || !vision.corners) return null;
    
    const corners = vision.corners;
    const centering = vision.centering;
    const issues = vision.issues || [];
    const confidence = vision.confidence || 'medium';
    
    const parts = [];
    
    // Use ACTUAL specific issues from Haiku if available
    if (issues.length > 0) {
      // Take first issue (truncated)
      const firstIssue = issues[0].length > 40 ? issues[0].substring(0, 37) + '...' : issues[0];
      parts.push(firstIssue);
    } else if (corners >= 7 && centering >= 7) {
      // No issues AND good scores = clean card
      parts.push('Card looks clean');
    } else if (corners >= 6) {
      parts.push('Minor corner wear');
    } else {
      parts.push('Noticeable corner wear');
      
      if (centering < 6) {
        parts.push(centering >= 5 ? 'slight off-center' : 'off-center');
      }
    }
    
    // Coating (positive signal) - add to description if present
    const hasCoating = issues.some(i => 
      i.toLowerCase().includes('coat') || 
      i.toLowerCase().includes('film')
    );
    if (hasCoating) parts.push('coating intact ✓');
    
    // Overall verdict - Bloomberg terminal style
    const avg = (corners + centering) / 2;
    const verdictLabel = avg >= 7.5 ? 'CLEAN' : 
                         avg >= 6 ? 'REVIEW' : 'CAUTION';
    
    // Low confidence disclaimer
    const disclaimer = confidence === 'low' ? ' (limited photo quality)' : '';
    
    return {
      text: parts.join(', ') + '.',
      verdict: verdictLabel,
      formatted: `[${verdictLabel}] ${parts.join(' · ')}${disclaimer}`
    };
  }
}

module.exports = VisionFilter;
