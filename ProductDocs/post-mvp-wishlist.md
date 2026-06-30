# Post-MVP Wishlist

Features intentionally deferred from MVP. Revisit after launch once the core experience is solid and real usage patterns are visible. Items are loosely grouped by theme — not prioritized yet.

---

## Participant Experience

**Groups / Team Journey**
Participants go through the experience together as a group — a church small group, a cohort, a team. Shared progress, group reflection prompts, team dashboard showing where each member is in the journey. Groups would be created by Micah Catalysts and participants join with a code.

**Anonymous → Claim Later**
Let participants complete the full assessment without giving an email, then optionally claim their results at any point. Useful for lowering the barrier to start. Requires storing anonymous sessions and a claim flow.

**Google and Apple OAuth**
Alternative sign-in for participants who don't want to manage magic links. Reduces friction for returning users.

**Stage Completion Nudge Emails**
Automated reminder emails when a participant has been inactive on a stage for N days. E.g., "You're halfway through Stage 2 — pick up where you left off." Sequenced via Resend or a simple cron.

**Participant-Initiated RSVP**
Participants see upcoming events in their region from their dashboard and can RSVP without a catalyst manually adding them.

**Progress Sharing**
Let participants share their profile result (a shareable card / link) to invite others into the experience.

**In-App Resource Bookmarking**
Participants can save resources to revisit later, separate from the curated recommendations.

---

## Micah Catalyst

**Conversation / Message History**
Instead of one-off nudge emails, catalysts have a simple threaded view of their outreach to each participant — a lightweight CRM.

**Cohort Management (Groups)**
Catalysts create formal cohorts: a named group of participants going through the experience together on a schedule. Progress tracked as a cohort, not just individually.

**Participant RSVP from Participant Portal**
After a catalyst creates an event, participants see it in their dashboard and can RSVP directly (instead of the catalyst managing RSVPs manually).

**Calendar Integration**
Export events to Google Calendar or iCal.

---

## Partner Organization

**Org Profile Self-Service**
Partner admins can edit their own organization's profile (name, description, contact info, logo) without going through FW Admin.

**Invite Participants**
Partner orgs can generate a referral link or code that pre-associates new participants with their org when they start the experience.

**Invite Additional Admins**
Org admins can add other people from their organization to the portal without FW Admin involvement.

**Messaging Interested Participants**
Partner admins can send a message or follow-up email directly to participants who expressed interest (currently this happens outside the platform).

---

## FaithfulWitness Admin

**Content Management**
Admins can edit assessment questions, stage copy, and resources from inside the portal rather than requiring a code deploy. Needed for long-term maintenance as the experience evolves.

**Email Template Editor**
Edit transactional email templates (assessment results, nudge emails, event invitations) from the admin portal.

**Advanced Analytics**
- Funnel analysis: how many participants start Stage 1 vs. complete it vs. continue to Stage 2+
- Time-to-completion per stage
- Geographic heat maps by region, not just state
- Cohort retention over time

**Data Export**
Full participant data export (CSV/Excel) for reporting to coalition partners and funders.

**Announcement / Platform-Wide Messages**
Admins can post an announcement visible to all participants on their next login.

---

## Platform / Infrastructure

**Subdomain Routing**
Move from path-based (`faithfulwitness.us/catalyst`) to subdomain routing (`catalyst.faithfulwitness.us`) for cleaner role separation. Requires Supabase cookie domain configuration.

**Push Notifications / In-App Notifications**
Real-time or near-real-time alerts for catalysts when participants in their region express org interest. Could be email today, browser push notifications later.

**Audit Logging**
Track admin actions (user creation, role changes, deactivation) for accountability and debugging.

**Multi-Language Support**
Spanish-language version of the participant experience. Given CCDA, NaLEC, and World Relief's constituency, this is a significant long-term need.

**Supabase Edge Functions for Recommendations**
Replace the current client-side recommendation logic with a server-side Edge Function so the recommendation algorithm can be updated without a frontend deploy.
