require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const WebSocket = require('ws');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const chrono = require('chrono-node');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const VoiceResponse = twilio.twiml.VoiceResponse;

// Convert G711 mulaw to PCM16 and upsample 8kHz to 24kHz for xAI
function mulawToPcm16(mulawBuffer) {
  // Mulaw to linear PCM16
  const MULAW_BIAS = 33;
  const pcm8k = Buffer.alloc(mulawBuffer.length * 2);
  
  for (let i = 0; i < mulawBuffer.length; i++) {
    let mulaw = ~mulawBuffer[i] & 0xff;
    const sign = mulaw & 0x80;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0f;
    let sample = ((mantissa << 1) + 33) << (exponent + 2);
    sample -= MULAW_BIAS;
    if (sign) sample = -sample;
    pcm8k.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }
  
  // Upsample 8kHz to 24kHz (3:1) by repeating each sample 3 times
  const pcm24k = Buffer.alloc(pcm8k.length * 3);
  for (let i = 0; i < pcm8k.length / 2; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    pcm24k.writeInt16LE(sample, i * 6);
    pcm24k.writeInt16LE(sample, i * 6 + 2);
    pcm24k.writeInt16LE(sample, i * 6 + 4);
  }
  return pcm24k;
}

// Downsample from 24kHz to 8kHz (3:1) then convert to G711 mulaw
function pcm16ToMulaw(pcmBuffer) {
  // xAI sends 24kHz PCM16, Twilio needs 8kHz mulaw
  // Downsample 3:1
  const sourceSamples = pcmBuffer.length / 2;
  const targetSamples = Math.floor(sourceSamples / 3);
  const mulaw = Buffer.alloc(targetSamples);
  
  for (let i = 0; i < targetSamples; i++) {
    // Simple decimation - take every 3rd sample
    let sample = pcmBuffer.readInt16LE(i * 6);
    
    // PCM16 to mulaw conversion
    const MULAW_BIAS = 33;
    const sign = sample < 0 ? 0x80 : 0;
    if (sign) sample = -sample;
    if (sample > 32767) sample = 32767;
    sample += MULAW_BIAS;
    let exponent = 7;
    let expMask;
    for (expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    mulaw[i] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
  return mulaw;
}

// ──────────────────────────────────────────
// Google Calendar — Book Appointments
// ──────────────────────────────────────────

const GWS_BIN = '/home/clawd/.nvm/versions/node/v22.22.0/bin/gws';
const CALENDAR_TIMEZONE = 'America/New_York';
const DEFAULT_SERVICE_DURATION = 60; // minutes

const BUSINESS_HOURS = {
  // day of week: { open: hour (24h), close: hour (24h) }
  0: { open: 10, close: 17 }, // Sunday
  1: { open: 9, close: 19 },  // Monday
  2: { open: 9, close: 19 },  // Tuesday
  3: { open: 9, close: 19 },  // Wednesday
  4: { open: 9, close: 19 },  // Thursday
  5: { open: 9, close: 19 },  // Friday
  6: { open: 9, close: 18 },  // Saturday
};

const SERVICE_DURATIONS = {
  'haircut': 60,
  'color': 120,
  'highlights': 120,
  'blowout': 45,
  'keratin treatment': 90,
  'trim': 30,
  'beard trim': 15,
  'eyebrow': 15,
};

/**
 * Send SMS via Twilio
 */
function sendSms(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: message,
  });

  return new Promise((resolve) => {
    const req = require('https').request(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.sid) console.log(`📱 SMS sent to ${to}: ${result.sid}`);
            else console.log(`⚠️ SMS failed: ${result.message}`);
          } catch { /* ignore */ }
          resolve();
        });
      }
    );
    req.on('error', () => resolve());
    req.write(body.toString());
    req.end();
  });
}

// NOTE: Supabase activity logging was for StoreIQ, which is the Superare Shopify dashboard.
// The salon is a separate business — not a StoreIQ client. Removed to avoid polluting
// the Superare activity log with salon call data.

