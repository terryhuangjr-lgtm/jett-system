-- MaggiePM - Opt-in to new public schema grants behavior
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yzmqgldiidpmzritdxfj/sql/new
--
-- This migration:
-- 1. Revokes default auto-grants for NEW tables (opts in to Oct 30 change early)
-- 2. Explicitly GRANTs access to ALL existing tables that the API needs

BEGIN;

-- ==========================================
-- Step 1: Revoke default auto-grants for NEW tables
-- This opts us into the new behavior NOW instead of waiting for Oct 30
-- ==========================================

-- Revoke for the standard roles that Supabase auto-grants to
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, authenticated, service_role, anon
  IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM anon, authenticated, service_role;

-- Also revoke for functions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, authenticated, service_role, anon
  IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM anon, authenticated, service_role;

-- ==========================================
-- Step 2: Explicit GRANTs for EXISTING tables
-- ==========================================

-- Tables that need read access from the dashboard (anon role)
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT ON TABLE public.tenants TO anon;
GRANT SELECT ON TABLE public.leases TO anon;
GRANT SELECT ON TABLE public.payments TO anon;
GRANT SELECT ON TABLE public.tasks TO anon;
GRANT SELECT ON TABLE public.activity_log TO anon;
GRANT SELECT ON TABLE public.expenses TO anon;
GRANT SELECT ON TABLE public.calendar_events TO anon;

-- Tables where the dashboard writes (anon can insert)
GRANT INSERT ON TABLE public.calendar_events TO anon;
GRANT INSERT ON TABLE public.payments TO anon;
GRANT INSERT ON TABLE public.expenses TO anon;

-- Tables that need update from dashboard
GRANT UPDATE ON TABLE public.payments TO anon;
GRANT UPDATE ON TABLE public.tasks TO anon;
GRANT UPDATE ON TABLE public.calendar_events TO anon;

-- Delete/cancel from dashboard
GRANT DELETE ON TABLE public.calendar_events TO anon;

-- Service role (backend / agent) — full access to everything
GRANT ALL ON TABLE public.properties TO authenticated, service_role;
GRANT ALL ON TABLE public.tenants TO authenticated, service_role;
GRANT ALL ON TABLE public.leases TO authenticated, service_role;
GRANT ALL ON TABLE public.payments TO authenticated, service_role;
GRANT ALL ON TABLE public.tasks TO authenticated, service_role;
GRANT ALL ON TABLE public.activity_log TO authenticated, service_role;
GRANT ALL ON TABLE public.expenses TO authenticated, service_role;
GRANT ALL ON TABLE public.calendar_events TO authenticated, service_role;

-- ==========================================
-- Step 3: Views (read-only, select only)
-- ==========================================
GRANT SELECT ON TABLE public.upcoming_lease_expirations TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.monthly_rent_status TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.open_tasks_by_priority TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.monthly_pnl TO anon, authenticated, service_role;

COMMIT;

-- ==========================================
-- Verification queries (run after migration):
-- ==========================================
-- SELECT schemaname, tablename, tableowner
-- FROM pg_catalog.pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
-- ORDER BY table_name, grantee, privilege_type;
