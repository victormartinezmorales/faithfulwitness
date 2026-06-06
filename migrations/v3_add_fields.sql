-- =====================================================================
-- Faithful Witness Discernment Experience
-- v3 schema migration — ADD columns only. No drops, no type changes.
-- =====================================================================
--
-- Source of truth: FW_Discernment_Assessment_Spec_v3.md (§2, §3, §4, §6).
--
-- Guardrails honored:
--   * Every statement is additive. Existing columns and existing rows are not touched.
--   * IF NOT EXISTS guards make this idempotent and safe to re-run.
--   * No data backfill is performed here. New rows will populate new columns; old rows keep
--     their existing fields and have NULL in the new columns.
--   * impact_proximity is access-restricted via row-level security (RLS): only the
--     service-role JWT (used by the api/submit.js serverless function) can read or write
--     this column. anon and authenticated clients can read/write everything else, but
--     cannot select or update impact_proximity. This is per spec §6.
--
-- Apply manually after review:
--   psql "$DATABASE_URL" -f migrations/v3_add_fields.sql
-- or paste into the Supabase SQL editor.

-- =====================================================================
-- 1. Core record (spec §2)
-- =====================================================================
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS participant_id     uuid;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assessment_version text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at         timestamptz;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS completed_at       timestamptz;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS profile_assigned   text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS team_code          text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS invited_by         text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS referral_source    text;

-- Indexes that make longitudinal queries cheap.
CREATE INDEX IF NOT EXISTS submissions_participant_id_idx ON submissions (participant_id);
CREATE INDEX IF NOT EXISTS submissions_team_code_idx      ON submissions (team_code);
CREATE INDEX IF NOT EXISTS submissions_completed_at_idx   ON submissions (completed_at);

-- =====================================================================
-- 2. Dimensions D1–D7 (spec §3)
-- =====================================================================
-- D1 Exposure
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS exposure_level int;

-- D2 Understanding (two items)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS understanding_informed   int;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS understanding_confidence int;

-- D3 Perspective hybrid: slider 0–100 + "unsure" boolean
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS perspective_lean   int;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS perspective_unsure boolean DEFAULT false;

-- D4 Posture
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS posture_openness int;

-- D5 Motivation (array). Stored as jsonb for flexibility; values are short strings.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS motivation_arr jsonb;

-- D6 Readiness (1–5, includes apathy floor)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS readiness_stage int;

-- D7 Gifting (array, max 2 client-side)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS gifting_arr jsonb;

-- =====================================================================
-- 3. Context C1–C6 (spec §4)
-- =====================================================================
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS faith_tradition    text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS leadership_context jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS engaging_for       text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_capacity      text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS burning_question   text;

-- C4 Personal impact — sensitive. Restricted further below.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS impact_proximity int;

-- =====================================================================
-- 4. Constraints — light, additive, non-destructive
-- =====================================================================
-- These NOT VALID checks won't block existing NULLs but enforce ranges going forward.
-- They use IF NOT EXISTS via a guarded DO block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_exposure_level_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_exposure_level_range
      CHECK (exposure_level IS NULL OR (exposure_level BETWEEN 1 AND 4)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_posture_openness_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_posture_openness_range
      CHECK (posture_openness IS NULL OR (posture_openness BETWEEN 1 AND 4)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_readiness_stage_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_readiness_stage_range
      CHECK (readiness_stage IS NULL OR (readiness_stage BETWEEN 1 AND 5)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_understanding_informed_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_understanding_informed_range
      CHECK (understanding_informed IS NULL OR (understanding_informed BETWEEN 1 AND 5)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_understanding_confidence_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_understanding_confidence_range
      CHECK (understanding_confidence IS NULL OR (understanding_confidence BETWEEN 1 AND 5)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_perspective_lean_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_perspective_lean_range
      CHECK (perspective_lean IS NULL OR (perspective_lean BETWEEN 0 AND 100)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_impact_proximity_range') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_impact_proximity_range
      CHECK (impact_proximity IS NULL OR (impact_proximity BETWEEN 1 AND 4)) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_profile_assigned_enum') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_profile_assigned_enum
      CHECK (profile_assigned IS NULL OR profile_assigned IN (
        'open_explorer','thoughtful_learner','careful_seeker','ready_responder','faithful_witness'
      )) NOT VALID;
  END IF;
END $$;

-- =====================================================================
-- 5. RLS / access restriction on impact_proximity (spec §6)
-- =====================================================================
-- The submissions table almost certainly already has RLS enabled for use with the
-- Supabase REST API. The serverless function (api/submit.js) authenticates as the
-- service_role (SUPABASE_SERVICE_KEY), which BYPASSES RLS by design — so existing
-- inserts continue to work without change.
--
-- The goal here is to ensure that any non-service-role client (anon JWT, dashboard
-- views shared with humans, future read-only API tokens) cannot read or write the
-- impact_proximity column, even if they otherwise have access to the table.
--
-- We do this with column-level GRANT REVOKE plus an explicit RLS policy that
-- excludes impact_proximity from any policy granted to anon/authenticated.

-- Make sure RLS is on. (No-op if it already is.)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Column-level privilege: only service_role can SELECT or UPDATE impact_proximity.
-- The anon and authenticated roles get every other column but not this one.
DO $$
BEGIN
  -- Revoke any blanket grants on the column for non-service roles.
  EXECUTE 'REVOKE ALL (impact_proximity) ON submissions FROM anon';
  EXECUTE 'REVOKE ALL (impact_proximity) ON submissions FROM authenticated';
EXCEPTION WHEN OTHERS THEN
  -- Roles may not exist locally; ignore. On Supabase prod, both will exist.
  NULL;
END $$;

-- Belt and braces: grant explicit ALL on the column to service_role.
DO $$
BEGIN
  EXECUTE 'GRANT ALL (impact_proximity) ON submissions TO service_role';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Comment on the column so anyone browsing the schema knows the rule.
COMMENT ON COLUMN submissions.impact_proximity IS
  'SENSITIVE. Proximity of lived experience with immigration (spec §C4, 1-4). '
  'Service-role access only. NEVER include in dashboard views, exports tied to PII, '
  'or external syncs (e.g. Mailchimp). See FW_Discernment_Assessment_Spec_v3.md §6.';

-- =====================================================================
-- End migration. No rows changed. No existing columns altered.
-- =====================================================================
