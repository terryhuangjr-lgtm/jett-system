# Salon Voice Agent — Architecture & Context

## Overview
A real-time AI voice receptionist + booking system for any business. Currently deployed for **Salon 516**. Inbound calls via Twilio → Grok Voice (Eve) → Google Calendar booking. Full dashboard on Vercel.

---

## Architecture

### Two Components, One Product

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Tunnel                    │
│         voice.jettmissioncontrol.com                  │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  ┌────────────────┐  │  ┌────────────────────────┐  │
│  │  Voice Agent   │  │  │  React Dashboard       │  │
│  │  (PM2 :3333)   │  │  │  (Vercel)              │  │
│  │                 │  │  │                        │  │
│  │  - Twilio TwiML │  │  │  - Calendar view      │  │
│  │  - Grok Voice   │  │  │  - Live transcription │  │
│  │  - Google API   │  │  │  - Call logs         │  │
│  │  - Supabase     │  │  │  - Settings panel    │  │
│  │  - SMS (Twilio) │  │  │  - Employee mgmt     │  │
│  └────────┬───────┘  │  └────────────────────────┘  │
│           │           │                              │
│           └───────────┤   REST API on :3333          │
│                       │   /api/* endpoints           │
└───────────────────────┴──────────────────────────────┘
```

### Backend (Voice Agent Server)
| Component | Implementation |
|-----------|---------------|
| **Location** | `/home/terry/clawd/salon-voice-agent/server.js` |
| **Runtime** | Node.js v22, PM2 process `salon-voice-agent` |
| **Port** | 3333 |
| **Phone** | Twilio number `+1516***8571` via Cloudflare tunnel to `voice.jettmissioncontrol.com/incoming-call` |
| **AI Voice** | xAI Grok Voice Think Fast 1.0 (`wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0`) |
| **Post-call LLM** | `grok-4-1-fast` via REST API for booking extraction from transcript |
| **Calendar** | Google Calendar API (`google-calendar.js`) — jett.theassistant@gmail.com |
| **DB** | Supabase project `fhmjvnphxsbtwcutqkvq` (call_logs, live_calls, salon_settings, salon_stylists) |
| **SMS** | Twilio API — confirmation to customer, alert to owner |

### Frontend (React Dashboard)
| Component | Implementation |
|-----------|---------------|
| **Location** | `/home/terry/salon-dashboard/` |
| **URL** | `https://salon-dashboard-lac.vercel.app` |
| **Framework** | Vite + React + TypeScript + Tailwind CSS |
| **GitHub** | `github.com/terryhuangjr-lgtm/salon-dashboard.git` |
| **Auth** | PIN login (2024) via Supabase |
| **API source** | Voice agent at `voice.jettmissioncontrol.com` (API prefix configured in env) |

### Infrastructure
| Component | Detail |
|-----------|--------|
| **Machine** | Strix Halo (local), Ubuntu 26.04 |
| **Process mgmt** | PM2 — `pm2 restart salon-voice-agent` |
| **Tunnel** | Cloudflare tunnel (ID: `ccf312e9...`) → port 3333 |
| **Domain** | `voice.jettmissioncontrol.com` → tunnel → :3333 |
| **Google OAuth** | jett.theassistant@gmail.com, token at `~/.hermes/google_token.json` |
| **Stylist colors** | Mark=Lavender(1), Sofia=Blueberry(9), Jenna=Grape(3), Emma=Banana(5) |

---

## Booking Flow

1. Call comes in via Twilio → `/incoming-call` → `<Connect>` stream to Grok Voice
2. Eve (receptionist) handles conversation — asks for name, service, date, time, stylist preference
3. After call ends, full transcript sent to `grok-4-1-fast` for structured booking extraction
4. If booking detected: parse date/time with chrono → check availability via Google Calendar → create event with stylist color → SMS confirmation → SMS alert to owner
5. Call logged to Supabase with transcript, booking data, calendar event ID

## API Endpoints (from backend :3333)
| Endpoint | Purpose |
|----------|---------|
| `POST /incoming-call` | Twilio webhook → returns TwiML |
| `GET /dashboard` | Server-rendered call dashboard HTML |
| `GET /api/call-logs` | Call history from Supabase |
| `GET /api/appointments` | Today's booked appointments |
| `GET /api/settings` | Salon settings JSON |
| `POST /api/settings` | Update salon settings |
| `POST /api/restart` | Restart server (dashboard button) |
| WebSocket `/media-stream` | Grok Voice real-time audio |
| WebSocket `/media-stream-voicemail` | Voicemail after-hours path |
| WebSocket `/live-transcripts` | Live transcription push |

## Services & Prices
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

## Key Files
| File | Purpose |
|------|---------|
| `/home/terry/clawd/salon-voice-agent/server.js` | Main server — Twilio, Grok, calendar, API |
| `/home/terry/clawd/salon-voice-agent/google-calendar.js` | Google Calendar module (direct API, not broken gws npm) |
| `/home/terry/clawd/salon-voice-agent/salon-db.js` | Supabase client for call logs + settings |
| `/home/terry/clawd/salon-voice-agent/live-stream.js` | WebSocket for dashboard live transcription |
| `/home/terry/clawd/salon-voice-agent/dashboard.html` | Simple server-rendered dashboard (for :3333/dashboard) |
| `/home/terry/clawd/salon-voice-agent/supabase-setup.sql` | DB schema for call_logs, live_calls, salon_settings |
| `/home/terry/clawd/salon-voice-agent/.env` | Environment variables (Twilio, Supabase, xAI keys) |
| `/home/terry/salon-dashboard/` | React dashboard source (deployed to Vercel) |
| `/home/terry/.hermes/google_token.json` | Google OAuth for jett.theassistant@gmail.com |

## PM2 Commands
```bash
pm2 status salon-voice-agent      # Check status
pm2 logs salon-voice-agent        # Tail logs
pm2 restart salon-voice-agent     # Restart after code changes
pm2 stop salon-voice-agent        # Stop
pm2 start salon-voice-agent       # Start
```

## Testing
1. Call `+1516***8571` — Eve answers
2. Dashboard: `https://salon-dashboard-lac.vercel.app` (PIN: 2024)
3. Calendar: check jett.theassistant@gmail.com for bookings
