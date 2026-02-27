module.exports = {
  apps: [
    {
      name: 'task-manager-server',
      script: '/home/clawd/clawd/task-manager/server.js',
      cwd: '/home/clawd/clawd/task-manager',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        TZ: 'America/New_York',
        HOME: '/home/clawd',
        NVM_DIR: '/home/clawd/.nvm'
      }
    },
    {
      name: 'task-manager-worker',
      script: '/home/clawd/clawd/task-manager/worker.js',
      cwd: '/home/clawd/clawd/task-manager',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        TZ: 'America/New_York',
        HOME: '/home/clawd',
        NVM_DIR: '/home/clawd/.nvm'
      }
    },
    {
      name: 'podcast-summarizer',
      script: '/home/clawd/skills/podcast-summary/app.py',
      interpreter: 'python3',
      watch: false,
      restart_delay: 5000,
      env: {
        HOME: '/home/clawd'
      }
    },
    {
      name: 'clawdbot-gateway',
      script: '/home/clawd/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/entry.js',
      interpreter: '/home/clawd/.nvm/versions/node/v22.22.0/bin/node',
      args: 'gateway --port 18789',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      kill_timeout: 5000,
      env: {
        HOME: '/home/clawd',
        PATH: '/home/clawd/.nvm/versions/node/v22.22.0/bin:/home/clawd/.local/bin:/home/clawd/.npm-global/bin:/usr/local/bin:/usr/bin:/bin',
        CLAWDBOT_GATEWAY_PORT: '18789',
        CLAWDBOT_GATEWAY_TOKEN: '5a5132b80dedcc723bec68c13679992b6eaadc7fa848b7af',
        CLAWDBOT_SERVICE_MARKER: 'clawdbot',
        CLAWDBOT_SERVICE_KIND: 'gateway',
        CLAWDBOT_SERVICE_VERSION: '2026.1.24-3'
      }
    }
  ]
}