/**
 * Check calendar for existing events on a given date/time — returns available slots
 */
function getAvailableSlots(dateStr) {
  return new Promise((resolve, reject) => {
    const date = new Date(dateStr);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const args = [
      'calendar', 'events', 'list',
      '--params', JSON.stringify({
        calendarId: 'primary',
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      }),
      '--format', 'json',
    ];

    execFile(GWS_BIN, args, { timeout: 10000 }, (err, stdout) => {
      if (err) return resolve([]); // Fail open — return all slots
      try {
        const data = JSON.parse(stdout);
        const events = data.items || [];
        const busySlots = events.map(e => ({
          start: new Date(e.start?.dateTime || e.start?.date),
          end: new Date(e.end?.dateTime || e.end?.date),
        }));
        resolve(busySlots);
      } catch {
        resolve([]);
      }
    });
  });
}

/**
 * Check if a proposed time slot is available (not overlapping existing events)
 */
async function isSlotAvailable(startISO, endISO) {
  const start = new Date(startISO);
  const busy = await getAvailableSlots(start.toISOString());
  const proposedStart = start.getTime();
  const proposedEnd = new Date(endISO).getTime();
  for (const slot of busy) {
    const busyStart = slot.start.getTime();
    const busyEnd = slot.end.getTime();
    if (proposedStart < busyEnd && proposedEnd > busyStart) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a time falls within business hours
 */
function isWithinBusinessHours(startISO, endISO) {
  const estOffset = -4 * 60;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const localStart = new Date(start.getTime() + estOffset * 60000);
  const localEnd = new Date(end.getTime() + estOffset * 60000);
  const dayOfWeek = localStart.getDay();
  const hours = BUSINESS_HOURS[dayOfWeek];
  if (!hours) return false;
  const startHour = localStart.getHours() + localStart.getMinutes() / 60;
  const endHour = localEnd.getHours() + localEnd.getMinutes() / 60;
  return startHour >= hours.open && endHour <= hours.close;
}

/**
 * Send SMS to owner about new booking
 */
function sendOwnerAlert(customerName, service, dateStr, timeStr, phone) {
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone || ownerPhone === 'your_real_cell_here') return;
  const msg = `📅 New Booking!\n${customerName} - ${service}\n${dateStr} at ${timeStr}\nPhone: ${phone}`;
  sendSms(ownerPhone, msg);
}

/**
 * Parse a time string like "3pm", "3:00 PM", "15:00", "10am" to (hours, minutes)
 */
function parseTimeString(str) {
  if (!str) return null;
  str = str.trim().toLowerCase();
  const match12 = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2] || '0');
    const meridiem = match12[3];
    if (meridiem === 'pm' && h !== 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return { hours: h, minutes: m };
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { hours: parseInt(match24[1]), minutes: parseInt(match24[2]) };
  }
  return null;
}

/**
 * Parse a natural language date/time from a transcript into ISO datetime + duration
 * Uses chrono-node (NLP date parser) to handle real-world expressions:
 *   "tomorrow at 3pm", "next Tuesday at 2:30", "May 10th at 11am",
 *   "this Friday at noon", "the 15th at 4pm", "Saturday morning"
 * Returns { service, startISO, endISO, duration } or null
 */
