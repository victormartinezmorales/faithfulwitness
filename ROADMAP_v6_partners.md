# Roadmap v6 — Partner Network Views

*Captured June 2026, after the v5 team dashboard build. This is a thinking
document, not a spec. The build-shape notes are at the bottom; the main body
is work you can do in Claude chat before any code gets written.*

## The idea

Once coalition partners (CCDA, NaLEC, World Relief, Undivided) come onboard,
each should be able to see the movement forming within their own network:
teams formed, people in formation, reach over time, profile mixes, completion,
teams sparking teams, geography. Aggregates only — never member identities,
sense-of-calling text, or anything Part F protects. Members were promised a
private team; the partner view honors that promise while still telling the
multiplication story.

## The one discipline that matters NOW

Network attribution is derivable from existing data: every team is an invite
chain, and the root inviter's `referral_source` attributes the whole tree.
So the only prerequisite is **clean source slugs from day one of partner
traffic** (`?utm_source=ccda`, `worldrelief`, `nalec`, `undivided` — stable,
documented, never repurposed). If the slugs are clean, the partner dashboard
is a query. If they're messy, no migration fixes it retroactively.

---

## Work this in Claude chat (no code required)

Each of these is a self-contained working session for claude.ai. Paste the
relevant context (this file, the Theory of Change one-pager, or the v4 spec)
and go.

**1. Partner slug registry + UTM convention.**
"Help me design a referral-source naming convention for coalition partners
and their sub-networks (regional chapters, individual churches, conferences).
One level or two (`ccda` vs `ccda-cincinnati`)? How do we handle a church
that belongs to two networks? Produce a one-page convention doc and a
starter registry table."

**2. The partner data promise (privacy language).**
"Draft the data-sharing language we give partners: exactly what they will
and won't see about teams formed in their network, written plainly enough
to also show participants. Aggregates yes; identities, reflections, and
sensitive fields no. Include the opt-in mechanic for teams that WANT their
partner to contact them."

**3. Partner pitch one-pager.**
"Using the Theory of Change one-pager and the funder story (movement
infrastructure, immigration as proof of concept), draft the one-pager that
invites a partner to drive their network into the Discernment Experience.
Lead with what they get back: a live view of formation happening in their
network."

**4. Metric definitions for the partner dashboard.**
"Define the 6–8 metrics a partner sees, precisely: what counts as a 'team'
(named? has members?), 'in formation' (started Stage 1? completed?),
'reach', 'teams sparked', 'completion rate'. Write the definitions so an
engineer can implement them without judgment calls and a partner can't
misread them in a board report."

**5. Partner onboarding kit copy.**
"Draft the partner onboarding email sequence and the toolkit page: how to
share their link, sample pulpit/newsletter/social copy in their voice
(CCDA's voice differs from World Relief's), and what happens after someone
clicks."

**6. The 'or even…' question.**
"Think through with me: beyond seeing their own network, what might partners
want? Cross-network aggregate views for the coalition table? Seeding their
own campaigns (a creation-care instance)? Regional cohorts? Map each idea to
what it would demand of the data model, and which ones to refuse."

**7. Partner-tier access design.**
"Partner accounts are the first thing in this system that justify real
authentication (today: participant pid links + one admin token). Walk me
through the options — magic links, Supabase auth, per-partner tokens — and
the tradeoffs for a small nonprofit coalition. No code; a decision memo."

**8. Opt-in contact flow.**
"Design the consent flow for a team choosing to be visible/contactable by
their network partner: who decides (leader only? vote?), what gets shared,
how it's revoked, and the exact UI copy. One page."

---

## Build shape (when it's time — not now)

- A third gated surface: participant-gated `/team`, token-gated internal
  `/dashboard.html`, then partner-gated `/partner` (filtered aggregate
  variant of the internal dashboard).
- Attribution query: walk invite chains to root; root's `referral_source`
  = network. Consider materializing `network_origin` at signup later for
  query cost, but it stays derivable until then.
- Needs: partners table, per-partner auth (see chat item 7), aggregate-only
  endpoint with the metric definitions from chat item 4, opt-in flag from
  chat item 8.
- Unchanged: one led team per person; teams stay private by default.
