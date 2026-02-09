#!/usr/bin/env node
/**
 * Database Bridge - Node.js to Python SQLite
 *
 * Allows JavaScript automation scripts to add/query the knowledge database
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const JETT_DB_PATH = path.join(__dirname, '..', 'jett_db.py');

class DatabaseBridge {
  /**
   * Add content to database
   */
  addContent(topic, content, category, source, btcAngle, qualityScore = 8) {
    // Write Python code to temp file to avoid shell escaping issues
    const python = `import sys
sys.path.insert(0, '${path.dirname(JETT_DB_PATH)}')
from jett_db import get_db

db = get_db()
content_id = db.add_content_idea(
    topic=${JSON.stringify(topic)},
    category=${JSON.stringify(category)},
    content=${JSON.stringify(content)},
    status="draft",
    quality_score=${qualityScore},
    source=${JSON.stringify(source)}
)
print(content_id)`;

    const tmpFile = path.join(os.tmpdir(), `db-bridge-${Date.now()}.py`);

    try {
      fs.writeFileSync(tmpFile, python);
      const result = execSync(`python3 ${tmpFile}`, {
        encoding: 'utf8'
      });
      fs.unlinkSync(tmpFile);
      return parseInt(result.trim());
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      console.error('Failed to add content to database:', err.message);
      return null;
    }
  }

  /**
   * Add athlete to database
   */
  addAthlete(name, sport, team, contractValue, contractYear, dealType, keyDetails, source) {
    const python = `import sys
sys.path.insert(0, '${path.dirname(JETT_DB_PATH)}')
from jett_db import get_db

db = get_db()
athlete_id = db.add_athlete(
    name=${JSON.stringify(name)},
    sport=${JSON.stringify(sport)},
    team=${JSON.stringify(team || '')},
    contract_value=${contractValue || 0},
    contract_year=${contractYear || 'None'},
    deal_type=${JSON.stringify(dealType || '')},
    key_details=${JSON.stringify(keyDetails || '')},
    source_file=${JSON.stringify(source || '')}
)
print(athlete_id)`;

    const tmpFile = path.join(os.tmpdir(), `db-bridge-${Date.now()}.py`);

    try {
      fs.writeFileSync(tmpFile, python);
      const result = execSync(`python3 ${tmpFile}`, {
        encoding: 'utf8'
      });
      fs.unlinkSync(tmpFile);
      return parseInt(result.trim());
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      console.error('Failed to add athlete to database:', err.message);
      return null;
    }
  }

  /**
   * Get draft content from database
   */
  getDraftContent(limit = 20) {
    const python = `import sys
sys.path.insert(0, '${path.dirname(JETT_DB_PATH)}')
import json
from jett_db import get_db

db = get_db()
drafts = db.get_content_by_status('draft', limit=${limit})
print(json.dumps(drafts))`;

    const tmpFile = path.join(os.tmpdir(), `db-bridge-${Date.now()}.py`);

    try {
      fs.writeFileSync(tmpFile, python);
      const result = execSync(`python3 ${tmpFile}`, {
        encoding: 'utf8'
      });
      fs.unlinkSync(tmpFile);
      return JSON.parse(result);
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      console.error('Failed to get draft content:', err.message);
      return [];
    }
  }

  /**
   * Get database stats
   */
  getStats() {
    const python = `
import json
from jett_db import get_db
db = get_db()
stats = db.get_stats()
print(json.dumps(stats))
`;

    try {
      const result = execSync(`cd ${path.dirname(JETT_DB_PATH)} && python3 -c '${python}'`, {
        encoding: 'utf8'
      });
      return JSON.parse(result);
    } catch (err) {
      console.error('Failed to get stats:', err.message);
      return {};
    }
  }

  /**
   * Search athletes
   */
  searchAthletes(filters = {}) {
    const { sport, minValue, maxValue, keyword } = filters;

    let pythonFilters = [];
    if (sport) pythonFilters.push(`sport="${this.escape(sport)}"`);
    if (minValue) pythonFilters.push(`min_value=${minValue}`);
    if (maxValue) pythonFilters.push(`max_value=${maxValue}`);
    if (keyword) pythonFilters.push(`keyword="${this.escape(keyword)}"`);

    const filtersStr = pythonFilters.length > 0 ? pythonFilters.join(', ') : '';

    const python = `
import json
from jett_db import get_db
db = get_db()
athletes = db.search_athletes(${filtersStr})
print(json.dumps(athletes))
`;

    try {
      const result = execSync(`cd ${path.dirname(JETT_DB_PATH)} && python3 -c '${python}'`, {
        encoding: 'utf8'
      });
      return JSON.parse(result);
    } catch (err) {
      console.error('Failed to search athletes:', err.message);
      return [];
    }
  }

  /**
   * Mark content as published
   */
  markPublished(contentId) {
    const python = `import sys
sys.path.insert(0, '${path.dirname(JETT_DB_PATH)}')
from jett_db import get_db

db = get_db()
result = db.mark_content_published(${contentId})
print('ok' if result else 'failed')`;

    const tmpFile = path.join(os.tmpdir(), `db-bridge-${Date.now()}.py`);

    try {
      fs.writeFileSync(tmpFile, python);
      const result = execSync(`python3 ${tmpFile}`, {
        encoding: 'utf8'
      });
      fs.unlinkSync(tmpFile);
      return result.trim() === 'ok';
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      console.error('Failed to mark as published:', err.message);
      return false;
    }
  }

  /**
   * Escape strings for Python
   * Note: We wrap Python code in single quotes in shell, so must escape single quotes
   */
  escape(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")  // Escape single quotes for shell
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Update content category
   */
  updateContentCategory(contentId, newCategory) {
    const python = `import sys
sys.path.insert(0, '${path.dirname(JETT_DB_PATH)}')
from jett_db import get_db

db = get_db()
db.db.execute(
    "UPDATE content_ideas SET category = ? WHERE id = ?",
    (${JSON.stringify(newCategory)}, ${contentId})
)
db.db.commit()
print("updated")`;

    const tmpFile = path.join(os.tmpdir(), `db-bridge-${Date.now()}.py`);

    try {
      fs.writeFileSync(tmpFile, python);
      execSync(`python3 ${tmpFile}`, {
        encoding: 'utf8'
      });
      fs.unlinkSync(tmpFile);
      return true;
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      console.error('Failed to update category:', err.message);
      return false;
    }
  }
}

// Export singleton instance
const db = new DatabaseBridge();

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'stats':
      console.log(JSON.stringify(db.getStats(), null, 2));
      break;

    case 'drafts':
      const drafts = db.getDraftContent(10);
      drafts.forEach(d => {
        console.log(`\n${d.topic}`);
        console.log(d.content.substring(0, 150) + '...');
      });
      break;

    case 'athletes':
      const athletes = db.searchAthletes();
      athletes.forEach(a => {
        console.log(`${a.name} (${a.sport}): $${(a.contract_value || 0).toLocaleString()}`);
      });
      break;

    case 'add-test':
      const id = db.addContent(
        'Test Content',
        'This is a test content entry from Node.js',
        'test',
        'manual',
        'Test BTC angle',
        7
      );
      console.log(`Added content with ID: ${id}`);
      break;

    default:
      console.log('Usage:');
      console.log('  node db-bridge.js stats    - Show database stats');
      console.log('  node db-bridge.js drafts   - Show draft content');
      console.log('  node db-bridge.js athletes - Show athletes');
      console.log('  node db-bridge.js add-test - Add test content');
  }
}

module.exports = db;
