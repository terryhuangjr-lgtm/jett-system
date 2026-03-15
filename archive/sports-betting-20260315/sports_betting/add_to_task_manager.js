#!/usr/bin/env node
/**
 * Add sports betting tasks to task manager
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = '/home/clawd/clawd/task-manager/tasks.db';

const db = new sqlite3.Database(DB_PATH);

// Task 1: Scout Mode (1 AM)
const scoutTask = {
  name: '🔍 Sports Betting - Scout Mode',
  description: 'Morning NBA game screening (1 AM). Identifies 2-3 games worth watching and sends scout report to #sportsbetting.',
  command: '/usr/bin/python3 orchestrator.py --mode scout >> /home/clawd/clawd/logs/betting_scout.log 2>&1',
  schedule: '0 1 * * *',  // 1 AM daily
  priority: 5,
  enabled: 1
};

// Task 2: Final Mode (4 PM)
const finalTask = {
  name: '🎯 Sports Betting - Final Mode',
  description: 'Pre-game deep analysis with latest injury/line data (4 PM). Makes final pick recommendation and posts to #sportsbetting.',
  command: 'cd /home/clawd/clawd/sports_betting && /usr/bin/python3 orchestrator.py --mode final >> /home/clawd/clawd/logs/betting_final.log 2>&1',
  schedule: '0 16 * * *',  // 4 PM daily
  priority: 5,
  enabled: 1
};

// Helper to calculate next run from cron schedule
function calculateNextRun(cronSchedule) {
  // For now, just return current time + 1 day
  // Task manager should have better cron parser
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now.toISOString();
}

// Insert tasks
db.serialize(() => {
  // Check if tasks already exist
  db.get("SELECT id FROM tasks WHERE name = ?", [scoutTask.name], (err, row) => {
    if (err) {
      console.error('Error checking scout task:', err);
      return;
    }
    
    if (row) {
      console.log('✅ Scout task already exists (ID: ' + row.id + ')');
    } else {
      db.run(
        `INSERT INTO tasks (name, description, command, schedule, priority, enabled, next_run)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          scoutTask.name,
          scoutTask.description,
          scoutTask.command,
          scoutTask.schedule,
          scoutTask.priority,
          scoutTask.enabled,
          calculateNextRun(scoutTask.schedule)
        ],
        function(err) {
          if (err) {
            console.error('❌ Error adding scout task:', err.message);
          } else {
            console.log('✅ Added scout task (ID: ' + this.lastID + ')');
          }
        }
      );
    }
  });

  db.get("SELECT id FROM tasks WHERE name = ?", [finalTask.name], (err, row) => {
    if (err) {
      console.error('Error checking final task:', err);
      return;
    }
    
    if (row) {
      console.log('✅ Final task already exists (ID: ' + row.id + ')');
    } else {
      db.run(
        `INSERT INTO tasks (name, description, command, schedule, priority, enabled, next_run)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          finalTask.name,
          finalTask.description,
          finalTask.command,
          finalTask.schedule,
          finalTask.priority,
          finalTask.enabled,
          calculateNextRun(finalTask.schedule)
        ],
        function(err) {
          if (err) {
            console.error('❌ Error adding final task:', err.message);
          } else {
            console.log('✅ Added final task (ID: ' + this.lastID + ')');
          }
        }
      );
    }
  });
});

// Close after a short delay
setTimeout(() => {
  db.close();
  console.log('\n📊 Tasks added to task manager!');
  console.log('View at: http://localhost:3000');
}, 1000);
