# Salon Voice Agent — System Context

## Overview
AI voice receptionist powered by Twilio + xAI Grok Voice. Answers incoming calls, takes appointment bookings naturally, and syncs to Google Calendar.

**Phone Number:** +1 (516) 530-8571
**Voice URL:** `https://voice.jettmissioncontrol.com/incoming-call`
**Server Port:** 3333

## Architecture

```
Caller → Twilio (Phone Number)
                ↓ POST /incoming-call (TwiML → WebSocket)
                ↓   Twilio Media Stream (G711 µ-law audio)
          salon-voice-agent (server.js :3333)
                ↓   WebSocket (xAI Realtime API)
          xAI Grok Voice (grok-voice-think-fast-1.0)
                ↑
          Post-call LLM extraction (grok-4-1-fast)
                ↓
          Google Calendar (via GWS CLI)
                ↓
          SMS via Twilio API (to customer + owner)
```

## Key Files

| File | Purpose |
|------|---------|
| `/home/clawd/clawd/salon-voice-agent/server.js` | Main server (842 lines) |
| `/home/clawd/clawd/salon-voice-agent/.env` | Secrets (DO NOT EDIT — see CLAUDE.md rule) |
| `/home/clawd/clawd/salon-voice-agent/start.sh` | systemd startup script |
| `/home/clawd/clawd/salon-voice-agent/stop.sh` | systemd stop script |
| `/tmp/salon-agent.log` | Live call logs (tail -f to monitor) |
| `/etc/systemd/system/salon-voice-agent.service` | systemd unit (system-level, systemctl) |

## Configuration (in server.js)

```
MAX_CONCURRENT_BOOKINGS = 3   // 3 chairs/stylists
STYLISTS = [
  { name: 'Mark',  daysOff: [2] },       // Off Tuesdays
  { name: 'Sofia', daysOff: [1] },       // Off Mondays
  { name: 'Jenna', daysOff: [1, 2] },    // Off Mon-Tues
]
SERVICE_DURATIONS              // Per-service duration in minutes
SALON_NAME / ADDRESS / HOURS  // Salon info (from .env)
SALON_PHONE                    // Display phone number
```

## Services & Prices (Eve's script)

| Service | Price | Duration |
|---------|-------|----------|
| Women's Haircut | $75 | 60 min |
| Men's Haircut | $55 | 45 min |
| Color | $130+ | 120 min |
| Highlights | $160+ | 120 min |
| Blowout | $50 | 45 min |
| Keratin Treatment | $220+ | 90 min |
| Trim | $35 | 30 min |
| Beard Trim | $20 | 15 min |
| Eyebrow Wax | $18 | 15 min |

## Features

| Feature | Status |
|---------|--------|
| Answer calls → Eve (xAI Grok Voice) | ✅ |
| Natural language booking | ✅ |
| Ask for phone number | ✅ |
| Live calendar availability | ✅ |
| Suggest specific open slots | ✅ |
| Multi-chair capacity | ✅ |
| Stylist preference (if requested) | ✅ |
| Google Calendar booking | ✅ |
| SMS confirmation to customer | ✅ (queued, awaiting A2P approval) |
| SMS owner alert | ✅ (queued, awaiting A2P approval) |
| Post-call LLM extraction | ✅ |
| AM/PM time normalization | ✅ |
| Cloudflare tunnel (permanent URL) | ✅ |
| Business hours check (timezone-aware) | ✅ |

## Known Issues
- **SMS delivery:** A2P 10DLC registration pending with Twilio. SMS is queued but won't deliver until approved. Carrier-side delay (1-2 weeks quoted).
- **Stylist calendars:** All appointments go to shared Google Calendar. Per-stylist calendars not yet implemented.

## Testing
```
# Watch live calls
tail -f /tmp/salon-agent.log

# Check server status
sudo systemctl status salon-voice-agent

# Restart server
sudo systemctl restart salon-voice-agent

# Verify webhook
curl -s -o /dev/null -w "%{http_code}" https://voice.jettmissioncontrol.com/incoming-call -X POST -d "From=xxx&To=xxx"
```
