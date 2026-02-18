#!/usr/bin/env node
/**
 * Fix Weekly Tasks - Recalculate next_run for all weekly tasks
 */

const TaskDatabase = require('./database');

(async () => {
  const db = new TaskDatabase();
  await db.init();

  console.log('Fixing weekly task schedules...\n');

  // Get all tasks
  const tasks = await db.getTasks();

  let fixedCount = 0;
  for (const task of tasks) {
    if (task.schedule && task.schedule.startsWith('weekly on ')) {
      const nextRun = db.calculateNextRun(task.schedule);
      if (nextRun) {
        await db.updateTask(task.id, { next_run: nextRun });
        console.log(`✓ Task ${task.id}: ${task.name}`);
        console.log(`  Schedule: ${task.schedule}`);
        console.log(`  Next run: ${nextRun}\n`);
        fixedCount++;
      } else {
        console.log(`✗ Task ${task.id}: Failed to calculate next_run`);
        console.log(`  Schedule: ${task.schedule}\n`);
      }
    }
  }

  await db.close();
  console.log(`\nFixed ${fixedCount} weekly task(s)`);
})();
