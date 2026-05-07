// salon-db.js — Supabase integration for Salon Voice Agent
// Handles call logging, live transcript tracking, and settings retrieval

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://fhmjvnphxsbtwcutqkvq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZobWp2bnBoeHNidHdjdXRxa3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTgyNzcsImV4cCI6MjA5Mjc5NDI3N30.aUBnSwsBCE4JURXaQpZR81jtgP6A4cO-XXSUHrdnRgU';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Log a new call to Supabase
 */
async function logCallStarted(callerNumber, streamSid, callSid) {
  const { data, error } = await supabase
    .from('call_logs')
    .insert({
      caller_number: callerNumber,
      stream_sid: streamSid,
      call_sid: callSid,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    console.log('⚠️ Supabase: Failed to log call start:', error.message);
    return null;
  }
  console.log(`📊 Supabase: Call logged (${data.id})`);
  return data;
}

/**
 * Update call log with transcript and outcome
 */
async function logCallComplete(callLogId, transcript, bookingResult, smsResults) {
  const transcriptArray = Array.isArray(transcript) ? transcript : [];
  const transcriptText = transcriptArray
    .map(t => `${t.speaker === 'receptionist' ? 'Eve' : 'Customer'}: ${t.text}`)
    .join('\n');

  const updates = {
    ended_at: new Date().toISOString(),
    duration_seconds: null, // will compute if needed
    transcript: transcriptArray,
    transcript_text: transcriptText,
    status: 'completed',
  };

  if (bookingResult) {
    updates.booking_detected = true;
    updates.booking = {
      customerName: bookingResult.customerName,
      service: bookingResult.service,
      dateStr: bookingResult.dateStr,
      timeStr: bookingResult.timeStr,
      phone: bookingResult.phone,
    };
    updates.booking_created = !!bookingResult.calendarEventId;
    updates.booking_calendar_event_id = bookingResult.calendarEventId || null;
    updates.sms_sent = !!smsResults?.customer;
    updates.sms_owner_sent = !!smsResults?.owner;
  }

  const { error } = await supabase
    .from('call_logs')
    .update(updates)
    .eq('id', callLogId);

  if (error) {
    console.log('⚠️ Supabase: Failed to update call log:', error.message);
  } else {
    console.log(`📊 Supabase: Call ${callLogId} updated with transcript`);
  }
}

/**
 * Track a live call in the live_calls table
 */
async function trackLiveCall(callerNumber, streamSid) {
  // Clean up any stale entry for this stream
  await supabase.from('live_calls').delete().eq('stream_sid', streamSid);

  const { data, error } = await supabase
    .from('live_calls')
    .insert({
      caller_number: callerNumber,
      stream_sid: streamSid,
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      transcript: [],
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.log('⚠️ Supabase: Failed to track live call:', error.message);
    return null;
  }
  return data;
}

/**
 * Add a transcript turn to the live call and update last_activity_at
 */
async function appendLiveTranscript(streamSid, speaker, text) {
  // Fetch current transcript
  const { data: live, error } = await supabase
    .from('live_calls')
    .select('transcript')
    .eq('stream_sid', streamSid)
    .single();

  if (error || !live) return;

  const transcript = [...(live.transcript || []), {
    speaker,
    text,
    timestamp: new Date().toISOString(),
  }];

  await supabase
    .from('live_calls')
    .update({
      transcript,
      last_activity_at: new Date().toISOString(),
    })
    .eq('stream_sid', streamSid);
}

/**
 * End a live call entry
 */
async function endLiveCall(streamSid) {
  await supabase
    .from('live_calls')
    .update({ is_active: false, last_activity_at: new Date().toISOString() })
    .eq('stream_sid', streamSid);

  // Also clean up after 60 seconds (delete old entry)
  setTimeout(async () => {
    await supabase.from('live_calls').delete().eq('stream_sid', streamSid);
  }, 60000);
}

/**
 * Fetch latest salon settings from Supabase
 */
async function getSalonSettings() {
  const { data, error } = await supabase
    .from('salon_settings')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    console.log('⚠️ Supabase: Failed to fetch salon settings:', error?.message);
    return null;
  }
  return data;
}

module.exports = {
  logCallStarted,
  logCallComplete,
  trackLiveCall,
  appendLiveTranscript,
  endLiveCall,
  getSalonSettings,
};
