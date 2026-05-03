# Salon Voice Agent — Project Context

## What This Is
A real-time AI voice receptionist for Terry's mom's salon. Handles inbound calls via Twilio, converses using xAI Grok Voice (Eve), and books appointments into Google Calendar.

## Current State (May 2, 2026)
- **Core pipeline works**: Twilio → xAI Grok Voice → Google Calendar
- Successfully booked "Bob Franklin - Haircut" on Sunday May 3rd at 4PM → Calendar event created
- Booking detection is ~50% reliable — worked for Bob, failed for Frank
- SMS confirmation is broken (low priority)
- Server runs stable on port 3333

## Key Files
| File | Path |
|------|------|
| Main server | `/home/clawd/clawd/salon-voice-agent/server.js` |
| Log file | `/tmp/salon-agent.log` |
| Skill (full docs) | `software-development/twilio-xai-voice-agent` |

## Configuration
- Twilio number: `+18555004781`
- GWS user: `jett.theassistant@gmail.com`
- GWS binary: `/home/clawd/.nvm/versions/node/v22.22.0/bin/gws`
- ngrok URL (previously): `https://saussuritic-cecila-nonformatively.ngrok-free.dev`

## Known Issues
1. **Unreliable booking detection** — The `response.output_audio_transcript.done` event + keyword parsing doesn't always trigger.
2. **SMS silent fail** — `customerPhone` variable not reliably populated before SMS send.
3. **chrono + "tomorrow May 3rd"** — Produces wrong timestamps when relative + absolute dates are both present.
4. ~~Supabase logging removed — was polluting Superare StoreIQ activity log. Salon is a separate business, not a StoreIQ client.~~

## How to Restart
```bash
cd ~/clawd/salon-voice-agent
pkill -f "node server.js"
node server.js > /tmp/salon-agent.log 2>&1 &
```

## How to Test
1. Start the server (above)
2. Start ngrok: `ngrok http 3333`
3. Update Twilio Console webhook URL to `https://<ngrok-id>.ngrok-free.dev/incoming-call`
4. Call `+18555004781`
5. Tail logs: `tail -f /tmp/salon-agent.log | grep -a -v '^\x00'`

## How to Verify Bookings
```bash
/home/clawd/.nvm/versions/node/v22.22.0/bin/gws --user jett.theassistant@gmail.com calendar events list --params '{"timeMin":"2026-05-03T00:00:00Z","timeMax":"2026-05-05T00:00:00Z"}'
```

## Next Improvements (if revisited)
- Make booking detection event-driven instead of keyword-parsed
- Properly wire customerPhone from Twilio start event before booking logic runs
- Add real-time log monitoring during test calls
