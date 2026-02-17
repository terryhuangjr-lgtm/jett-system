/**
 * Task Manager Query Helper for Slack Bridge
 * Pre-fetches task data for common queries so Claude has actual information
 */

const sqlite3 = require('sqlite3').verbose();
const DB_PATH = '/home/clawd/clawd/task-manager/tasks.db';

// Detect if message is asking about scheduled tasks
function isTaskQuery(message) {
  const lower = message.toLowerCase();
  const patterns = [
    /what.*scheduled/i,
    /what.*running.*tonight|today|tomorrow/i,
    /show.*tasks/i,
    /list.*tasks/i,
    /what.*ebay.*scan/i,
    /what.*task.*\b(tonight|today|tomorrow|next|upcoming)/i,
    /check.*task.*manager/i,
    /any.*tasks/i
  ];
  
  return patterns.some(p => p.test(message));
}

// Get tasks scheduled for a specific timeframe
async function getScheduledTasks(timeframe = 'tonight') {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    let startTime, endTime;
    
    if (timeframe === 'tonight' || timeframe === 'today') {
      startTime = today;
      endTime = new Date(today);
      endTime.setDate(endTime.getDate() + 1);
    } else if (timeframe === 'tomorrow') {
      startTime = new Date(today);
      startTime.setDate(startTime.getDate() + 1);
      endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
    } else {
      // Next 24 hours
      startTime = now;
      endTime = new Date(now);
      endTime.setHours(endTime.getHours() + 24);
    }
    
    db.all(
      `SELECT id, name, schedule, next_run, enabled 
       FROM tasks 
       WHERE enabled = 1 
       AND next_run >= ? 
       AND next_run < ?
       ORDER BY next_run`,
      [startTime.toISOString(), endTime.toISOString()],
      (err, rows) => {
        db.close();
        
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(r => ({
            id: r.id,
            name: r.name,
            schedule: r.schedule,
            nextRun: new Date(r.next_run).toLocaleString('en-US', { 
              timeZone: 'America/New_York',
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          })));
        }
      }
    );
  });
}

// Enrich message with task data if it's a task query
async function enrichMessageWithTaskData(message) {
  if (!isTaskQuery(message)) {
    return message; // Not a task query, return as-is
  }
  
  try {
    // Determine timeframe from message
    const lower = message.toLowerCase();
    let timeframe = 'tonight';
    if (lower.includes('tomorrow')) timeframe = 'tomorrow';
    if (lower.includes('today')) timeframe = 'today';
    
    const tasks = await getScheduledTasks(timeframe);
    
    if (tasks.length === 0) {
      return `${message}\n\n[System Context: I checked the task manager - no tasks scheduled for ${timeframe}.]`;
    }
    
    const taskList = tasks.map(t => `  - ${t.name} (${t.nextRun})`).join('\n');
    return `${message}\n\n[System Context: I checked the task manager - ${tasks.length} task(s) scheduled for ${timeframe}:\n${taskList}]`;
    
  } catch (error) {
    console.error('Error fetching task data:', error.message);
    return message; // On error, return original message
  }
}

module.exports = { enrichMessageWithTaskData, isTaskQuery };
