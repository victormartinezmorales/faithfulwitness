-- =====================================================================
-- Faithful Witness Discernment Experience
-- v4 schema migration — Stage 3 fields + Stage 4 infrastructure.
-- ADD only. No drops. No type changes to existing columns.
-- =====================================================================
--
-- Source of truth: FW_Discernment_Spec_v4_Stage3_Stage4.md (§2, §6).
--
-- Guardrails honored:
--   * Every statement is additive. v3 columns and rows are not touched.
--   * IF NOT EXISTS guards make this idempotent and safe to re-run.
--   * No data backfill. v3 rows remain with NULL in Stage 3 columns.
--   * cant_shake_text, journal_entry, sense_of_calling are sensitive
--     (spec §7). Column-level grants restrict read/write to the
--     service-role JWT used by api/submit.js. Anon / authenticated
--     clients keep their existing access to all OTHER columns.
--   * Stage 4 tables (next_steps, next_step_events,
--     participant_recommendations) are created empty. ENABLE_STAGE_4
--     is OFF on the front end; nothing reads or writes these yet.
--
-- Apply manually after review:
--   psql "$DATABASE_URL" -f migrations/v4_stage3_fields.sql
-- or paste into the Supabase SQL editor.

-- =====================================================================
-- 1. Stage 3 fields on submissions (spec §2)
-- =====================================================================

-- Timestamps
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS stage3_started_at   timestamptz;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS stage3_completed_at timestamptz;

-- Q0 — What you can't shake
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cant_shake_text     text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cant_shake_emotions jsonb;

-- Q1 — Specific neighbor or community (multi-select, cap 3)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS specific_neighbor       jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS specific_neighbor_other text;

-- Q2 — Shape of action (single-select)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS action_shape text;

-- Q3 — Contextual focus (multi-select with sub-prompts)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contextual_focus               jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contextual_focus_followups     jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contextual_focus_specific_place text;

-- Q4 — Recalibrated capacity
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_recalibrated text;

-- Q5 — Sense of calling
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sense_of_calling text;

-- Journal + team-share
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS journal_entry      text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS journal_share_team boolean DEFAULT false;

-- Helpful index for the future team dashboard read path.
CREATE INDEX IF NOT EXISTS submissions_stage3_completed_at_idx
  ON submissions (stage3_completed_at);

