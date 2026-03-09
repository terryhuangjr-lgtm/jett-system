#!/bin/bash
# Gateway starter script with proper Node version
# Used by crontab @reboot and health checks

source /home/clawd/.nvm/nvm.sh
nvm use 22.22.0

exec nohup clawdbot gateway >> /tmp/gateway.log 2>&1
