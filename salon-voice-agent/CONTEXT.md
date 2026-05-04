# Salon Voice Agent — Project Context

## What This Is
A real-time AI voice receptionist for Terry's mom's salon. Handles inbound calls via Twilio, converses using xAI Grok Voice (Eve), and books appointments into Google Calendar.

## How It Works (LLM-Powered Booking Extraction)
- **During call**: Eve handles conversation normally. The server collects every transcript turn (Eve + customer) into a `conversationLog` array.
- **After call ends**: Full transcript is sent to `grok-4-1-fast` with a structured extraction prompt.
- **If booking detected**: LLM returns JSON (customerName, service, dateStr, timeStr, phone) → chrono parses dates → GWS creates calendar event → SMS sent to customer + owner.

## Configuration

| File | Path |
|------|------|
| Main server | `/home/clawd/clawd/salon-voice-agent/server.js` |
| Log file | `/tmp/salon-agent.log` |
| Skill (full docs) | `software-development/twilio-xai-voice-agent` |
| Systemd service | `salon-voice-agent.service` |

- Twilio number: `+185****4781`
- GWS user: `jett.theassistant@gmail.com`
- GWS binary: `/home/clawd/.nvm/versions/node/v22.22.0/bin/gws`

## Known Issues
1. ~~Old keyword-based booking detection removed~~ — Replaced with post-call LLM extraction (grok-4-1-fast). Should be near-perfect.
2. **SMS confirmation** — `customerPhone` is captured from the Twilio start event. If missing, owner alert uses "Unknown".

## Systemd Service Management

The salon agent runs as a managed systemd service. This provides auto-restart on crash, clean startup/shutdown, and boot-time launch.

```bash
# Status
systemctl status salon-voice-agent

# Restart (e.g., after code changes)
sudo systemctl restart salon-voice-agent

# Tail logs
tail -f /tmp/salon-agent.log | grep -a -v '^\x00'

# Stop
sudo systemctl stop salon-voice-agent

# Start
sudo systemctl start salon-voice-agent
```

No `pkill` or background `&` needed — systemd handles everything.

## How to Test
1. Service is already running — `systemctl status salon-voice-agent`
2. Start ngrok: `ngrok http 3333`
3. Update Twilio Console webhook URL to `https://<ngrok-id>.ngrok-free.dev/incoming-call`
4. Call `+185****4781`
5. Tail logs: `tail -f /tmp/salon-agent.log | grep -a -v '^\x00'`

## How to Verify Bookings
```bash
/home/clawd/.nvm/versions/node/v22.22.0/bin/gws --user jett.theassistant@gmail.com \
  calendar events list \
  --params '{"timeMin":"2026-05-03T00:00:00Z","timeMax":"2026-05-05T00:00:00Z"}'
```

## Next Improvements (if revisited)
- Wire ngrok auto-update into the server so Twilio webhook stays current
- Add phone number to the transcript extraction for more reliable SMS
- Add a simple dashboard to view call history and bookings
