#!/usr/bin/bash
cd /home/terry/clawd/salon-voice-agent || exit 1
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1
node server.js >> /tmp/salon-agent.log 2>&1 &
PID=$!
echo $PID > /tmp/salon-agent.pid
sleep 2
if kill -0 $PID 2>/dev/null; then
  exit 0
else
  exit 1
fi
