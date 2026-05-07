-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/fhmjvnphxsbtwcutqkvq/sql/new)
-- Creates tables for the Salon Voice Agent Dashboard

-- 1. Salon Settings — stores configuration editable from the dashboard
CREATE TABLE IF NOT EXISTS salon_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_name TEXT NOT NULL DEFAULT 'Test Salon',
  salon_phone TEXT NOT NULL DEFAULT '555-1234',
  salon_address TEXT NOT NULL DEFAULT '123 Main St, Garden City NY',
  salon_hours TEXT NOT NULL DEFAULT 'Monday-Saturday 9am-7pm, Sunday 10am-5pm',
  business_hours JSONB NOT NULL DEFAULT '{"0":{"open":10,"close":17},"1":{"open":9,"close":19},"2":{"open":9,"close":19},"3":{"open":9,"close":19},"4":{"open":9,"close":19},"5":{"open":9,"close":19},"6":{"open":9,"close":18}}',
  services JSONB NOT NULL DEFAULT '[
    {"name":"Women''s Haircut","price":75,"duration":60},
    {"name":"Men''s Haircut","price":55,"duration":45},
    {"name":"Color","price":130,"duration":120},
    {"name":"Highlights","price":160,"duration":120},
    {"name":"Blowout","price":50,"duration":45},
    {"name":"Keratin Treatment","price":220,"duration":90},
    {"name":"Trim","price":35,"duration":30},
    {"name":"Beard Trim","price":20,"duration":15},
    {"name":"Eyebrow Wax","price":18,"duration":15}
  ]',
  stylists JSONB NOT NULL DEFAULT '[
    {"name":"Mark","daysOff":[2]},
    {"name":"Sofia","daysOff":[1]},
    {"name":"Jenna","daysOff":[1,2]}
  ]',
  max_concurrent_bookings INTEGER NOT NULL DEFAULT 3,
  coverage_gap_minutes INTEGER NOT NULL DEFAULT 30,
  prompt_instructions TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Enable RLS but allow read/write with anon key (it's a single-owner dashboard)
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to anon" ON salon_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO salon_settings (salon_name, salon_phone, salon_address, salon_hours)
VALUES ('Test Salon', '555-1234', '123 Main St, Garden City NY', 'Monday-Saturday 9am-7pm, Sunday 10am-5pm')
ON CONFLICT DO NOTHING;

-- 2. Call Logs — stores every call with transcript and outcome
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_number TEXT,
  caller_name TEXT,
  stream_sid TEXT,
  call_sid TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB, -- Array of {speaker, text, timestamp}
  transcript_text TEXT, -- Plain text transcript
  booking_detected BOOLEAN NOT NULL DEFAULT false,
  booking JSONB, -- {customerName, service, dateStr, timeStr, phone} from LLM
  booking_created BOOLEAN NOT NULL DEFAULT false,
  booking_calendar_event_id TEXT,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  sms_owner_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'completed', -- completed, missed, voicemail
  summary TEXT, -- LLM-generated call summary
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to anon" ON call_logs FOR ALL USING (true) WITH CHECK (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_number ON call_logs (caller_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_booking_detected ON call_logs (booking_detected);

-- 3. Live call tracking for the real-time dashboard
CREATE TABLE IF NOT EXISTS live_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_number TEXT,
  stream_sid TEXT UNIQUE,
  call_sid TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to anon" ON live_calls FOR ALL USING (true) WITH CHECK (true);

-- Auto-cleanup: remove stale live entries older than 1 hour
-- (run as a cron or the server cleans up on restart)
