// notify-failure.js
// Purpose: Send Slack DM to Terry when any task fails
// Usage: const notifyFailure = require('./notify-failure'); notifyFailure('Task Name', error);

const { execSync } = require('child_process');

function notifyFailure(taskName, error) {
  try {
    const message = `⚠️ *Jett Task Failed*\n*Task:* ${taskName}\n*Error:* ${error.message || error}\n*Time:* ${new Date().toLocaleString('en-US', {timeZone: 'America/New_York'})}`;
    const tmpFile = `/tmp/notify-${Date.now()}.txt`;
    require('fs').writeFileSync(tmpFile, message);
    execSync(`/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot message send --channel slack --target "U0ABTP704QK" --message "$(cat ${tmpFile})" && rm ${tmpFile}`);
  } catch(e) {
    console.error('Failed to send failure notification:', e.message);
  }
}

module.exports = notifyFailure;
