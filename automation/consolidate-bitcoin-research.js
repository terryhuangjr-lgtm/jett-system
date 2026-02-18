#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = path.join(process.env.HOME, 'clawd', 'memory', 'research');
const OUTPUT_FILE = path.join(process.env.HOME, 'clawd', 'memory', '21m-bitcoin-verified-research.json');

function extractBitcoinContent(content) {
  const findings = [];
  const lines = content.split('\n');
  
  let current = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match ### headings (but not Content Ideas sections)
    if (line.startsWith('### ') && !line.includes('Content Ideas')) {
      if (current && current.topic) findings.push(current);
      
      const topic = line.replace('### ', '').trim();
      current = { topic, content: '', sources: [] };
      continue;
    }
    
    // Skip section headers
    if (line.startsWith('##') || line.startsWith('#') || line.startsWith('---')) continue;
    
    // Collect content under a topic
    if (current) {
      // Look for sources (URLs)
      const urlMatch = line.match(/(https?:\/\/[^\s\)]+)/);
      if (urlMatch && !current.sources.includes(urlMatch[1])) {
        current.sources.push(urlMatch[1]);
      }
      
      // Look for Author
      if (line.includes('**Author:**')) {
        current.author = line.replace(/.*\*\*Author:\*\*\s*/i, '').trim();
      }
      
      // Add content lines
      const trimmed = line.replace(/^-\s+/, '').trim();
      if (trimmed && trimmed.length > 10 && !trimmed.startsWith('**')) {
        current.content += ' ' + trimmed;
      }
    }
  }
  
  if (current && current.topic) findings.push(current);
  
  // Clean up
  return findings.filter(f => f.content && f.content.length > 20);
}

console.log('21M Bitcoin Consolidator\n');

const files = fs.readdirSync(RESEARCH_DIR).filter(f => f.includes('bitcoin') && f.endsWith('.md'));
console.log('Found', files.length, 'files\n');

let all = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(RESEARCH_DIR, f), 'utf8');
  const extracted = extractBitcoinContent(content);
  console.log(f + ':', extracted.length);
  extracted.forEach(x => console.log(' -', x.topic.substring(0, 50)));
  all = all.concat(extracted);
}

console.log('\nTotal:', all.length);

// Dedupe by topic
const seen = new Set();
all = all.filter(x => {
  const key = x.topic.toLowerCase().substring(0, 20);
  return seen.has(key) ? false : seen.add(key);
});
console.log('After dedup:', all.length);

// Save
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
  type: '21m_bitcoin_research',
  timestamp: new Date().toISOString(),
  findings: all,
  verification_status: 'CONSOLIDATED'
}, null, 2));

console.log('\nSaved to:', OUTPUT_FILE);
console.log('\n=== AVAILABLE ===');
all.forEach((x, i) => console.log(i+1 + '.', x.topic));
