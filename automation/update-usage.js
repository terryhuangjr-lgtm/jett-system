#!/usr/bin/env node
/**
 * Update content usage tracking
 * Marks content as used and logs to usage_log
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = '/home/clawd/clawd/data/jett_knowledge.db';

// Get topics from content file
const contentFile = process.argv[2];
if (!contentFile || !fs.existsSync(contentFile)) {
  console.error('Usage: node update-usage.js <content-file.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(contentFile, 'utf8'));

// Get topics - check both old and new formats
let topics = [];
if (data.metadata && data.metadata.topics) {
  topics = data.metadata.topics;
} else if (data.metadata && data.metadata.content_topics) {
  topics = data.metadata.content_topics;
}

if (topics.length === 0) {
  console.log('No topics found in content file');
  process.exit(0);
}

console.log(`\n📊 Updating usage for ${topics.length} topics...\n`);

const python = `
import sys
sys.path.insert(0, '/home/clawd/clawd')
import sqlite3
from datetime import datetime

conn = sqlite3.connect('${DB_PATH}')
cursor = conn.cursor()

topics = ${JSON.stringify(topics).replace(/\bnull\b/g, 'None')}
placeholders = ','.join(['?' for _ in topics])

cursor.execute(f'SELECT id, topic, category FROM content_ideas WHERE topic IN ({placeholders})', topics)
results = cursor.fetchall()

print(f'Found {len(results)} matching content items\\n')

for row in results:
    content_id = row[0]
    topic = row[1]
    category = row[2]
    
    # Update usage_count
    cursor.execute('UPDATE content_ideas SET usage_count = usage_count + 1, last_used = datetime("now") WHERE id = ?', (content_id,))
    
    # Log to usage_log
    cursor.execute('''
        INSERT INTO content_usage_log (content_id, topic, category, platform, used_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (content_id, topic, category, '21m_slack', datetime.now()))
    
    print(f'  ✓ {topic[:50]}')

conn.commit()
conn.close()
print(f'\\n✅ Updated {len(results)} content items')
`;

const tmpFile = '/tmp/update-usage-' + Date.now() + '.py';
fs.writeFileSync(tmpFile, python);
try {
  execSync('python3 ' + tmpFile, { encoding: 'utf8' });
} finally {
  fs.unlinkSync(tmpFile);
}
