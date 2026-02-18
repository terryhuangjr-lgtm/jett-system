# Task Manager

Complete task scheduling and management system with web dashboard, CLI, and background worker.

## Features

- **Web Dashboard** - Visual interface at http://localhost:3000
- **Task Scheduler** - Cron-like scheduling (daily, hourly, custom intervals)
- **Background Worker** - Automatically executes tasks
- **CLI Interface** - Command-line management
- **REST API** - Programmatic access for Jett
- **Persistent Storage** - SQLite database
- **Task Logs** - Complete execution history
- **Real-time Updates** - Dashboard auto-refreshes

## Quick Start

### 1. Install Dependencies
```bash
npm install sqlite3
```

### 2. Start Task Manager
```bash
cd task-manager
./start.sh
```

This starts:
- Web server at http://localhost:3000
- Background worker (checks every 30s)

### 3. Open Dashboard
Visit http://localhost:3000 in your browser

### 4. Add Your First Task
Via dashboard or CLI:
```bash
node cli.js add "Test Task" "echo 'Hello World'"
```

## Using the Web Dashboard

### Add a Task
1. Click "Add Task" button
2. Fill in:
   - **Name**: Descriptive name
   - **Command**: Shell command to run
   - **Schedule**: Optional (e.g., "daily at 06:00", "hourly", "every 30 minutes")
   - **Priority**: 1-10 (higher = runs first)
3. Click "Create Task"

### Manage Tasks
- **View Details**: Click task name
- **Run Now**: Click "Run" button
- **Pause/Resume**: Click pause/resume button
- **Delete**: Click "Delete" button
- **Filter**: Use dropdown to filter by status

### Monitor Progress
- Stats bar shows task counts
- Status badges show current state
- Auto-refreshes every 10 seconds

## Using the CLI

### Add Tasks
```bash
# One-time task
node cli.js add "Scrape eBay" "node ../lib/stealth-browser/example-ebay.js 'vintage jersey'"

# Scheduled task - daily at 6 AM
node cli.js add "Morning Price Check" "node check-prices.js" --schedule "daily at 06:00"

# Hourly task
node cli.js add "Monitor Site" "node monitor.js" --schedule "hourly"

# Every 30 minutes
node cli.js add "Quick Check" "node quick-check.js" --schedule "every 30 minutes"

# With priority and description
node cli.js add "Important Task" "node important.js" \
  --description "Critical monitoring task" \
  --priority 10 \
  --schedule "every 5 minutes"
```

### List Tasks
```bash
# All tasks
node cli.js list

# Filter by status
node cli.js list --status pending
node cli.js list --status running
node cli.js list --status completed
```

### View Task Details
```bash
node cli.js show 1
```

### View Task Logs
```bash
# Last 10 logs
node cli.js logs 1

# Last 50 logs
node cli.js logs 1 --limit 50
```

### Update Task
```bash
# Change status
node cli.js update 1 --status pending

# Change schedule
node cli.js update 1 --schedule "daily at 18:00"

# Enable/disable
node cli.js update 1 --enabled false
node cli.js update 1 --enabled true

# Change priority
node cli.js update 1 --priority 10
```

### Delete Task
```bash
node cli.js remove 1
```

### Statistics
```bash
node cli.js stats
```

## Schedule Formats

### Daily at Specific Time
```bash
--schedule "daily at 06:00"
--schedule "daily at 14:30"
--schedule "daily at 23:45"
```

### Hourly
```bash
--schedule "hourly"
```

### Custom Intervals
```bash
--schedule "every 5 minutes"
--schedule "every 30 minutes"
--schedule "every 2 hours"
--schedule "every 6 hours"
```

## API for Jett

Jett can interact with tasks programmatically:

### List Tasks
```bash
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/tasks?status=pending
```

### Get Task
```bash
curl http://localhost:3000/api/tasks/1
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Task",
    "command": "echo test",
    "schedule": "hourly",
    "priority": 5
  }'
```

### Update Task
```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "pending"}'
```

### Delete Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/1
```

### Get Logs
```bash
curl http://localhost:3000/api/tasks/1/logs
```

### Get Stats
```bash
curl http://localhost:3000/api/stats
```

## Real-World Examples

### Example 1: Daily eBay Price Monitoring
```bash
node cli.js add "eBay Vintage Jerseys" \
  "node ../lib/stealth-browser/example-ebay.js 'vintage jersey'" \
  --schedule "daily at 06:00" \
  --description "Monitor vintage jersey prices on eBay"
