-- Huang Family Hub - Opt-in to new public schema grants behavior
-- Run in: https://supabase.com/dashboard/project/igllbezrxxdpggjxhfno/sql/new

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

-- calendar_events: full CRUD from dashboard + agent
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_events TO anon;
GRANT ALL ON TABLE public.calendar_events TO authenticated, service_role;

-- tasks: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO anon;
GRANT ALL ON TABLE public.tasks TO authenticated, service_role;

-- shopping_list: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shopping_list TO anon;
GRANT ALL ON TABLE public.shopping_list TO authenticated, service_role;

-- meal_plan: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meal_plan TO anon;
GRANT ALL ON TABLE public.meal_plan TO authenticated, service_role;

-- watchlist: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlist TO anon;
GRANT ALL ON TABLE public.watchlist TO authenticated, service_role;

-- restaurants: full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurants TO anon;
GRANT ALL ON TABLE public.restaurants TO authenticated, service_role;

COMMIT;
