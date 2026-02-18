#!/usr/bin/env node
/**
 * Test weekly schedule calculation
 */

const TaskDatabase = require('./database');

const db = new TaskDatabase();

console.log('Testing weekly schedule calculation\n');
console.log(`Current time: ${new Date().toString()}\n`);

const testCases = [
  'weekly on Monday at 04:00',
  'weekly on Tuesday at 04:00',
  'weekly on Wednesday at 04:00',
  'weekly on Thursday at 04:00',
  'weekly on Friday at 04:00',
  'weekly on Saturday at 04:00',
  'weekly on Sunday at 04:00',
  'daily at 06:00',
  'every 30 minutes'
];

testCases.forEach(schedule => {
  const nextRun = db.calculateNextRun(schedule);
  if (nextRun) {
    const date = new Date(nextRun);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    console.log(`✓ ${schedule}`);
    console.log(`  → ${date.toString()} (${dayName})\n`);
  } else {
    console.log(`✗ ${schedule} - FAILED\n`);
  }
});
