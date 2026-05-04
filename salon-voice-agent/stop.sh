#!/usr/bin/bash
kill $(cat /tmp/salon-agent.pid 2>/dev/null) 2>/dev/null
pkill -f "salon-voice-agent.*node server.js" 2>/dev/null || true
pkill -f "node.*salon-voice-agent.*server.js" 2>/dev/null || true
exit 0
