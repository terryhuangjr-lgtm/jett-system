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
    },
    {
      name: 'task-manager-worker',
      script: './task-manager/worker.js',
      cwd: '/home/clawd/clawd',
      instances: 1,
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100
    }
  ]
};
