-- Migration: add missing columns and set up retention
-- Run this in Supabase SQL Editor after the base setup.sql

-- 1. Add recording columns (if not already present)
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_duration INTEGER;

-- 2. Cleanup function: removes call logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_call_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM call_logs
  WHERE started_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 3. Enable the pg_cron extension if available (optional)
-- If you're on Supabase, you can schedule this via their cron UI:
-- https://supabase.com/dashboard/project/fhmjvnphxsbtwcutqkvq/database/cron-jobs
-- Or run manually: SELECT cleanup_old_call_logs();
