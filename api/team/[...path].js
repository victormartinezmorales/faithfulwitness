// api/team/[...path].js — all /api/team/* routes (v5 Team Dashboard).
//
// Single catch-all function (keeps the Vercel function count low). Routes:
//   GET    /api/team/:teamLeaderId                       — dashboard data (B1)
//   POST   /api/team/:teamLeaderId/name                  — rename team (B2; PATCH also accepted)
//   POST   /api/team/:teamLeaderId/role                  — assign member role (B3)
//   POST   /api/team/:teamLeaderId/events                — create event + notify (B4)
//   PATCH  /api/team/:teamLeaderId/events/:eventId       — update event (B5)
//   DELETE /api/team/:teamLeaderId/events/:eventId       — soft-delete + notify (B6)
//   POST   /api/team/:teamLeaderId/events/:eventId/rsvp  — set requester RSVP (B7)
//
// AUTH (Part F — non-negotiable): every route requires ?pid= (the existing
// return-link mechanic). The pid must resolve to a participant who is the
// leader of, or a DIRECT member of, the team identified by :teamLeaderId.
// Anything else → 403, body reveals nothing about the team. When in doubt,
// deny.

'use strict';

const {
  sbGet, sbInsert, sbPatch, sbUpsert,
  firstNameOf, isUuid, getParticipant, resolveTeam, countInvitees,
  roleOnTeam, canManage, teamDisplayName, teamRecipients,
} = require('../../lib/team-data.js');
const { fetchOgMetadata, validateEventUrl, derivePlatform } = require('../../lib/og.js');
const {
  renderEventNotificationEmail,
  renderEventRemovalEmail,
} = require('../../lib/team-email-templates.js');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = 'Faithful Witness <discernment@faithfulwitness.us>';

const PROFILE_NAMES = {
  open_explorer: 'Open Explorer', thoughtful_learner: 'Thoughtful Learner',
  careful_seeker: 'Careful Seeker', ready_responder: 'Ready Responder',
  faithful_witness: 'Faithful Witness',
};
const GIFTING_LABELS = {
  relational: 'Relational', learning: 'Learning & teaching',
  leading: 'Leading', service: 'Service', advocacy: 'Advocacy',
};
const NEIGHBOR_LABELS = {
  mixed_status_families:          'Mixed-status families',
  asylum_refugees:                'Asylum seekers & refugees',
  daca_undocumented_young_adults: 'DACA recipients & undocumented young adults',
  day_laborers_workers:           'Day laborers & immigrant workers',
  immigrant_churches_pastors:     'Immigrant churches & pastors',
  known_neighbors:                'Families they already know',
  immigrant_children_youth:       'Immigrant children & youth',
  detention_deportation:          'People in detention or facing deportation',
};

// ─── small utils ────────────────────────────────────────────────────────────

function json(res, code, body) { return res.status(code).json(body); }
function deny(res)             { return json(res, 403, { error: 'Not authorized for this team' }); }

function parseBody(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body || {};
}

function parseArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
}

function journeyStage(row) {
  if (row.stage3_completed_at) return { key: 'complete', label: 'Complete' };
  if (row.stage3_started_at)   return { key: 'stage3',   label: 'Mid Stage 3' };
  if (row.completed_at)        return { key: 'stage1',   label: 'Stage 1 done' };
  return { key: 'started', label: 'Started' };
}

async function sendViaResend(to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  const result = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Resend error ' + r.status + ': ' + (result.message || 'unknown'));
  return result.id || null;
}

// ─── auth: resolve team + requester role, or null ──────────────────────────

async function requireTeamAccess(req, teamLeaderId) {
  const pid = (req.query && req.query.pid) || '';
  if (!isUuid(pid) || !isUuid(teamLeaderId)) return null;
  const requester = await getParticipant(pid);
  if (!requester) return null;
  const team = await resolveTeam(teamLeaderId);
  if (!team) return null;
  const role = roleOnTeam(pid, team);
  if (!role) return null;                       // not a member → deny
  return { pid, requester, team, role };
}

// ─── B1: GET dashboard data ─────────────────────────────────────────────────

