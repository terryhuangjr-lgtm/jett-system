#!/usr/bin/env node
/**
 * content-calendar-ai.js
 * ======================
 * Generates 3 weekly social media posts for Level Up Digital NY.
 * Runs every Sunday at 9am. Generates Mon/Wed/Fri content, writes to Google Sheets.
 * 
 * Philosophy: 3 high-quality posts > 6 mediocre ones. 
 * Best content comes from real work — screenshots of dashboards, alerts, builds.
 * 
 * Schedule:
 *   Monday   — Education (teach something useful, include a real stat)
 *   Wednesday — Demo/Proof (building in public, raw screenshots)
 *   Friday   — Pain Point (call out a problem, no pitch)
 * 
 * Each day calls Claude Sonnet 4-6 directly via the Anthropic API.
 * Appends to Sheet1 in the Level Up Content sheet.
 * Sends a Telegram summary after completion.
 * 
 * ENV VARS:
 *   GWS_PATH              - Path to gws CLI (default: auto-detected)
 *   TELEGRAM_BOT_TOKEN    - Telegram bot token for notification
 *   TELEGRAM_CHAT_ID      - Telegram chat ID for notification
 * 
 * API key read from:
 *   ~/clawd/.env  - ANTHROPIC_API_KEY (Claude Sonnet access)
 */

