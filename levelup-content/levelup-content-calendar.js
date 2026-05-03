#!/usr/bin/env node
/**
 * Level Up Digital — Content Calendar Generator
 * =====================================
 * Generates week's social media content (Mon-Sun)
 * Runs: Sunday at 8am
 * 
 * Outputs:
 * - Writes to Google Sheet "Content Calendar" tab
 * - Sends to Telegram for review
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1jPWFfCHbaTRX4BqqjlaPPjDB0U15qIIdpcIGQwg8Jcw';
const WORKSHEET_NAME = 'Content Calendar';
const OUTPUT_DIR = '/home/clawd/clawd/levelup-content';

const PORTFOLIO_SITES = [
  { name: 'Dynamic Demolition', url: 'https://dynamicdemolitionny.com', desc: 'Heavy equipment company with bold branding' },
  { name: 'Maison Atelier', url: 'https://modernsalonwebsitedesign.vercel.app/', desc: 'Modern salon with elegant design' },
  { name: 'Carter Real Estate', url: 'https://realestateagentwebsite.vercel.app/', desc: 'Luxury real estate agent' },
  { name: 'ProAir HVAC', url: 'https://proairhvac.com', desc: 'Professional HVAC company' },
  { name: 'Spotless Home Cleaning', url: 'https://spotlesshomecleaning.com', desc: 'Residential cleaning service' },
  { name: 'Pressure Wash Boss', url: 'https://pressurewashboss.com', desc: 'Power washing company' }
];

const PILLARS = [
  'Portfolio showcase',
  'Local business education',
  'AI and automation',
  'SEO tips',
  'Behind the scenes',
  'Social proof',
  'Direct CTA'
];

const HASHTAGS = '#LongIslandBusiness #NassauCounty #LevelUpDigital #WebDesignLI #LocalSEO #SmallBusinessNY #LongIslandMarketing #WebDesign #AIAutomation #LongIslandEntrepreneur #SupportLocalLI #DigitalMarketing';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function runGwsCommand(args) {
  try {
    return execFileSync('gws', args, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    log(`GWS error: ${e.message}`);
    return null;
  }
}

function runClaude(prompt) {
  try {
    const { execFileSync } = require('child_process');
    const result = execFileSync('claude', [
      '--dangerously-skip-prompt',
      '-p', prompt
    ], {
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch (e) {
    log(`Claude error: ${e.message}`);
    return null;
  }
}

function getPortfolioForPillar(pillar) {
  if (pillar !== 'Portfolio showcase') return null;
  return PORTFOLIO_SITES[Math.floor(Math.random() * PORTFOLIO_SITES.length)];
}

function getPillarForDay(dayIndex) {
  return PILLARS[dayIndex % PILLARS.length];
}


async function generatePost(pillar, day, portfolio) {
  const portfolioContext = portfolio
    ? `Portfolio site: ${portfolio.name} (${portfolio.desc}) at ${portfolio.url}`
    : '';

  const prompt = `You are writing social media content for Level Up Digital NY, a web design and AI automation agency run by Terry Huang in Nassau County, Long Island NY. Terry builds websites, AI agents, voice bots, and automation for local small businesses.

Generate 3 unique social media posts for ${day} with pillar: "${pillar}"
${portfolioContext}

Terry's tone: casual but professional, direct, no corporate speak, genuine local business owner energy. He has built real AI products: an AI voice receptionist (Eve), an AI Shopify operations bot (Hermes), an email triage agent, and a lead gen pipeline. He has clients like Dynamic Demolition, and a demo pending with Superare (NYC fight gear brand).

Hashtags to use from this list as relevant: #LongIslandBusiness #NassauCounty #LevelUpDigital #WebDesignLI #LocalSEO #SmallBusinessNY #LongIslandMarketing #WebDesign #AIAutomation #LongIslandEntrepreneur #SupportLocalLI #DigitalMarketing

Return ONLY valid JSON, no markdown, no explanation:
{
  "instagram_facebook": "post text here (can use emojis, 3-5 hashtags, max 300 chars)",
  "twitter_x": "post text here (max 260 chars, punchy, 2-3 hashtags)",
  "linkedin": "post text here (professional tone, 150-250 chars, 3 hashtags, no emojis)"
}`;

  try {
    const { execFileSync } = require('child_process');
    const result = execFileSync('claude', [
      '--dangerously-skip-permissions',
      '-p', prompt
    ], {
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Strip any markdown fences
    const cleaned = result.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Enforce X char limit
    if (parsed.twitter_x) {
      parsed.twitter_x = parsed.twitter_x.slice(0, 280);
    }

    return parsed;
  } catch (e) {
    log(`Claude generation failed: ${e.message} — using fallback`);
    // Fallback to simple template
    return {
      instagram_facebook: `${pillar === 'Portfolio showcase' && portfolio ? `Just launched: ${portfolio.name}! ${portfolio.url}` : `Level Up Digital — helping Long Island businesses grow online.`} #LevelUpDigital #LongIslandBusiness`,
      twitter_x: `${portfolio ? portfolio.url : 'Helping LI businesses level up.'} #LevelUpDigital`,
      linkedin: `Working with Long Island small businesses to improve their digital presence. If you need a website or AI automation, let\'s talk. #LevelUpDigital #LongIsland`
    };
  }
}

function getDatesForWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToNextMonday = (dayOfWeek === 0 ? 1 : 8 - dayOfWeek);  // Upcoming Monday
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToNextMonday);
  
  const dates = [];
  const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push({
      day: dayNames[i],
      date: d.toISOString().split('T')[0]
    });
  }
  
  return dates;
}

function ensureSheet() {
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID
    })]);
    
    if (result) {
      const data = JSON.parse(result);
      const sheets = data.sheets || [];
      const hasContentCalendar = sheets.some(s => s.properties?.title === WORKSHEET_NAME);
      
      if (!hasContentCalendar) {
        runGwsCommand(['sheets', 'spreadsheets', 'batchUpdate', '--params', JSON.stringify({
          spreadsheetId: SPREADSHEET_ID
        }), '--json', JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: WORKSHEET_NAME }
            }
          }]
        })]);
        log(`Created sheet: ${WORKSHEET_NAME}`);
      }
    }
  } catch (e) {
    log(`Ensure sheet error: ${e.message}`);
  }
}

function writeToSheet(rows) {
  const headers = ['date', 'day', 'pillar', 'instagram_facebook', 'twitter_x', 'linkedin', 'status'];
  
  try {
    // First ensure headers
    const getResult = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    
    if (!getResult) {
      runGwsCommand(['sheets', 'spreadsheets', 'values', 'update', '--params', JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        range: WORKSHEET_NAME,
        valueInputOption: 'USER_ENTERED'
      }), '--json', JSON.stringify({ values: [headers] })]);
    }
    
    // Clear existing rows (keep header)
    runGwsCommand(['sheets', 'spreadsheets', 'values', 'clear', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    
    // Write headers and data
    const allRows = [headers, ...rows.map(r => [
      r.date,
      r.day,
      r.pillar,
      r.instagram_facebook,
      r.twitter_x,
      r.linkedin,
      'draft'
    ])];
    
    runGwsCommand(['sheets', 'spreadsheets', 'values', 'update', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME,
      valueInputOption: 'USER_ENTERED'
    }), '--json', JSON.stringify({ values: allRows })]);
    
    log(`Wrote ${rows.length} rows to ${WORKSHEET_NAME}`);
  } catch (e) {
    log(`Write error: ${e.message}`);
  }
}

function sendToTelegram(calendar) {
  const weekStart = calendar[0]?.date || '';
  const weekEnd = calendar[6]?.date || '';
  
  let message = `Level Up Content Calendar — Week of ${weekStart}\n`;
  message += `---\n`;
  
  for (const day of calendar) {
    message += `\n${day.day} ${day.date} — ${day.pillar}\n`;
    message += `IG/FB: ${day.instagram_facebook.slice(0, 100)}...\n`;
    message += `X: ${day.twitter_x}\n`;
    message += `LinkedIn: ${day.linkedIn?.slice(0, 80)}...\n`;
    message += `---\n`;
  }
  
  try {
    execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
      'message', 'send', '--channel', 'telegram',
      '--target', '5867308866',
      '--message', message
    ], { timeout: 15000, stdio: 'ignore' });
    log('Sent to Telegram');
  } catch (e) {
    log(`Telegram error: ${e.message}`);
  }
}

async function main() {
  log('=== Level Up Content Calendar ===');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const dates = getDatesForWeek();
  const calendar = [];
  
  for (let i = 0; i < 7; i++) {
    const pillar = getPillarForDay(i);
    const portfolio = getPortfolioForPillar(pillar);
    const posts = await generatePost(pillar, dates[i], portfolio);
    
    calendar.push({
      date: dates[i].date,
      day: dates[i].day,
      pillar: pillar,
      ...posts,
      status: 'draft'
    });
  }
  
  // Ensure sheet exists
  ensureSheet();
  
  // Write to sheet
  writeToSheet(calendar);
  
  // Telegram notification handled by Hermes cron
  
  // Save locally
  const outputFile = `${OUTPUT_DIR}/content-calendar-${dates[0].date}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(calendar, null, 2));
  log(`Saved to: ${outputFile}`);
  
  log('Done!');
}

main().catch(e => {
  log(`Error: ${e.message}`);
  process.exit(1);
});