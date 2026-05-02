# Jett System Port Registry
# Last updated: 2026-05-02
# 
# RESERVED PORTS — Do NOT start any service on these ports.
# All ports below are managed by systemd and auto-start on boot.
# If you need a new port, pick one NOT in this list.

| Port | Service | Unit | Status |
|------|---------|------|--------|
| 3000 | Mission Control Dashboard | jett-task-manager.service | ✅ Active |
| 3002 | Gemma Assistant (content transform) | jett-gemma.service | ✅ Active |
| 3003 | storeiq-dashboard (Vite dev) | jett-storeiq.service | ⚠️ Disabled (use Vercel) |
| 5000 | Level Up Cards (Flask) | jett-levelup.service | ✅ Active |
| 5001 | Podcast Summarizer (Flask) | jett-podcast.service | ✅ Active |
| 5002 | Watchlist Dashboard (Flask) | jett-watchlist.service | ✅ Active |
| 11434 | Ollama (local LLM) | side process | ⚠️ Do not touch |
| 18789 | OpenClaw Gateway | openclaw-gateway.service | ✅ Active |
| 18791 | OpenClaw Browser Control | openclaw-gateway.service | ✅ Active |
| 20241 | Cloudflare Tunnel (jettmissioncontrol.com) | cloudflared | ⚠️ Do not touch |
| 8000 | API Usage Dashboard | manual start | 🔸 Use start-dashboard.sh |

## Rules

1. **NEVER** start anything on these ports without updating this file FIRST
2. **NEVER** kill a process on these ports without checking what it is
3. **ALL services** use `Restart=always` in their systemd unit — killing them will auto-restart
4. If a port is in use by something unexpected, check systemd: `systemctl --user list-units --type=service --state=running`
5. To verify a port's owner: `ss -tlnp | grep <PORT>`

## To add a new service

```bash
# 1. Pick an unused port
# 2. Create systemd unit
sudo tee /home/clawd/.config/systemd/user/jett-<name>.service << 'EOF'
[Unit]
Description=<Description>
After=network.target

[Service]
Type=simple
WorkingDirectory=<path>
ExecStart=<command>
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

# 3. Enable and start
systemctl --user daemon-reload
systemctl --user enable jett-<name>.service
systemctl --user start jett-<name>.service

# 4. Update this file
# 5. Update keepalive: add check_service to /home/clawd/scripts/jett-keepalive.sh
```
