-- StoreIQ Demo - Opt-in to new public schema grants behavior
-- Run in: https://supabase.com/dashboard/project/fhmjvnphxsbtwcutqkvq/sql/new

BEGIN;

-- ==========================================
-- Step 1: Revoke default auto-grants for NEW tables
-- ==========================================
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, authenticated, service_role, anon
  IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres, authenticated, service_role, anon
  IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM anon, authenticated, service_role;

-- ==========================================
-- Step 2: GRANTs for EXISTING tables
-- ==========================================

-- stores: read-only for anon (dashboard), full for service
GRANT SELECT ON TABLE public.stores TO anon;
GRANT ALL ON TABLE public.stores TO authenticated, service_role;

-- metrics: read-only for dashboard, write for backend
GRANT SELECT ON TABLE public.metrics TO anon;
GRANT ALL ON TABLE public.metrics TO authenticated, service_role;

-- alerts: read for dashboard, write for backend
GRANT SELECT, UPDATE ON TABLE public.alerts TO anon;
GRANT ALL ON TABLE public.alerts TO authenticated, service_role;

-- reports: read for dashboard
GRANT SELECT ON TABLE public.reports TO anon;
GRANT ALL ON TABLE public.reports TO authenticated, service_role;

-- product_performance: read for dashboard
GRANT SELECT ON TABLE public.product_performance TO anon;
GRANT ALL ON TABLE public.product_performance TO authenticated, service_role;

-- channel_breakdown: read for dashboard
GRANT SELECT ON TABLE public.channel_breakdown TO anon;
GRANT ALL ON TABLE public.channel_breakdown TO authenticated, service_role;

-- activity_log: read for dashboard, write for backend
GRANT SELECT ON TABLE public.activity_log TO anon;
GRANT ALL ON TABLE public.activity_log TO authenticated, service_role;

-- customer_segments: read for dashboard
GRANT SELECT ON TABLE public.customer_segments TO anon;
GRANT ALL ON TABLE public.customer_segments TO authenticated, service_role;

-- customers: read for dashboard
GRANT SELECT ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated, service_role;

-- cohort_data: read for dashboard
GRANT SELECT ON TABLE public.cohort_data TO anon;
GRANT ALL ON TABLE public.cohort_data TO authenticated, service_role;

-- call_logs: voice agent write, dashboard read
GRANT SELECT ON TABLE public.call_logs TO anon;
GRANT ALL ON TABLE public.call_logs TO authenticated, service_role;

-- salon_settings: voice agent write, dashboard read
GRANT SELECT ON TABLE public.salon_settings TO anon;
GRANT ALL ON TABLE public.salon_settings TO authenticated, service_role;

-- live_calls: voice agent CRUD
GRANT ALL ON TABLE public.live_calls TO authenticated, service_role;

COMMIT;
