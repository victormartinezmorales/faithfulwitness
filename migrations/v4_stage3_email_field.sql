-- =====================================================================
-- Faithful Witness Discernment Experience
-- v4 micro-migration — Stage 3 day-after email scheduling.
-- ADD ONE COLUMN. No drops. No other changes.
-- =====================================================================
--
-- Purpose: track which participants have already received the Stage 3
-- reflection email so the daily Vercel cron job
-- (api/send-pending-stage3-emails) can dedupe.
--
-- The cron query is:
--   SELECT ... FROM submissions
--    WHERE stage3_completed_at IS NOT NULL
--      AND stage3_completed_at < now() - interval '8 hours'
--      AND stage3_email_sent_at IS NULL
--      AND email IS NOT NULL;
--
-- The 8-hour delay window means a participant who finishes Stage 3 late
-- at night gets the email the NEXT morning, not the same morning.
--
-- Guardrails honored:
--   * Additive. v3/v4 columns and rows are not touched.
--   * IF NOT EXISTS makes this idempotent and safe to re-run.
--   * No backfill. Existing completed-Stage-3 rows remain NULL in this
--     column and WILL receive the email on the next cron tick. That's
--     the intended catch-up behavior. If you'd rather not back-send to
--     historical participants, run the one-time UPDATE statement at the
--     bottom of this file BEFORE the cron is deployed (commented out).
--
-- Apply manually after review:
--   psql "$DATABASE_URL" -f migrations/v4_stage3_email_field.sql
-- or paste into the Supabase SQL editor.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS stage3_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS submissions_stage3_email_sent_at_idx
  ON submissions (stage3_email_sent_at)
  WHERE stage3_email_sent_at IS NULL;

COMMENT ON COLUMN submissions.stage3_email_sent_at IS
  'Timestamp the day-after Stage 3 reflection email was successfully '
  'delivered to this participant. NULL means not sent yet. Used by '
  'api/send-pending-stage3-emails (daily cron at 12:00 UTC) to dedupe.';

-- =====================================================================
-- OPTIONAL: suppress catch-up sends for historical participants.
-- Uncomment ONLY if you want to skip sending the Stage 3 email to
-- participants who completed before this feature shipped.
-- =====================================================================
-- UPDATE submissions
--    SET stage3_email_sent_at = now()
--  WHERE stage3_completed_at IS NOT NULL
--    AND stage3_email_sent_at IS NULL;
