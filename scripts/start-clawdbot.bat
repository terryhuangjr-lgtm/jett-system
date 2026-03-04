@echo off
wsl -e bash -c "cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot gateway --force >> /tmp/gateway.log 2>&1 &"
