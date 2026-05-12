#!/usr/bin/env node
/**
 * content-calendar-ai.js
 * ======================
 * Generates a full week of social media content for Level Up Digital NY.
 * Runs every Sunday at 9am. Generates Mon-Sat content, writes to Google Sheets.
 * 
 * Each day calls Claude Sonnet 4-6 directly via the Anthropic API (api.anthropic.com/v1/messages).
 * Appends to the "Content Calendar" tab in the Level Up Content sheet.
 * Sends a Telegram summary after completion.
 * 
 * PM2: cron_restart: '0 9 * * 0'
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
const url = require('url');

// ── CONFIG ────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = '1P72_BgsUdfSDMstUCynXp_dvbQqHc42AaofE0pEtUZ0';
const SHEET_RANGE = 'Sheet1!A:P';  // 16 columns
const GWS_PATH = process.env.GWS_PATH || execSync('which gws').toString().trim() || '/home/clawd/.nvm/versions/node/v22.22.0/bin/gws';
const HERMES_CONFIG = path.join(process.env.HOME || '/home/clawd', '.hermes', 'config.yaml');

// Where the Anthropic API key lives (used by 21M generator and other tools)
const ANTHROPIC_ENV_PATH = path.join(process.env.HOME || '/home/clawd', 'clawd', '.env');

// Topic rotation (week number based on year)
const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// Saturday web design topics by week
const SATURDAY_TOPICS = {
  'Week 1': 'Why a $599 website beats a $15K agency build',
  'Week 2': 'What makes a local business website actually convert',
  'Week 3': 'The fastest way to go from no website to live site',
  'Week 4': 'Real before/after — what Level Up built this month',
};

// Tuesday education topics by week
const TUESDAY_TOPICS = {
  'Week 1': 'What a voice agent actually does (vs what people think)',
  'Week 2': 'How AI reads your Shopify data and what it finds',
  'Week 3': 'The difference between AI tools and AI agents',
  'Week 4': 'Why small businesses are the biggest AI opportunity right now',
};

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

function getWeekLabel(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date - startOfYear;
  const weekNum = Math.ceil(((diff / 86400000) + startOfYear.getDay() + 1) / 7);
  return `Week ${((weekNum - 1) % 4) + 1}`;
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
      // Exit if we hit a line at same or less indent that starts a new key
      if (indent <= sectionIndent && tr && !tr.startsWith('#') && !tr.startsWith('-') && !tr.startsWith("'") && !tr.startsWith('"')) {
        inSection = false;
        continue;
      }
      if (tr.startsWith(key + ':')) {
        return tr.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return null;
}

function getApiConfig() {
  // Read ANTHROPIC_API_KEY from clawd/.env
  try {
    const envRaw = fs.readFileSync(ANTHROPIC_ENV_PATH, 'utf8');
    for (const line of envRaw.split('\n')) {
      const tr = line.trim();
      if (tr.startsWith('ANTHROPIC_API_KEY=')) {
        const key = tr.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
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

  // Fallback: check environment
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

  throw new Error(
    'ANTHROPIC_API_KEY not found. Set it in ~/clawd/.env or set CONTENT_AI_PROVIDER=openrouter to use OpenRouter.'
  );
}

// ── AI MODEL CALL ──────────────────────────────────────────────────────────

function callAIModel(systemPrompt, userPrompt, apiConfig) {
  return new Promise((resolve, reject) => {
    let bodyStr;

    if (apiConfig.provider === 'anthropic') {
      // Anthropic API uses /v1/messages with different structure
      bodyStr = JSON.stringify({
        model: apiConfig.model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
    } else {
      // OpenAI-compatible (OpenRouter, xAI, etc.)
      bodyStr = JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
    }

    const options = {
      hostname: apiConfig.hostname,
      path: apiConfig.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiConfig.provider === 'anthropic'
          ? { 'x-api-key': apiConfig.apiKey, 'anthropic-version': '2023-06-01' }
          : { 'Authorization': `Bearer ${apiConfig.apiKey}` }),
        ...(apiConfig.headers || {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`${apiConfig.provider} error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
            return;
          }

          let content;
          if (apiConfig.provider === 'anthropic') {
            // Anthropic: content is in content[0].text
            if (parsed.content && parsed.content.length > 0) {
              content = parsed.content.map(c => c.text || '').join('');
            }
          } else {
            // OpenAI-compatible: content is in choices[0].message.content
            content = parsed.choices?.[0]?.message?.content;
          }

          if (!content) {
            reject(new Error('No content in model response'));
            return;
          }

          // Find JSON in the response — handle multiline, code fences, extra text
          let jsonStr = content.trim();
          
          // Remove code fences if present (handle ```json\n ... ```)
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
          
          // Find the first { and last }
          const jsonStart = jsonStr.indexOf('{');
          const jsonEnd = jsonStr.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1) {
            reject(new Error(`No JSON found in response: ${content.slice(0, 200)}`));
            return;
          }
          
          jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);

          // Fix common LLM JSON issues before parsing:
          // 1. Unescaped newlines inside string values
          // 2. Trailing commas
          // Use a state-machine approach to only replace newlines inside strings
          const fixed = [];
          let inString = false;
          let escaped = false;
          for (let i = 0; i < jsonStr.length; i++) {
            const ch = jsonStr[i];
            if (escaped) { fixed.push(ch); escaped = false; continue; }
            if (ch === '\\' && inString) { fixed.push(ch); escaped = true; continue; }
            if (ch === '"' && !escaped) { inString = !inString; fixed.push(ch); continue; }
            if (inString && (ch === '\n' || ch === '\r')) {
              fixed.push('\\n');
              continue;
            }
            fixed.push(ch);
          }
          
          jsonStr = fixed.join('');
          
          // Remove trailing commas before closing braces/brackets
          jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          
          try {
            resolve(JSON.parse(jsonStr));
          } catch (parseErr) {
            reject(new Error(
              `JSON parse failed: ${parseErr.message}\nFirst 400 chars: ${jsonStr.slice(0, 400)}`
            ));
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

const GWS_QUOTE_ESC = "'\\''";  // Shell-safe single-quote escape pattern

function gwsAppendRows(rows) {
  return new Promise((resolve, reject) => {
    // Use the raw API (not +append helper) for multi-row support
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
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        resolve({ raw: stdout });
      }
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
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(null);
      }
    });
  });
}

function gwsUpdateCells(range, rows) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(rows);
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

function gwsClearRange(range) {
  return new Promise((resolve, reject) => {
    const args = [
      'sheets', 'spreadsheets', 'values', 'clear',
      '--params', JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      }),
      '--format', 'json',
    ];

    execFile(GWS_PATH, args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`gws clear failed: ${err.message}\n${stderr?.slice(0, 200)}`));
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

// ── CONSTRUCT PROMPTS ──────────────────────────────────────────────────────

function buildDayPrompt(dayInfo) {
  const { day, dayName, pillar, topic, weekLabel } = dayInfo;

  return `Generate social media content for a ${pillar.toLowerCase()} post.

AGENCY: Level Up Digital NY (levelupdigitalny.com) — Long Island AI automation and web design agency.
OWNER: Terry Huang.

BRAND VOICE:
- Confident but approachable, not corporate
- Local Long Island angle whenever possible
- Educational, not salesy — teach first, sell never
- Real talk, no fluff
- "AI isn't scary — here's what it actually does"

TODAY: ${dayName}, ${weekLabel}
PILLAR: ${pillar}
TOPIC: ${topic}
CONTENT RATIO: 85% AI Automation, 15% Web Design

STATISTICS REQUIREMENT:
THIS EDUCATIONAL POST MUST INCLUDE at least ONE real, accurately cited statistic.
Use well-known sources like Salesforce, McKinsey, Gartner, Deloitte, AT&T, HubSpot, etc.
Format: "According to [source], [stat]"
If you're unsure of the exact statistic, use "industry estimates suggest" phrasing.
NEVER fabricate statistics.

PLATFORMS (generate ALL 4):

1. LINKEDIN — Professional, 150-300 words, 3-5 hashtags
2. INSTAGRAM — Casual, 80-150 words, 10-15 hashtags. First line MUST be a hook that stops the scroll. Structure: [Hook] + [body] + [call to action / engagement question]
3. X/TWITTER — Under 280 characters, punchy, one strong idea. Must fit in a single tweet.
4. FACEBOOK — Conversational, 100-200 words, local feel, written for small business owners not tech people.

For WEDNESDAY (DEMO/PROOF pillar only):
Include a "filming_brief" field with:
- What to show on screen
- Script outline
- Best time to post
- Caption + hashtags ready to paste

Return JSON (ONLY the JSON, no other text):
{
  "day": "${dayName}",
  "pillar": "${pillar}",
  "topic": "${topic}",
  "statistic_used": "the statistic text",
  "statistic_source": "source name",
  "linkedin": { "post": "full post text", "hashtags": ["tag1", "tag2"] },
  "instagram": { "hook": "scroll-stopping first line", "caption": "full caption", "hashtags": ["tag1", ...] },
  "twitter": "tweet text under 280 chars",
  "facebook": "facebook post text",
  "filming_brief": null
}

For WEDNESDAY only, the filming_brief should be a string describing the filming brief. For all other days, set filming_brief to null.`;
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
    content.instagram?.hook || '', // I: Instagram Hook
    content.instagram?.caption || '', // J: Instagram Caption
    (content.instagram?.hashtags || []).join(', '), // K: IG Hashtags
    content.twitter || '',         // L: Twitter
    content.facebook || '',        // M: Facebook
    content.filming_brief || '',   // N: Filming Brief
  ];
}

// If a retried or any day has no content, build a placeholder row
function buildPlaceholderRow(weekRange, day) {
  return [weekRange, day.dayName, day.pillar, day.topic, '', '', '', '', '', '', '', '', '', ''];
}

// ── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('📅 Starting Content Calendar Generation...\n');

  // Read API config
  const apiConfig = getApiConfig();
  console.log(`✅ ${apiConfig.provider} (${apiConfig.model}) configured\n`);

  // Calculate the upcoming week
  const today = new Date();
  const monday = getMonday(today);
  
  // If today is Sunday, we're generating for next week starting tomorrow (Monday)
  // Otherwise, generate for this week's remaining days
  const weekLabel = getWeekLabel(monday);

  // Day configurations: Mon-Sat
  const days = [
    { day: 1, dayName: 'Monday',    pillar: 'ROI Math',                topic: 'The cost of a missed call for service businesses — "Your plumber misses 8 calls a day. Do the math."' },
    { day: 2, dayName: 'Tuesday',   pillar: 'Education',               topic: TUESDAY_TOPICS[weekLabel] || 'How AI automation helps small businesses compete with big companies' },
    { day: 3, dayName: 'Wednesday', pillar: 'Demo/Proof',              topic: 'Describe what to film for a Loom/Reel this week — detailed filming brief' },
    { day: 4, dayName: 'Thursday',  pillar: 'Local Angle',             topic: 'Long Island / Nassau County small business focus — specific local angle' },
    { day: 5, dayName: 'Friday',    pillar: 'Behind the Build',        topic: 'Something real about what was built or learned this week — authentic, builder-to-builder' },
    { day: 6, dayName: 'Saturday',  pillar: 'Web Design',             topic: SATURDAY_TOPICS[weekLabel] || 'What makes a local business website actually convert' },
  ];

  const weekStart = new Date(monday);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 5); // Saturday
  const weekRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  console.log(`Week: ${weekLabel} (${weekRange})\n`);

  const results = [];
  let bestHook = '';
  let filmingTopic = '(no filming brief this week)';

  for (const day of days) {
    console.log(`📝 Generating ${day.dayName} — ${day.pillar}...`);

    const prompt = buildDayPrompt({
      ...day,
      weekLabel,
    });

    // Retry up to 2 times for each day
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const content = await callAIModel(
          'You are a social media content strategist for a local AI automation agency. Return ONLY a valid JSON object on a single line with no formatting. Do NOT wrap it in markdown code fences. Do NOT include any text before or after the JSON. No explanations. Just the raw JSON object. If you include anything other than the JSON, the system will crash.',
          attempt === 0
            ? prompt
            : `Generate this again but be EXTREMELY careful to return ONLY valid minified JSON on one line. NO line breaks. NO code fences. NO markdown. Just the JSON object. DO NOT USE BACKTICKS. Topic: ${day.topic}`,
          apiConfig
        );
        console.log(`   ✅ ${day.dayName} content generated`);

        // Track best hook and filming brief
        if (day.dayName === 'Wednesday' && content.filming_brief) {
          filmingTopic = day.topic;
        }
        if (content.instagram?.hook && content.instagram.hook.length > (bestHook?.length || 0)) {
          bestHook = content.instagram.hook;
        }

        results.push({ day: day.dayName, row: buildDayRow(weekRange, day, content), content });
        break; // Success, exit retry loop
      } catch (err) {
        console.error(`   ❌ ${day.dayName} attempt ${attempt + 1} FAILED: ${err.message}`);
        if (attempt === 1) {
          // Last attempt failed — add placeholder
          results.push({
            day: day.dayName,
            row: buildPlaceholderRow(weekRange, day),
            content: null,
          });
        } else {
          await sleep(2000); // Wait before retry
        }
      }
    }
  }

  // ── WRITE TO GOOGLE SHEETS ──────────────────────────────────────────────

  console.log('\n📊 Writing to Google Sheets...');
  
  const rows = results.map(r => r.row);

  // First, check if header row exists — if not, add one
  try {
    const headerData = await gwsReadCells('Sheet1!A1:N1');
    if (!headerData || !headerData.values || headerData.values.length === 0) {
      const headerRow = [[
        'Week', 'Day', 'Pillar', 'Topic', 'Statistic Used', 'Source',
        'LinkedIn', 'LinkedIn Hashtags', 'Instagram Hook', 'Instagram Caption',
        'IG Hashtags', 'Twitter', 'Facebook', 'Filming Brief'
      ]];
      await gwsUpdateCells('Sheet1!A1:N1', headerRow);
      console.log('   ✅ Header row added');
    } else {
      console.log('   ✅ Header row exists');
    }
  } catch (err) {
    console.log('   ⚠️ Header check failed (non-critical):', err.message);
  }

  // Append content rows using the simple +append helper
  try {
    await gwsAppendRows(rows);
    console.log(`   ✅ ${rows.length} rows appended to sheet`);
  } catch (err) {
    console.error('   ❌ Sheet append failed:', err.message);
    // Try individual rows as fallback
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
    // Count content by type
    const aiContent = results.filter(r => r.content?.linkedin?.post && r.day !== 'Saturday');
    const webContent = results.filter(r => r.day === 'Saturday' && r.content?.linkedin?.post);
    const failed = results.filter(r => r.content === null);

    const msg = [
      `<b>📅 Content Calendar — Week of ${formatDate(monday)}</b>`,
      ``,
      `✅ ${results.length} days of content generated`,
      `📊 Platforms: LinkedIn, Instagram, X, Facebook`,
      `🤖 ${aiContent.length} AI Automation posts`,
      `🎨 ${webContent.length > 0 ? '1 Web Design post' : '0 Web Design posts'}`,
      failed.length > 0 ? `❌ ${failed.length} failed: ${failed.map(f => f.day).join(', ')}` : ``,
      ``,
      bestHook ? `🔥 <b>Best hook this week:</b> ${bestHook}` : ``,
      filmingTopic ? `📹 <b>Wednesday filming brief:</b> ${filmingTopic}` : ``,
      ``,
      `Check the sheet — content ready to schedule!`,
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
    console.log('   Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars to enable notifications');
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════');
  console.log('📅 Content Calendar Generation Complete');
  console.log(`   Week: ${weekRange}`);
  console.log(`   Days generated: ${results.length}`);
  console.log(`   Best hook: ${bestHook || '(none)'}`);
  console.log(`   Filming brief: ${filmingTopic}`);
  console.log(`   Errors: ${results.filter(r => !r.content).length}`);
  console.log('═══════════════════════════════════\n');

  // Exit with error if ALL days failed
  const allFailed = results.every(r => r.content === null);
  if (allFailed) {
    console.error('❌ ALL days failed to generate. Check OpenRouter key and API access.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
