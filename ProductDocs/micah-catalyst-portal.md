# Micah Catalyst Portal

**App:** `apps/catalyst`
**Audience:** Regional leaders (Micah Catalysts) — one per region, assigned by FW Admin
**Auth:** Email magic link (account created by FW Admin)
**Mobile:** Fully responsive. Catalysts are often on the go.

---

## Role Overview

Micah Catalysts are the human connective tissue between the FaithfulWitness experience and partner organizations on the ground. Today they do this work manually — phone calls, spreadsheets, personal follow-up. This portal digitizes and streamlines that process so they can spend more time on relationship and less on logistics.

A Catalyst's job in the portal:
- See who in their region has gone through the experience and where they are in the journey
- Create and manage cohorts/events for participants to gather
- Nudge participants who have stalled in their journey
- Connect participants expressing org interest to the right partner organization
- View aggregate data on their region's engagement

---

## Regions (11 Established Movement)

Each Catalyst is assigned to one region. The region contains participants (matched by postal code), partner organizations, and events.

Regions shown in the prototype: Chicago IL, Cincinnati OH, Cleveland OH, Dallas TX, Detroit MI, El Paso TX, and 5 others. Each has a named Catalyst from one of the coalition orgs (CCDA, NaLEC, UNDIVIDED, World Relief).

---

## Pages and Features (MVP)

### Dashboard (Home)

Overview of the region at a glance.

**Stats cards:**
- Total participants in region
- Participants who have completed Stage 1
- Participants ready for next step (readiness ≥ 4)
- Participants who have expressed org interest

**Profile breakdown:**
- Count per profile type (Faithful Witness, Ready Responder, Careful Seeker, Open Explorer, Thoughtful Learner) — matches the existing `dashboard.html` donut chart style

**Upcoming events:**
- Next 2–3 events in the region with RSVP counts

**Recent activity feed:**
- New participant completions in the region
- New org interest expressions
- Recent event RSVPs

---

### Participant List

Full list of participants in the catalyst's region.

**Columns / card info:**
- Name (or "Anonymous" if not provided — email only)
- Profile type with color indicator
- Readiness level (1–5)
- Stages completed (progress indicator)
- Org interest expressed (yes/no)
- Last activity date

**Actions per participant:**
- Send nudge email (pre-written, catalyst can customize a short message)
- View participant detail (profile scores, stage completion, org interest)

**Filters:**
- By profile type
- By readiness level
- By stage completed
- By org interest (yes/no)

---

### Events / Cohorts

Catalysts create events to gather participants in their region — in-person or virtual gatherings, study groups, action planning sessions.

**Event list view:**
- Upcoming and past events
- RSVP count per event (Going / Maybe / Can't)
- Create new event button

**Create/edit event:**
- Title, description, date/time, location (or virtual link)
- On creation: option to notify all participants in the region via email (Resend)
- Participants see and RSVP from their dashboard _(Post-MVP — MVP is catalyst-only management)_

**Event detail:**
- RSVP list — who's going, maybe, can't
- Option to send reminder to Going/Maybe attendees

---

### Org Connections

List of participants in the region who have clicked "I'm interested" on a partner org.

**View:**
- Participant (email), org they expressed interest in, date clicked
- Status: Pending / Connected / Not a fit _(status set manually by catalyst)_

**Action:**
- Manually follow up (send nudge email to participant)
- Mark as connected once relationship is established

---

### Region Overview

Read-only summary of the catalyst's region:
- Region name and geography
- Assigned partner organizations in the region
- Catalyst's own contact info (name, org affiliation, email)

---

## Auth

- Account created by FW Admin with role = `catalyst` and `region_id` assigned
- Magic link sent to their email at account creation
- RLS ensures catalysts can only see participants and data within their own region

---

## Emails Sent by Catalyst Portal

| Email | Trigger | Content |
|---|---|---|
| Nudge to participant | Manual send from participant list | Custom short message + link to their dashboard |
| Event invitation | Catalyst creates event + checks "notify region" | Event details + RSVP link |
| Event reminder | Manual from event detail | Reminder to registered attendees |

---

## Route Structure

```
/                        Dashboard / home
/participants            Participant list
/participants/[id]       Participant detail
/events                  Events list
/events/new              Create event
/events/[id]             Event detail + RSVPs
/connections             Org interest / connection queue
/region                  Region overview
```

---

## Open Decisions

- Should participants be able to RSVP to events from their own dashboard (MVP) or is RSVP management catalyst-only for now? _(Recommend: catalyst-only for MVP, participant RSVP post-MVP)_
- Does a catalyst need to be able to message participants outside of the nudge email flow (e.g. a thread / conversation history)? _(Post-MVP)_
