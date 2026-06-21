-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/fhmjvnphxsbtwcutqkvq/sql/new)
-- to enable Realtime on the call_logs table for the voice agent dashboard.

ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
