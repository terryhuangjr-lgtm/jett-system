// google-calendar.js — Direct Google Calendar API integration for Salon Voice Agent
// Uses saved OAuth token from ~/.hermes/google_token.json (jett.theassistant@gmail.com)
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.resolve(process.env.HOME || '/home/terry', '.hermes/google_token.json');

let calendar = null;

async function getCalendarClient() {
  if (calendar) return calendar;
  
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  
  const auth = new google.auth.OAuth2({
    clientId: tokenData.client_id,
    clientSecret: tokenData.client_secret,
  });
  
  auth.setCredentials({
    access_token: tokenData.token,
    refresh_token: tokenData.refresh_token,
    token_type: 'Bearer',
    expiry_date: tokenData.expiry_date,
  });
  
  // Auto-refresh on expiry
  auth.on('tokens', (tokens) => {
    if (tokens.access_token) {
      const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      existing.token = tokens.access_token;
      existing.expiry_date = tokens.expiry_date || Date.now() + 3600 * 1000;
      if (tokens.refresh_token) existing.refresh_token = tokens.refresh_token;
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(existing, null, 2));
    }
  });
  
  calendar = google.calendar({ version: 'v3', auth });
  return calendar;
}

/**
 * List events for a given day
 * @param {string} dateStr ISO date string
 * @returns {Array<{start: Date, end: Date}>}
 */
async function listEvents(dateStr) {
  try {
    const cal = await getCalendarClient();
    const date = new Date(dateStr);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const res = await cal.events.list({
      calendarId: 'primary',
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return (res.data.items || []).map(e => ({
      start: new Date(e.start?.dateTime || e.start?.date),
      end: new Date(e.end?.dateTime || e.end?.date),
    }));
  } catch (err) {
    console.log('⚠️ Google Calendar list error:', err.message);
    return [];
  }
}

/**
 * Create a calendar event
 * @param {string} summary Event title
 * @param {Date} startDate Start datetime
 * @param {Date} endDate End datetime
 * @param {string} description Event description
 * @param {number|null} colorId Google Calendar color ID (1-11)
 * @returns {object|null} Created event or null
 */
async function createEvent(summary, startDate, endDate, description, colorId) {
  try {
    const cal = await getCalendarClient();
    
    const event = {
      summary,
      description: description || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/New_York',
      },
    };

    if (colorId) {
      event.colorId = String(colorId);
    }

    const res = await cal.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return res.data;
  } catch (err) {
    console.log('⚠️ Google Calendar create error:', err.message);
    return null;
  }
}

/**
 * Update an event's color (used to set stylist color after creation)
 */
async function patchEvent(eventId, updates) {
  try {
    const cal = await getCalendarClient();
    await cal.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updates,
    });
    return true;
  } catch (err) {
    console.log('⚠️ Google Calendar patch error:', err.message);
    return false;
  }
}

module.exports = { listEvents, createEvent, patchEvent };