-- =====================================================================
-- 2. Light constraints — additive, NOT VALID so existing NULLs survive
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_action_shape_enum') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_action_shape_enum
      CHECK (action_shape IS NULL OR action_shape IN (
        'deepen_learning','build_relationship','join_existing',
        'start_in_community','advocate_publicly','accompany_affected','not_yet'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_time_recalibrated_enum') THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_time_recalibrated_enum
      CHECK (time_recalibrated IS NULL OR time_recalibrated IN (
        'same','more','less','no_commit'
      )) NOT VALID;
  END IF;
END $$;

-- =====================================================================
-- 3. Column-level access restriction on Stage 3 sensitive text (spec §7)
-- =====================================================================
-- Service-role bypasses RLS, so api/submit.js continues to read/write
-- everything. Anon and authenticated clients lose SELECT/UPDATE on the
-- three personal-reflection text columns. Same pattern as v3
-- impact_proximity. Every other Stage 3 column remains unrestricted.

DO $$
BEGIN
  EXECUTE 'REVOKE ALL (cant_shake_text)   ON submissions FROM anon';
  EXECUTE 'REVOKE ALL (cant_shake_text)   ON submissions FROM authenticated';
  EXECUTE 'REVOKE ALL (journal_entry)     ON submissions FROM anon';
  EXECUTE 'REVOKE ALL (journal_entry)     ON submissions FROM authenticated';
  EXECUTE 'REVOKE ALL (sense_of_calling)  ON submissions FROM anon';
  EXECUTE 'REVOKE ALL (sense_of_calling)  ON submissions FROM authenticated';
EXCEPTION WHEN OTHERS THEN
  NULL;  -- roles may not exist locally; OK on Supabase prod.
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT ALL (cant_shake_text)  ON submissions TO service_role';
  EXECUTE 'GRANT ALL (journal_entry)    ON submissions TO service_role';
  EXECUTE 'GRANT ALL (sense_of_calling) ON submissions TO service_role';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMENT ON COLUMN submissions.cant_shake_text IS
  'SENSITIVE. Q0 free-text disclosure. Service-role access only. '
  'Never include in broad dashboard views, exports tied to PII, or '
  'external syncs (Mailchimp). See spec §7.';
COMMENT ON COLUMN submissions.journal_entry IS
  'SENSITIVE. Stage 3 closing journal. Service-role access only. '
  'Visible to a team ONLY when journal_share_team is true AND the '
  'future team dashboard surfaces it. See spec §7.';
COMMENT ON COLUMN submissions.sense_of_calling IS
  'SENSITIVE. Q5 open text. Service-role access only. Not exposed '
  'externally. See spec §7.';

-- =====================================================================
-- 4. Stage 4 catalog (spec §6.1) — created empty, read by api/recommend.js
-- =====================================================================
CREATE TABLE IF NOT EXISTS next_steps (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  text NOT NULL,
  why_one_liner          text,
  time_cue               text,
  cta_text               text,
  destination_url        text,
  partner_org            text,
  profile_match          jsonb,
  motivation_match       jsonb,
  gifting_match          jsonb,
  population_match       jsonb,
  action_shape_match     jsonb,
  context_match          jsonb,
  faith_tradition_match  jsonb,
  time_level             text,
  geography              text,
  remote_available       boolean DEFAULT false,
  priority               text DEFAULT 'standard',
  active                 boolean DEFAULT true,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS next_steps_active_idx ON next_steps (active);
CREATE INDEX IF NOT EXISTS next_steps_priority_idx ON next_steps (priority);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_steps_time_level_enum') THEN
    ALTER TABLE next_steps ADD CONSTRAINT next_steps_time_level_enum
      CHECK (time_level IS NULL OR time_level IN (
        'one_time','monthly','weekly_ongoing'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_steps_priority_enum') THEN
    ALTER TABLE next_steps ADD CONSTRAINT next_steps_priority_enum
      CHECK (priority IN ('standard','high')) NOT VALID;
  END IF;
END $$;

-- Lock down writes to service_role; anon/authenticated get read only
-- (so the front end could fetch the catalog directly if we ever choose
-- to skip the recommend endpoint). Today, only api/recommend.js reads it.
ALTER TABLE next_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'GRANT SELECT ON next_steps TO anon';
  EXECUTE 'GRANT SELECT ON next_steps TO authenticated';
  EXECUTE 'GRANT ALL    ON next_steps TO service_role';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='next_steps' AND policyname='next_steps_read_active') THEN
    CREATE POLICY next_steps_read_active ON next_steps
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- =====================================================================
-- 5. Interaction tracking (spec §6.3)
-- =====================================================================
CREATE TABLE IF NOT EXISTS next_step_events (
  id              bigserial PRIMARY KEY,
  participant_id  uuid,
  step_id         uuid REFERENCES next_steps(id) ON DELETE SET NULL,
  event_type      text NOT NULL,
  occurred_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS next_step_events_participant_idx ON next_step_events (participant_id);
CREATE INDEX IF NOT EXISTS next_step_events_step_idx        ON next_step_events (step_id);
CREATE INDEX IF NOT EXISTS next_step_events_type_idx        ON next_step_events (event_type);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_step_events_type_enum') THEN
    ALTER TABLE next_step_events ADD CONSTRAINT next_step_events_type_enum
      CHECK (event_type IN ('shown','clicked','dismissed')) NOT VALID;
  END IF;
END $$;

ALTER TABLE next_step_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'GRANT ALL ON next_step_events           TO service_role';
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE next_step_events_id_seq TO service_role';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================================
-- 6. Recommendation persistence (spec §6.4)
-- =====================================================================
CREATE TABLE IF NOT EXISTS participant_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      uuid,
  step_ids            jsonb,        -- ordered: [primary, alternative, stretch]
  generation_version  text,         -- e.g., 'v4.0'
  generated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participant_recommendations_participant_idx
  ON participant_recommendations (participant_id);
CREATE INDEX IF NOT EXISTS participant_recommendations_generated_at_idx
  ON participant_recommendations (generated_at);

ALTER TABLE participant_recommendations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'GRANT ALL ON participant_recommendations TO service_role';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================================
-- End migration. v3 columns and rows untouched. Stage 4 tables empty.
-- =====================================================================
