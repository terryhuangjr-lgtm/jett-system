require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const WebSocket = require('ws');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const chrono = require('chrono-node');
const salonDb = require('./salon-db');
const liveStream = require('./live-stream');
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
const SALON_HOURS = 'Monday-Saturday 9am-7pm, Sunday 10am-5pm';
const GWS_BIN = '/home/clawd/.nvm/versions/node/v22.22.0/bin/gws';
const CALENDAR_TIMEZONE = 'America/New_York';

// ──────────────────────────────────────────
// SALON CONFIGURATION
// ──────────────────────────────────────────

// Number of simultaneous bookings allowed (stylists/chairs available)
const MAX_CONCURRENT_BOOKINGS = 3;

// Staff — Eve can ask who the customer prefers
const STYLISTS = [
  { name: 'Mark',      daysOff: [2] },                // Off Tuesdays
  { name: 'Sofia',     daysOff: [1] },                // Off Mondays
  { name: 'Jenna',     daysOff: [1, 2] },             // Off Mon-Tues
];

// Duration per service (minutes)
const SERVICE_DURATIONS = {
  "women's haircut":  60,
  "men's haircut":    45,
  'color':           120,
  'highlights':      120,
  'blowout':          45,
  'keratin treatment': 90,
  'trim':             30,
  'beard trim':       15,
  'eyebrow wax':      15,
};

const DEFAULT_SERVICE_DURATION = 60;

const COVERAGE_GAP_MINUTES = 30;

// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// Post-Call LLM Booking Extraction
// Instead of fragile keyword parsing during the call, we collect the full
// conversation transcript and feed it to an LLM after the call ends.
// The LLM extracts structured booking data from natural conversation reliably.
// ──────────────────────────────────────────

const XAI_API_KEY = process.env.XAI_API_KEY;

/**
 * Send the full call transcript to xAI/Grok and ask it to extract booking details.
 * Returns { hasBooking, customerName, service, dateStr, timeStr, phone } or null.
 */
