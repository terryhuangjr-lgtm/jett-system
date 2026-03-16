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
- surface: ONLY score if surface issues are clearly visible (scratches, print lines, creases). 
  If you cannot clearly assess surface from this angle/lighting, score 7 as neutral default.
- overall: Weight corners 40%, centering 40%, surface 20% since edges/back are not visible
- skip: Set true ONLY if corners are clearly worn/rounded OR centering is worse than 70/30 
  OR there are obvious creases/writing visible. Do NOT skip for lighting or glare issues.
- confidence: "high" if card is clearly visible, "medium" if partial, "low" if too small/dark

Be strict on what you CAN see. Be neutral on what you CANNOT see.
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
      return {
        score: result.overall || 5,
        corners: result.corners || 5,
        centering: result.centering || 5,
        surface: result.surface || 5,
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
  async filterItems(items, topN = 30) {
    const toScan = items.slice(0, topN);
    console.log(`\n👁️  Vision scanning ${toScan.length} listings with Claude Haiku...`);
    
    const results = [];
    let skipped = 0;
    let passed = 0;
    let cost = 0;

    for (let i = 0; i < toScan.length; i++) {
      const item = toScan[i];
      process.stdout.write(`  [${i+1}/${toScan.length}] Scanning: ${item.title.substring(0,40)}...`);
      
      const vision = await this.analyzeCardImage(item.imageUrl, item.title);
      cost += 0.002;
      
      if (vision.skip) {
        skipped++;
        process.stdout.write(` ❌ SKIP (${vision.reason})\n`);
      } else {
        passed++;
        process.stdout.write(` ✅ PASS (score: ${vision.score}/10)\n`);
        results.push({
          ...item,
          visionScore: vision.score,
          visionCorners: vision.corners,
          visionCentering: vision.centering,
          visionSurface: vision.surface,
          visionIssues: vision.issues,
          visionReason: vision.reason
        });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n👁️  Vision results: ${passed} passed, ${skipped} skipped`);
    console.log(`💰 Estimated vision cost: ~$${(cost/100).toFixed(4)}`);

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
