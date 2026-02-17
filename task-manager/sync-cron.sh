#!/bin/bash
# Task Manager to Cron Sync Script
# Run: /home/clawd/clawd/task-manager/sync-cron.sh

TASKS_API="http://localhost:3000/api/tasks"

# Get tasks
curl -s $TASKS_API > /tmp/tasks.json

# Build cron entries
python3 << 'PYEOF' | tee /tmp/crontab_new
import json

with open('/tmp/tasks.json') as f:
    tasks = json.load(f)

schedule_map = {
    "daily at 00:00": "0 0 * * *",
    "daily at 03:00": "0 3 * * *",
    "daily at 04:00": "0 4 * * *",
    "daily at 05:00": "0 5 * * *",
    "daily at 06:30": "30 6 * * *",
    "daily at 07:30": "30 7 * * *",
    "daily at 08:00": "0 8 * * *",
    "daily at 09:00": "0 9 * * *",
    "daily at 10:00": "0 10 * * *",
    "daily at 16:00": "0 16 * * *",
    "weekly on Sunday at 09:00": "0 9 * * 0",
    "weekly on Monday at 09:00": "0 9 * * 1",
    "weekly on Tuesday at 09:00": "0 9 * * 2",
    "weekly on Wednesday at 09:00": "0 9 * * 3",
    "weekly on Thursday at 09:00": "0 9 * * 4",
    "weekly on Friday at 09:00": "0 9 * * 5",
    "weekly on Saturday at 09:00": "0 9 * * 6",
    "weekly": "0 9 * * 0",
}

print("# Task Manager Synced Cron Jobs")
print("# Edit tasks in Task Manager Dashboard, then run sync-cron.sh")
print("")

# Health monitor
print("@reboot cd /home/clawd/clawd/task-manager && node health-monitor.js >> /home/clawd/clawd/task-manager/logs/health-monitor.log 2>&1")

count = 0
for t in tasks:
    if not t.get("enabled"):
        continue
    
    schedule = t.get("schedule", "")
    command = t.get("command", "")
    name = t.get("name", "Unknown")[:50]
    tid = t.get("id", "?")
    
    cron_time = schedule_map.get(schedule, "")
    
    if cron_time and command:
        print(f"# Task-{tid}: {name}")
        
        # Handle different command types
        if command.startswith("cd "):
            parts = command.split(" && ")
            cd_dir = parts[0].replace("cd ", "").strip()
            rest = " && ".join(parts[1:])
            full_cmd = f'cd {cd_dir} && /home/clawd/.nvm/versions/node/v22.22.0/bin/{rest} >> /home/clawd/clawd/task-manager/logs/cron-{tid}.log 2>&1'
        elif command.startswith("python3"):
            full_cmd = f'cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/{command} >> /home/clawd/clawd/task-manager/logs/cron-{tid}.log 2>&1'
        elif command.startswith("bash"):
            full_cmd = f'cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/{command} >> /home/clawd/clawd/task-manager/logs/cron-{tid}.log 2>&1'
        else:
            if command.startswith("node "):
                command = command[5:]
            full_cmd = f'cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/node {command} >> /home/clawd/clawd/task-manager/logs/cron-{tid}.log 2>&1'
        
        print(cron_time + " " + full_cmd)
        print("")
        count += 1

print(f"# Total: {count} tasks synced")
PYEOF

# Install crontab
crontab /tmp/crontab_new
echo ""
echo "✅ Cron synced!"
crontab -l
