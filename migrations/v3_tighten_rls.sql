-- =====================================================================
-- Faithful Witness — v3 RLS tightening (apply AFTER v3_add_fields.sql is live
-- AND the new code is deployed). Drops the unrestricted SELECT policies on
-- public.submissions so that anon/authenticated can no longer read submission
-- rows directly from Supabase.
--
-- service_role bypasses RLS by design, so:
--   * api/submit.js  (server, service_role)  — keeps inserting
--   * api/dashboard.js (server, service_role) — keeps reading
--
-- Nothing else in the codebase reads submissions via the anon key as of v3.
-- (Pre-v3 dashboard.html did; it was changed in this same release to call
-- /api/dashboard instead.)
--
-- Idempotent: DROP POLICY IF EXISTS only.
-- Reversible: see the COMMENTED-OUT "rollback" block at the bottom.
-- =====================================================================

-- 1. Drop the two open SELECT policies.
DROP POLICY IF EXISTS "Allow public read"        ON public.submissions;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.submissions;

-- 2. (Intentionally left in place) "Allow public insert" — anon can still INSERT.
--    This is harmless: api/submit.js authenticates as service_role and doesn't rely
--    on this policy. If you want maximum lockdown, uncomment the line below.
-- DROP POLICY IF EXISTS "Allow public insert" ON public.submissions;

-- 3. Sanity comment so the next person reading the schema knows the intent.
COMMENT ON TABLE public.submissions IS
  'Discernment Experience submissions. RLS enabled; service_role-only read/write '
  'via api/submit.js and api/dashboard.js. No anon/authenticated SELECT policy. '
  'See migrations/v3_tighten_rls.sql.';

-- =====================================================================
-- Rollback (for reference; do NOT run as part of this migration):
--   CREATE POLICY "Allow public read"        ON public.submissions FOR SELECT TO anon          USING (true);
--   CREATE POLICY "Allow authenticated read" ON public.submissions FOR SELECT TO authenticated USING (true);
-- =====================================================================