function parseBookingTranscript(transcript) {
  // Detect service
  let service = null;
  for (const s of Object.keys(SERVICE_DURATIONS)) {
    if (transcript.toLowerCase().includes(s)) {
      service = s;
      break;
    }
  }

  // Use chrono to parse date/time from the transcript
  // Strip "tomorrow" if there's also an explicit date (e.g., "May 3rd") to avoid confusion
  // chrono handles: "next Monday", "May 10", "Friday", "this Friday", "the 15th"
  let cleanTranscript = transcript;
  if (/\btomorrow\b/i.test(transcript) && /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(transcript)) {
    cleanTranscript = transcript.replace(/\btomorrow\b/gi, '').trim();
    // Collapse multiple spaces
    cleanTranscript = cleanTranscript.replace(/\s+/g, ' ');
  }
  const parsed = chrono.parse(cleanTranscript, new Date(), { forwardDate: true });
  if (parsed.length === 0) return null;

  const ref = parsed[0];
  if (!ref.start) return null;

  const startDate = ref.start.date();

  // Extract time from the parsed result manually via regex if chrono didn't get time right
  // chrono is good at dates but can miss time references that are in a different clause
  const timeMatch = transcript.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)|(\d{1,2}):(\d{2})(?:\s*am|\s*pm)?|(\d{1,2})\s*(?:am|pm)|(?:\bat\b\s*)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    const parsedTime = parseTimeString(timeMatch[0]);
    if (parsedTime) {
      startDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    }
  }

  // Duration
  const duration = service ? (SERVICE_DURATIONS[service] || DEFAULT_SERVICE_DURATION) : DEFAULT_SERVICE_DURATION;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  return {
    service,
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
    duration,
  };
}

/**
 * Create a calendar event via GWS CLI
 */
function createBookingEvent(customerName, customerPhone, service, startISO, endISO) {
  return new Promise((resolve, reject) => {
    if (!service) service = 'Appointment';
    const summary = `${customerName} - ${service.charAt(0).toUpperCase() + service.slice(1)}`;
    const description = `Booked via Salon Voice Agent\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${service}`;

    const args = [
      'calendar', '+insert',
      '--summary', summary,
      '--start', startISO,
      '--end', endISO,
      '--description', description,
      '--format', 'json',
    ];

    execFile(GWS_BIN, args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Calendar insert failed:', err.message);
        return resolve(null);
      }
      try {
        const event = JSON.parse(stdout);
        console.log(`✅ Booked: ${summary} at ${startISO}`);
        resolve(event);
      } catch {
        resolve(null);
      }
    });
  });
}

// Salon context — this gets fed to the AI
const SALON_CONTEXT = `
You are a friendly receptionist for ${process.env.SALON_NAME}.
Your job is to answer calls, book appointments, and answer questions.

SALON INFO:
- Name: ${process.env.SALON_NAME}
- Address: ${process.env.SALON_ADDRESS}
- Hours: ${process.env.SALON_HOURS}
- Phone: ${process.env.SALON_PHONE}

SERVICES & PRICES:
- Haircut: $65
- Color: $120+
- Highlights: $150+
- Blowout: $45
- Keratin Treatment: $200+
- Trim: $30
- Beard Trim: $15
- Eyebrow Wax: $15

BEGINNING THE CALL:
- The customer just called your business
- Greet them warmly and ask how you can help
- DO NOT introduce yourself by name — just say "Hi, thanks for calling [Salon Name], how can I help you?"

BOOKING:
- Ask for: their name, what service they want, preferred date and time
- Say the customer's FULL NAME out loud at least once during the conversation — I need to hear it clearly
- Available times: any slot during business hours
- When you confirm the booking, say it clearly like: "Great, I have you booked for a [service] on [day] at [time]"
- Confirm the booking clearly before ending the call

RULES:
- Be warm, friendly, and professional
- Keep responses concise — this is a phone call
- If you cannot help, offer to take a message for the owner
- Never make up information not provided above
- Always confirm booking details before ending call
`;

