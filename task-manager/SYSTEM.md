# Task Manager System

**Dashboard:** http://localhost:3000

---

## Quick Start

### View all tasks
```bash
curl -s http://localhost:3000/api/tasks | python3 -m json.tool
```

### Add a task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"My Task","command":"echo hello","schedule":"daily at 09:00"}'
```

### Delete a task
```bash
curl -X DELETE http://localhost:3000/api/tasks/ID
```

---

## How It Works

The Task Manager runs scheduled jobs at configured times:

1. **Cron-based scheduling** - Each task has a schedule
2. **Executes shell commands** - Python, Node, scripts, etc.
3. **Logs results** - Success/failure tracked
4. **Dashboard UI** - Visual management at port 3000

---

## Key Files

```
/home/clawd/clawd/task-manager/
├── app.py              # Flask API server
├── database.js         # SQLite operations
├── runner.js          # Cron executor
├── tasks.db           # Task database
└── SYSTEM.md         # This file
```

---

## Current Tasks

| Time | Task | Status |
|------|------|--------|
| 02:00 | Podcast Processing | ON |
| 07:00 | Bitcoin Tweet Generation | ON |
| 07:30 | Sports Tweet Generation | ON |
| 08:00 | Morning Family Brief | ON |
| 08:30 | Podcast Summary Deployment | ON |
| 09:00 | System Health Check | ON |
| 10:00 | eBay Scans Deploy | ON |
| 10:00 | Sports Betting Scout | ON |
| 16:00 | Sports Betting Pick | ON |

### Disabled Tasks
- BTC and Sports Research (disabled - low quality)
- Sports Tweet Deployment (disabled - redundant)
- Bitcoin Tweet Deployment (disabled - redundant)

---

## Schedule Format

Uses cron-like format:
- `daily at HH:MM` - Every day at specific time
- `weekly on DAY at HH:MM` - Specific day each week

---

## Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  command TEXT,
  schedule TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 5,
  last_run TEXT,
  last_status TEXT
);
```

---

## Troubleshooting

### Task not running
1. Check `enabled` = 1
2. Check schedule format
3. Check logs in dashboard

### Dashboard not loading
```bash
# Restart
pkill -f "task-manager"
cd /home/clawd/clawd/task-manager
nohup python3 app.py &
```

### Add manual task
```bash
cd /home/clawd/clawd/task-manager
node -e "
const Database = require('./database.js');
const db = new Database();
db.init().then(async () => {
  await db.createTask({
    name: 'Test Task',
    command: 'echo test',
    schedule: 'daily at 12:00'
  });
  console.log('Created');
  process.exit(0);
});
"
```
