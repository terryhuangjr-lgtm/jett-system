#!/usr/bin/env node
/**
 * System Health Check
 * Reports on task success/failures, disk usage, and recent errors
 */

const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function getTaskStats() {
  try {
    const response = await execAsync('curl -s http://localhost:3000/api/tasks');
    const tasks = JSON.parse(response.stdout);
    
    const enabled = tasks.filter(t => t.enabled).length;
    const total = tasks.length;
    const recentRuns = tasks.filter(t => t.last_run).length;
    
    return { enabled, total, recentRuns };
  } catch (e) {
    return { error: 'Task manager unreachable' };
  }
}

async function getDiskUsage() {
  try {
    const { stdout } = await execAsync('df -h /home | tail -1');
    const parts = stdout.trim().split(/\s+/);
    return {
      total: parts[1],
      used: parts[2],
      available: parts[3],
      percent: parts[4]
    };
  } catch (e) {
    return { error: 'Could not get disk usage' };
  }
}

async function getRecentErrors() {
  const logFiles = [
    '/home/clawd/data/podcasts/cron_log.txt',
    '/home/clawd/clawd/task-manager/logs/error.log'
  ];
  
  const errors = [];
  for (const logFile of logFiles) {
    try {
      if (fs.existsSync(logFile)) {
        const { stdout } = await execAsync(`tail -100 ${logFile} | grep -i error | tail -5`);
        if (stdout.trim()) {
          errors.push({
            file: logFile.split('/').pop(),
            lines: stdout.trim().split('\n').slice(0, 3)
          });
        }
      }
    } catch (e) {
      // No errors or file doesn't exist
    }
  }
  
  return errors;
}

async function getSessionStats() {
  try {
    const sessionsDir = process.env.HOME + '/.clawdbot/state/sessions';
    if (!fs.existsSync(sessionsDir)) return { error: 'No sessions found' };
    
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    let totalTokens = 0;
    
    for (const file of files) {
      const content = fs.readFileSync(`${sessionsDir}/${file}`, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length > 0) {
        const lastLine = JSON.parse(lines[lines.length - 1]);
        if (lastLine.totalTokens) totalTokens += lastLine.totalTokens;
      }
    }
    
    return {
      sessions: files.length,
      totalTokens
    };
  } catch (e) {
    return { error: 'Could not read sessions' };
  }
}

async function main() {
  console.log('🏥 SYSTEM HEALTH CHECK\n');
  console.log('=' .repeat(60));
  
  const tasks = await getTaskStats();
  console.log('\n📋 TASK MANAGER:');
  if (tasks.error) {
    console.log(`   ❌ ${tasks.error}`);
  } else {
    console.log(`   ✅ Running: ${tasks.enabled}/${tasks.total} tasks enabled`);
    console.log(`   📊 ${tasks.recentRuns} tasks have run at least once`);
  }
  
  const disk = await getDiskUsage();
  console.log('\n💾 DISK USAGE:');
  if (disk.error) {
    console.log(`   ❌ ${disk.error}`);
  } else {
    console.log(`   📁 ${disk.used} used of ${disk.total} (${disk.percent})`);
    console.log(`   🆓 ${disk.available} available`);
    
    const percentNum = parseInt(disk.percent);
    if (percentNum > 80) {
      console.log(`   ⚠️  WARNING: Disk usage above 80%`);
    }
  }
  
  const sessions = await getSessionStats();
  console.log('\n🧠 SESSIONS:');
  if (sessions.error) {
    console.log(`   ⚠️  ${sessions.error}`);
  } else {
    console.log(`   📊 ${sessions.sessions} active sessions`);
    console.log(`   🎫 ${sessions.totalTokens.toLocaleString()} total tokens`);
    
    if (sessions.totalTokens > 500000) {
      console.log(`   ⚠️  WARNING: High token usage (consider pruning)`);
    }
  }
  
  const errors = await getRecentErrors();
  console.log('\n🚨 RECENT ERRORS:');
  if (errors.length === 0) {
    console.log('   ✅ No recent errors found');
  } else {
    for (const err of errors) {
      console.log(`   📄 ${err.file}:`);
      err.lines.forEach(line => console.log(`      ${line.substring(0, 80)}`));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n⚠️  PROCESS KILL RULES:');
  console.log('   🚫 NEVER kill kilo/bun/kilo--model processes — these are Terry\'s active coding sessions');
  console.log('   🚫 High CPU from kilo is NORMAL — ask Terry before killing anything');
  console.log(`\n✅ Health check complete at ${new Date().toLocaleString()}\n`);
}

main().catch(console.error);
