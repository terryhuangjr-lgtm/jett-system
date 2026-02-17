#!/usr/bin/env node
/**
 * Quick Memory Access - Fast utilities for reading/writing memory files
 * Optimized for common patterns to reduce token usage
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];

class QuickMemory {
  // Get today's memory file path
  static getTodayFile() {
    return path.join(MEMORY_DIR, `${TODAY}.md`);
  }

  // Get yesterday's file path
  static getYesterdayFile() {
    return path.join(MEMORY_DIR, `${YESTERDAY}.md`);
  }

  // Quick append to today's memory (most common operation)
  static append(text) {
    const file = this.getTodayFile();
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: 'America/New_York'
    });
    const entry = `\n## ${timestamp}\n${text}\n`;

    try {
      if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
      }

      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, `# ${TODAY}\n\n${entry}`);
      } else {
        fs.appendFileSync(file, entry);
      }
      return true;
    } catch (err) {
      console.error('Failed to append:', err.message);
      return false;
    }
  }

  // Read recent context (today + yesterday)
  static getRecentContext() {
    const files = [this.getTodayFile(), this.getYesterdayFile()];
    let context = '';

    for (const file of files) {
      if (fs.existsSync(file)) {
        context += fs.readFileSync(file, 'utf8') + '\n\n';
      }
    }

    return context;
  }

  // Get summary of last N entries from today
  static getLastEntries(n = 5) {
    const file = this.getTodayFile();
    if (!fs.existsSync(file)) return [];

    const content = fs.readFileSync(file, 'utf8');
    const entries = content.split(/^## /m).slice(1);
    return entries.slice(-n).map(e => '## ' + e.trim());
  }

  // List all memory files
  static listFiles() {
    if (!fs.existsSync(MEMORY_DIR)) return [];
    return fs.readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.md') && f.match(/\d{4}-\d{2}-\d{2}\.md/))
      .sort()
      .reverse();
  }

  // Get file size in KB (for token estimation)
  static getFileSize(filename) {
    const file = path.join(MEMORY_DIR, filename);
    if (!fs.existsSync(file)) return 0;
    const stats = fs.statSync(file);
    return (stats.size / 1024).toFixed(2);
  }

  // Clean old entries (keep last N days)
  static cleanOld(daysToKeep = 30) {
    const files = this.listFiles();
    const cutoff = new Date(Date.now() - daysToKeep * 86400000);
    let cleaned = 0;

    for (const file of files) {
      const match = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const fileDate = new Date(match[1]);
        if (fileDate < cutoff) {
          fs.unlinkSync(path.join(MEMORY_DIR, file));
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'append':
      QuickMemory.append(args.slice(1).join(' '));
      console.log('Appended to today\'s memory');
      break;
    case 'recent':
      console.log(QuickMemory.getRecentContext());
      break;
    case 'last':
      console.log(QuickMemory.getLastEntries(parseInt(args[1]) || 5).join('\n\n'));
      break;
    case 'list':
      const files = QuickMemory.listFiles();
      files.forEach(f => {
        console.log(`${f} (${QuickMemory.getFileSize(f)} KB)`);
      });
      break;
    case 'clean':
      const cleaned = QuickMemory.cleanOld(parseInt(args[1]) || 30);
      console.log(`Cleaned ${cleaned} old memory files`);
      break;
    default:
      console.log('Usage: quick-memory.js [append|recent|last|list|clean] <args>');
  }
}

module.exports = QuickMemory;