// Step 1 — Twilio calls this when someone calls our number
app.post('/incoming-call', (req, res) => {
  console.log(`📞 Incoming call from: ${req.body.From}`);
  
  const twiml = new VoiceResponse();
  
  // Connect to our WebSocket media stream
  const connect = twiml.connect();
  const stream = connect.stream({
    url: `wss://${req.headers.host}/media-stream`
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Voicemail fallback
app.post('/voicemail', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say({
    voice: 'alice',
  }, 'Thanks for calling. We\'re currently assisting another customer. Please leave your name and number and we\'ll call you back as soon as possible.');
  twiml.record({
    action: '/voicemail-callback',
    maxLength: 30,
    playBeep: true,
  });
  twiml.say('Goodbye.');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/voicemail-callback', (req, res) => {
  console.log(`📝 Voicemail from ${req.body.From}: ${req.body.RecordingUrl}`);
  const twiml = new VoiceResponse();
  twiml.hangup();
  res.type('text/xml');
  res.send(twiml.toString());
});

// Step 2 — WebSocket handler for real-time audio
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (twilioWs) => {
  console.log('🔊 Twilio media stream connected');
  
  let xaiWs = null;
  let streamSid = null;
  let customerName = '';
  let customerPhone = '';
  
  // Connect to xAI Voice Agent
  xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    }
  });
  
  let sessionReady = false;
  let audioBuffer = [];

  xaiWs.on('open', () => {
    console.log('🤖 Connected to xAI Voice Agent');
    
    // Configure the voice agent
    xaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        voice: 'eve',
        instructions: SALON_CONTEXT,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        },
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: {
          model: 'grok-2-transcribe'
        }
      }
    }));
  });
  
  // Forward xAI audio back to Twilio
  xaiWs.on('message', (data) => {
    const event = JSON.parse(data);

    // Wait for session ready before sending greeting
    if (event.type === 'session.updated' && !sessionReady) {
      sessionReady = true;
      console.log('✅ Session ready — sending greeting');
      
      // Send any buffered audio first
      for (const audio of audioBuffer) {
        xaiWs.send(audio);
      }
      audioBuffer = [];

      // Now send greeting
      xaiWs.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: 'A customer just called. Greet them warmly and ask how you can help.'
          }]
        }
      }));
      xaiWs.send(JSON.stringify({ type: 'response.create' }));
    }
    
    if (event.type === 'response.output_audio.delta' && streamSid) {
      if (twilioWs.readyState === WebSocket.OPEN) {
        try {
          // xAI sends PCM16 — convert to G711 mulaw for Twilio
          const pcmBuffer = Buffer.from(event.delta, 'base64');
          const mulawBuffer = pcm16ToMulaw(pcmBuffer);
          const mulawPayload = mulawBuffer.toString('base64');
          // conversion silent
          twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: { payload: mulawPayload }
          }));
        } catch(e) {
          console.log(`❌ Audio conversion error: ${e.message}`);
        }
      } else {
        console.log(`⚠️ Twilio WS not open: ${twilioWs.readyState}`);
      }
    }
    
    // Only log errors
    if (event.error) console.log(`❌ xAI Error:`, JSON.stringify(event.error));
    
    if (event.type === 'response.output_audio_transcript.done') {
      console.log(`\n🤖 Eve: ${event.transcript}\n`);
    }
    
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      console.log(`👤 Customer: ${event.transcript}`);
      // Capture name from customer: "my name is X Y", "I'm X", etc.
      const txt = event.transcript || '';
      // Try full name first: "my name is Frank Sullivan"
      let m = txt.match(/(?:my name is)\s+(\w+)\s+(\w+)/i);
      if (m && m[1] && m[2]) {
        customerName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ' ' +
                       m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
        console.log(`📝 Captured name: ${customerName}`);
      } else {
        // Single name: "my name is Frank", "I'm Frank"
        m = txt.match(/(?:my name is|name's|i'm|it's|this is)\s+(\w+)/i);
        if (m && m[1] && m[1].length > 1) {
          customerName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
          console.log(`📝 Captured name: ${customerName}`);
        }
      }
    }
    
    // Handle booking confirmation — xAI may send EITHER event type depending on model version
    if (event.type === 'response.output_audio_transcript.done' || event.type === 'response.audio_transcript.done') {
      if (event.type === 'response.audio_transcript.done') {
        console.log(`🤖 Eve: ${event.transcript}`);
      }

      const transcript = event.transcript || '';
      const isBookingConfirm = /booked|scheduled|confirmed|reserved|appointment for/i.test(transcript);

      if (isBookingConfirm) {
        // Extract name from Eve's confirmation — she always says "First Last, I have you booked"
        // or "First Last. I've reserved..." / "Thank you First Last."
        const nameFromEve = transcript.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)[,.]/);
        if (nameFromEve) {
          customerName = nameFromEve[1];
          console.log(`📝 Name from Eve: ${customerName}`);
        }
        // If no full name, try single capitalized word + comma
        if (!customerName) {
          const nameWord = transcript.match(/\b([A-Z][a-z]{2,}),/);
          if (nameWord) {
            customerName = nameWord[1];
            console.log(`📝 Name (single) from Eve: ${customerName}`);
          }
        }

        if (customerName) {
          const booking = parseBookingTranscript(transcript);
          if (booking && booking.startISO) {
            // Check business hours
            if (!isWithinBusinessHours(booking.startISO, booking.endISO)) {
              console.log(`⛔ Outside business hours: ${booking.startISO}`);
              return;
            }

            // Check availability
            isSlotAvailable(booking.startISO, booking.endISO).then(available => {
              if (!available) {
                console.log(`⛔ Slot unavailable (double-booking): ${booking.startISO}`);
                return;
              }

              createBookingEvent(customerName, customerPhone || 'Unknown', booking.service || 'Appointment', booking.startISO, booking.endISO)
                .then(event => {
                  if (event) {
                    console.log(`✅ BOOKED: ${customerName} - ${booking.service} at ${booking.startISO}`);
                    const salon = process.env.SALON_NAME || 'Salon';
                    const svc = booking.service ? booking.service.charAt(0).toUpperCase() + booking.service.slice(1) : 'Appointment';
                    const d = new Date(booking.startISO);
                    const ds = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    const ts = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    sendSms(customerPhone, `✅ Confirmed! Your ${svc} at ${salon} is booked for ${ds} at ${ts}. See you then!`);
                    sendOwnerAlert(customerName, svc, ds, ts, customerPhone || 'Unknown');
                  }
                });
            });
          }
        }
      }
    }
  });
  
  // Forward Twilio audio to xAI
  twilioWs.on('message', (data) => {
    const event = JSON.parse(data);
    
    if (event.event === 'start') {
      streamSid = event.start.streamSid;
      // Twilio start event: caller number is in event.from (root level), NOT event.start
      customerPhone = event.from || event.start?.callerNumber || event.start?.from || '';
      console.log(`📱 Call from: ${customerPhone} | Stream: ${streamSid}`);
    }
    
    if (event.event === 'media' && xaiWs?.readyState === WebSocket.OPEN) {
      if (sessionReady) {
        // Twilio sends mulaw 8kHz — need to upsample to PCM16 24kHz for xAI
        try {
          const mulawBuffer = Buffer.from(event.media.payload, 'base64');
          const pcmBuffer = mulawToPcm16(mulawBuffer);
          const pcmPayload = pcmBuffer.toString('base64');
          xaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: pcmPayload
          }));
        } catch(e) {
          // Fallback to raw
          xaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: event.media.payload
          }));
        }
      } else {
        audioBuffer.push(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: event.media.payload
        }));
      }
    }
    
    if (event.event === 'stop') {
      console.log('📵 Call ended');
      xaiWs?.close();
    }
  });
  
  twilioWs.on('close', () => {
    console.log('📵 Twilio disconnected');
    xaiWs?.close();
  });
  
  xaiWs.on('error', (err) => {
    console.error('xAI error:', err.message);
  });
});

// Start server
const server = app.listen(3333, () => {
  console.log('🚀 Salon Voice Agent running on port 3333');
  console.log(`📞 Twilio number: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`🏪 Salon: ${process.env.SALON_NAME}`);
});

// Attach WebSocket to HTTP server
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/media-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});
