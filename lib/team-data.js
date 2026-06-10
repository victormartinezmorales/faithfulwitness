// lib/team-data.js — shared data layer for the team dashboard (v5).
//
// Participant records live in public.submissions. participant_id is nullable
// and NON-unique (a pid can have multiple rows; latest row wins). A "team" is
// not a database object: it is a leader's participant_id plus everyone whose
// invited_by points to it (spec Part A2). invited_by stores the inviter's
// participant_id as text.
//
// PRIVACY (Part F): everything here runs server-side with the service-role
// key. Callers (api/team/[...path].js, api/send-event-reminders.js) MUST
// gate every response on team membership via requireTeamAccess(). Sensitive
// columns (sense_of_calling, journal_entry, burning_question, cant_shake_*,
// impact_proximity, raw_answers) are selected ONLY where this module
// explicitly needs them, and sense_of_calling is exposed ONLY for rows with
// journal_share_team = true (v1 opt-in proxy).

'use strict';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ─── Supabase REST helpers (PostgREST; same pattern as the stage-3 cron) ───

async function sbGet(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const r = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Accept':        'application/json',
    },
  });
  if (!r.ok) throw new Error(`Supabase GET ${table} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbWrite(method, table, params, body, prefer) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
  const r = await fetch(url, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        prefer || 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${method} ${table} failed: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

const sbInsert = (table, body)         => sbWrite('POST',  table, '', body);
const sbPatch  = (table, params, body) => sbWrite('PATCH', table, params, body);
const sbUpsert = (table, body, onConflict) =>
  sbWrite('POST', table, `on_conflict=${onConflict}`, body, 'resolution=merge-duplicates,return=representation');

// ─── Column whitelists (never SELECT *) ─────────────────────────────────────

// Safe member-facing columns. sense_of_calling and journal_share_team are
// included ONLY so this module can apply the opt-in filter server-side;
// sense_of_calling never leaves this module unless journal_share_team=true.
const MEMBER_COLUMNS = [
  'participant_id', 'name', 'email', 'created_at', 'completed_at',
  'stage3_started_at', 'stage3_completed_at', 'profile_assigned',
  'gifting_arr', 'specific_neighbor', 'specific_neighbor_other',
  'invited_by', 'team_code', 'team_name', 'team_role',
  'sense_of_calling', 'journal_share_team',
].join(',');

// ─── Row utilities ──────────────────────────────────────────────────────────

function firstNameOf(row) {
  const raw = (row && row.name ? String(row.name) : '').trim();
  if (!raw) return 'friend';
  return raw.split(/\s+/)[0];
}

// Multiple submission rows can share a pid (re-takes). Latest created_at wins.
function latestByPid(rows) {
  const byPid = new Map();
  for (const row of rows || []) {
    if (!row.participant_id) continue;
    const prev = byPid.get(row.participant_id);
    if (!prev || String(row.created_at) > String(prev.created_at)) {
      byPid.set(row.participant_id, row);
    }
  }
  return byPid;
}

function isUuid(s) {
  return typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ─── Participant + team resolution ─────────────────────────────────────────

async function getParticipant(pid) {
  if (!isUuid(pid)) return null;
  const rows = await sbGet('submissions',
    `select=${encodeURIComponent(MEMBER_COLUMNS)}` +
    `&participant_id=eq.${encodeURIComponent(pid)}` +
    `&order=created_at.desc&limit=1`);
  return rows.length ? rows[0] : null;
}

async function getDirectInvitees(pids) {
  if (!pids.length) return [];
  const list = pids.map((p) => `"${p}"`).join(',');
  const rows = await sbGet('submissions',
    `select=${encodeURIComponent(MEMBER_COLUMNS)}` +
    `&invited_by=in.(${encodeURIComponent(list)})` +
    `&participant_id=not.is.null&order=created_at.asc&limit=500`);
  return rows;
}

// Resolve a team: leader row + direct members (deduped), plus the deeper
// invite graph (levels 2 and 3) for display/momentum. MEMBERSHIP — and
// therefore every permission check — is leader + DIRECT invitees only
// (spec A2). Deeper levels are display data, not members.
async function resolveTeam(teamLeaderId) {
  const leader = await getParticipant(teamLeaderId);
  if (!leader) return null;

  const level1Rows = await getDirectInvitees([teamLeaderId]);
  const level1 = [...latestByPid(level1Rows).values()]
    .filter((r) => r.participant_id !== teamLeaderId);

  const l1Pids = level1.map((r) => r.participant_id);
  const level2 = l1Pids.length
    ? [...latestByPid(await getDirectInvitees(l1Pids)).values()]
        .filter((r) => r.participant_id !== teamLeaderId && !l1Pids.includes(r.participant_id))
    : [];

  const l2Pids = level2.map((r) => r.participant_id);
  const level3 = l2Pids.length
    ? [...latestByPid(await getDirectInvitees(l2Pids)).values()]
        .filter((r) => r.participant_id !== teamLeaderId &&
                       !l1Pids.includes(r.participant_id) && !l2Pids.includes(r.participant_id))
    : [];

  // Invite counts for everyone shown in the graph (one query).
  const allPids = [teamLeaderId, ...l1Pids, ...l2Pids, ...level3.map((r) => r.participant_id)];
  const inviteCounts = await countInvitees(allPids);

  return { teamLeaderId, leader, level1, level2, level3, inviteCounts };
}

async function countInvitees(pids) {
  if (!pids.length) return {};
  const list = pids.map((p) => `"${p}"`).join(',');
  const rows = await sbGet('submissions',
    `select=invited_by,participant_id&invited_by=in.(${encodeURIComponent(list)})` +
    `&participant_id=not.is.null&limit=2000`);
  const seen = new Set();
  const counts = {};
  for (const r of rows) {
    const key = r.invited_by + '→' + r.participant_id;   // dedupe re-takes
    if (seen.has(key)) continue;
    seen.add(key);
    counts[r.invited_by] = (counts[r.invited_by] || 0) + 1;
  }
  return counts;
}

// ─── Roles & permissions (Part F: when in doubt, deny) ─────────────────────

// Role of `pid` ON THE TEAM identified by team.teamLeaderId:
//   'leader'      — pid IS the team_leader_id
//   'co-leader'   — direct member with explicit team_role='co-leader'
//   'participant' — any other direct member
//   null          — not a member: NO ACCESS
function roleOnTeam(pid, team) {
  if (!pid || !team) return null;
  if (pid === team.teamLeaderId) return 'leader';
  const row = team.level1.find((r) => r.participant_id === pid);
  if (!row) return null;
  return row.team_role === 'co-leader' ? 'co-leader' : 'participant';
}

const canManage = (role) => role === 'leader' || role === 'co-leader';

// ─── Team metadata ──────────────────────────────────────────────────────────

function teamDisplayName(team) {
  return (team.leader.team_name || '').trim() ||
    `${firstNameOf(team.leader)}'s Team`;
}

// Email recipients = leader + direct members with an email (deduped by pid).
function teamRecipients(team) {
  const all = [team.leader, ...team.level1];
  const out = [];
  const seen = new Set();
  for (const r of all) {
    if (!r.email || !r.participant_id || seen.has(r.participant_id)) continue;
    seen.add(r.participant_id);
    out.push(r);
  }
  return out;
}

module.exports = {
  sbGet, sbInsert, sbPatch, sbUpsert,
  firstNameOf, latestByPid, isUuid,
  getParticipant, getDirectInvitees, resolveTeam, countInvitees,
  roleOnTeam, canManage, teamDisplayName, teamRecipients,
  MEMBER_COLUMNS,
};
