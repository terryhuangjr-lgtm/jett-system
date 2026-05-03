#!/usr/bin/env node
/**
 * Outreach Draft Generator - Level Up Digital
 * ========================================
 * Phase 2: Reads pending HIGH priority leads, generates personalized
 * DM/email drafts, saves as text files and sends to Telegram for review.
 * 
 * Runs: After lead-research-levelup completes (Phase 1)
 * Runs manually: node outreach-drafts.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1jPWFfCHbaTRX4BqqjlaPPjDB0U15qIIdpcIGQwg8Jcw';
const WORKSHEET_NAME = 'Salons and RE leads';
const OUTPUT_DIR = '/home/clawd/clawd/lead-research-levelup/outreach-drafts';

// Level Up Digital info
const EMAIL = 'terry@levelupdigitalny.com';
const WEBSITE = 'levelupdigitalny.com';

// Portfolio links for social proof
const SALON_PORTFOLIO = 'https://modernsalonwebsitedesign.vercel.app/';
const RE_PORTFOLIO = 'https://realestateagentwebsite.vercel.app/';

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

function getPendingHighLeads() {
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);

    if (!result) return [];

    const data = JSON.parse(result);
    const values = data.values || [];

    if (values.length < 2) return [];

    const headers = values[0].map(h => h.toLowerCase());
    const leads = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const lead = {};

      for (let j = 0; j < headers.length; j++) {
        lead[headers[j]] = row[j] || '';
      }

      // Only include HIGH priority pending leads (not already drafted)
      if (lead.priority === 'HIGH' && (lead.outreach_status === 'pending' || lead.outreach_status === '')) {
        leads.push(lead);
      }
    }

return leads;
  } catch (e) {
    log(`Error reading leads: ${e.message}`);
    return leads;
  }
}

function updateLeadStatus(businessName, town, status) {
  try {
    const result = runGwsCommand(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: WORKSHEET_NAME
    })]);
    
    if (!result) return;
    
    const data = JSON.parse(result);
    const values = data.values || [];
    const headers = values[0].map(h => h.toLowerCase());
    
    const nameIdx = headers.indexOf('business_name');
    const townIdx = headers.indexOf('town');
    const statusIdx = headers.indexOf('outreach_status');
    
    if (nameIdx === -1 || townIdx === -1 || statusIdx === -1) return;
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[nameIdx] === businessName && row[townIdx] === town && row[statusIdx] === 'pending') {
        const cellRef = WORKSHEET_NAME + '!' + String.fromCharCode(65 + statusIdx) + (i + 1);
        runGwsCommand(['sheets', 'spreadsheets', 'values', 'update', '--params', JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          range: cellRef,
          valueInputOption: 'USER_ENTERED'
        }), '--json', JSON.stringify({ values: [[status]] })]);
        log(`  Marked ${businessName} as ${status}`);
        break;
      }
    }
  } catch (e) {
    log(`Update status error: ${e.message}`);
  }
}

function generateDraft(lead) {
  const businessName = lead.business_name || '';
  const category = lead.category || 'salon';
  const town = lead.town || '';
  const facebook = lead.facebook || '';
  const instagram = lead.instagram || '';
  const phone = lead.phone || '';
  const gbpUrl = lead.gbp_url || '';

  const portfolio = category === 'salon' ? SALON_PORTFOLIO : RE_PORTFOLIO;
  const categoryLabel = category === 'salon' ? 'salons' : 'real estate agents';

  const drafts = [];

  // --- DM Draft (for Facebook/Instagram) - short, casual, visual proof ---
  if (facebook || instagram) {
    let channels = [];
    if (facebook) channels.push('Facebook');
    if (instagram) channels.push('Instagram');

    const dmDraft = `Hey! Came across ${businessName} while researching ${categoryLabel} in ${town} — love the vibe. Noticed you don't have a website yet and wanted to reach out.
I build sites for ${categoryLabel} on Long Island — just finished one for a client that I think you'd really like the look of: ${portfolio}
Would love to do something similar for you. Happy to chat if you're open to it!
— Terry @ Level Up Digital
${WEBSITE}`;

    drafts.push({
      channel: channels.join('/') + ' DM',
      content: dmDraft,
      handle: instagram || facebook
    });
  }

  // --- Email Draft - tighter, price point, no fluff ---
  const emailDraft = `Subject: Quick question about ${businessName}

Hi there,

I was researching ${categoryLabel} in ${town} and noticed ${businessName} doesn't have a website yet. Wanted to reach out personally because I think I could help.

I'm Terry — I run Level Up Digital and specialize in building sites for Long Island ${categoryLabel}. Just finished this one for a client: ${portfolio}

Sites start at $499 and I include 3 months of free SEO to get you showing up in local searches. Happy to jump on a quick call or just answer questions over email — no pressure either way.

— Terry
${EMAIL}
${WEBSITE}`;

  drafts.push({
    channel: 'Email',
    content: emailDraft,
    handle: lead.email || phone
  });

  // --- LinkedIn Draft (for RE agents) ---
  if (category === 'realestate' && lead.linkedin) {
    const liDraft = `Hey! Noticed you don't have a personal website yet — reach out because I think I could help.

I run Level Up Digital and specialize in building sites for Long Island agents. Just finished one here: ${portfolio}

Having your own domain (instead of just a brokerage profile) builds credibility and helps you stand out. Sites start at $499.

Happy to chat if you're interested — no pressure.

— Terry
${EMAIL}
${WEBSITE}`;

    drafts.push({
      channel: 'LinkedIn',
      content: liDraft,
      handle: lead.linkedin
    });
  }

  return drafts;
}

function saveDrafts(drafts, lead, index) {
  const dir = OUTPUT_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const safeName = (lead.business_name || 'lead_' + index)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 30);

  const results = [];

  for (const draft of drafts) {
    const filename = `${dir}/${safeName}_${draft.channel.toLowerCase().replace(/[^a-z]/g, '')}.txt`;

    const content = `---
LEAD: ${lead.business_name}
TOWN: ${lead.town}
CATEGORY: ${lead.category}
HANDLE: ${draft.handle}
CHANNEL: ${draft.channel}
PRIORITY: ${lead.priority}
DATE: ${lead.date_added}
---

${draft.content}
`;

    fs.writeFileSync(filename, content);
    results.push(filename);
    log(`  Saved: ${filename}`);
  }

  return results;
}

async function sendToTelegram(drafts, lead) {
  const message = `📝 *New Outreach Drafts*\n\n` +
    `*Lead:* ${lead.business_name}\n` +
    `*Town:* ${lead.town}\n` +
    `*Category:* ${lead.category}\n` +
    `*Priority:* ${lead.priority}\n\n` +
    `_Available channels for outreach:_`;

  try {
    execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
      'message', 'send', '--channel', 'telegram',
      '--target', '5867308866',
      '--message', message
    ], { timeout: 10000, stdio: 'ignore' });

    // Send each draft
    for (const draft of drafts) {
      const draftMsg = `\n\n--- ${draft.channel} ---\n${draft.content}`;
      execFileSync('/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot', [
        'message', 'send', '--channel', 'telegram',
        '--target', '5867308866',
        '--message', draftMsg
      ], { timeout: 10000, stdio: 'ignore' });
    }
  } catch (e) {
    log(`Telegram error: ${e.message}`);
  }
}

async function main() {
  log('=== Outreach Draft Generator ===');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get pending HIGH priority leads
  const leads = getPendingHighLeads();
  log(`Found ${leads.length} pending HIGH priority leads`);

  if (leads.length === 0) {
    log('No pending leads - nothing to generate');
    return;
  }

  let totalDrafts = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    log(`\n--- Lead ${i + 1}: ${lead.business_name} ---`);

    const drafts = generateDraft(lead);
    log(`  Generated ${drafts.length} drafts`);

    const files = saveDrafts(drafts, lead, i + 1);
    totalDrafts += files.length;

    // Update outreach_status to "drafted" so we don't pick up this lead again
    updateLeadStatus(lead.business_name, lead.town, 'drafted');

    // Send to Telegram for review
    await sendToTelegram(drafts, lead);
  }

  log(`\n=== Summary ===`);
  log(`Leads processed: ${leads.length}`);
  log(`Drafts generated: ${totalDrafts}`);
  log(`Saved to: ${OUTPUT_DIR}`);
  log('\nDrafts sent to Telegram for review');
}

main().catch(e => {
  log(`Error: ${e.message}`);
  process.exit(1);
});