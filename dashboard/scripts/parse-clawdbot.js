#!/usr/bin/env node

/**
 * Clawdbot Usage Parser
 * 
 * Reads Clawdbot session .jsonl files and extracts usage data.
 * Outputs to ../data/token-usage.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSIONS_DIR = path.join(process.env.HOME, '.clawdbot/agents/main/sessions');
const DATA_FILE = path.join(__dirname, '../data/token-usage.json');
const PUBLIC_FILE = path.join(__dirname, '../public/token-usage.json');

async function parseSessionFile(filePath) {
  const entries = [];
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      
      // Handle nested message structure
      const msg = data.message || data;
      
      // Only process assistant messages with usage data
      if (msg.role === 'assistant' && msg.usage) {
        entries.push({
          timestamp: data.timestamp || Date.now(),
          agent: determineAgent(filePath, msg),
          model: msg.model || 'anthropic/claude-sonnet-4-5',
          tokens: {
            input: msg.usage.input || 0,
            output: msg.usage.output || 0,
            cacheRead: msg.usage.cacheRead || 0,
            cacheWrite: msg.usage.cacheWrite || 0,
            total: msg.usage.totalTokens || 0
          },
          cost: msg.usage.cost || {},
          sessionId: path.basename(filePath, '.jsonl'),
          project: extractProject(msg)
        });
      }
    } catch (err) {
      // Skip malformed lines
    }
  }
  
  return entries;
}

function determineAgent(filePath, data) {
  const fileName = path.basename(filePath);
  
  // Check if it's a cron job
  if (fileName.includes('cron')) return 'cron';
  
  // Check if it's a subagent
  if (fileName.includes('subagent')) {
    if (data.model && data.model.includes('grok')) return 'subagent-grok';
    return 'subagent';
  }
  
  // Main agent (Jett)
  return 'jett';
}

function extractProject(data) {
  // Try to extract project/task from message content
  let contentStr = '';
  
  if (Array.isArray(data.content)) {
    // New format: content is array of objects
    contentStr = data.content
      .map(c => c.text || c.thinking || '')
      .join(' ')
      .toLowerCase();
  } else {
    contentStr = (data.content || '').toLowerCase();
  }
  
  if (contentStr.includes('21m')) return '21m-sports';
  if (contentStr.includes('batting cage') || contentStr.includes('batting-cage')) return 'batting-cage';
  if (contentStr.includes('btc') || contentStr.includes('bitcoin')) return 'investing';
  if (contentStr.includes('morning brief')) return 'morning-brief';
  
  return 'general';
}

async function main() {
  console.log('🔍 Scanning Clawdbot sessions...');
  
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => path.join(SESSIONS_DIR, f));
  
  console.log(`Found ${files.length} session files`);
  
  let allEntries = [];
  
  for (const file of files) {
    const entries = await parseSessionFile(file);
    allEntries = allEntries.concat(entries);
  }
  
  // Sort by timestamp
  allEntries.sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate totals
  const totalCost = allEntries.reduce((sum, e) => sum + (e.cost.total || 0), 0);
  const totalTokens = allEntries.reduce((sum, e) => sum + e.tokens.total, 0);
  
  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEntries: allEntries.length,
      totalCost: parseFloat(totalCost.toFixed(4)),
      totalTokens,
      dateRange: allEntries.length > 0 ? {
        start: new Date(allEntries[0].timestamp).toISOString(),
        end: new Date(allEntries[allEntries.length - 1].timestamp).toISOString()
      } : null
    },
    entries: allEntries
  };
  
  // Write to both locations
  const outputJson = JSON.stringify(output, null, 2);
  fs.writeFileSync(DATA_FILE, outputJson);
  fs.writeFileSync(PUBLIC_FILE, outputJson);

  console.log('✅ Done!');
  console.log(`📊 Total entries: ${allEntries.length}`);
  console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
  console.log(`📅 Date range: ${output.summary.dateRange?.start?.split('T')[0]} to ${output.summary.dateRange?.end?.split('T')[0]}`);
  console.log(`🎯 Output:`);
  console.log(`   - ${DATA_FILE}`);
  console.log(`   - ${PUBLIC_FILE}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
