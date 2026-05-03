# Port Map — Source of Truth
## Last updated: 2026-05-03
## ALL agents and coding tools MUST read this before binding to a port or making networking changes.
## Canonical registry: ~/clawd/clawd/context/PORT-REGISTRY.md

| Port | Service | Process | Profile/Owner | Notes |
|------|---------|---------|---------------|-------|
| 3000 | Mission Control Dashboard | node server.js | Jett | systemd: jett-task-manager.service; Cloudflare → jettmissioncontrol.com |
| 3002 | Gemma Assistant | node server.js | Jett | systemd: jett-gemma.service; content transformation |
| 3003 | storeiq-dashboard | Vite dev | Jett | systemd: jett-storeiq.service (disabled — use Vercel) |
| 3333 | Salon Voice Agent | node server.js | Jett | systemd: salon-voice-agent.service (SYSTEM, not user); Twilio + xAI Grok Voice |
| 5000 | Level Up Cards | python3 (Flask) | Jett | systemd: jett-levelup.service |
| 5001 | Podcast Summarizer | python3 (Flask) | Jett | systemd: jett-podcast.service |
| 5002 | Watchlist Dashboard | python3 (Flask) | Jett | systemd: jett-watchlist.service |
| 8000 | API Usage Dashboard | node | Jett | Manual start only: cd ~/jett-system/dashboard && bash start-dashboard.sh |
| 11434 | Ollama | ollama serve | Jett | Local LLM inference — DO NOT KILL |
| 18789 | OpenClaw Gateway | openclaw-gateway | Jett (main) | systemd: openclaw-gateway.service; WS + IPv4 |
| 18791 | OpenClaw Browser Control | openclaw-gateway | Jett (main) | systemd: openclaw-gateway.service; canvas |
| 20241 | Cloudflare Tunnel | cloudflared | Jett | tunnels jettmissioncontrol.com → :3000; DO NOT TOUCH |

## Hermes Gateways (no local ports)
Hermes runs 4 Python gateway processes via Telegram long-polling. They do NOT bind to any local port.
| Service | Profile | Unit | Notes |
|---------|---------|------|-------|
| Hermes Default | Superare/Shopify ops | hermes-gateway.service | deepseek-v4-flash |
| Hermes Personal | Terry's personal assistant | hermes-gateway-personal.service | grok-4-1-fast-reasoning |
| Hermes Coder | Dev tasks | hermes-gateway-coder.service | deepseek-chat |
| Hermes Doctor | System health monitor | hermes-gateway-doctor.service | grok-4-1-fast; @JettHermesDoctorBot |

## Rules
1. No two services may share a port
2. Before binding to any new port, check this map AND ~/clawd/clawd/context/PORT-REGISTRY.md
3. If adding a new service, update both PORT_MAP.md AND PORT-REGISTRY.md FIRST
4. ALL user services use Restart=on-failure or Restart=always in their systemd unit — killing them auto-restarts
5. salon-voice-agent.service is a SYSTEM service (not user) — restart with `sudo systemctl restart salon-voice-agent`
6. To verify any port's owner: `ss -tlnp | grep <PORT>` or `lsof -i :<PORT>`
