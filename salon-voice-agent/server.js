// Force-load .env FIRST — read file directly to bypass dotenv process.env interference
const envFs = require('fs');
const envPath = __dirname + '/.env';
if (envFs.existsSync(envPath)) {
  const envContent = envFs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.substring(0, eqIdx).trim();
    const v = trimmed.substring(eqIdx + 1).trim();
    // Always set from .env — the salon's .env is the source of truth
    process.env[k] = v;
  }
}
// Then run dotenv as normal for remaining vars
require('dotenv').config({ override: false });
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
const googleCal = require('./google-calendar');
const SALON_HOURS = 'Monday-Saturday 9am-7pm, Sunday 10am-5pm';
const CALENDAR_TIMEZONE = 'America/New_York';

// ──────────────────────────────────────────
// SALON CONFIGURATION
// ──────────────────────────────────────────

// Number of simultaneous bookings allowed (stylists/chairs available)
const MAX_CONCURRENT_BOOKINGS = 4;

// Staff — Eve can ask who the customer prefers
// Each stylist has staggered days off so at least 2 are always working Mon-Sat
const STYLISTS = [
  { name: 'Mark',      daysOff: [1] },                // Off Mondays
  { name: 'Sofia',     daysOff: [2] },                // Off Tuesdays
  { name: 'Jenna',     daysOff: [3] },                // Off Wednesdays
  { name: 'Emma',      daysOff: [1] },                // Off Mondays (same as Mark, works Tue-Sat)
];

// Individual service durations (minutes) — loaded from Supabase at startup
// These are base single-service durations, NOT combo combos
let SERVICE_DURATIONS = {};
let LOADED_SERVICES = []; // Full service objects from Supabase (for prices in prompts)

const DEFAULT_SERVICE_DURATION = 60;

/**
 * Calculate duration for ANY service description by parsing individual services.
 * Handles both single services ("blowout") and combos ("haircut and color", "cut & highlights").
 * Splits on and/&/,/+ and sums the individual durations.
 */