async function getEventsForTeam(teamLeaderId, viewerPid) {
  // Upcoming + very recent past (6h grace so "tonight" doesn't vanish mid-event).
  const cutoff = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const events = await sbGet('team_events',
    'select=id,team_leader_id,added_by,title,description,event_datetime,location,' +
    'source_url,source_platform,og_image_url,created_at' +
    `&team_leader_id=eq.${encodeURIComponent(teamLeaderId)}` +
    '&is_removed=eq.false' +
    `&event_datetime=gte.${encodeURIComponent(cutoff)}` +
    '&order=event_datetime.asc&limit=50');
  if (!events.length) return [];

  const ids = events.map((e) => `"${e.id}"`).join(',');
  const rsvps = await sbGet('team_event_rsvps',
    `select=event_id,participant_id,rsvp_status&event_id=in.(${encodeURIComponent(ids)})&limit=2000`);

  return events.map((e) => {
    const mine = rsvps.find((r) => r.event_id === e.id && r.participant_id === viewerPid);
    const counts = { going: 0, maybe: 0, cant: 0 };
    for (const r of rsvps) if (r.event_id === e.id && counts[r.rsvp_status] != null) counts[r.rsvp_status]++;
    return { ...e, rsvpCounts: counts, viewerRsvp: mine ? mine.rsvp_status : null };
  });
}

async function handleGetTeam(res, ctx) {
  const { team, pid, role } = ctx;
  const allMemberRows = [team.leader, ...team.level1];

  const members = allMemberRows.map((r) => {
    const isFounder = r.participant_id === team.teamLeaderId;
    return {
      participantId: r.participant_id,
      firstName:     firstNameOf(r),
      name:          (r.name || '').trim() || 'Participant',
      profileKey:    r.profile_assigned || null,
      profileName:   PROFILE_NAMES[r.profile_assigned] || null,
      gifting:       parseArr(r.gifting_arr),
      role:          isFounder ? 'leader' : (r.team_role === 'co-leader' ? 'co-leader' : 'participant'),
      isFounder,
      invitedCount:  team.inviteCounts[r.participant_id] || 0,
      journeyStage:  journeyStage(r),
      isYou:         r.participant_id === pid,
      // NOTE: no email, no sensitive fields. Part F.
    };
  });

  const profileMix = {};
  const giftingDistribution = {};
  const popCounts = {};
  for (const r of allMemberRows) {
    if (r.profile_assigned) profileMix[r.profile_assigned] = (profileMix[r.profile_assigned] || 0) + 1;
    for (const g of parseArr(r.gifting_arr)) {
      if (GIFTING_LABELS[g]) giftingDistribution[g] = (giftingDistribution[g] || 0) + 1;
    }
    for (const n of parseArr(r.specific_neighbor)) {
      if (NEIGHBOR_LABELS[n]) popCounts[n] = (popCounts[n] || 0) + 1;
    }
  }
  const populations = Object.entries(popCounts)
    .map(([code, count]) => ({ code, label: NEIGHBOR_LABELS[code], count }))
    .sort((a, b) => b.count - a.count);

  // Themes: ONLY journal_share_team=true rows (v1 opt-in proxy, Part F).
  const themes = allMemberRows
    .filter((r) => r.journal_share_team === true &&
                   r.sense_of_calling && String(r.sense_of_calling).trim())
    .map((r) => ({
      firstName:   firstNameOf(r),
      profileName: PROFILE_NAMES[r.profile_assigned] || null,
      quote:       String(r.sense_of_calling).trim(),
    }));

  const graphNode = (r) => ({
    participantId: r.participant_id,
    firstName:     firstNameOf(r),
    profileKey:    r.profile_assigned || null,
    invitedBy:     r.invited_by || null,
    invitedCount:  team.inviteCounts[r.participant_id] || 0,
    role:          r.participant_id === team.teamLeaderId ? 'leader'
                   : (r.team_role === 'co-leader' ? 'co-leader' : 'participant'),
  });

  const teamsSparked = team.level1.filter((r) => (team.inviteCounts[r.participant_id] || 0) > 0).length;
  const completedCount = team.level1.filter((r) => r.stage3_completed_at).length +
                         (team.leader.stage3_completed_at ? 1 : 0);

  return json(res, 200, {
    team: {
      teamLeaderId:    team.teamLeaderId,
      teamName:        teamDisplayName(team),
      teamNameIsDefault: !(team.leader.team_name || '').trim(),
      leaderFirstName: firstNameOf(team.leader),
    },
    viewer: { pid: pid, role, canManage: canManage(role) },
    members,
    profileMix,
    giftingDistribution,
    populations,
    themes,
    events: await getEventsForTeam(team.teamLeaderId, pid),
    momentum: {
      youInvited:   team.level1.length,
      theyInvited:  team.level2.length + team.level3.length,
      teamsSparked,
      reach:        team.level1.length + team.level2.length + team.level3.length,
      completion: {
        completed: completedCount,
        total:     team.level1.length + 1,
      },
    },
    graph: {
      root:   graphNode(team.leader),
      level1: team.level1.map(graphNode),
      level2: team.level2.map(graphNode),
      level3: team.level3.map(graphNode),
    },
  });
}

