/**
 * Task Manager Database
 * SQLite-based persistent storage for tasks
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'tasks.db');

class TaskDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          command TEXT NOT NULL,
          schedule TEXT,
          status TEXT DEFAULT 'pending',
          priority INTEGER DEFAULT 5,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_run DATETIME,
          next_run DATETIME,
          run_count INTEGER DEFAULT 0,
          enabled INTEGER DEFAULT 1
        )
      `, (err) => {
        if (err) return reject(err);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS task_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            output TEXT,
            error TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            duration_ms INTEGER,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Create a new task
  async createTask(task) {
    return new Promise((resolve, reject) => {
      const { name, description, command, schedule, priority } = task;

      this.db.run(
        `INSERT INTO tasks (name, description, command, schedule, priority, next_run)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description || '', command, schedule || null, priority || 5,
         schedule ? this.calculateNextRun(schedule) : null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...task });
        }
      );
    });
  }

  // Get all tasks
  async getTasks(filter = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM tasks WHERE 1=1';
      const params = [];

      if (filter.status) {
        query += ' AND status = ?';
        params.push(filter.status);
      }

      if (filter.enabled !== undefined) {
        query += ' AND enabled = ?';
        params.push(filter.enabled ? 1 : 0);
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get a single task
  async getTask(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Update task
  async updateTask(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);

      this.db.run(
        `UPDATE tasks SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Delete task
  async deleteTask(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Add task log
  async addLog(taskId, log) {
    return new Promise((resolve, reject) => {
      const { status, output, error, started_at, completed_at, duration_ms } = log;

      this.db.run(
        `INSERT INTO task_logs (task_id, status, output, error, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, status, output || null, error || null, started_at, completed_at || null, duration_ms || null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  // Get logs for a task
  async getLogs(taskId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM task_logs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?',
        [taskId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Get tasks ready to run
  async getTasksReadyToRun() {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.all(
        `SELECT * FROM tasks
         WHERE enabled = 1
         AND status != 'running'
         AND (
           (schedule IS NOT NULL AND next_run IS NOT NULL AND next_run <= ?)
           OR (schedule IS NULL AND status = 'pending')
         )
         ORDER BY priority DESC`,
        [now],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Calculate next run time based on schedule (ALL TIMES IN EST)
  calculateNextRun(schedule) {
    const now = new Date();
    const EST = 'America/New_York';

    // Parse schedule format: "daily at HH:MM", "weekly on [day] at HH:MM", "hourly", "every N minutes", etc.
    // ALL SCHEDULE TIMES ARE INTERPRETED IN EST TIMEZONE
    if (schedule.startsWith('daily at ')) {
      const time = schedule.replace('daily at ', '');
      const [hours, minutes] = time.split(':').map(Number);

      // Get current date in EST
      const estNowStr = now.toLocaleString('en-US', { timeZone: EST });
      const estNow = new Date(estNowStr);

      // Create next run at specified time in EST
      const next = new Date(estNow);
      next.setHours(hours, minutes, 0, 0);

      // If time has passed today in EST, schedule for tomorrow
      if (next <= estNow) {
        next.setDate(next.getDate() + 1);
      }

      return next.toISOString();
    } else if (schedule.startsWith('weekly on ')) {
      // Format: "weekly on Tuesday at 09:00" (ALL TIMES EST)
      const match = schedule.match(/weekly on (\w+) at (\d{2}):(\d{2})/i);
      if (match) {
        const [, dayName, hours, minutes] = match;
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };

        const targetDay = dayMap[dayName.toLowerCase()];
        if (targetDay !== undefined) {
          // Get current date in EST
          const estNowStr = now.toLocaleString('en-US', { timeZone: EST });
          const estNow = new Date(estNowStr);

          const next = new Date(estNow);
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // Calculate days until target day in EST
          const currentDay = estNow.getDay();
          let daysUntil = targetDay - currentDay;

          // If target day is today but time has passed, or target day is in the past, go to next week
          if (daysUntil < 0 || (daysUntil === 0 && next <= estNow)) {
            daysUntil += 7;
          }

          next.setDate(next.getDate() + daysUntil);
          return next.toISOString();
        }
      }
      return null;
    } else if (schedule === 'hourly') {
      const next = new Date(now);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next.toISOString();
    } else if (schedule.startsWith('every ') && schedule.includes('minutes')) {
      const minutes = parseInt(schedule.match(/\d+/)[0]);
      const next = new Date(now.getTime() + minutes * 60000);
      return next.toISOString();
    } else if (schedule.startsWith('every ') && schedule.includes('hours')) {
      const hours = parseInt(schedule.match(/\d+/)[0]);
      const next = new Date(now.getTime() + hours * 3600000);
      return next.toISOString();
    }

    return null;
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = TaskDatabase;
