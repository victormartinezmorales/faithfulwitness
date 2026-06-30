# FaithfulWitness Admin Portal

**App:** `apps/admin`
**Audience:** Internal FaithfulWitness team
**Auth:** Email magic link (accounts created by another FW Admin or seeded at launch)
**Mobile:** Responsive, but desktop is the primary use case.

---

## Role Overview

FW Admins have full visibility across the entire platform. They manage the user roster, oversee regional activity, and track the health of the overall discernment experience. MVP scope is the full existing prototype dashboard plus user/account management.

---

## Pages and Features (MVP)

### Insights Dashboard (Home)

Mirrors the existing `dashboard.html` prototype. Full-platform visibility.

**Top-line stats:**
- Total participants (all time)
- Participants ready for next step (readiness ≥ 4)
- States represented
- _(Add: total org interest expressions)_

**Profile distribution:**
- Count per profile type (Faithful Witness, Ready Responder, Careful Seeker, Open Explorer, Thoughtful Learner)
- Shown as donut chart + count list

**Readiness distribution:**
- Bar or donut chart across readiness levels (Not yet / Exploring / Considering / Ready / Active)

**Geographic map:**
- US SVG map with participants per state (choropleth shading)
- State list with counts below the map
- _(As in existing `dashboard.html`)_

**Participant feed:**
- Most recent participant completions across all regions
- Profile type indicator per entry

**Date range filter:**
- Last 7 days / 30 days / 90 days / All time

---

### User Management

**User list:**
- All users across all roles
- Columns: email, role, region/org (where applicable), status (active/deactivated), created date
- Search by email
- Filter by role

**Create user:**
- Email (required)
- Role: participant / catalyst / partner_admin / fw_admin
- If catalyst: assign region
- If partner_admin: assign organization
- On creation: magic link sent to their email

**Edit user:**
- Change role
- Reassign region or org
- Reset / re-send magic link

**Deactivate user:**
- Soft delete — account disabled but data retained
- User can no longer log in

---

### Region Management

View and manage the 11 Established Movement regions.

**Region list:**
- Region name, city/state, assigned catalyst, participant count

**Edit region:**
- Reassign catalyst (select from existing catalyst-role users)
- Edit region name/geography label

> Adding new regions or removing existing ones is expected to be infrequent and can be done via Supabase directly at MVP.

---

### Organization Management

View and manage partner organizations.

**Org list:**
- Org name, region, number of admins, total participants interested, coalition affiliation

**Create org:**
- Name, region, coalition affiliation, short description, contact info
- Assign initial admin (email → creates partner_admin account + sends magic link)

**Edit org:**
- Update profile info
- Add/remove admin accounts for the org

---

## Auth

- FW Admin accounts are seeded at project launch or created by another FW Admin
- Magic link auth — no password
- RLS grants full read/write on all tables for this role
- Recommend: limit the number of FW Admin accounts and treat it as a privileged role

---

## Route Structure

```
/                         Insights dashboard
/users                    User list
/users/new                Create user
/users/[id]               User detail / edit
/regions                  Region list
/regions/[id]             Region detail / edit catalyst
/organizations            Org list
/organizations/new        Create org
/organizations/[id]       Org detail / edit
```

---

## Open Decisions

- Should the insights dashboard support exporting data (CSV download of participant list)? _(Recommend: yes, even if minimal — useful for the team)_
- Does the admin need to view individual participant responses (full assessment answers), or only aggregated data?
