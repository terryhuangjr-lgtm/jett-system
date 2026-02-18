#!/usr/bin/env node
/**
 * Task Manager CLI
 * Command-line interface for managing tasks
 */

const TaskDatabase = require('./database');

const commands = {
  async add(args) {
    const db = new TaskDatabase();
    await db.init();

    const task = {
      name: args.name || args._[0],
      description: args.description || args.desc || '',
      command: args.command || args.cmd || args._[1],
      schedule: args.schedule || args.sched || null,
      priority: parseInt(args.priority || args.p || 5)
    };

    if (!task.name || !task.command) {
      console.error('Error: name and command are required');
      console.error('Usage: node cli.js add <name> <command> [options]');
      console.error('Options: --description, --schedule, --priority');
      process.exit(1);
    }

    const created = await db.createTask(task);
    console.log(`✓ Task created with ID: ${created.id}`);
    console.log(JSON.stringify(created, null, 2));

    await db.close();
  },

  async list(args) {
    const db = new TaskDatabase();
    await db.init();

    const filter = {};
    if (args.status) filter.status = args.status;

    const tasks = await db.getTasks(filter);

    if (tasks.length === 0) {
      console.log('No tasks found');
    } else {
      console.log(`\nFound ${tasks.length} task(s):\n`);
      tasks.forEach(task => {
        const status = task.status.toUpperCase();
        const schedule = task.schedule ? ` (${task.schedule})` : '';
        const nextRun = task.next_run ? ` [next: ${new Date(task.next_run).toLocaleString()}]` : '';

        console.log(`[${task.id}] ${task.name} - ${status}${schedule}${nextRun}`);
        console.log(`    Command: ${task.command}`);
        console.log(`    Priority: ${task.priority} | Runs: ${task.run_count} | Created: ${new Date(task.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    await db.close();
  },

  async show(args) {
    const db = new TaskDatabase();
    await db.init();

    const id = parseInt(args._[0] || args.id);
    if (!id) {
      console.error('Error: task ID required');
      console.error('Usage: node cli.js show <id>');
      process.exit(1);
    }

    const task = await db.getTask(id);
    if (!task) {
      console.error(`Task ${id} not found`);
      process.exit(1);
    }

    console.log('\n=== Task Details ===\n');
    console.log(JSON.stringify(task, null, 2));

    // Show recent logs
    const logs = await db.getLogs(id, 5);
    if (logs.length > 0) {
      console.log('\n=== Recent Logs ===\n');
      logs.forEach(log => {
        console.log(`[${log.status}] ${new Date(log.started_at).toLocaleString()}`);
        if (log.duration_ms) {
          console.log(`Duration: ${log.duration_ms}ms`);
        }
        if (log.output) {
          console.log(`Output: ${log.output.substring(0, 200)}...`);
        }
        if (log.error) {
          console.log(`Error: ${log.error}`);
        }
        console.log('');
      });
    }

    await db.close();
  },

  async logs(args) {
    const db = new TaskDatabase();
    await db.init();

    const id = parseInt(args._[0] || args.id);
    const limit = parseInt(args.limit || args.n || 10);

    if (!id) {
      console.error('Error: task ID required');
      console.error('Usage: node cli.js logs <id> [--limit 10]');
      process.exit(1);
    }

    const logs = await db.getLogs(id, limit);

    if (logs.length === 0) {
      console.log('No logs found');
    } else {
      console.log(`\n=== Logs for Task ${id} (showing ${logs.length}) ===\n`);
      logs.forEach(log => {
        console.log(`[${log.id}] ${log.status} - ${new Date(log.started_at).toLocaleString()}`);
        if (log.duration_ms) {
          console.log(`Duration: ${log.duration_ms}ms`);
        }
        if (log.output) {
          console.log('Output:');
          console.log(log.output);
        }
        if (log.error) {
          console.log('Error:');
          console.log(log.error);
        }
        console.log('---\n');
      });
    }

    await db.close();
  },

  async remove(args) {
    const db = new TaskDatabase();
    await db.init();

    const id = parseInt(args._[0] || args.id);
    if (!id) {
      console.error('Error: task ID required');
      console.error('Usage: node cli.js remove <id>');
      process.exit(1);
    }

    await db.deleteTask(id);
    console.log(`✓ Task ${id} deleted`);

    await db.close();
  },

  async update(args) {
    const db = new TaskDatabase();
    await db.init();

    const id = parseInt(args._[0] || args.id);
    if (!id) {
      console.error('Error: task ID required');
      console.error('Usage: node cli.js update <id> [options]');
      process.exit(1);
    }

    const updates = {};
    if (args.name) updates.name = args.name;
    if (args.description || args.desc) updates.description = args.description || args.desc;
    if (args.command || args.cmd) updates.command = args.command || args.cmd;
    if (args.schedule || args.sched) updates.schedule = args.schedule || args.sched;
    if (args.status) updates.status = args.status;
    if (args.priority || args.p) updates.priority = parseInt(args.priority || args.p);
    if (args.enabled !== undefined) updates.enabled = args.enabled === 'true' ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      console.error('Error: no updates specified');
      console.error('Options: --name, --description, --command, --schedule, --status, --priority, --enabled');
      process.exit(1);
    }

    await db.updateTask(id, updates);
    console.log(`✓ Task ${id} updated`);

    const task = await db.getTask(id);
    console.log(JSON.stringify(task, null, 2));

    await db.close();
  },

  async stats(args) {
    const db = new TaskDatabase();
    await db.init();

    const tasks = await db.getTasks();

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      scheduled: tasks.filter(t => t.schedule).length,
      enabled: tasks.filter(t => t.enabled).length
    };

    console.log('\n=== Task Statistics ===\n');
    console.log(`Total Tasks: ${stats.total}`);
    console.log(`Pending: ${stats.pending}`);
    console.log(`Running: ${stats.running}`);
    console.log(`Completed: ${stats.completed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Scheduled: ${stats.scheduled}`);
    console.log(`Enabled: ${stats.enabled}`);

    await db.close();
  },

  help() {
    console.log(`
Task Manager CLI

COMMANDS:
  add <name> <command>     Create a new task
  list                     List all tasks
  show <id>                Show task details
  logs <id>                Show task logs
  remove <id>              Delete a task
  update <id>              Update a task
  stats                    Show statistics

ADD OPTIONS:
  --description <text>     Task description
  --schedule <spec>        Schedule: "daily at HH:MM", "hourly", "every N minutes"
  --priority <1-10>        Priority (default: 5)

UPDATE OPTIONS:
  --name <name>            Update name
  --description <text>     Update description
  --command <cmd>          Update command
  --schedule <spec>        Update schedule
  --status <status>        Update status (pending, running, completed, failed)
  --priority <1-10>        Update priority
  --enabled <true|false>   Enable/disable task

LIST OPTIONS:
  --status <status>        Filter by status

LOGS OPTIONS:
  --limit <n>              Number of logs to show (default: 10)

EXAMPLES:
  # Add a one-time task
  node cli.js add "Scrape eBay" "node lib/stealth-browser/example-ebay.js 'vintage jersey'"

  # Add a scheduled task
  node cli.js add "Daily Price Check" "node check-prices.js" --schedule "daily at 06:00"

  # Add hourly task
  node cli.js add "Monitor Site" "node monitor.js" --schedule "hourly"

  # List all pending tasks
  node cli.js list --status pending

  # View task details
  node cli.js show 1

  # View task logs
  node cli.js logs 1 --limit 5

  # Update task
  node cli.js update 1 --status pending --enabled true

  # Delete task
  node cli.js remove 1

  # Show statistics
  node cli.js stats
    `);
  }
};

// Parse arguments
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++;
    } else {
      args._.push(argv[i]);
    }
  }
  return args;
}

// Main
async function main() {
  const [,, command, ...argv] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
    process.exit(0);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'node cli.js help' for usage`);
    process.exit(1);
  }

  const args = parseArgs(argv);
  await commands[command](args);
}

process.on('unhandledRejection', error => {
  console.error('Error:', error.message);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = commands;