async function extractBookingFromTranscript(transcript) {
  if (!transcript || transcript.trim().length < 20) return null;
  if (!XAI_API_KEY) {
    console.log('⚠️ No XAI_API_KEY for post-call extraction');
    return null;
  }

  const prompt = `You are a salon booking extraction system. Given a conversation transcript between a salon receptionist and a customer, determine if a booking was made.

If a booking was made, extract EXACTLY these fields as JSON:
{
  "hasBooking": true,
  "customerName": "First Last",
  "service": "haircut or color or highlights or blowout or keratin treatment or trim or beard trim or eyebrow",
  "dateStr": "May 3rd",
  "timeStr": "3pm",
  "phone": "+15551234567"
}

If no booking was made (e.g., just an inquiry, wrong number, hang up, information request), respond with:
{"hasBooking": false}

Rules:
- customerName: Capture the customer's full name as stated. If only first name, use that alone.
- service: Use the exact service name from the list above. If unclear, use "appointment".
- dateStr: The natural language date the customer agreed to.
- timeStr: The natural language time the customer agreed to. Include am/pm.
- phone: The phone number the customer provided during the call if asked. Format as +1XXXXXXXXXX. Can be null.
- Only extract if the receptionist CONFIRMED the booking aloud. If it sounds tentative or the customer said "let me think about it", do NOT extract.

Conversation transcript:
${transcript}`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.log(`⚠️ LLM extraction failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`🤖 LLM extraction result: ${content}`);

    // Parse JSON from the response — handle markdown-wrapped JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️ No JSON in LLM response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    if (result.hasBooking) {
      // Normalize time: if no "am" or "pm" in timeStr, assume PM for reasonable hours
      if (result.timeStr && !/am|pm/i.test(result.timeStr)) {
        const num = parseInt(result.timeStr);
        if (!isNaN(num) && num >= 1 && num <= 11) {
          result.timeStr = num + 'pm';
          console.log(`⏰ Normalized time to: ${result.timeStr}`);
        }
      }
      console.log(`✅ LLM extracted: ${result.customerName} - ${result.service} on ${result.dateStr} at ${result.timeStr}`);
      return result;
    }
    console.log('ℹ️ LLM determined no booking was made');
    return null;
  } catch (err) {
    console.log(`⚠️ LLM extraction error: ${err.message}`);
    return null;
  }
}

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
 * Check if a proposed time slot is available (not exceeding concurrent booking capacity)
 * Uses MAX_CONCURRENT_BOOKINGS to allow multiple overlapping appointments (e.g., 3 chairs).
 */
async function isSlotAvailable(startDate, endDate) {
  const busy = await getAvailableSlots(startDate.toISOString());
  const proposedStart = startDate.getTime();
  const proposedEnd = endDate.getTime();
  let overlapCount = 0;
  for (const slot of busy) {
    const busyStart = slot.start.getTime();
    const busyEnd = slot.end.getTime();
    if (proposedStart < busyEnd && proposedEnd > busyStart) {
      overlapCount++;
      if (overlapCount >= MAX_CONCURRENT_BOOKINGS) return false;
    }
  }
  return true;
}

/**
 * Fetch available time slots for the next 7 days (starting tomorrow).
 * Returns a human-readable string like "Friday May 8th: 9am, 10am, 11am, 2pm, 3pm"
 * Used to inject live calendar availability into Eve's system prompt.
 */
async function fetchAvailableSlotsWindow() {
  const BUSINESS_HOURS_MAP = {0:10,1:9,2:9,3:9,4:9,5:9,6:9};
  const BUSINESS_HOURS_CLOSE = {0:17,1:19,2:19,3:19,4:19,5:19,6:18};
  const SERVICE_GAP = 60; // minutes between slots

  const today = new Date();
  const results = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dayOfWeek = date.getDay();
    const open = BUSINESS_HOURS_MAP[dayOfWeek];
    const close = BUSINESS_HOURS_CLOSE[dayOfWeek];
    if (!open) continue; // closed

    // Fetch existing events for this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    let busySlots = [];
    try {
      busySlots = await new Promise((resolve, reject) => {
        execFile(GWS_BIN, [
          'calendar', 'events', 'list',
          '--params', JSON.stringify({
            calendarId: 'primary',
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          }),
          '--format', 'json',
        ], { timeout: 10000 }, (err, stdout) => {
          if (err) return resolve([]);
          try {
            const data = JSON.parse(stdout);
            resolve((data.items || []).map(e => ({
              start: new Date(e.start?.dateTime || e.start?.date).getTime(),
              end: new Date(e.end?.dateTime || e.end?.date).getTime(),
            })));
          } catch { resolve([]); }
        });
      });
    } catch { busySlots = []; }

    // Compute free hour slots
    const availableHours = [];
    for (let h = open; h < close; h++) {
      const slotStart = new Date(date);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + SERVICE_GAP * 60000);
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotEnd.getTime();

      // Count overlapping events — slot is free if under MAX_CONCURRENT_BOOKINGS
      let overlapCount = 0;
      for (const b of busySlots) {
        if (slotStartMs < b.end && slotEndMs > b.start) {
          overlapCount++;
          if (overlapCount >= MAX_CONCURRENT_BOOKINGS) break;
        }
      }
      if (overlapCount < MAX_CONCURRENT_BOOKINGS) {
        const hourStr = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
        availableHours.push(hourStr);
      }
    }

    if (availableHours.length > 0) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      results.push(`${dayName}: ${availableHours.join(', ')}`);
    }
  }

  return results.length > 0
    ? results.join('\n')
    : '';
}

/**
 * Check if a time falls within business hours
 */
function isWithinBusinessHours(startDate, endDate) {
  const dayOfWeek = startDate.getDay();
  const hours = BUSINESS_HOURS[dayOfWeek];
  if (!hours) return false;
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  return startHour >= hours.open && endHour <= hours.close;
}

/**
 * Send SMS to owner about new booking
 */
function sendOwnerAlert(customerName, service, dateStr, timeStr, phone) {
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone || ownerPhone === 'your_real_cell_here') return Promise.resolve();
  const msg = `📅 New Booking!\n${customerName} - ${service}\n${dateStr} at ${timeStr}\nPhone: ${phone}`;
  return sendSms(ownerPhone, msg);
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
function createBookingEvent(customerName, customerPhone, service, startDate, endDate) {
  return new Promise((resolve, reject) => {
    if (!service) service = 'Appointment';
    const summary = `${customerName} - ${service.charAt(0).toUpperCase() + service.slice(1)}`;
    const description = `Booked via Salon Voice Agent\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${service}`;
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

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

// Salon context builder — generates dynamic instructions per call with live availability
function buildSalonContext(availableSlotsStr) {
  // Staff info — show stylists with their schedules
  let staffInfo = '';
  if (STYLISTS.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const stylistLines = STYLISTS.map(s => {
      const daysOff = s.daysOff.map(d => dayNames[d]).join(', ');
      return `- ${s.name} (off ${daysOff})`;
    });
    staffInfo = `\nSTYLISTS:\n${stylistLines.join('\n')}\n- Ask who they prefer. If they don't care, book with whoever's working.\n- If a stylist is off that day, tell the customer and suggest another stylist or day.`;
  }
  if (MAX_CONCURRENT_BOOKINGS > 1) {
    staffInfo += `\n- Our salon has ${MAX_CONCURRENT_BOOKINGS} stylists working at once, so multiple appointments can run at the same time.`;
  }

  let bookingSection = `BOOKING:
- Ask for: their name, what service they want, preferred date and time
- Say the customer's FULL NAME out loud at least once during the conversation — I need to hear it clearly
- Ask for their phone number to send a confirmation SMS before finalizing`;

  if (availableSlotsStr) {
    bookingSection += `
- Suggest specific available times from the list below. For example: "We have 10am, 2pm, or 4pm available on Friday."
- Do NOT suggest times that are not listed below

AVAILABLE SLOTS (pre-computed from calendar):
${availableSlotsStr}`;
  } else {
    bookingSection += `
- Available times: any slot during business hours`;
  }

  return `
You are a friendly receptionist for ${process.env.SALON_NAME}.
Your job is to answer calls, book appointments, and answer questions.

SALON INFO:
- Name: ${process.env.SALON_NAME}
- Address: ${process.env.SALON_ADDRESS}
- Hours: ${process.env.SALON_HOURS}
- Phone: ${process.env.SALON_PHONE}

SERVICES & PRICES:
- Women's Haircut: $75
- Men's Haircut: $55
- Color: $130+
- Highlights: $160+
- Blowout: $50
- Keratin Treatment: $220+
- Trim: $35
- Beard Trim: $20
- Eyebrow Wax: $18

BEGINNING THE CALL:
- The customer just called your business
- Greet them ONCE warmly
- If the customer says "Hi" back, continue the conversation naturally — do NOT re-greet them
- DO NOT introduce yourself by name — just say "Hi, thanks for calling [Salon Name], how can I help you?"

RULES:
- If the customer simply replies with "Hi" or "Hello", continue naturally with "What can I help you with?" — do NOT repeat the greeting

${bookingSection}

${staffInfo}

- When you confirm the booking, say it clearly like: "Great, I have you booked for a [service] on [day] at [time]"
- Confirm the booking clearly before ending the call

RULES:
- Be warm, friendly, and professional
- Keep responses concise — this is a phone call
- Speak at a brisk pace — shorter sentences, less wordy
- If the customer speaks while you're talking, stop immediately and listen. Do NOT finish your sentence — the customer comes first.
- If you cannot help, offer to take a message for the owner
- Never make up information not provided above
- Always confirm booking details before ending call
`;}

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
  let callSid = null;
  let customerName = '';
  let customerPhone = '';
  let callLogId = null; // Supabase call_logs ID
  let bookingResult = null; // Store booking result for final update
  let smsResults = { customer: false, owner: false };
  const conversationLog = []; // Collects { speaker, text } turns during the call
  
  // Connect to xAI Voice Agent
  xaiWs = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0', {
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    }
  });
  
  let sessionReady = false;
  let audioBuffer = [];

  xaiWs.on('open', () => {
    console.log('🤖 Connected to xAI Voice Agent');
    
  fetchAvailableSlotsWindow().then(slotsStr => {
    const instructions = buildSalonContext(slotsStr);
    console.log(`📋 Injected available slots into system prompt`);
    
    xaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        voice: 'eve',
        instructions: instructions,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.8,
          prefix_padding_ms: 200,
          silence_duration_ms: 450
        },
        audio: {
          input: { format: { type: 'audio/pcmu' } },
          output: { format: { type: 'audio/pcmu' } }
        }
      }
    }));
  });
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

      // Trigger the first greeting based on system instructions
      xaiWs.send(JSON.stringify({ type: 'response.create' }));
    }
    
    if (event.type === 'response.output_audio.delta' && streamSid) {
      if (twilioWs.readyState === WebSocket.OPEN) {
        // xAI sends raw µ-law (audio/pcmu) — pass straight to Twilio
        twilioWs.send(JSON.stringify({
          event: 'media',
          streamSid: streamSid,
          media: { payload: event.delta }
        }));
      } else {
        console.log(`⚠️ Twilio WS not open: ${twilioWs.readyState}`);
      }
    }
    
    if (event.type === 'response.output_audio_transcript.done') {
      console.log(`\n🤖 Eve: ${event.transcript}\n`);
      conversationLog.push({ speaker: 'receptionist', text: event.transcript });
      // Live broadcast to dashboard + Supabase
      liveStream.transcriptTurn(streamSid, 'receptionist', event.transcript);
      if (streamSid) salonDb.appendLiveTranscript(streamSid, 'receptionist', event.transcript);
    }
    
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      console.log(`👤 Customer: ${event.transcript}`);
      conversationLog.push({ speaker: 'customer', text: event.transcript });
      // Live broadcast to dashboard + Supabase
      liveStream.transcriptTurn(streamSid, 'customer', event.transcript);
      if (streamSid) salonDb.appendLiveTranscript(streamSid, 'customer', event.transcript);
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
    
    // Log errors only
    if (event.error) console.log(`❌ xAI Error:`, JSON.stringify(event.error));
  });
  
  // Forward Twilio audio to xAI
  twilioWs.on('message', (data) => {
    const event = JSON.parse(data);
    
    if (event.event === 'start') {
      streamSid = event.start.streamSid;
      callSid = event.start.callSid || '';
      // Twilio start event: caller number is in event.from (root level), NOT event.start
      customerPhone = event.from || event.start?.callerNumber || event.start?.from || '';
      console.log(`📱 Call from: ${customerPhone} | Stream: ${streamSid} | CallSid: ${callSid}`);
      // Log to Supabase + broadcast live
      salonDb.logCallStarted(customerPhone, streamSid, callSid).then(log => {
        if (log) callLogId = log.id;
      });
      liveStream.callStarted(customerPhone, streamSid);
    }
    
    if (event.event === 'media' && xaiWs?.readyState === WebSocket.OPEN) {
      if (sessionReady) {
        // Twilio sends g711 µ-law at 8kHz — xAI accepts raw µ-law (audio/pcmu)
        xaiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: event.media.payload
        }));
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
    liveStream.callEnded(streamSid);

    // Post-call LLM booking extraction
    // Collect the full conversation transcript and let Grok figure out if a booking was made
    const transcripts = conversationLog.map(t => `${t.speaker === 'receptionist' ? 'Receptionist' : 'Customer'}: ${t.text}`).join('\n');
    
    // Helper: finalize call log in Supabase
    const finalizeCall = () => {
      if (callLogId) {
        salonDb.logCallComplete(callLogId, conversationLog, bookingResult, smsResults);
      }
      if (streamSid) {
        salonDb.endLiveCall(streamSid);
      }
    };

    if (transcripts.length > 20) {
      console.log(`📝 Running post-call booking extraction...`);
      extractBookingFromTranscript(transcripts).then(booking => {
        if (!booking) {
          console.log('ℹ️ No booking detected in this call');
          finalizeCall();
          return;
        }

        // Broadcast booking to dashboard
        bookingResult = booking;
        liveStream.bookingDetected(streamSid, booking);

        // Parse dateStr + timeStr into ISO dates using chrono
        const combined = `${booking.dateStr} ${booking.timeStr || ''}`.trim();
        const parsed = chrono.parse(combined, new Date(), { forwardDate: true });
        if (!parsed.length || !parsed[0].start) {
          console.log(`⚠️ Could not parse date/time: ${combined}`);
          finalizeCall();
          return;
        }

        const startDate = parsed[0].start.date();
        const duration = Object.keys(SERVICE_DURATIONS).includes((booking.service || '').toLowerCase())
          ? SERVICE_DURATIONS[booking.service.toLowerCase()]
          : DEFAULT_SERVICE_DURATION;
        const endDate = new Date(startDate.getTime() + duration * 60000);

        // Check business hours
        if (!isWithinBusinessHours(startDate, endDate)) {
          console.log(`⛔ Outside business hours: ${startDate.toString()}`);
          finalizeCall();
          return;
        }

        // Check availability and book
        isSlotAvailable(startDate, endDate).then(available => {
          if (!available) {
            console.log(`⛔ Slot unavailable (double-booking): ${startDate.toISOString()}`);
            finalizeCall();
            return;
          }

          const service = (booking.service || 'Appointment').toLowerCase();
          createBookingEvent(booking.customerName, customerPhone || booking.phone || 'Unknown', service, startDate, endDate)
            .then(calEvent => {
              if (calEvent) {
                console.log(`✅ LLM BOOKED: ${booking.customerName} - ${service} at ${startDate.toISOString()}`);
                bookingResult.calendarEventId = (calEvent.id || null);
                const salon = process.env.SALON_NAME || 'Salon';
                const svc = service.charAt(0).toUpperCase() + service.slice(1);
                const d = startDate;
                const ds = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                const ts = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const phone = customerPhone || booking.phone;
                if (phone) {
                  sendSms(phone, `✅ Confirmed! Your ${svc} at ${salon} is booked for ${ds} at ${ts}. See you then!`)
                    .then(() => { smsResults.customer = true; })
                    .finally(() => {
                      sendOwnerAlert(booking.customerName, svc, ds, ts, phone || 'Unknown')
                        .then(() => { smsResults.owner = true; })
                        .finally(finalizeCall);
                    });
                } else {
                  sendOwnerAlert(booking.customerName, svc, ds, ts, 'Unknown')
                    .then(() => { smsResults.owner = true; })
                    .finally(finalizeCall);
                }
              } else {
                console.log('⚠️ Calendar event creation returned null');
                finalizeCall();
              }
            });
        });
      });
    } else {
      console.log('ℹ️ Call too short for booking extraction');
      finalizeCall();
    }
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
  // Initialize live transcript streaming for the dashboard
  liveStream.attach(server, '/live-transcripts');
  liveStream.init();
});

// Attach WebSocket to HTTP server
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/media-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    liveStream.handleUpgrade(request, socket, head);
  }
});
