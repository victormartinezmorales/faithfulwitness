-- migrations/v5_team_phase1_2.sql
-- Team Dashboard Phase 1 (roles) + Phase 2 (events).
-- ADDITIVE ONLY. No drops, no destructive changes, no edits to existing
-- columns, constraints, or data. Safe to run on the live database.
--
-- Participant records live in public.submissions (there is no separate
-- participants table). participant_id is a nullable, non-unique uuid column
-- on submissions, so the new team tables reference it by value (no FK).
--
-- Team identity (spec Part A2): a team is identified by the leader's
-- participant_id (team_leader_id). Leadership is DERIVED from the invite
-- graph (anyone with invitees leads their own team); team_role stores only
-- explicit assignments (chiefly 'co-leader', set by the leader via the API).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. New columns on submissions
-- ───────────────────────────────────────────────────────────────────────────

-- Editable team display name. Lives on the LEADER's submission row(s).
-- NULL means "use the default": "[FirstName]'s Team".
alter table public.submissions
  add column if not exists team_name text;

comment on column public.submissions.team_name is
  'Editable display name for the team this participant LEADS. NULL = default "[FirstName]''s Team". Set via POST /api/team/:id/name (leader or co-leader only).';

-- Explicit role assignment on the team this participant BELONGS to (via
-- invited_by). NULL = no explicit assignment: role is derived contextually
-- (leader if they have invitees; participant otherwise). 'co-leader' is the
-- only value the v1 API writes; 'leader'/'participant' allowed for forward
-- compatibility per spec A1.
alter table public.submissions
  add column if not exists team_role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'submissions_team_role_check'
      and conrelid = 'public.submissions'::regclass
  ) then
    alter table public.submissions
      add constraint submissions_team_role_check
      check (team_role is null or team_role in ('leader','co-leader','participant'))
      not valid;  -- NOT VALID: never blocks existing rows; enforced on new writes
  end if;
end $$;

comment on column public.submissions.team_role is
  'Explicit role on the team this participant belongs to (invited_by chain). NULL = derived (leader if they have invitees, else participant). Set by the team leader via POST /api/team/:id/role.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. team_events
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.team_events (
  id                   uuid primary key default gen_random_uuid(),
  team_leader_id       uuid not null,          -- leader's participant_id; identifies the team
  added_by             uuid not null,          -- participant_id of leader/co-leader who added it
  title                text not null,
  description          text,
  event_datetime       timestamptz not null,
  location             text,
  source_url           text not null,
  source_platform      text,                   -- derived from URL host
  og_image_url         text,                   -- from Open Graph fetch
  notification_sent_at timestamptz,            -- creation email sent
  reminder_sent_at     timestamptz,            -- 24-hr reminder sent (cron dedupe)
  is_removed           boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint team_events_source_platform_check check (
    source_platform is null or source_platform in
      ('eventbrite','mobilize','facebook','google_calendar','internal','other')
  )
);

comment on table public.team_events is
  'Team events (aggregator-card pattern). Service-role access only; all reads/writes go through /api/team/* which enforces team membership. See Part F privacy notes in v5 migration.';

-- Cron lookup: events needing a reminder (23-25h out, not yet reminded).
create index if not exists team_events_reminder_idx
  on public.team_events (event_datetime)
  where reminder_sent_at is null and is_removed = false;

-- Dashboard lookup: upcoming events for a team.
create index if not exists team_events_team_idx
  on public.team_events (team_leader_id, event_datetime);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. team_event_rsvps
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.team_event_rsvps (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.team_events(id) on delete cascade,
  participant_id uuid not null,
  rsvp_status    text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint team_event_rsvps_status_check check (rsvp_status in ('going','maybe','cant')),
  constraint team_event_rsvps_unique unique (event_id, participant_id)
);

comment on table public.team_event_rsvps is
  'One RSVP per participant per event (upserted on conflict). Service-role access only via /api/team/:id/events/:eid/rsvp.';

create index if not exists team_event_rsvps_event_idx
  on public.team_event_rsvps (event_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. updated_at maintenance (additive trigger; touches only the new tables)
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.fw_touch_updated_at()
returns trigger language plpgsql
set search_path = ''   -- pinned per Supabase linter 0011 (mutable search_path)
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists team_events_touch on public.team_events;
create trigger team_events_touch
  before update on public.team_events
  for each row execute function public.fw_touch_updated_at();

drop trigger if exists team_event_rsvps_touch on public.team_event_rsvps;
create trigger team_event_rsvps_touch
  before update on public.team_event_rsvps
  for each row execute function public.fw_touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Row-level security
-- ───────────────────────────────────────────────────────────────────────────
-- Architecture note (defense in depth, Part F): participants are NOT
-- Supabase auth users — they authenticate to the API by pid query param
-- only. There is therefore no JWT identity on which a membership-based RLS
-- policy could match. The enforceable database-level posture (identical to
-- submissions, see v3_tighten_rls.sql) is:
--   * RLS enabled with NO anon/authenticated policies → deny-all from
--     browsers and any leaked publishable key.
--   * service_role bypasses RLS → the API endpoints and the cron, which
--     enforce the invited_by-chain membership checks in code on every route.
-- If participants ever become auth users, replace this with true
-- membership policies.

alter table public.team_events      enable row level security;
alter table public.team_event_rsvps enable row level security;

-- No policies created intentionally: deny-all for anon/authenticated.
