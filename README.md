# Faithful Witness Portal

A Gospel-rooted discernment platform helping Christians navigate their faith and engagement with immigration. The portal connects participants with Scripture, story, and reflection — then routes them toward organizations where they can serve.

## What This Is

The Faithful Witness experience guides participants through a 4-stage discernment journey. At the end, it surfaces a personalized profile and connects them with partner organizations and regional leaders in their area. The platform is built by and for the four founding coalition organizations: CCDA, NaLEC, UNDIVIDED, and World Relief.

## Portal Architecture

This is a **Turborepo monorepo** with four independent Next.js apps sharing a common design system, Supabase backend, and type layer.

```
apps/
  participant/          Discernment journey + personal dashboard
  catalyst/             Regional leader (Micah Catalyst) workspace
  partner/              Partner organization analytics
  admin/                FaithfulWitness internal dashboard + user management
packages/
  design-system/        @faithfulwitness/design-system — React component library
  supabase/             Shared Supabase client, types, and RLS helpers
  types/                Shared TypeScript interfaces across all apps
  email/                Transactional email templates (Resend)
```

## User Roles

| Role | Portal | Description |
|---|---|---|
| **Participant** | `/apps/participant` | Takes the discernment journey, tracks progress, discovers orgs |
| **Micah Catalyst** | `/apps/catalyst` | Regional leader managing participants, cohorts, and connections |
| **Partner Org Admin** | `/apps/partner` | Organization admin viewing attribution analytics and participant interest |
| **FW Admin** | `/apps/admin` | Internal FaithfulWitness team — full insights, user management |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | Best AI-agent compatibility, native Vercel support, RSC for data-heavy dashboards |
| Monorepo | Turborepo | Vercel-native, handles `packages/` dependencies and build caching |
| Auth + DB | Supabase | Auth, RLS, Postgres — single backend for all four apps |
| Email | Resend | Transactional magic links and assessment results emails (Supabase SMTP integration) |
| Styling | Design system + Tailwind | `@faithfulwitness/design-system` for components, Tailwind for layout glue |
| Deployment | Vercel | One repo, separate Vercel projects per app |
| Language | TypeScript | Shared types across all apps via `packages/types` |

> **Note on email:** MailChimp is suited for marketing newsletters. For transactional email (magic links, assessment results) use Resend — it integrates directly with Supabase Auth and is purpose-built for this.

## Participant Profiles

The assessment produces one of five profiles based on readiness × posture × exposure:

| Profile | Description |
|---|---|
| **Faithful Witness** | Already engaged — wants to go deeper and lead others |
| **Ready Responder** | Prepared to act — needs clarity on how |
| **Careful Seeker** | Approaching with honesty and care — faithful starting place |
| **Open Explorer** | Open and curious — ready to go deeper |
| **Thoughtful Learner** | Some connection — ready to understand more deeply |

## Regions

11 Established Movement regions, each with an assigned Micah Catalyst from one of the four coalition organizations.

## Product Documentation

See `ProductDocs/` for detailed specs per portal:

- [`ProductDocs/tech-stack.md`](ProductDocs/tech-stack.md) — full technical decisions and project structure
- [`ProductDocs/participant-portal.md`](ProductDocs/participant-portal.md) — discernment journey + participant dashboard
- [`ProductDocs/micah-catalyst-portal.md`](ProductDocs/micah-catalyst-portal.md) — regional leader workspace
- [`ProductDocs/partner-org-portal.md`](ProductDocs/partner-org-portal.md) — partner organization dashboard
- [`ProductDocs/fw-admin-portal.md`](ProductDocs/fw-admin-portal.md) — internal admin dashboard
- [`ProductDocs/post-mvp-wishlist.md`](ProductDocs/post-mvp-wishlist.md) — future features and ideas

## MVP Target

August 2026. Priority order: Participant → FW Admin → Micah Catalyst → Partner Org.
