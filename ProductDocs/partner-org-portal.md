# Partner Organization Portal

**App:** `apps/partner`
**Audience:** Staff at partner organizations who want to see how their org is performing and connect with interested participants
**Auth:** Email magic link (accounts created by FW Admin or another org admin)
**Mobile:** Fully responsive.

---

## Role Overview

Partner organizations are the on-ramps for participants who are ready to serve. They need to know:
- How many participants have expressed interest in their org
- What those participants look like (profile type, readiness)
- How to follow up with interested participants

MVP scope is analytics + participant connection. Configuration (logos, messaging, custom profiles) is post-MVP.

---

## Multi-Admin Model

Each organization can have multiple admin accounts. All admins for an org see the same data and have the same permissions. Accounts are created by:
- FW Admin (always)
- Another admin in the same org (post-MVP)

---

## Pages and Features (MVP)

### Dashboard (Home)

Overview of the organization's reach within the platform.

**Stats cards:**
- Total participants who have expressed interest in this org
- Breakdown by profile type (how many Faithful Witnesses, Ready Responders, etc.)
- Breakdown by readiness level
- New interest this month (vs. last month)

**Attribution:**
- Total participants in the org's region who have completed Stage 1
- Percentage who have connected or expressed interest in any org (platform-wide engagement proxy)

---

### Interested Participants

List of participants who clicked "I'm interested" on this organization's card.

**View per participant:**
- Email address
- Profile type + readiness score
- Date of interest expression
- Stage completion status (how far are they in the journey)
- Region (city/state)

**Actions:**
- Mark as "Contacted" (manual status update — no automated outreach from this portal in MVP)
- Export list to CSV

**Filters:**
- By profile type
- By readiness level
- By status (new / contacted)

---

### Organization Profile (Read-Only MVP)

View-only page showing what participants see when browsing partner orgs:
- Org name
- Region(s) served
- Short description
- Coalition affiliation
- Contact info shown to participants

> Editing this information is post-MVP. For MVP, FW Admin manages org profile data.

---

## Auth

- Accounts created by FW Admin with role = `partner_admin` and `org_id` assigned
- Multiple accounts per org — each has their own email + magic link
- RLS ensures partner admins can only see data for their own organization
- `org_interests` and `profiles` filtered to own org's interested participants only

---

## Route Structure

```
/                        Dashboard / home
/participants            Interested participants list
/org-profile             Organization profile (read-only)
```

---

## Open Decisions

- Should partner admins be able to create additional admin accounts for their own org in MVP, or does FW Admin handle all account creation? _(Recommend: FW Admin only for MVP, self-service post-MVP)_
- Is CSV export required for MVP, or is the in-app list sufficient?
- Does the org profile page need to exist in this portal for MVP, or is it purely analytics?
