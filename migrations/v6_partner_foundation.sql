-- migrations/v6_partner_foundation.sql
-- Partner Network Dashboard, Phase 1 foundation.
-- ADDITIVE ONLY. No drops, no destructive changes, no edits to existing
-- columns or data. Participant records live in public.submissions.
--
-- Sources of truth honored here:
--   * Partner Slug Convention v1 — slug format check, registry seed, retired-
--     slug semantics (is_active=false, retired_at).
--   * Data Promise v1 — deny-all RLS posture; partner_access_log for audit.
--   * Attribution ruling (Victor, 2026-06-10): a participant's network
--     attribution = own referral_source when invited_by IS NULL (they are a
--     chain root); otherwise inherited from the ROOT of their invited_by
--     chain. Invited participants' own utm_source never overrides the chain.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. partners (the slug registry, operationalized)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.partners (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  organization_name text not null,
  full_legal_name   text,
  is_active         boolean not null default true,
  onboarded_at      timestamptz not null default now(),
  retired_at        timestamptz,
  notes             text,
  -- Slug Convention naming rules: lowercase letters/digits/hyphens, 3-30 chars.
  constraint partners_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$')
);

comment on table public.partners is
  'Partner slug registry (Slug Convention v1). Slugs are permanent: retire (is_active=false, retired_at set), never delete or reassign.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. partner_users
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.partner_users (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id),
  email         text not null,             -- stored lowercase; compared lowercase
  full_name     text,
  role          text not null default 'viewer',
  is_active     boolean not null default true,
  invited_at    timestamptz not null default now(),
  last_login_at timestamptz,
  constraint partner_users_role_check check (role in ('viewer','admin')),
  constraint partner_users_email_partner_unique unique (email, partner_id)
);

create index if not exists partner_users_email_idx on public.partner_users (email);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. partner_sessions (magic-link login flow)
-- ───────────────────────────────────────────────────────────────────────────
-- Tokens are NEVER stored raw: both magic_link_token and session_token hold
-- sha256 hex digests. The raw values exist only in the emailed link and the
-- HTTP-only cookie respectively.
--
-- Spec note: the prompt lists session_token as "unique not null", but flow
-- B1 creates the row BEFORE login with session_token = NULL ("not yet logged
-- in"). Resolved as nullable + unique (Postgres allows multiple NULLs in a
-- unique column); NOT NULL is unachievable in the specced flow.

create table if not exists public.partner_sessions (
  id                    uuid primary key default gen_random_uuid(),
  partner_user_id       uuid not null references public.partner_users(id),
  session_token         text unique,        -- sha256; NULL until magic link used
  magic_link_token      text,               -- sha256
  magic_link_expires_at timestamptz,
  session_expires_at    timestamptz,
  created_at            timestamptz not null default now(),
  used_at               timestamptz
);

create index if not exists partner_sessions_magic_idx
  on public.partner_sessions (magic_link_token) where magic_link_token is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. partner_access_log (Data Promise F3 — audit only, 90-day retention)
-- ───────────────────────────────────────────────────────────────────────────
-- Retention is enforced opportunistically by the API (each insert deletes
-- rows older than 90 days) rather than by a new cron, per the guardrail
-- against touching cron infrastructure.

create table if not exists public.partner_access_log (
  id              bigint generated always as identity primary key,
  partner_user_id uuid,
  partner_id      uuid,
  endpoint        text,
  occurred_at     timestamptz not null default now(),
  user_agent      text,
  ip_address      text
);

create index if not exists partner_access_log_when_idx
  on public.partner_access_log (occurred_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Network attribution function (Part C — the recursive CTE, Option 1)
-- ───────────────────────────────────────────────────────────────────────────
-- Returns the deduped participant_ids attributed to a partner slug.
-- Dedupe rule matches the platform convention: a pid can have multiple
-- submission rows; the LATEST row (created_at) supplies invited_by /
-- referral_source. Roots: invited_by IS NULL AND referral_source = slug.
-- Everyone downstream of a root inherits the root's attribution.

create or replace function public.fw_network_members(p_slug text)
returns table (member_pid uuid)
language sql
stable
set search_path = ''
as $$
  with recursive latest as (
    select distinct on (participant_id)
      participant_id, invited_by, referral_source
    from public.submissions
    where participant_id is not null
    order by participant_id, created_at desc
  ),
  chain as (
    select l.participant_id
    from latest l
    where l.invited_by is null
      and l.referral_source = p_slug
    union all
    select l.participant_id
    from latest l
    join chain c on l.invited_by = c.participant_id::text
  )
  select participant_id from chain;
$$;

comment on function public.fw_network_members(text) is
  'Network attribution (Slug Convention v1 + 2026-06-10 ruling): chain roots with referral_source = slug, plus their full invite subtree. Invoked via service-role RPC from /api/partner/*.';

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Row-level security
-- ───────────────────────────────────────────────────────────────────────────
-- Same posture as v3/v5 (documented there): partner_users are NOT Supabase
-- auth users — they authenticate via app-level magic-link sessions — so
-- there is no JWT identity for per-user policies ("a viewer can SELECT only
-- their own partner") to match against. The enforceable database posture is
-- RLS enabled with NO anon/authenticated policies (deny-all from any leaked
-- publishable key), service_role bypassing RLS, and the per-partner scoping
-- enforced in code on every /api/partner/* route (Part F1). If partner
-- accounts move to Supabase Auth later, replace with true per-user policies.
-- Existing policies on submissions are untouched.

alter table public.partners           enable row level security;
alter table public.partner_users      enable row level security;
alter table public.partner_sessions   enable row level security;
alter table public.partner_access_log enable row level security;

-- No policies created intentionally: deny-all for anon/authenticated.

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Seeds — registry per Slug Convention v1
-- ───────────────────────────────────────────────────────────────────────────

insert into public.partners (slug, organization_name, full_legal_name, notes) values
  ('ccda',          'CCDA',                  'Christian Community Development Association', null),
  ('nalec',         'NaLEC',                 'National Latino Evangelical Coalition',       null),
  ('worldrelief',   'World Relief',          'World Relief',                                null),
  ('undivided',     'Undivided',             'Undivided',                                   null),
  ('crossroads-es', 'Crossroads en Español', 'Crossroads en Español, Cincinnati',
     'Pending/reserved per registry: activates when their first attributed link is published.'),
  ('internal',      'Internal / staff',      'Faithful Witness platform staff',
     'Staff testing and internal traffic. Excluded from partner-facing UI.')
on conflict (slug) do nothing;

-- Staff-only seed users (per Part A: "seed only platform staff emails...
-- Confirm with me before any partner email goes in"). Victor gets admin on
-- every registered partner so each dashboard can be exercised end-to-end
-- before partner contacts are confirmed.

insert into public.partner_users (partner_id, email, full_name, role)
select p.id, 'victor.martinez@crossroads.net', 'Victor Martinez', 'admin'
from public.partners p
on conflict (email, partner_id) do nothing;