```

### Example 2: Hourly Website Check
```bash
node cli.js add "Check Competitor Site" \
  "node ../lib/stealth-browser/cli.js scrape --url https://competitor.com --output /tmp/competitor.json" \
  --schedule "hourly" \
  --priority 8
```

### Example 3: Multiple Research Tasks
```bash
# Add 5 research tasks
node cli.js add "Research Site 1" "node ../lib/stealth-browser/cli.js scrape --url https://site1.com"
node cli.js add "Research Site 2" "node ../lib/stealth-browser/cli.js scrape --url https://site2.com"
node cli.js add "Research Site 3" "node ../lib/stealth-browser/cli.js scrape --url https://site3.com"
node cli.js add "Research Site 4" "node ../lib/stealth-browser/cli.js scrape --url https://site4.com"
node cli.js add "Research Site 5" "node ../lib/stealth-browser/cli.js scrape --url https://site5.com"

# Worker will execute them one by one
```

### Example 4: Overnight Batch Job
```bash
node cli.js add "Overnight Analysis" \
  "bash /path/to/overnight-script.sh" \
  --schedule "daily at 02:00" \
  --description "Heavy analysis job that runs overnight"
```

## Task Statuses

- **pending**: Waiting to run
- **running**: Currently executing
- **completed**: Finished successfully
- **failed**: Finished with error

For scheduled tasks, status returns to "pending" after completion.

## Architecture

```
task-manager/
├── database.js        # SQLite database layer
├── worker.js          # Background task executor
├── server.js          # Web server + REST API
├── cli.js             # Command-line interface
├── dashboard/         # Web UI
│   ├── index.html     # Dashboard page
│   ├── style.css      # Styles
│   └── app.js         # Frontend JavaScript
├── tasks.db           # SQLite database (created automatically)
├── start.sh           # Start script
├── stop.sh            # Stop script
└── logs/              # Log files
    ├── server.log
    └── worker.log
```

## How It Works

1. **You add a task** (via dashboard or CLI)
2. **Task is stored** in SQLite database
3. **Worker checks every 30s** for tasks ready to run
4. **Worker executes** the command
5. **Results are logged** to database
6. **If scheduled**, next run time is calculated
7. **Dashboard shows** real-time status

## Integration with Stealth Browser

Perfect companion to the stealth browser:

```bash
# Schedule daily eBay scans
node cli.js add "eBay Scan" \
  "node /home/clawd/clawd/lib/stealth-browser/example-ebay.js 'vintage jersey'" \
  --schedule "daily at 06:00"

# Schedule hourly price checks
node cli.js add "Price Monitor" \
  "node /home/clawd/clawd/lib/stealth-browser/cli.js scrape --url https://site.com/products --selector '.price' --multiple true --output /tmp/prices.json" \
  --schedule "hourly"
```

## Stopping Task Manager

```bash
./stop.sh
```

Or use Ctrl+C if running in foreground.

## Viewing Logs

```bash
# Real-time logs
tail -f logs/server.log
tail -f logs/worker.log

# Both logs
tail -f logs/*.log
```

## Troubleshooting

### Task not running?
- Check worker is running: `ps aux | grep worker.js`
- Check task is enabled: `node cli.js show <id>`
- Check next_run time: Should be in the past for it to execute
- Check logs: `node cli.js logs <id>`

### Dashboard not loading?
- Check server is running: `ps aux | grep server.js`
- Check port 3000 is available: `lsof -i :3000`
- Check server logs: `cat logs/server.log`

### Command not executing?
- Test command manually first
- Check command path is correct
- Worker runs from task-manager/ directory
- Use absolute paths if needed

## Tips

1. **Test commands first** - Run manually before scheduling
2. **Use absolute paths** - Especially for file operations
3. **Set priorities** - Higher priority tasks run first
4. **Monitor logs** - Check logs to debug issues
5. **Start simple** - Test with `echo` commands first
6. **Schedule wisely** - Don't hammer websites
7. **Use sessions** - For stealth browser tasks requiring login

## Token Savings

This system enables Jett to work autonomously:

**Without Task Manager:**
- You: "Jett, check eBay prices"
- Jett: Uses 50k tokens to orchestrate and scrape
- Repeat daily = 350k tokens/week = $1.05/week

**With Task Manager:**
- You: Schedule task once
- Task runs automatically daily
- Jett doesn't need to be involved
- Cost: ~$0 (runs locally)

**Massive savings + autonomous operation!**