const { execFile, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = '1P72_BgsUdfSDMstUCynXp_dvbQqHc42AaofE0pEtUZ0';
const SHEET_RANGE = 'Sheet1!A:P';
const GWS_PATH = process.env.GWS_PATH || execSync('which gws').toString().trim() || '/home/clawd/.nvm/versions/node/v22.22.0/bin/gws';
const HERMES_CONFIG = path.join(process.env.HOME || '/home/clawd', '.hermes', 'config.yaml');
const ANTHROPIC_ENV_PATH = path.join(process.env.HOME || '/home/clawd', 'clawd', '.env');

// 3 high-quality days per week
const DAYS = [
  {
    day: 1,
    dayName: 'Monday',
    pillar: 'Education',
    topic: 'Educational AI automation insight — teach something useful. "Did you know your Shopify store can\'t tell you when to reorder? Here\'s what AI inventory management looks like." Include a screenshot or short clip idea from StoreIQ.',
    promptHint: 'Teach something useful. Educational but not textbook. Include a real statistic with source. Suggest a screenshot or short screen recording the user can actually capture from their dashboard.'
  },
  {
    day: 3,
    dayName: 'Wednesday',
    pillar: 'Demo/Proof',
    topic: 'Proof of work — "Built this today" or "Here\'s what the AI agent did overnight for a test store." Raw screenshots, Telegram alerts, dashboard views. This is building-in-public and it\'s the most authentic content.',
    promptHint: 'Describe what the user can actually screenshot or film from their real tools — Hermes dashboard, Telegram alerts, Shopify admin, StoreIQ. No mockups. No staged demos. Authentic building-in-public only.'
  },
  {
    day: 5,
    dayName: 'Friday',
    pillar: 'Pain Point',
    topic: 'Call out a real problem your target audience has. "If you\'re manually checking your Shopify inventory every morning, you\'re wasting 5 hours a week. There\'s a better way." No pitch — just the problem. Let people come to you.',
    promptHint: 'Identify a genuine pain point for small business owners. No solutions, no pitch. Just name the problem clearly and let the reader feel seen. The best marketing is someone saying "that\'s exactly my problem."'
  },
];

// ── HELPERS ────────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── CONFIG READER ──────────────────────────────────────────────────────────

function getConfigValue(section, key) {
  const raw = fs.readFileSync(HERMES_CONFIG, 'utf8');
  const lines = raw.split('\n');
  let inSection = false;
  let sectionIndent = -1;
  for (const line of lines) {
    const tr = line.trim();
    const indent = line.length - line.trimLeft().length;

    if (!inSection && tr.startsWith(section + ':')) {
      inSection = true;
      sectionIndent = indent;
      continue;
    }

    if (inSection) {
      if (indent <= sectionIndent && tr && !tr.startsWith('#') && !tr.startsWith('-') && !tr.startsWith("'") && !tr.startsWith('"')) {
        inSection = false;
        continue;
      }
      if (tr.startsWith(key + ':')) {
        return tr.split(':').slice(1).join(':').trim().replace(/^['\"]|['\"]$/g, '');
      }
    }
  }
  return null;
}

function getApiConfig() {
  try {
    const envRaw = fs.readFileSync(ANTHROPIC_ENV_PATH, 'utf8');
    for (const line of envRaw.split('\n')) {
      const tr = line.trim();
      if (tr.startsWith('ANTHROPIC_API_KEY=')) {
        const key = tr.split('=').slice(1).join('=').trim().replace(/^['\"]|['\"]$/g, '');
        if (key) {
          return {
            provider: 'anthropic',
            model: 'claude-sonnet-4-6',
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            apiKey: key,
          };
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not read ANTHROPIC_API_KEY from', ANTHROPIC_ENV_PATH, err.message);
  }

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    return {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      apiKey: envKey,
    };
  }

  throw new Error('ANTHROPIC_API_KEY not found in ~/clawd/.env');
}

// ── AI MODEL CALL ──────────────────────────────────────────────────────────

function callAIModel(systemPrompt, userPrompt, apiConfig) {
  return new Promise((resolve, reject) => {
    let bodyStr;

    bodyStr = JSON.stringify({
      model: apiConfig.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const options = {
      hostname: apiConfig.hostname,
      path: apiConfig.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Anthropic error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
            return;
          }

          let content;
          if (parsed.content && parsed.content.length > 0) {
            content = parsed.content.map(c => c.text || '').join('');
          }

          if (!content) {
            reject(new Error('No content in model response'));
            return;
          }

          // Extract JSON from response
          let jsonStr = content.trim();
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

          const jsonStart = jsonStr.indexOf('{');
          const jsonEnd = jsonStr.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1) {
            reject(new Error(`No JSON found in response: ${content.slice(0, 200)}`));
            return;
          }

          jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);

          // Fix unescaped newlines inside string values
          const fixed = [];
          let inString = false;
          let escaped = false;
          for (let i = 0; i < jsonStr.length; i++) {
            const ch = jsonStr[i];
            if (escaped) { fixed.push(ch); escaped = false; continue; }
            if (ch === '\\' && inString) { fixed.push(ch); escaped = true; continue; }
            if (ch === '"' && !escaped) { inString = !inString; fixed.push(ch); continue; }
            if (inString && (ch === '\n' || ch === '\r')) { fixed.push('\\n'); continue; }
            fixed.push(ch);
          }
          jsonStr = fixed.join('');

          // Remove trailing commas
          jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

          try {
            resolve(JSON.parse(jsonStr));
          } catch (parseErr) {
            reject(new Error(`JSON parse failed: ${parseErr.message}\nFirst 400 chars: ${jsonStr.slice(0, 400)}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}\nRaw: ${data.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── GOOGLE SHEETS ──────────────────────────────────────────────────────────

function gwsAppendRows(rows) {
  return new Promise((resolve, reject) => {
    const args = [
      'sheets', 'spreadsheets', 'values', 'append',
      '--params', JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:N',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
      }),
      '--json', JSON.stringify({ values: rows }),
      '--format', 'json',
    ];

    execFile(GWS_PATH, args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`gws append failed: ${err.message}\n${stderr?.slice(0, 500)}`));
        return;
      }
      try { resolve(JSON.parse(stdout)); } catch { resolve({ raw: stdout }); }
    });
  });
}

function gwsReadCells(range) {
  return new Promise((resolve, reject) => {
    const args = [
      'sheets', '+read',
      '--spreadsheet', SPREADSHEET_ID,
      '--range', range,
      '--format', 'json',
    ];

    execFile(GWS_PATH, args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`gws read failed: ${err.message}\n${stderr?.slice(0, 200)}`));
        return;
      }
      try { resolve(JSON.parse(stdout)); } catch { resolve(null); }
    });
  });
}

function gwsUpdateCells(range, rows) {
  return new Promise((resolve, reject) => {
    const args = [
      'sheets', 'spreadsheets', 'values', 'update',
      '--params', JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
      }),
      '--json', JSON.stringify({ values: rows }),
      '--format', 'json',
    ];

    execFile(GWS_PATH, args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`gws update failed: ${err.message}\n${stderr?.slice(0, 200)}`));
      else resolve();
    });
  });
}

// ── TELEGRAM ──────────────────────────────────────────────────────────────

function sendTelegram(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── PROMPT BUILDER ──────────────────────────────────────────────────────────

function buildDayPrompt(day) {
  return `Generate ONE social media post for Level Up Digital NY.

AGENCY: Level Up Digital NY (levelupdigitalny.com) — Long Island AI automation and web design agency.
OWNER: Terry Huang. He builds real AI products people use every day.

BRAND VOICE:
- Confident but approachable, not corporate
- Local Long Island angle whenever possible
- Educational, not salesy — teach first, sell never
- Real talk, no fluff
- "AI isn't scary — here's what it actually does"
- The best content comes from REAL WORK — screenshots of actual dashboards, real alerts from Telegram, raw builds. People can smell AI-generated generic content.

TODAY: ${day.dayName}
PILLAR: ${day.pillar}
TOPIC: ${day.topic}

${day.promptHint}

IMPORTANT GUIDELINES:
- This must be AUTHENTIC. Don't suggest stock photos or mockups. Suggest things Terry can actually screenshot from his real tools (Hermes, StoreIQ, Shopify, Telegram, his code editor).
- If suggesting a visual, describe what to capture from a REAL dashboard or tool.
- Educational posts MUST include at least one real, cited statistic. Use Salesforce, McKinsey, Gartner, Deloitte, HubSpot, AT&T, etc. If unsure of exact number, say "industry estimates suggest."
- NEVER fabricate statistics.

PLATFORMS (generate for both):
1. LINKEDIN — Professional, 150-300 words, 3-5 hashtags
2. X/TWITTER — Under 280 characters, punchy, one strong idea. Must fit in a single tweet.

Return JSON ONLY, no other text:
{
  "day": "${day.dayName}",
  "pillar": "${day.pillar}",
  "topic": "${day.topic}",
  "statistic_used": "the statistic text",
  "statistic_source": "source name",
  "linkedin": { "post": "full post text", "hashtags": ["tag1", "tag2"] },
  "twitter": "tweet text under 280 chars",
  "visual_suggestion": "describe what to actually screenshot or film from a real tool",
  "filming_brief": null
}

For WEDNESDAY only, set filming_brief to a short string with a specific filming script. For Monday and Friday, set it to null.`;
}

// ── ROW BUILDER ────────────────────────────────────────────────────────────

function buildDayRow(weekRange, day, content) {
  return [
    weekRange,                     // A: Week
    day.dayName,                   // B: Day
    day.pillar,                    // C: Pillar
    day.topic,                     // D: Topic
    content.statistic_used || '',  // E: Statistic
    content.statistic_source || '',// F: Source
    content.linkedin?.post || '',  // G: LinkedIn
    (content.linkedin?.hashtags || []).join(', '),  // H: LinkedIn Hashtags
    '',                            // I: Instagram Hook (removed — only LinkedIn + X now)
    '',                            // J: Instagram Caption (removed — only LinkedIn + X now)
    '',                            // K: IG Hashtags (removed)
    content.twitter || '',         // L: Twitter
    '',                            // M: Facebook (removed — only LinkedIn + X now)
    content.filming_brief || '',   // N: Filming Brief
    content.visual_suggestion || '', // O: Visual Suggestion (new)
  ];
}

function buildPlaceholderRow(weekRange, day) {
  return [weekRange, day.dayName, day.pillar, day.topic, '', '', '', '', '', '', '', '', '', '', ''];
}

// ── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('📅 Starting Content Calendar Generation (3 posts/week)...\n');

  const apiConfig = getApiConfig();
  console.log(`✅ ${apiConfig.provider} (${apiConfig.model}) configured\n`);

  const today = new Date();
  const monday = getMonday(today);

  const weekStart = new Date(monday);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 5);
  const weekRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  console.log(`Week: ${weekRange}\n`);

  const results = [];
  let bestHook = '(n/a — no Instagram anymore)';
  let filmingTopic = '(no filming brief this week)';

  for (const day of DAYS) {
    console.log(`📝 Generating ${day.dayName} — ${day.pillar}...`);

    // Retry once on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const content = await callAIModel(
          'You are a social media strategist for a local AI agency. Return ONLY a valid JSON object. No markdown, no code fences, no extra text. Just the raw JSON.',
          attempt === 0
            ? buildDayPrompt(day)
            : `Generate this again. Return ONLY valid JSON, no markdown, no code fences. Topic: ${day.topic}`,
          apiConfig
        );
        console.log(`   ✅ ${day.dayName} content generated`);

        if (day.dayName === 'Wednesday' && content.filming_brief) {
          filmingTopic = day.topic;
        }

        results.push({ day: day.dayName, row: buildDayRow(weekRange, day, content), content });
        break;
      } catch (err) {
        console.error(`   ❌ ${day.dayName} attempt ${attempt + 1} FAILED: ${err.message}`);
        if (attempt === 1) {
          results.push({ day: day.dayName, row: buildPlaceholderRow(weekRange, day), content: null });
        } else {
          await sleep(2000);
        }
      }
    }
  }

  // ── WRITE TO GOOGLE SHEETS ──────────────────────────────────────────────

  console.log('\n📊 Writing to Google Sheets...');

  const rows = results.map(r => r.row);

  try {
    const headerData = await gwsReadCells('Sheet1!A1:O1');
    if (!headerData || !headerData.values || headerData.values.length === 0) {
      const headerRow = [[
        'Week', 'Day', 'Pillar', 'Topic', 'Statistic Used', 'Source',
        'LinkedIn', 'LinkedIn Hashtags', 'Instagram Hook', 'Instagram Caption',
        'IG Hashtags', 'Twitter', 'Facebook', 'Filming Brief', 'Visual Suggestion'
      ]];
      await gwsUpdateCells('Sheet1!A1:O1', headerRow);
      console.log('   ✅ Header row added');
    } else {
      console.log('   ✅ Header row exists');
    }
  } catch (err) {
    console.log('   ⚠️ Header check failed (non-critical):', err.message);
  }

  try {
    await gwsAppendRows(rows);
    console.log(`   ✅ ${rows.length} rows appended to sheet`);
  } catch (err) {
    console.error('   ❌ Sheet append failed:', err.message);
    console.log('   🔄 Retrying one row at a time...');
    for (let i = 0; i < rows.length; i++) {
      try {
        await gwsAppendRows([rows[i]]);
        console.log(`   ✅ Row ${i + 1} (${results[i].day}) written`);
      } catch (rowErr) {
        console.error(`   ❌ Row ${i + 1} failed: ${rowErr.message}`);
      }
      await sleep(500);
    }
  }

  // ── TELEGRAM NOTIFICATION ────────────────────────────────────────────────

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '5867308866';

  if (botToken) {
    const succeeded = results.filter(r => r.content !== null);
    const failed = results.filter(r => r.content === null);
    const wednesdayPost = results.find(r => r.day === 'Wednesday');

    const msg = [
      `<b>📅 Content Calendar — Week of ${formatDate(monday)}</b>`,
      ``,
      `✅ ${succeeded.length}/3 posts generated`,
      `📱 Platforms: LinkedIn + X (Twitter)`,
      `📹 Wednesday: ${wednesdayPost?.content?.filming_brief ? 'Filming brief ready 📽️' : 'No filming brief'}`,
      failed.length > 0 ? `❌ ${failed.length} failed: ${failed.map(f => f.day).join(', ')}` : ``,
      ``,
      `💡 <b>Strategy:</b> Post real screenshots of your actual work.`,
      `   Monday = Education | Wednesday = Build in Public | Friday = Pain Point`,
      ``,
      filmingTopic ? `📹 <b>Wednesday filming:</b> ${filmingTopic.slice(0, 100)}...` : ``,
      ``,
      `Check the sheet → content ready to schedule:`,
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    ].filter(Boolean).join('\n');

    try {
      await sendTelegram(botToken, chatId, msg);
      console.log('✅ Telegram notification sent');
    } catch (err) {
      console.error('❌ Telegram send failed:', err.message);
    }
  } else {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set — skipping notification');
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────

  const succeeded = results.filter(r => r.content !== null);
  console.log('\n═══════════════════════════════════');
  console.log('📅 Content Calendar Generation Complete');
  console.log(`   Week: ${weekRange}`);
  console.log(`   Posts generated: ${succeeded.length}/3`);
  console.log(`   Platforms: LinkedIn + X (Twitter)`);
  succeeded.forEach(r => console.log(`   ✓ ${r.day}: ${r.content.pillar}`));
  const failed = results.filter(r => r.content === null);
  if (failed.length) console.log(`   ✗ Failed: ${failed.map(f => f.day).join(', ')}`);
  console.log('═══════════════════════════════════\n');

  if (succeeded.length === 0) {
    console.error('❌ ALL days failed to generate.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
