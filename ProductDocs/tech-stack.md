# Technical Architecture

## Monorepo Structure

```
faithfulwitness/
├── apps/
│   ├── participant/          # Next.js App Router — public-facing discernment experience
│   ├── catalyst/             # Next.js App Router — Micah Catalyst regional workspace
│   ├── partner/              # Next.js App Router — Partner org analytics
│   └── admin/                # Next.js App Router — FW internal dashboard
├── packages/
│   ├── design-system/        # @faithfulwitness/design-system (React component library)
│   ├── supabase/             # Shared client, generated types, RLS helpers
│   ├── types/                # Shared TypeScript interfaces (user roles, profiles, events)
│   └── email/                # Resend email templates
├── turbo.json
├── package.json
└── .design-sync/             # Claude Design sync config + component previews
```

## Framework Decisions

### Next.js 15 App Router (all four apps)
- Server Components handle data-heavy pages without client-side loading states
- Built-in routing, layouts, and middleware — no extra router needed
- Vercel deploys Next.js apps with zero config
- Best compatibility with AI coding agents (well-understood patterns)
- Each app is an independent Next.js project — separate `package.json`, separate Vercel deployment

### Turborepo
- `packages/` dependencies are resolved automatically across apps
- Build caching: only rebuilds what changed
- `turbo run build` builds all four apps in dependency order
- Native Vercel integration — CI just works

## Backend

### Supabase (fresh project)
- **Auth**: magic link email for all user types; Google and Apple OAuth as future addition for participants
- **Database**: Postgres with Row Level Security — each role's policies live in `packages/supabase/`
- **Storage**: logo assets for partner orgs (post-MVP)
- **SMTP**: configured to use Resend so Supabase auth emails (magic links) go through the same provider as assessment result emails

### Database Schema (MVP)

```sql
-- Core user profile (extends auth.users)
profiles (
  id          uuid references auth.users primary key,
  email       text,
  postal_code text,
  role        text check (role in ('participant','catalyst','partner_admin','fw_admin')),
  region_id   uuid references regions,
  org_id      uuid references organizations,
  created_at  timestamptz default now()
)

-- The 11 Micah Catalyst regions
regions (
  id           uuid primary key,
  name         text,         -- e.g. "Chicago, IL"
  city         text,
  state        text,
  catalyst_id  uuid references profiles
)

-- Coalition partner organizations
organizations (
  id          uuid primary key,
  name        text,
  region_id   uuid references regions,
  created_at  timestamptz
)

-- Multiple admins per org
org_admins (
  org_id   uuid references organizations,
  user_id  uuid references profiles,
  primary key (org_id, user_id)
)

-- Assessment responses (one row per completed stage)
assessments (
  id              uuid primary key,
  user_id         uuid references profiles,
  stage           integer check (stage in (1, 2, 3, 4)),
  completed_at    timestamptz,
  profile_key     text,   -- faithful_witness, ready_responder, etc.
  readiness_score integer,
  posture_score   integer,
  exposure_score  integer,
  answers         jsonb,  -- raw question responses
  unique (user_id, stage)
)

-- Micah Catalyst events / cohorts
events (
  id          uuid primary key,
  region_id   uuid references regions,
  title       text,
  description text,
  event_date  timestamptz,
  created_by  uuid references profiles
)

-- Event RSVPs
event_rsvps (
  event_id  uuid references events,
  user_id   uuid references profiles,
  status    text check (status in ('going','maybe','cant')),
  primary key (event_id, user_id)
)

-- Org interest (participant clicked "Connect" on an org)
org_interests (
  id         uuid primary key,
  user_id    uuid references profiles,
  org_id     uuid references organizations,
  created_at timestamptz default now()
)
```

### Row Level Security Policies (summary)

| Table | Participant | Catalyst | Partner Admin | FW Admin |
|---|---|---|---|---|
| `profiles` | Own row only | Region's participants | Own row only | All |
| `assessments` | Own rows only | Region's participants | None | All |
| `events` | Read own region | Full CRUD own region | None | All |
| `organizations` | Read only | Read only | Own org | All |
| `org_interests` | Own rows | Region's | Own org's | All |

## Email (Resend)

Use Resend — not MailChimp — for all transactional email. MailChimp is built for marketing newsletters; Resend is purpose-built for programmatic/transactional email and integrates directly with Supabase Auth.

| Email | Trigger |
|---|---|
| Magic link — participant | After assessment: email + postal code capture |
| Assessment results | Immediately after Stage 1 completion |
| Magic link — catalyst / partner / admin | Login flow |
| Event invitation (catalyst → participants) | Catalyst creates event |
| Nudge email (catalyst → participant) | Manual from catalyst dashboard |

Templates live in `packages/email/` as React Email components.

## Auth Flows by Role

### Participant
1. Takes assessment anonymously (no account required)
2. After Stage 1 completion: prompted for email + postal code to receive results
3. Supabase creates account, sends magic link + results email via Resend
4. Returns via magic link → lands on personal dashboard
5. Future: Google / Apple OAuth as alternative

### Micah Catalyst, Partner Admin, FW Admin
1. Account created by FW Admin in the admin portal
2. Magic link sent to their email
3. Role + region/org assigned at creation — enforced by RLS

## Deployment

Each app deploys as a separate Vercel project from the same monorepo repo:

| App | Vercel Root | URL pattern |
|---|---|---|
| `participant` | `apps/participant` | `faithfulwitness.us` |
| `catalyst` | `apps/catalyst` | `catalyst.faithfulwitness.us` or `faithfulwitness.us/catalyst` |
| `partner` | `apps/partner` | `partners.faithfulwitness.us` or `faithfulwitness.us/partners` |
| `admin` | `apps/admin` | `admin.faithfulwitness.us` |

> URL structure (path vs subdomain) is a decision to make before launch. Path-based routing (`faithfulwitness.us/catalyst`) is simpler for Supabase auth cookies. Subdomain routing is cleaner UX for distinct audiences.

## Design System

`packages/design-system/` is `@faithfulwitness/design-system` — the existing 12-component React library synced to Claude Design at `https://claude.ai/design/p/6a00c236-e5fa-4b73-9e2a-b191bce3f714`.

All four apps import from this package. New components added here are automatically available to all apps after rebuild.

## Mobile

All four portals must be fully responsive. Participant is the highest mobile-priority (users will complete the assessment on their phone). Catalyst is second (regional leaders on the go). Design mobile-first for participant, adapt for larger screens.
