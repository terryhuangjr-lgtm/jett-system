module.exports = {
  apps: [
    {
      name: 'task-manager-server',
      script: '/home/clawd/clawd/task-manager/server.js',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10
    },
    {
      name: 'task-manager-worker',
      script: '/home/clawd/clawd/task-manager/worker.js',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10
    },
    {
      name: 'podcast-summarizer',
      script: '/home/clawd/skills/podcast-summary/app.py',
      interpreter: 'python3',
      watch: false,
      restart_delay: 5000
    }
  ]
}