function calculateDuration(serviceName) {
  if (!serviceName) return DEFAULT_SERVICE_DURATION;

  const normalized = serviceName.trim().toLowerCase().replace(/['’]/g, "'");

  // First try exact match (fast path for single services)
  if (SERVICE_DURATIONS[normalized]) return SERVICE_DURATIONS[normalized];

  // Split on common combiners: "and", "&", ",", "+"
  const parts = normalized.split(/\s+(?:and|&)\s+|\s*,\s*|\s*\+\s*/).filter(Boolean);

  if (parts.length > 1) {
    let total = 0;
    let foundAll = true;
    for (const part of parts) {
      const p = part.trim().replace(/['\u2019]/g, "'");
      // Try exact match
      let dur = SERVICE_DURATIONS[p];
      if (!dur) dur = SERVICE_DURATIONS[p + "s"]; // "haircut" -> "haircuts"

      // Try matching "womens" -> "women's", "haircut" -> "womens haircut"
      if (!dur) {
        const match = Object.entries(SERVICE_DURATIONS).find(([k]) => {
          const a = k.replace(/['\u2019]/g, "").toLowerCase();
          const b = p.replace(/['\u2019]/g, "").toLowerCase();
          // Prefer when one contains the other AND they start the same first 3 chars
          return a === b || (a.length >= 4 && b.length >= 4 && a[0] === b[0] && a[1] === b[1] && (a.includes(b) || b.includes(a)));
        });
        dur = match ? match[1] : null;
      }

      if (dur) {
        total += dur;
      } else {
        foundAll = false;
        break;
      }
    }
    if (foundAll && total > 0) return total;
  }

  // Fallback: try fuzzy match on the full string
  const cleaned = normalized.replace(/['’]/g, "").replace(/\s+(?:and|&)\s+/g, " ");
  const fuzzyMatch = Object.entries(SERVICE_DURATIONS).find(([k]) => {
    const kCleaned = k.replace(/['’]/g, "").toLowerCase();
    return kCleaned.includes(cleaned) || cleaned.includes(kCleaned);
  });
  if (fuzzyMatch) return fuzzyMatch[1];

  // Last resort — use the first service that appears anywhere in the name
  const subMatch = Object.entries(SERVICE_DURATIONS).find(([k]) =>
    normalized.includes(k) || k.includes(normalized)
  );
  return subMatch ? subMatch[1] : DEFAULT_SERVICE_DURATION;
}

// Load service durations + owner phone from Supabase salon_settings (dashboard is source of truth)
async function loadDurationsFromSettings() {
  try {
    const settings = await salonDb.getSalonSettings();
    if (settings?.services && Array.isArray(settings.services)) {
      const nameMap = {};
      for (const svc of settings.services) {
        // Index by lowercase name for fuzzy matching
        const key = svc.name.trim().toLowerCase();
        nameMap[key] = svc.duration;
      }
      SERVICE_DURATIONS = nameMap;
      LOADED_SERVICES = settings.services;
      console.log(`📊 Loaded ${Object.keys(nameMap).length} service durations from Supabase settings`);
    }
    // Load owner phone from dashboard settings (fallback to .env)
    if (settings?.owner_phone) {
      process.env.OWNER_PHONE = settings.owner_phone;
      console.log(`📱 Owner phone loaded from dashboard settings`);
    }
  } catch (err) {
    console.log('⚠️ Could not load settings from Supabase, using fallback durations');
  }
}

/**
 * Get the owner's phone number — checks dynamically loaded value first, then .env
 */
function getOwnerPhone() {
  return process.env.OWNER_PHONE || '';
}

let COVERAGE_GAP_MINUTES = 30;

// ── Loaded from Supabase salon_settings at startup ─────────────────
let SALON_CONFIG = null;  // Full settings object from Supabase

let SALON_NAME = process.env.SALON_NAME || 'Salon';
let SALON_ADDRESS = process.env.SALON_ADDRESS || '';
let SALON_PHONE = process.env.SALON_PHONE || '';
let SALON_HOURS_DISPLAY = process.env.SALON_HOURS || 'Monday-Saturday 9am-7pm, Sunday 10am-5pm';
let SALON_STYLISTS = [...STYLISTS];  // Copy default
let SALON_MAX_BOOKINGS = MAX_CONCURRENT_BOOKINGS;
let SALON_BUSINESS_HOURS = {
  0: { open: 10, close: 17 },
  1: { open: 9, close: 19 },
  2: { open: 9, close: 19 },
  3: { open: 9, close: 19 },
  4: { open: 9, close: 19 },
  5: { open: 9, close: 19 },
  6: { open: 9, close: 18 },
};

async function loadSalonConfig() {
  try {
    const settings = await salonDb.getSalonSettings();
    if (!settings) {
      console.log('⚠️ No salon_settings found in Supabase, using .env defaults');
      return;
    }
    SALON_CONFIG = settings;

    // Salon info
    if (settings.salon_name) SALON_NAME = settings.salon_name;
    if (settings.salon_phone) SALON_PHONE = settings.salon_phone;
    if (settings.salon_address) SALON_ADDRESS = settings.salon_address;
    if (settings.salon_hours) SALON_HOURS_DISPLAY = settings.salon_hours;
    if (settings.max_concurrent_bookings) SALON_MAX_BOOKINGS = settings.max_concurrent_bookings;
    if (settings.coverage_gap_minutes) COVERAGE_GAP_MINUTES = settings.coverage_gap_minutes;

    // Stylists from dashboard
    if (settings.stylists && Array.isArray(settings.stylists) && settings.stylists.length > 0) {
      SALON_STYLISTS = settings.stylists;
    }

    // Business hours from dashboard
    if (settings.business_hours && typeof settings.business_hours === 'object') {
      for (const day of Object.keys(settings.business_hours)) {
        const h = settings.business_hours[day];
        if (h && typeof h.open === 'number' && typeof h.close === 'number') {
          SALON_BUSINESS_HOURS[parseInt(day)] = { open: h.open, close: h.close };
        }
      }
    }

    // Owner phone
    if (settings.owner_phone) {
      process.env.OWNER_PHONE = settings.owner_phone;
      console.log(`📱 Owner phone loaded from dashboard settings`);
    }

    console.log(`🏪 Salon config loaded from Supabase: ${SALON_NAME}`);
    console.log(`   Stylists: ${SALON_STYLISTS.length}, Max bookings: ${SALON_MAX_BOOKINGS}`);
  } catch (err) {
    console.log(`⚠️ Could not load salon config from Supabase: ${err.message}`);
  }
}

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

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    MessagingServiceSid: 'MG9bbd0ebe1e101a973f47392d49708d9f',
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

  // Build service list for extraction prompt from Supabase data
  const extractServiceList = LOADED_SERVICES.length > 0
    ? LOADED_SERVICES.map(s => s.name.toLowerCase().trim()).join(' or ')
    : "haircut or color or highlights or blowout or keratin treatment or trim or beard trim or eyebrow wax";

  const prompt = `You are a multilingual salon booking extraction system. Given a conversation transcript between a salon receptionist and a customer, determine if a booking was made. The conversation may be in ANY LANGUAGE — Spanish, Chinese (Mandarin/Cantonese), Korean, English, or any other language.

If a booking was made, extract EXACTLY these fields as JSON:
{
  "hasBooking": true,
  "customerName": "First Last",
  "service": "${extractServiceList}",
  "dateStr": "May 3rd",
  "timeStr": "3pm",
  "stylist": "Sophia",
  "phone": "+155****4567"
}

If no booking was made (e.g., just an inquiry, wrong number, hang up, information request), respond with:
{"hasBooking": false}

Rules:
- customerName: Capture the customer's full name as stated. If only first name, use that alone.
- service: Use the exact service name from the English list above. Even if the customer asked in another language (e.g. "corte de cabello" = "haircut", "染发" = "color"), map it to the closest matching English service name from the list. If the customer asked for a combination (e.g. "corte y color"), describe it naturally like "haircut and color".
- dateStr: The natural language date in ENGLISH (e.g. "May 3rd"), regardless of what language the customer spoke. Translate dates to English.
- timeStr: The natural language time in ENGLISH. Include am/pm.
- stylist: The stylist name the customer requested. If they didn't specify one, set to null.
- phone: The phone number the customer provided during the call if asked. Format as +1XXXXXXXXXX. Can be null.
- Only extract if the receptionist CONFIRMED the booking aloud. If it sounds tentative or the customer said "let me think about it", do NOT extract.
- The transcript may contain mixed languages — extract from whichever language has the booking details.

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

    googleCal.listEvents(dateStr).then(busySlots => {
      resolve(busySlots);
    }).catch(() => resolve([]));
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
      const daySlots = await googleCal.listEvents(date.toISOString());
      busySlots = daySlots.map(s => ({
        start: s.start.getTime(),
        end: s.end.getTime(),
      }));
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
  const ownerPhone = getOwnerPhone();
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
  // Detect service — look for individual services AND combos (split on and/&/,)
  let service = null;
  const lower = transcript.toLowerCase();
  
  // First pass: try to detect a combo (two services joined by "and" or "&")
  for (const s of Object.keys(SERVICE_DURATIONS)) {
    if (lower.includes(s)) {
      service = s;
      break;
    }
  }
  // If no exact match, search for individual service words in context of "and"/"&"
  if (!service) {
    const serviceNames = Object.keys(SERVICE_DURATIONS).sort((a, b) => b.length - a.length);
    for (const s of serviceNames) {
      if (lower.includes(s)) {
        service = s;
        break;
      }
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
  const duration = service ? calculateDuration(service) : DEFAULT_SERVICE_DURATION;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  return {
    service,
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
    duration,
  };
}

// Stylist color map for Google Calendar events
// Google Calendar color IDs: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana,
// 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
const STYLIST_COLORS = {
  'mark':  1,  // Lavender
  'sofia': 9,  // Blueberry
  'sophia': 9, // Blueberry (alternate spelling)
  'jenna': 3,  // Grape
  'emma':  5,  // Banana
};

/**
 * Create a calendar event via GWS CLI
 */
function createBookingEvent(customerName, customerPhone, service, startDate, endDate, stylistName) {
  return new Promise(async (resolve, reject) => {
    if (!service) service = 'Appointment';
    const stylistLabel = stylistName ? ` w/ ${stylistName}` : '';
    const summary = `${customerName} - ${service.charAt(0).toUpperCase() + service.slice(1)}${stylistLabel}`;
    const description = `Booked via Salon Voice Agent\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${service}${stylistName ? `\nStylist: ${stylistName}` : ''}`;
    
    const colorId = stylistName ? STYLIST_COLORS[stylistName.toLowerCase().trim()] : null;

    const event = await googleCal.createEvent(summary, startDate, endDate, description, colorId);
    if (event) {
      console.log(`✅ Booked: ${summary}`);
      resolve(event);
    } else {
      resolve(null);
    }
  });
}

// Salon context builder — generates dynamic instructions per call with live availability
function buildSalonContext(availableSlotsStr) {
  // Staff info — show stylists with their schedules
  let staffInfo = '';
  if (SALON_STYLISTS.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const stylistLines = SALON_STYLISTS.map(s => {
      const daysOff = (s.daysOff || []).map(d => dayNames[d]).join(', ');
      return `- ${s.name} (off ${daysOff})`;
    });
    staffInfo = `\nSTYLISTS:\n${stylistLines.join('\n')}\n- Ask the customer: "Do you have a preferred stylist?" — say their names so the customer knows who works here.\n- If they don't care, book with whoever is working that day.\n- If the stylist they want is off that day, tell them and suggest a different stylist or a different day.`;
  }
  if (SALON_MAX_BOOKINGS > 1) {
    staffInfo += `\n- Our salon has ${SALON_MAX_BOOKINGS} stylists working at once, so multiple appointments can run at the same time.`;
  }

  let bookingSection = `BOOKING:\n- First ask if they have a particular stylist in mind. Mention who's working today by name!\n- If they don't have a preference, say whoever's available works great.\n- If the stylist they want is off that day, say \"[Stylist] is off [day], but [other stylist] is available then — or I can check a different day.\"\n- Then ask for: their name, what service they want, and preferred date/time\n- Say the customer's FULL NAME out loud at least once during the conversation — I need to hear it clearly\n- Ask for their phone number to send a confirmation SMS before finalizing`;

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

  // Services list — build from Supabase data (or fallback hardcoded)
  const servicesList = Object.keys(SERVICE_DURATIONS).length > 0
    ? Object.entries(SERVICE_DURATIONS).map(([name, duration]) => {
        const price = (() => {
          // try to find price from settings if we cached it
          const svc = LOADED_SERVICES?.find(s => s.name?.toLowerCase() === name);
          return svc?.price || '';
        })();
        return `- ${name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: $${price}${price ? (duration ? ` (${duration}min)` : '') : ''}`;
      }).join('\n')
    : `- Women's Haircut: $75 (60min)
- Men's Haircut: $55 (45min)
- Color: $130+ (120min)
- Highlights: $160+ (120min)
- Blowout: $50 (45min)
- Keratin Treatment: $220+ (90min)
- Trim: $35 (30min)
- Beard Trim: $20 (15min)
- Eyebrow Wax: $18 (15min)`;

  return `
You are a friendly receptionist for ${SALON_NAME}.
Your job is to answer calls, book appointments, and answer questions.

SALON INFO:
- Name: ${SALON_NAME}
- Address: ${SALON_ADDRESS}
- Hours: ${SALON_HOURS_DISPLAY}
- Phone: ${SALON_PHONE}

SERVICES & PRICES:
${servicesList}

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
|- Be warm, friendly, and professional
|- Keep responses concise — this is a phone call
|- Speak at a brisk pace — shorter sentences, less wordy
|- If the customer speaks while you're talking, stop immediately and listen. Do NOT finish your sentence — the customer comes first.
|- If you cannot help, offer to take a message for the owner
|- Never make up information not provided above
|- Always confirm booking details before ending call
|- LANGUAGE MATCH: If the customer speaks Spanish, Chinese (Mandarin/Cantonese), or any other language, respond in that same language. Do NOT switch to English unless the customer does first.
|- TRANSFER TO HUMAN: If the customer says "let me speak to a human/manager/owner/person" or anything similar, respond warmly with "Of course, let me transfer you to the owner right away!" then say exactly: [[TRANSFER]]
`;}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHoursNow() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hours = SALON_BUSINESS_HOURS[dayOfWeek];
  if (!hours) return false;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  // Allow 30-minute buffer before close so Eve can finish a call
  return currentHour >= hours.open && currentHour <= hours.close - 0.5;
}

// Step 1 — Twilio calls this when someone calls our number
app.post('/incoming-call', (req, res) => {
  console.log(`📞 Incoming call from: ${req.body.From}`);
  
  if (!isWithinBusinessHoursNow()) {
    console.log('🕐 Outside business hours — routing to Eve voicemail');
    const twiml = new VoiceResponse();
    const publicHost = process.env.PUBLIC_HOST || 'voice.jettmissioncontrol.com';
    const connect = twiml.connect({
      timeout: '300',
      recordingStatusCallback: `https://${publicHost}/recording-callback`,
      recordingStatusCallbackEvent: ['completed']
    });
    const stream = connect.stream({
      url: `wss://${req.headers.host}/media-stream-voicemail`
    });
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }
  
  const twiml = new VoiceResponse();
  
  // Connect to our WebSocket media stream — with recording
  const publicHost = process.env.PUBLIC_HOST || 'voice.jettmissioncontrol.com';
  const connect = twiml.connect({
    timeout: '300',
    recordingStatusCallback: `https://${publicHost}/recording-callback`,
    recordingStatusCallbackEvent: ['completed']
  });
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

/**
 * Twilio recording callback — saves RecordingUrl to the call_logs table
 * Twilio POSTs here when a recording completes
 */
app.post('/recording-callback', async (req, res) => {
  const callSid = req.body.CallSid;
  const recordingUrl = req.body.RecordingUrl;
  const duration = req.body.RecordingDuration ? parseInt(req.body.RecordingDuration) : null;
  
  if (!callSid || !recordingUrl) {
    console.log('⚠️ Recording callback missing CallSid or RecordingUrl');
    res.sendStatus(200); // Always 200 so Twilio doesn't retry
    return;
  }
  
  console.log(`🔴 Recording complete for ${callSid}: ${recordingUrl} (${duration || '?'}s)`);
  
  // Save to call_logs
  const updates = { recording_url: recordingUrl.includes('http') ? recordingUrl : `https://api.twilio.com${recordingUrl.startsWith('/') ? '' : '/'}${recordingUrl}` };
  if (duration) updates.recording_duration = duration;
  
  const supabaseUrl = process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Find the call_log by call_sid
    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('call_sid', callSid)
      .select();
    
    if (error) {
      console.log('⚠️ Failed to save recording URL:', error.message);
    } else if (data?.length > 0) {
      console.log(`📹 Recording saved to call_log for ${callSid}`);
    } else {
      // Try matching by stream_sid (fallback)
      console.log(`📹 No call_log found for CallSid ${callSid}, recording URL stored`);
    }
  } catch (e) {
    console.log('⚠️ Recording callback error:', e.message);
  }
  
  res.sendStatus(200);
});

/**
 * Build system prompt for after-hours voicemail mode
 */
function buildVoicemailContext() {
  const salonName = SALON_NAME || 'Salon';
  const salonHours = process.env.SALON_HOURS || 'Monday-Saturday 9am-7pm, Sunday 10am-5pm';
  const salonPhone = process.env.SALON_PHONE || '';

  return `
You are a polite voicemail receptionist for ${salonName}.
The salon is currently CLOSED. Your only job is to take a message.

AVAILABLE HOURS:
${salonHours}
Phone: ${salonPhone}

RULES:
- Greet the caller warmly with "Hi, thanks for calling ${salonName}. We're currently closed, but I can take a message for the owner."
- Ask for their name, phone number, and the reason for their call
- If they try to book an appointment, say: "I'd love to help with that, but I can only take a message right now. I'll make sure the owner calls you back during business hours."
- Keep it brief — this is a voicemail
- LANGUAGE MATCH: If the customer speaks Spanish, Chinese, or any other language, respond in that same language
- Do NOT offer to book anything
- Do NOT check availability
- End with "Thanks for calling, I'll make sure the owner gets your message."
`;
}

/**
 * Extract voicemail info from a transcript — caller name, phone, reason
 */
async function extractVoicemailFromTranscript(transcript) {
  if (!transcript || transcript.trim().length < 20) return null;
  if (!XAI_API_KEY) return null;

  const prompt = `You are a voicemail extraction system. Given a transcript of a caller leaving a message for a closed business, extract the key information as JSON.

{
  "hasMessage": true,
  "callerName": "First Last or null",
  "phone": "Number they gave or null",
  "reason": "Brief summary of why they called",
  "wantsBooking": true/false
}

If no clear message was left (hang up, wrong number, just silence), respond with:
{"hasMessage": false}

Rules:
- callerName: Extract the name the caller provided. If none, set null.
- phone: Extract any phone number they provided. Format as +1XXXXXXXXXX.
- reason: A one-line summary of why they called, in English.
- wantsBooking: true if they wanted to book an appointment or service.
- The conversation may be in any language — extract from whatever language is used.

Transcript:
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

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return JSON.parse(text);
  } catch (e) {
    console.log('⚠️ Voicemail extraction failed:', e.message);
    return null;
  }
}

/**
 * Send voicemail notification to owner
 */
async function sendVoicemailAlert(vmInfo, transcript, callerNumber, callLogId) {
  const ownerPhone = getOwnerPhone();
  if (!ownerPhone || ownerPhone === 'your_real_cell_here') {
    console.log('⚠️ No owner phone set, skipping voicemail alert');
    return;
  }

  const callerName = vmInfo?.callerName || 'Unknown';
  const reason = vmInfo?.reason || 'No message left';
  const phone = vmInfo?.phone || callerNumber || 'Unknown';
  const wantsBooking = vmInfo?.wantsBooking ? '📅 Wants to book' : '';

  const msg = `📞 Voicemail from ${callerName}
📱 ${phone}
📝 ${reason}
${wantsBooking ? '📅 Wants to book' : ''}
━━━━━━━━━━━━━
Transcript (limited):
${(transcript || '').substring(0, 300)}
━━━━━━━━━━━━━
View full: https://voice.jettmissioncontrol.com/calls`.trim();

  await sendSms(ownerPhone, msg);
}

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
      
      // Check for transfer-to-human signal
      if (event.transcript && event.transcript.includes('[[TRANSFER]]')) {
        console.log('🔄 Transfer to human requested — redirecting call to owner');
        const ownerPhone = getOwnerPhone();
        if (ownerPhone && ownerPhone !== 'your_real_cell_here' && callSid) {
          const twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          // Redirect the call to the owner's phone
          twilioClient.calls(callSid).update({
            twiml: `<Response><Dial timeout="30">${ownerPhone}</Dial></Response>`
          }).catch(err => console.log('⚠️ Transfer failed:', err.message));
        }
      }
    }
    
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      console.log(`👤 Customer: ${event.transcript}`);
      // Coalesce partial STT utterances — if last customer entry starts with new text, replace it
      const lastIdx = conversationLog.length - 1;
      if (lastIdx >= 0 && conversationLog[lastIdx].speaker === 'customer') {
        const lastText = conversationLog[lastIdx].text;
        // If new text is a superset/continuation of the last, replace it
        if (event.transcript.length > lastText.length && event.transcript.startsWith(lastText)) {
          conversationLog[lastIdx] = { speaker: 'customer', text: event.transcript };
        } else if (lastText.length >= event.transcript.length && lastText.startsWith(event.transcript)) {
          // New text is shorter — it's probably a stale partial, skip it
          return;
        } else {
          conversationLog.push({ speaker: 'customer', text: event.transcript });
        }
      } else {
        conversationLog.push({ speaker: 'customer', text: event.transcript });
      }
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
    
    // Log all event types for debugging
    if (event.type && !['response.output_audio.delta', 'response.output_audio_transcript.done', 'response.audio_transcript.done', 'conversation.item.input_audio_transcription.completed', 'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped'].includes(event.type)) {
      console.log(`ℹ️ xAI event: ${event.type}`, event.type === 'response.done' ? '(response complete)' : '');
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
      salonDb.trackLiveCall(customerPhone, streamSid);
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
        const duration = calculateDuration(booking.service);
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
          createBookingEvent(booking.customerName, customerPhone || booking.phone || 'Unknown', service, startDate, endDate, booking.stylist)
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

// Voicemail WebSocket handler — same audio pipeline, different system prompt, different post-call behavior
const vmWss = new WebSocket.Server({ noServer: true });

vmWss.on('connection', (twilioWs) => {
  console.log('🔊 Voicemail media stream connected');
  
  let xaiWs = null;
  let streamSid = null;
  let callSid = null;
  let callLogId = null;
  let vmCallerNumber = ''; // captured from Twilio start event
  const conversationLog = [];

  // Connect to xAI Voice Agent
  xaiWs = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0', {
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    }
  });
  
  let sessionReady = false;
  let audioBuffer = [];

  xaiWs.on('open', () => {
    console.log('🤖 Connected to xAI Voice Agent (voicemail mode)');
    
    const instructions = buildVoicemailContext();
    
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
  
  // Forward xAI audio back to Twilio
  xaiWs.on('message', (data) => {
    const event = JSON.parse(data);

    if (event.type === 'session.updated' && !sessionReady) {
      sessionReady = true;
      console.log('✅ Voicemail session ready — sending greeting');
      
      for (const audio of audioBuffer) {
        xaiWs.send(audio);
      }
      audioBuffer = [];

      xaiWs.send(JSON.stringify({ type: 'response.create' }));
    }
    
    if (event.type === 'response.output_audio.delta' && streamSid) {
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(JSON.stringify({
          event: 'media',
          streamSid: streamSid,
          media: { payload: event.delta }
        }));
      }
    }
    
    if (event.type === 'response.output_audio_transcript.done') {
      console.log(`\n🤖 Eve (voicemail): ${event.transcript}\n`);
      conversationLog.push({ speaker: 'receptionist', text: event.transcript });
    }
    
    if (event.type === 'response.done') {
      console.log('✅ Voicemail response turn complete — waiting for caller response');
      // DON'T hang up here — the caller needs to respond!
      // The stream will end naturally when Twilio closes it.
    }
    
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      console.log(`👤 Caller: ${event.transcript}`);
      conversationLog.push({ speaker: 'customer', text: event.transcript });
    }
    
    if (event.error) console.log(`❌ xAI Error (voicemail):`, JSON.stringify(event.error));
  });
  
  // Forward Twilio audio to xAI
  twilioWs.on('message', (data) => {
    const event = JSON.parse(data);
    
    if (event.event === 'start') {
      streamSid = event.start.streamSid;
      callSid = event.start.callSid || '';
      const callerNumber = event.from || event.start?.callerNumber || event.start?.from || '';
      vmCallerNumber = callerNumber;
      console.log(`📱 Voicemail call from: ${callerNumber} | Stream: ${streamSid}`);

      // Track live call
      salonDb.trackLiveCall(callerNumber, streamSid);

      // Log with 'voicemail' status
      salonDb.logCallStarted(callerNumber, streamSid, callSid).then(log => {
        if (log) {
          callLogId = log.id;
          // Update status to 'voicemail' immediately
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co',
            process.env.SUPABASE_ANON_KEY
          );
          supabase.from('call_logs').update({ status: 'voicemail' }).eq('id', log.id).then(() => {});
        }
      });
    }
    
    if (event.event === 'media' && xaiWs?.readyState === WebSocket.OPEN) {
      if (sessionReady) {
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
      console.log('📵 Voicemail call ended');
      xaiWs?.close();
    }
  });
  
  twilioWs.on('close', () => {
    console.log('📵 Voicemail Twilio disconnected');
    xaiWs?.close();

    // Post-call: extract voicemail message
    const transcripts = conversationLog.map(t => `${t.speaker === 'receptionist' ? 'Eve' : 'Caller'}: ${t.text}`).join('\n');
    
    const finalizeVM = () => {
      if (callLogId) {
        salonDb.logCallComplete(callLogId, conversationLog, null, { customer: false, owner: false });
      }
      if (streamSid) {
        salonDb.endLiveCall(streamSid);
      }
    };

    if (transcripts.length > 20) {
      console.log(`📝 Running voicemail extraction...`);
      extractVoicemailFromTranscript(transcripts).then(vmInfo => {
        if (vmInfo?.hasMessage) {
          console.log(`📞 Voicemail from: ${vmInfo.callerName || 'Unknown'} — ${vmInfo.reason || ''}`);
          // Send SMS to owner with voicemail details
          sendVoicemailAlert(vmInfo, transcripts, vmCallerNumber, callLogId);
        } else {
          console.log('ℹ️ No meaningful voicemail left');
        }
        finalizeVM();
      });
    } else {
      console.log('ℹ️ Voicemail call too short');
      finalizeVM();
    }
  });
  
  xaiWs.on('error', (err) => {
    console.error('xAI error (voicemail):', err.message);
  });
});

// Dashboard
// Serve dashboard with Supabase config injected
app.get('/dashboard', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  let html = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  html = html.replace('__SUPABASE_URL__', supabaseUrl);
  html = html.replace('__SUPABASE_ANON_KEY__', supabaseKey);
  res.type('html').send(html);
});

// Serve settings as static
app.use('/settings', express.static(__dirname + '/settings.html'));

// Root redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API: Save salon settings (uses service key to bypass RLS)
// The frontend can't save directly because anon key PATCH to JSONB columns
// is restricted by RLS. So we proxy through the server.
app.post('/api/save-settings', async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Read service key from superare profile (shares this Supabase project)
    const envPath = '/home/terry/.hermes/profiles/superare/.env';
    let serviceKey = '';

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        if (line.trim().startsWith('SUPABASE_SERVICE_KEY=')) {
          serviceKey = line.split('=').slice(1).join('=').trim().replace(/['"]/g, '');
          break;
        }
      }
    }

    if (!serviceKey) {
      return res.status(500).json({ error: 'Service key not available' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co';
    const { createClient } = require('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get the settings row ID
    const { data: existing, error: fetchError } = await adminClient
      .from('salon_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError || !existing) {
      return res.status(500).json({ error: 'Could not find salon settings', details: fetchError?.message });
    }

    const { error: updateError } = await adminClient
      .from('salon_settings')
      .update(updates)
      .eq('id', existing.id);

    if (updateError) {
      return res.status(500).json({ error: 'Save failed', details: updateError.message });
    }

    // 🔁 Sync stylists to salon_stylists table when stylists JSONB is updated
    if (updates.stylists && Array.isArray(updates.stylists)) {
      // Get existing stylists from salon_stylists to match by name
      const { data: existingStylists } = await adminClient
        .from('salon_stylists')
        .select('id, name');

      const existingStylistMap = {};
      if (existingStylists) {
        for (const s of existingStylists) {
          existingStylistMap[s.name] = s.id;
        }
      }

      for (const s of updates.stylists) {
        const daysOff = (s.daysOff || []).filter(d => d >= 0 && d <= 6);
        if (existingStylistMap[s.name]) {
          // Update existing stylist
          await adminClient
            .from('salon_stylists')
            .update({ days_off: daysOff, active: true })
            .eq('id', existingStylistMap[s.name]);
        } else {
          // Insert new stylist
          await adminClient
            .from('salon_stylists')
            .insert({ name: s.name, days_off: daysOff, active: true });
        }
      }

      // Deactivate stylists that were removed from the settings
      if (existingStylists) {
        const currentNames = updates.stylists.map(s => s.name);
        for (const existing of existingStylists) {
          if (!currentNames.includes(existing.name)) {
            await adminClient
              .from('salon_stylists')
              .update({ active: false })
              .eq('id', existing.id);
          }
        }
      }
    }

    console.log(`⚙️ Settings saved via dashboard: ${Object.keys(updates).join(', ')}`);
    res.json({ success: true });

    // Reload config in-memory after save
    await loadSalonConfig();
    await loadDurationsFromSettings();
  } catch (err) {
    console.log('⚠️ Save settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Restart endpoint — dashboard calls this instead of requiring SSH
// Protected by RESTART_SECRET from .env
app.post('/api/restart', (req, res) => {
  const auth = req.headers['authorization'];
  const expected = process.env.RESTART_SECRET;
  
  if (!expected || auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('🔄 Dashboard requested restart — restarting in 1s...');
  res.json({ message: 'Restarting...' });
  
  // Give the response time to flush, then exit
  // systemd will automatically restart the service
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start server
const server = app.listen(3333, async () => {
  console.log('🚀 Salon Voice Agent running on port 3333');
  console.log(`📞 Twilio number: ${process.env.TWILIO_PHONE_NUMBER}`);
  // Load all salon config from Supabase (dashboard is single source of truth)
  await loadSalonConfig();
  console.log(`🏪 Salon: ${SALON_NAME}`);
  await loadDurationsFromSettings();
  console.log(`📊 Service durations loaded: ${Object.keys(SERVICE_DURATIONS).length} services`);

  // Initial sync: push salon_settings stylists into salon_stylists table
  (async () => {
    try {
      const envPath = '/home/terry/.hermes/profiles/superare/.env';
      const supUrl = process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co';
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        let serviceKey = '';
        for (const line of envContent.split('\n')) {
          if (line.trim().startsWith('SUPABASE_SERVICE_KEY=')) {
            serviceKey = line.split('=').slice(1).join('=').trim().replace(/['"]/g, '');
            break;
          }
        }
        if (serviceKey) {
          const { createClient } = require('@supabase/supabase-js');
          const ac = createClient(supUrl, serviceKey);

          // Sync stylists from settings to salon_stylists table
          if (SALON_STYLISTS.length > 0) {
            const { data: existing } = await ac.from('salon_stylists').select('id, name');
            const existingNames = {};
            if (existing) existing.forEach(s => existingNames[s.name] = s.id);

            for (const s of SALON_STYLISTS) {
              const daysOff = (s.daysOff || []).filter(d => d >= 0 && d <= 6);
              if (existingNames[s.name]) {
                await ac.from('salon_stylists').update({ days_off: daysOff, active: true }).eq('id', existingNames[s.name]);
              } else {
                await ac.from('salon_stylists').insert({ name: s.name, days_off: daysOff, active: true });
              }
            }
            // Deactivate any that were removed
            const currentNames = SALON_STYLISTS.map(s => s.name);
            if (existing) {
              for (const s of existing) {
                if (!currentNames.includes(s.name)) {
                  await ac.from('salon_stylists').update({ active: false }).eq('id', s.id);
                }
              }
            }
            console.log(`🔄 Synced ${SALON_STYLISTS.length} stylists to salon_stylists table`);
          }
        }
      }
    } catch (e) {
      console.log(`⚠️ Initial stylist sync skipped: ${e.message}`);
    }
  })();

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
  } else if (request.url === '/media-stream-voicemail') {
    vmWss.handleUpgrade(request, socket, head, (ws) => {
      vmWss.emit('connection', ws, request);
    });
  } else {
    liveStream.handleUpgrade(request, socket, head);
  }
});