// ─── B2: rename team ────────────────────────────────────────────────────────

async function handleName(res, ctx, body) {
  if (!canManage(ctx.role)) return deny(res);
  const name = String(body.teamName || body.team_name || '').trim();
  if (name.length < 1 || name.length > 60) {
    return json(res, 400, { error: 'Team name must be 1-60 characters' });
  }
  await sbPatch('submissions',
    `participant_id=eq.${encodeURIComponent(ctx.team.teamLeaderId)}`,
    { team_name: name });
  return json(res, 200, { success: true, teamName: name });
}

// ─── B3: assign role (leader only) ──────────────────────────────────────────

async function handleRole(res, ctx, body) {
  if (ctx.role !== 'leader') return deny(res);   // co-leaders cannot promote
  const targetPid = String(body.participantId || '').trim();
  const newRole   = String(body.role || '').trim();
  if (!isUuid(targetPid))   return json(res, 400, { error: 'Invalid participantId' });
  if (newRole !== 'co-leader' && newRole !== 'participant') {
    return json(res, 400, { error: "Role must be 'co-leader' or 'participant'" });
  }
  // The founder's leader status is not changeable; leaders cannot demote themselves.
  if (targetPid === ctx.team.teamLeaderId) {
    return json(res, 400, { error: "The team founder's role cannot be changed" });
  }
  const isDirectMember = ctx.team.level1.some((r) => r.participant_id === targetPid);
  if (!isDirectMember) return deny(res);

  await sbPatch('submissions',
    `participant_id=eq.${encodeURIComponent(targetPid)}`,
    { team_role: newRole });
  return json(res, 200, { success: true, participantId: targetPid, role: newRole });
}

// ─── B4: create event (+ C1 notification) ───────────────────────────────────

async function notifyTeam(team, adder, event, render) {
  const adderFirst = firstNameOf(adder);
  const teamName   = teamDisplayName(team);
  let sent = 0;
  for (const r of teamRecipients(team)) {
    if (r.participant_id === adder.participant_id) continue;   // not the adder
    try {
      const { subject, html } = render({
        recipientFirstName: firstNameOf(r),
        recipientPid:       r.participant_id,
        adderFirstName:     adderFirst,
        removerFirstName:   adderFirst,
        teamName,
        event,
      });
      await sendViaResend(r.email, subject, html);
      sent++;
    } catch (err) {
      console.error('event email failed for', r.participant_id, err.message);
    }
  }
  return sent;
}

async function handleCreateEvent(res, ctx, body) {
  if (!canManage(ctx.role)) return deny(res);

  const sourceUrl = String(body.sourceUrl || body.source_url || '').trim();
  const urlObj = validateEventUrl(sourceUrl);
  if (!urlObj) return json(res, 400, { error: 'A valid event URL is required' });

  const eventDatetime = new Date(body.eventDatetime || body.event_datetime || '');
  if (isNaN(eventDatetime.getTime())) return json(res, 400, { error: 'A valid event date/time is required' });

  // OG fetch is best-effort: a dead page must not block event creation.
  let og = null;
  try { og = await fetchOgMetadata(sourceUrl); } catch (e) { og = null; }

  const title = String(body.title || (og && og.title) || '').trim();
  if (!title) return json(res, 400, { error: 'Title is required (the page had no Open Graph title)' });
  if (title.length > 200) return json(res, 400, { error: 'Title too long (max 200)' });

  const inserted = await sbInsert('team_events', {
    team_leader_id:  ctx.team.teamLeaderId,
    added_by:        ctx.pid,
    title,
    description:     String(body.description || (og && og.description) || '').trim().slice(0, 2000) || null,
    event_datetime:  eventDatetime.toISOString(),
    location:        String(body.location || '').trim().slice(0, 300) || null,
    source_url:      urlObj.toString(),
    source_platform: derivePlatform(urlObj),
    og_image_url:    (og && og.image) || null,
  });
  const event = inserted[0];

  const sent = await notifyTeam(ctx.team, ctx.requester, event, renderEventNotificationEmail);
  if (sent > 0) {
    await sbPatch('team_events', `id=eq.${event.id}`,
      { notification_sent_at: new Date().toISOString() });
  }
  return json(res, 201, { success: true, event, notified: sent });
}

