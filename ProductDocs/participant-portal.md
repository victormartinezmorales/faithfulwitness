# Participant Portal

**App:** `apps/participant`
**Audience:** Individual Christians engaging with the immigration discernment experience
**Auth:** Anonymous → email magic link after assessment completion
**Mobile:** Mobile-first. Participants are expected to complete the journey on their phone.

---

## North Star

The portal exists to move participants *out* of the portal and into real community. Every piece of content, every resource, every CTA is pointed toward connecting them with a partner organization or regional movement where they can serve. The portal is a bridge, not a destination.

---

## User Journey (MVP)

```
Landing page
  ↓
Start assessment (anonymous — no account required)
  ↓
Stage 1: Discernment (multi-section questionnaire)
  ↓
Stage 1 Results + profile revealed
  ↓
Email + postal code capture → results emailed + account created
  ↓
  [Magic link sent → participant returns later]
  ↓
Personal dashboard
  ↓
Stage 2: Guided Formation
  ↓
Stage 3: Listening / Deep Discernment
  ↓
Stage 4: Personalized Next Steps
  ↓
Org discovery + connection CTA
```

---

## Pages and Features (MVP)

### Landing Page
- Hero with core value proposition
- 4-stage journey overview
- Individuals and teams section
- Coalition partner logos (CCDA, NaLEC, UNDIVIDED, World Relief)
- Primary CTA: "Begin the Experience"
- _(Mirrors the existing `index.html` landing section — port to React)_

### Assessment Flow (Stages 1–4)

The assessment is the core of the participant experience. Each stage is its own route within the participant app.

**Stage 1 — Discernment (Initial Assessment)**
Multi-section questionnaire. Sections:
- Intro / moment of reflection
- Your real-life connection to immigration (exposure)
- Your sense of knowledge and clarity
- How you currently think about immigration (posture)
- Your openness to engaging this topic
- Where you are in your engagement journey (readiness)
- What draws you and how you're wired
- A little about your community and background

Scoring produces three dimensions: `readiness` (1–5), `posture` (1–4), `exposure`.

**Profile assignment logic (waterfall):**
1. readiness = 5 → `faithful_witness`
2. readiness = 4 → `ready_responder`
3. posture ≤ 2 → `careful_seeker`
4. posture 3–4 AND readiness 1–3 → `open_explorer`
5. default → `thoughtful_learner`

**Stage 1 Results Screen**
- Profile name + tagline revealed
- Readiness bar + posture/openness breakdown
- Personalized narrative paragraph
- Curated resource recommendations (tagged by profile + readiness)
- Primary CTA: "Save my results" → email + postal code capture

**Email + postal code capture (post-Stage 1)**
- Collects: email, postal code
- Supabase creates auth user, results emailed via Resend
- Assessment data attached to new user account
- Magic link in email returns them to their dashboard
- _Decision needed: make this blocking (must provide to continue) or optional (can proceed anonymously)_

**Stage 2 — Guided Formation**
Scripture, story, and reflection content. Shape posture toward immigration as a follower of Jesus. Content-driven (readings, prompts). Participants work through sections at their own pace.

**Stage 3 — Listening / Deep Discernment**
One question per screen. More contemplative, generous pacing. Helps participants identify their specific shape: which population, which kind of action, which context.

**Stage 4 — Personalized Next Steps**
- 2–3 concrete next steps shaped by Stage 1 profile + Stage 3 answers
- Curated resource list (filtered by their tags)
- Org connection CTA (see below)

### Personal Dashboard (logged-in participants)

Participants return here via magic link. Shows their journey progress and surfaces next actions.

**Sections:**
- **Profile card** — their profile type (e.g. "Ready Responder"), readiness level, posture label
- **Journey progress** — which stages are complete, which is next
- **Next step** — the single most important action for them right now
- **Resources** — curated list filtered to their profile and tags
- **Connect with a community** — org discovery CTA (see below)

### Org Discovery

Goal: make it as easy as possible for a participant to find a partner organization in their area.

- After Stage 4 (or from dashboard), participant sees partner orgs in their region (matched by postal code → region)
- Each org card: name, type, city, Micah Catalyst name, short description
- "Learn more" → org detail page (name, mission, how to get involved, contact)
- "I'm interested" button → creates `org_interest` record, notifies org admin and regional catalyst
- _(See the existing `index.html` org cards for visual reference)_

### Resources Library

Curated collection of external resources. Each resource has tags (faith, compassion, exploring, justice, advocacy, etc.) that match to participant profiles and readiness levels.

Initial resources from prototype:
- 7-Day Prayer Guide: Love Your Neighbors
- Guide to Respectful Conversations about Immigration
- Manual for Pastors & Church Leaders
- Advent Welcome: Overview
- Know Your Rights
- God's Household: Overview
- Sermon Outlines: Welcoming the Stranger

---

## Data Collected (minimum viable — privacy-first)

| Field | When | Why |
|---|---|---|
| Email | Post-Stage 1 | Account creation + magic link |
| Postal code | Post-Stage 1 | Region matching for org discovery |
| Stage 1 answers | Stage 1 completion | Profile calculation + future reference |
| Profile key | Stage 1 completion | Personalization throughout |
| Readiness / posture / exposure scores | Stage 1 completion | Dashboard display + filtering |
| Stage 2–4 completion status | As completed | Progress tracking |
| Stage 3 answers | Stage 3 completion | Personalized next steps |
| Org interest clicks | When clicked | Routing to catalyst + partner |

No name required. No demographic data beyond postal code.

---

## Auth

- Anonymous until post-Stage 1 email capture
- Magic link via Resend (Supabase Auth SMTP)
- Session persists across visits — participants return to their dashboard
- Future: Google / Apple OAuth as alternative login

---

## Emails Sent to Participants

| Email | Trigger | Content |
|---|---|---|
| Stage 1 results | Stage 1 completion + email capture | Profile, scores, personalized narrative, 3 resources, link to dashboard |
| Magic link | Every login request | Login link |
| Stage completion nudge | _Post-MVP_ | Reminder to continue to next stage |

---

## Route Structure

```
/                         Landing page
/start                    Assessment entry point
/assessment/stage-1       Stage 1 questionnaire
/assessment/results       Stage 1 results + email capture
/assessment/stage-2       Guided Formation
/assessment/stage-3       Listening / Discernment
/assessment/stage-4       Personalized Next Steps
/dashboard                Personal dashboard (auth required)
/resources                Resources library (auth required)
/orgs                     Org discovery (auth required)
/orgs/[id]                Org detail page
```

---

## Open Decisions

- Should participants be blocked from continuing past Stage 1 without providing email? Or can they proceed anonymously and claim results later? _(Recommend: gated — email is the minimum data we need to serve them over time)_
- Google / Apple OAuth for MVP or post-MVP?
- How long does a magic link session stay active before re-authentication?
