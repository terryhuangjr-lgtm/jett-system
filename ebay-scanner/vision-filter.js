/**
 * Vision Filter - Claude Haiku Image Analysis
 * Analyzes card images for condition issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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
    this.model = 'claude-haiku-4-5-20251001';
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
      const imageBase64 = await this.fetchImageAsBase64(imageUrl);
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
              text: `Analyze this sports card listing photo. Return ONLY valid JSON, no other text:
{
  "corners": 1-10,
  "centering": 1-10,
  "surface": 1-10,
  "overall": 1-10,
  "issues": ["list any visible problems"],
  "skip": true/false,
  "confidence": "high/medium/low"
}

SCORING RULES:
- corners: Score what you can actually see. 10=perfect sharp corners, 1=badly rounded/worn
- centering: Score left/right and top/bottom ratio. 10=60/40 or better, 1=severely off-center
- surface: IGNORE - do not score surface. Always return 7 as neutral default.
- overall: Weight corners 50%, centering 50%. Surface is NOT factored in.
- skip: Set true ONLY if corners are clearly worn/rounded OR centering is worse than 70/30 
  OR there are obvious creases/writing visible. Do NOT skip for lighting or glare issues.
- confidence: "high" if card is clearly visible, "medium" if partial, "low" if too small/dark

Be strict on corners and centering. Ignore surface entirely.
If image is too small, dark, or obscured to assess properly, return overall:6 skip:false confidence:low`
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
      
      const overallScore = Math.round((cornersScore + centeringScore) / 2);
      
      return {
        score: overallScore,
        corners: result.corners || 5,
        centering: result.centering || 5,
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
        if (vision.skip) {
          skipped++;
          batchSkipped++;
        } else {
          passed++;
          batchPassed++;
          results.push({
            ...item,
            visionScore: vision.score,
            visionCorners: vision.corners,
            visionCentering: vision.centering,
            visionSurface: vision.surface,
            visionIssues: vision.issues,
            visionReason: vision.reason,
            visionConfidence: vision.confidence
          });
        }
      }

      process.stdout.write(` ✅ ${batchPassed} passed, ❌ ${batchSkipped} skipped\n`);

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
}

module.exports = VisionFilter;