// ─── B5/B6: update / soft-delete event ──────────────────────────────────────

async function loadTeamEvent(teamLeaderId, eventId) {
  if (!isUuid(eventId)) return null;
  const rows = await sbGet('team_events',
    'select=*' +
    `&id=eq.${encodeURIComponent(eventId)}` +
    `&team_leader_id=eq.${encodeURIComponent(teamLeaderId)}` +   // team-scoped, always
    '&limit=1');
  return rows.length ? rows[0] : null;
}

async function handleUpdateEvent(res, ctx, eventId, body) {
  if (!canManage(ctx.role)) return deny(res);
  const existing = await loadTeamEvent(ctx.team.teamLeaderId, eventId);
  if (!existing || existing.is_removed) return json(res, 404, { error: 'Event not found' });

  const patch = {};
  if (body.title       !== undefined) {
    const t = String(body.title).trim();
    if (!t || t.length > 200) return json(res, 400, { error: 'Title must be 1-200 characters' });
    patch.title = t;
  }
  if (body.description !== undefined) patch.description = String(body.description || '').trim().slice(0, 2000) || null;
  if (body.location    !== undefined) patch.location    = String(body.location || '').trim().slice(0, 300) || null;
  if (body.eventDatetime !== undefined || body.event_datetime !== undefined) {
    const d = new Date(body.eventDatetime || body.event_datetime);
    if (isNaN(d.getTime())) return json(res, 400, { error: 'Invalid event date/time' });
    patch.event_datetime = d.toISOString();
    // If the date moves, the old reminder bookkeeping no longer applies.
    if (existing.reminder_sent_at && d.getTime() > Date.now() + 25 * 3600 * 1000) {
      patch.reminder_sent_at = null;
    }
  }
  if (body.sourceUrl !== undefined || body.source_url !== undefined) {
    const urlObj = validateEventUrl(body.sourceUrl || body.source_url);
    if (!urlObj) return json(res, 400, { error: 'Invalid event URL' });
    patch.source_url      = urlObj.toString();
    patch.source_platform = derivePlatform(urlObj);
    try {
      const og = await fetchOgMetadata(patch.source_url);
      if (og && og.image) patch.og_image_url = og.image;
    } catch (e) { /* keep prior image */ }
  }
  if (!Object.keys(patch).length) return json(res, 400, { error: 'Nothing to update' });

  const updated = await sbPatch('team_events', `id=eq.${existing.id}`, patch);
  return json(res, 200, { success: true, event: updated[0] });
}

async function handleDeleteEvent(res, ctx, eventId) {
  if (!canManage(ctx.role)) return deny(res);
  const existing = await loadTeamEvent(ctx.team.teamLeaderId, eventId);
  if (!existing || existing.is_removed) return json(res, 404, { error: 'Event not found' });

  await sbPatch('team_events', `id=eq.${existing.id}`, { is_removed: true });

  // C3: notify members who RSVP'd going or maybe.
  const rsvps = await sbGet('team_event_rsvps',
    `select=participant_id,rsvp_status&event_id=eq.${encodeURIComponent(existing.id)}` +
    '&rsvp_status=in.("going","maybe")&limit=500');
  const rsvpPids = new Set(rsvps.map((r) => r.participant_id));
  const targets = teamRecipients(ctx.team).filter(
    (r) => rsvpPids.has(r.participant_id) && r.participant_id !== ctx.pid);

  let sent = 0;
  const removerFirst = firstNameOf(ctx.requester);
  const teamName = teamDisplayName(ctx.team);
  for (const r of targets) {
    try {
      const { subject, html } = renderEventRemovalEmail({
        recipientFirstName: firstNameOf(r),
        recipientPid:       r.participant_id,
        removerFirstName:   removerFirst,
        teamName,
        event:              existing,
      });
      await sendViaResend(r.email, subject, html);
      sent++;
    } catch (err) {
      console.error('removal email failed for', r.participant_id, err.message);
    }
  }
  return json(res, 200, { success: true, notified: sent });
}

