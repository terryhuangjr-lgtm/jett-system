module.exports = {
  apps: [
    {
      name: 'task-manager-server',
      script: './task-manager/server.js',
      cwd: '/home/clawd/clawd',
      instances: 1,
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100
    }
    // task-manager-worker disabled 2026-03-02
    // Reason: All automation migrated to clawdbot cron. Worker was redundant/crash loop.
    // Health monitor still runs via cron: "run bash: /home/clawd/scripts/health_check.sh"
  ]
};
