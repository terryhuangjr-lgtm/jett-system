#!/usr/bin/env node
/**
 * System Health Monitor
 * Runs every 6 hours, checks for issues, alerts via Slack
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || process.env.SLACK_ALERTS_WEBHOOK;
const HEARTBEAT_FILE = path.join(os.tmpdir(), 'clawd-task-worker.heartbeat');
const LOCK_FILE = path.join(os.tmpdir(), 'clawd-task-worker.lock');
const STALE_THRESHOLD_MS = 120000;
const CHECKS_FILE = path.join(os.tmpdir(), 'health-check-last-alert.json');

const ISSUES = [];

function addIssue(category, severity, message) {
  ISSUES.push({ category, severity, message, time: new Date().toISOString() });
}

function slackNotify(message, channel = '#alerts') {
  if (!SLACK_WEBHOOK) {
    console.log('[SLACK] No webhook configured - alert not sent');
    return;
  }

  const payload = {
    channel,
    text: message,
    username: 'System Health Monitor',
    icon_emoji: ':rotating_light:'
  };

  const req = https.request(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, () => {});

  req.on('error', e => console.error('[SLACK] Error:', e.message));
  req.write(JSON.stringify(payload));
  req.end();
}

async function checkWorkerHealth() {
  console.log('[Check] Task Worker health...');

  let heartbeat = null;
  try {
    heartbeat = JSON.parse(fs.readFileSync(HEARTBEAT_FILE, 'utf8'));
  } catch (e) {
    addIssue('Worker', 'high', 'No heartbeat file - worker may not be running');
    return;
  }

  let lockData = null;
  try {
    lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch (e) {
    addIssue('Worker', 'medium', 'No lock file - possible worker restart needed');
  }

  if (heartbeat) {
    const staleMs = Date.now() - heartbeat.lastBeat;
    if (staleMs > STALE_THRESHOLD_MS) {
      addIssue('Worker', 'critical', `Worker stale (${Math.round(staleMs/1000)}s since heartbeat)`);
    } else if (heartbeat.pid && lockData && heartbeat.pid !== lockData.pid) {
      addIssue('Worker', 'medium', 'Heartbeat PID does not match lock PID');
    }
  }

  if (lockData) {
    try {
      process.kill(lockData.pid, 0);
    } catch (e) {
      addIssue('Worker', 'high', `Lock exists (PID ${lockData.pid}) but process dead - orphaned lock`);
    }
  }
}

async function checkClawdbotGateway() {
  console.log('[Check] Clawdbot Gateway...');
  try {
    const pid = execSync('pgrep -f "clawdbot-gateway" | head -1', { encoding: 'utf8' }).trim();
    if (pid) {
      try { process.kill(parseInt(pid), 0); } catch(e) {
        addIssue('Gateway', 'high', 'Gateway PID file exists but process dead');
      }
    } else {
      addIssue('Gateway', 'high', 'Clawdbot Gateway not running');
    }
  } catch (e) {
    addIssue('Gateway', 'high', 'Clawdbot Gateway not running');
  }
}

async function checkCronJobs() {
  console.log('[Check] Cron jobs...');
  try {
    const output = execSync('crontab -l 2>/dev/null || echo ""', { encoding: 'utf8' });
    if (!output.includes('jett') && !output.includes('clawd')) {
      addIssue('Cron', 'low', 'No Jett/Clawd cron jobs found');
    }
  } catch (e) {
    addIssue('Cron', 'medium', 'Unable to read crontab');
  }
}

async function checkDiskSpace() {
  console.log('[Check] Disk space...');
  try {
    const output = execSync('df -h /home/clawd 2>/dev/null | tail -1', { encoding: 'utf8' });
    const used = parseInt(output.match(/(\d+)%/)?.[1] || 0);
    if (used > 90) {
      addIssue('System', 'critical', `Disk usage at ${used}%`);
    } else if (used > 80) {
      addIssue('System', 'medium', `Disk usage at ${used}%`);
    }
  } catch (e) {
    addIssue('System', 'low', 'Unable to check disk space');
  }
}

async function checkMemory() {
  console.log('[Check] Memory...');
  try {
    const output = execSync('free -m | grep Mem', { encoding: 'utf8' });
    const parts = output.split(/\s+/);
    const used = parseInt(parts[2]);
    const total = parseInt(parts[1]);
    const percent = Math.round((used / total) * 100);
    if (percent > 90) {
      addIssue('System', 'high', `Memory at ${percent}%`);
    }
  } catch (e) {
    addIssue('System', 'low', 'Unable to check memory');
  }
}

async function checkFailedServices() {
  console.log('[Check] Systemd services...');
  try {
    const output = execSync('systemctl --user list-units --state=failed --no-pager 2>/dev/null', { encoding: 'utf8' });
    if (output.includes('failed')) {
      const lines = output.split('\n').filter(l => l.includes('failed'));
      addIssue('Systemd', 'medium', `${lines.length} failed user services`);
    }
  } catch (e) {
    // systemd may not be available
  }
}

async function checkRecentErrors() {
  console.log('[Check] Recent errors...');
  try {
    const logFile = '/home/clawd/clawd/task-manager/logs/worker-error.log';
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (stats.mtimeMs > oneDayAgo) {
        const content = fs.readFileSync(logFile, 'utf8').slice(-2000);
        if (content.includes('Error') || content.includes('error') || content.includes('Failed')) {
          addIssue('Logs', 'low', 'Recent errors in worker log (check logs)');
        }
      }
    }
  } catch (e) {
    // Ignore
  }
}

async function shouldAlertAgain(issueKey, hours = 6) {
  try {
    const lastAlert = JSON.parse(fs.readFileSync(CHECKS_FILE, 'utf8'))[issueKey];
    if (lastAlert && (Date.now() - lastAlert) < (hours * 60 * 60 * 1000)) {
      return false;
    }
  } catch (e) {}
  return true;
}

async function recordAlert(issueKey) {
  try {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(CHECKS_FILE, 'utf8')); } catch(e) {}
    data[issueKey] = Date.now();
    fs.writeFileSync(CHECKS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

async function main() {
  console.log('=== System Health Check ===');
  console.log('Time:', new Date().toISOString());

  await checkWorkerHealth();
  await checkClawdbotGateway();
  await checkCronJobs();
  await checkDiskSpace();
  await checkMemory();
  await checkFailedServices();
  await checkRecentErrors();

  console.log(`Found ${ISSUES.length} issues`);

  if (ISSUES.length === 0) {
    console.log('All checks passed!');
    return;
  }

  const criticalIssues = ISSUES.filter(i => i.severity === 'critical');
  const highIssues = ISSUES.filter(i => i.severity === 'high');
  const mediumIssues = ISSUES.filter(i => i.severity === 'medium');
  const lowIssues = ISSUES.filter(i => i.severity === 'low');

  const emoji = criticalIssues.length > 0 ? ':rotating_light:' : (highIssues.length > 0 ? ':warning:' : ':information_source:');
  const priority = criticalIssues.length > 0 ? 'CRITICAL' : (highIssues.length > 0 ? 'HIGH' : 'ISSUES');

  const lines = [
    `${emoji} *System Health Report* - ${new Date().toLocaleString()}`,
    '',
    `*Critical:* ${criticalIssues.length}`,
    `*High:* ${highIssues.length}`,
    `*Medium:* ${mediumIssues.length}`,
    `*Low:* ${lowIssues.length}`,
    ''
  ];

  for (const issue of ISSUES.slice(0, 10)) {
    lines.push(`[${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}`);
  }

      if (ISSUES.length > 10) {
        lines.push(`... and ${ISSUES.length - 10} more issues`);
      }

      if (criticalIssues.length > 0 || highIssues.length > 0) {
        lines.push('', '<!channel>');
      }

  const message = lines.join('\n');
  console.log(message);

  if (ISSUES.length > 0) {
    if (SLACK_WEBHOOK) {
      slackNotify(message);
      console.log('[Alert] Sent to Slack');
    } else {
      console.log('[Alert] Slack webhook not configured - alert not sent');
    }
  }
}

main().catch(e => {
  console.error('Health check failed:', e.message);
  slackNotify(`:x: Health check failed: ${e.message}`);
});