// ─── B7: RSVP ───────────────────────────────────────────────────────────────

async function handleRsvp(res, ctx, eventId, body) {
  // Any team member, including leader and co-leaders (membership already
  // verified by requireTeamAccess).
  const status = String(body.rsvp_status || body.rsvpStatus || '').trim();
  if (['going', 'maybe', 'cant'].indexOf(status) < 0) {
    return json(res, 400, { error: "rsvp_status must be 'going', 'maybe', or 'cant'" });
  }
  const existing = await loadTeamEvent(ctx.team.teamLeaderId, eventId);
  if (!existing || existing.is_removed) return json(res, 404, { error: 'Event not found' });

  const rows = await sbUpsert('team_event_rsvps', {
    event_id:       existing.id,
    participant_id: ctx.pid,
    rsvp_status:    status,
    updated_at:     new Date().toISOString(),
  }, 'event_id,participant_id');

  return json(res, 200, { success: true, rsvp: rows ? rows[0] : { rsvp_status: status } });
}

// ─── Router ─────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return json(res, 500, { error: 'Missing required environment variables' });
  }

  try {
    let path = req.query.path || [];
    if (typeof path === 'string') path = path.split('/').filter(Boolean);

    // GET /api/team/context?pid=… — resolve which team this pid sees by
    // default (spec E1): own team if they've invited anyone, else the team
    // they belong to, else null (frontend redirects to /welcome-back).
    // Reveals nothing about any team beyond the id the pid already implies.
    if (path[0] === 'context' && req.method === 'GET') {
      const pid = (req.query && req.query.pid) || '';
      if (!isUuid(pid)) return json(res, 404, { error: 'Participant not found' });
      const participant = await getParticipant(pid);
      if (!participant) return json(res, 404, { error: 'Participant not found' });

      const counts = await countInvitees([pid]);
      // "Leads own team" = has invitees OR has intentionally STARTED a team
      // by naming it (the start-a-team flow). Naming is the commitment
      // device; the first invitation makes it grow.
      const leadsOwnTeam = (counts[pid] || 0) > 0 || !!String(participant.team_name || '').trim();
      // Default view (E1): own team once it has members; otherwise the team
      // they belong to; otherwise their own freshly named (still empty)
      // team. A named-but-empty team never outranks an active membership —
      // it stays one switcher click away.
      let defaultTeamLeaderId = null;
      if ((counts[pid] || 0) > 0) {
        defaultTeamLeaderId = pid;
      } else if (isUuid(participant.invited_by) && await getParticipant(participant.invited_by)) {
        defaultTeamLeaderId = participant.invited_by;
      } else if (leadsOwnTeam) {
        defaultTeamLeaderId = pid;
      }
      return json(res, 200, {
        firstName: firstNameOf(participant),
        defaultTeamLeaderId,
        leadsOwnTeam,
        memberOfTeam: isUuid(participant.invited_by) ? participant.invited_by : null,
      });
    }

    const teamLeaderId = path[0] || '';
    const ctx = await requireTeamAccess(req, teamLeaderId);
    if (!ctx) return deny(res);

    const body = parseBody(req);
    const rest = path.slice(1);

    // GET /api/team/:tid
    if (rest.length === 0 && req.method === 'GET')  return handleGetTeam(res, ctx);

    // /name  (POST per spec B2; PATCH also accepted per spec E3)
    if (rest.length === 1 && rest[0] === 'name' &&
        (req.method === 'POST' || req.method === 'PATCH')) return handleName(res, ctx, body);

    // /role
    if (rest.length === 1 && rest[0] === 'role' && req.method === 'POST') return handleRole(res, ctx, body);

    // /events
    if (rest.length === 1 && rest[0] === 'events' && req.method === 'POST') return handleCreateEvent(res, ctx, body);

    // /events/:eventId
    if (rest.length === 2 && rest[0] === 'events') {
      if (req.method === 'PATCH')  return handleUpdateEvent(res, ctx, rest[1], body);
      if (req.method === 'DELETE') return handleDeleteEvent(res, ctx, rest[1]);
    }

    // /events/:eventId/rsvp
    if (rest.length === 3 && rest[0] === 'events' && rest[2] === 'rsvp' && req.method === 'POST') {
      return handleRsvp(res, ctx, rest[1], body);
    }

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('team api error:', err);
    return json(res, 500, { error: 'Server error' });
  }
};
