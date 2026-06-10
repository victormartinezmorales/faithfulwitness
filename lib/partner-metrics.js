// lib/partner-metrics.js — the 17 metrics, thresholds, narrative, insight.
//
// SOURCE OF TRUTH: "Partner Dashboard Metrics v1" (definitions and Part
// Seven thresholds) and "Data Promise v1" (what may never appear).
//
// PRIVACY BY CONSTRUCTION (Data Promise, Part Three):
//   * NETWORK_COLUMNS below is the complete list of fields this module ever
//     requests about participants. burning_question, cant_shake_*,
//     sense_of_calling, journal_entry, impact_proximity, name, email are
//     NOT on the list — exclusion by design, not by filtering.
//   * The < 10 minimum-count threshold is applied HERE, before anything is
//     returned to the route layer. The UI never receives raw small-N data.
//   * Geography resolves at MSA/state only (lib/geo.js); MSA counts < 5
//     fold into other_msas; population counts < 5 fold into "other".

'use strict';

const { sbGet, sbRpc } = require('./partner-auth.js');
const { resolveZip }   = require('./geo.js');

const THRESHOLD     = 10;  // Data Promise minimum-count for sub-aggregates
const SMALL_N_FOLD  = 5;   // per-category fold threshold (populations, MSAs)
const ACTIVE_DAYS   = 90;  // "active team" window (Metric 14)

// The ONLY participant fields partner metrics may read. Never expand this
// list without a Metric Definitions change (Data Promise F4).
const NETWORK_COLUMNS = [
  'participant_id', 'created_at', 'started_at', 'completed_at',
  'stage3_completed_at', 'profile_assigned', 'gifting_arr',
  'specific_neighbor', 'invited_by', 'zip',
].join(',');

const PROFILE_KEYS = ['open_explorer','thoughtful_learner','careful_seeker','ready_responder','faithful_witness'];
const GIFT_KEYS    = ['relational','learning','leading','service','advocacy'];
const POPULATION_KEYS = [
  'mixed_status_families','asylum_refugees','daca_undocumented_young_adults',
  'day_laborers_workers','immigrant_churches_pastors','known_neighbors',
  'immigrant_children_youth','detention_deportation',
];

function parseArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
}

// ─── Attribution (Part C): the SQL function via RPC ─────────────────────────

async function getNetworkPids(slug) {
  const rows = await sbRpc('fw_network_members', { p_slug: slug });
  return rows.map((r) => r.member_pid);
}

// Latest row per pid, whitelisted columns only.
async function fetchNetworkRows(pids) {
  if (!pids.length) return [];
  const out = new Map();
  // Chunk the IN() filter to keep URLs sane at larger scales.
  for (let i = 0; i < pids.length; i += 100) {
    const chunk = pids.slice(i, i + 100).map((p) => `"${p}"`).join(',');
    const rows = await sbGet('submissions',
      `select=${encodeURIComponent(NETWORK_COLUMNS)}` +
      `&participant_id=in.(${encodeURIComponent(chunk)})` +
      '&order=created_at.asc&limit=1000');
    for (const row of rows) {
      const prev = out.get(row.participant_id);
      if (!prev || String(row.created_at) > String(prev.created_at)) out.set(row.participant_id, row);
    }
  }
  return [...out.values()];
}

// ─── Metric computation ─────────────────────────────────────────────────────

function startedAtOf(r) { return r.started_at || r.created_at; }

function computeTeams(rows) {
  const pidSet = new Set(rows.map((r) => r.participant_id));
  const inviteesOf = {};
  for (const r of rows) {
    if (r.invited_by && pidSet.has(r.invited_by)) {
      (inviteesOf[r.invited_by] = inviteesOf[r.invited_by] || []).push(r.participant_id);
    }
  }
  const byPid = new Map(rows.map((r) => [r.participant_id, r]));
  const leaders = Object.keys(inviteesOf);
  const teamsFormed  = leaders.length;
  // Metric 6: leader was themselves invited by someone in the same network.
  const teamsSparked = leaders.filter((pid) => {
    const row = byPid.get(pid);
    return row && row.invited_by && pidSet.has(row.invited_by);
  }).length;
  return { inviteesOf, leaders, teamsFormed, teamsSparked, byPid };
}

async function computeActiveTeams(rows, teams) {
  if (!teams.leaders.length) return 0;
  const cutoff = Date.now() - ACTIVE_DAYS * 86400000;
  const recent = (iso) => iso && new Date(iso).getTime() >= cutoff;

  // RSVP activity for network pids (whitelisted: ids + timestamps only).
  const rsvpActive = new Set();
  const pids = rows.map((r) => r.participant_id);
  for (let i = 0; i < pids.length; i += 100) {
    const chunk = pids.slice(i, i + 100).map((p) => `"${p}"`).join(',');
    const cutoffIso = new Date(cutoff).toISOString();
    const rsvps = await sbGet('team_event_rsvps',
      `select=participant_id,updated_at&participant_id=in.(${encodeURIComponent(chunk)})` +
      `&updated_at=gte.${encodeURIComponent(cutoffIso)}&limit=1000`);
    for (const r of rsvps) rsvpActive.add(r.participant_id);
  }

  const memberActive = (pid) => {
    const r = teams.byPid.get(pid);
    if (!r) return false;
    return recent(r.created_at) || recent(r.completed_at) ||
           recent(r.stage3_completed_at) || rsvpActive.has(pid);
  };

  let active = 0;
  for (const leader of teams.leaders) {
    const memberPids = [leader, ...teams.inviteesOf[leader]];
    // "New invitation sent" counts as activity: a recent invitee row.
    if (memberPids.some(memberActive)) active++;
  }
  return active;
}

function distribution(counts, keys, total) {
  return keys
    .filter((k) => counts[k] > 0)
    .map((k) => ({ key: k, count: counts[k], percentage: Math.round(100 * counts[k] / total) }))
    .sort((a, b) => b.count - a.count);
}

// ─── The dashboard payload (D1 + D2 thresholds) ─────────────────────────────

async function computeDashboard(partner) {
  const pids = await getNetworkPids(partner.slug);
  const rows = await fetchNetworkRows(pids);

  const started     = rows;                                            // see Metrics doc note in summary
  const inFormation = rows.filter((r) => r.profile_assigned);
  const completed   = rows.filter((r) => r.stage3_completed_at);
  const seeds       = rows.filter((r) => !r.invited_by);

  const teams = computeTeams(rows);
  const activeTeams = await computeActiveTeams(rows, teams);

  // Metric 8 — profile distribution (threshold: in-formation total).
  let profile_distribution = null;
  if (inFormation.length >= THRESHOLD) {
    const counts = {};
    for (const r of inFormation) counts[r.profile_assigned] = (counts[r.profile_assigned] || 0) + 1;
    profile_distribution = distribution(counts, PROFILE_KEYS, inFormation.length)
      .map((d) => ({ profile: d.key, count: d.count, percentage: d.percentage }));
  }

  // Metric 9 — gifting (share of selections; threshold: participants with ≥1 gift).
  let gifting_distribution = null;
  const withGifts = rows.filter((r) => parseArr(r.gifting_arr).length > 0);
  if (withGifts.length >= THRESHOLD) {
    const counts = {}; let selections = 0;
    for (const r of withGifts) for (const g of parseArr(r.gifting_arr)) {
      if (GIFT_KEYS.indexOf(g) >= 0) { counts[g] = (counts[g] || 0) + 1; selections++; }
    }
    gifting_distribution = distribution(counts, GIFT_KEYS, selections)
      .map((d) => ({ gift: d.key, count: d.count, percentage: d.percentage }));
  }

  // Metric 10 — population focus (threshold: stage3-complete; fold < 5 into other).
  let population_focus = null;
  if (completed.length >= THRESHOLD) {
    const counts = {};
    for (const r of completed) for (const n of parseArr(r.specific_neighbor)) {
      if (POPULATION_KEYS.indexOf(n) >= 0) counts[n] = (counts[n] || 0) + 1;
    }
    const totalSel = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
    let other = 0;
    const main = [];
    for (const k of Object.keys(counts).sort((a, b) => counts[b] - counts[a])) {
      if (counts[k] < SMALL_N_FOLD) other += counts[k];
      else main.push({ population: k, count: counts[k], percentage: Math.round(100 * counts[k] / totalSel) });
    }
    if (other > 0) main.push({ population: 'other', count: other, percentage: Math.round(100 * other / totalSel) });
    population_focus = main;
  }

  // Metric 11 — geography (threshold: with-zip total; MSA < 5 folds; never below MSA).
  let geographic_distribution = null;
  const withZip = rows.map((r) => resolveZip(r.zip)).filter(Boolean);
  if (withZip.length >= THRESHOLD) {
    const msaCounts = {}; const stateCounts = {};
    for (const g of withZip) {
      stateCounts[g.state] = (stateCounts[g.state] || 0) + 1;
      if (g.msa) {
        const key = g.msa.city + '|' + g.msa.state;
        msaCounts[key] = (msaCounts[key] || 0) + 1;
      }
    }
    let other_msas = withZip.filter((g) => !g.msa).length;
    const msa = [];
    for (const key of Object.keys(msaCounts).sort((a, b) => msaCounts[b] - msaCounts[a])) {
      if (msaCounts[key] < SMALL_N_FOLD) { other_msas += msaCounts[key]; continue; }
      const [city, state] = key.split('|');
      msa.push({ city, state, count: msaCounts[key] });
    }
    geographic_distribution = {
      msa: msa.slice(0, 8),
      state: Object.keys(stateCounts).sort((a, b) => stateCounts[b] - stateCounts[a])
        .map((s) => ({ state: s, count: stateCounts[s] })),
      other_msas,
    };
  }

  // Metric 13 — completion rates (each rate hidden if denominator < 10).
  const rate = (num, den) => den >= THRESHOLD ? Math.round(100 * num / den) : null;
  const completion_rates = {
    stage1:         rate(inFormation.length, started.length),
    full_journey:   rate(completed.length, started.length),
    team_formation: rate(teams.teamsFormed, inFormation.length),
  };
  const completionAllHidden = completion_rates.stage1 === null &&
    completion_rates.full_journey === null && completion_rates.team_formation === null;

  return {
    partner: {
      slug: partner.slug,
      name: partner.organization_name,
      full_name: partner.full_legal_name,
      onboarded_at: partner.onboarded_at,
      is_active: partner.is_active,
    },
    network_size:      started.length,
    total_reach:       started.length,        // Metric 5 == Metric 1 by definition
    in_formation:      inFormation.length,
    completed_journey: completed.length,
    teams_formed:      teams.teamsFormed,
    teams_sparked:     teams.teamsSparked,
    seed_participants: seeds.length,
    active_teams:      activeTeams,
    profile_distribution,
    gifting_distribution,
    population_focus,
    geographic_distribution,
    completion_rates: completionAllHidden ? { error: 'insufficient_data' } : completion_rates,
    events_summary: { events_published: 0, total_views: 0, total_rsvps: 0 },   // Phase 2
  };
}

// ─── Metric 12 — growth series ──────────────────────────────────────────────

async function computeGrowthSeries(partner, range) {
  const pids = await getNetworkPids(partner.slug);
  const rows = await fetchNetworkRows(pids);

  const now = Date.now();
  const ranges = { '30d': 30 * 86400000, '90d': 90 * 86400000, '12w': 12 * 7 * 86400000 };
  let from;
  if (range === 'all') {
    const earliest = rows.reduce((min, r) => Math.min(min, new Date(startedAtOf(r)).getTime() || now), now);
    from = rows.length ? earliest : now - ranges['12w'];
  } else {
    from = now - (ranges[range] || ranges['12w']);
  }

  // Weekly buckets (daily for 30d).
  const step = range === '30d' ? 86400000 : 7 * 86400000;
  const points = [];
  for (let t = from; t <= now + 1; t += step) {
    const upTo = (iso) => iso && new Date(iso).getTime() <= t;
    points.push({
      date: new Date(t).toISOString().slice(0, 10),
      network_size:      rows.filter((r) => upTo(startedAtOf(r))).length,
      in_formation:      rows.filter((r) => r.profile_assigned && upTo(r.completed_at || startedAtOf(r))).length,
      completed_journey: rows.filter((r) => upTo(r.stage3_completed_at)).length,
    });
  }
  return { range: range || '12w', step: range === '30d' ? 'day' : 'week', points };
}

// ─── D3 — narrative paragraph ───────────────────────────────────────────────
// MUST never include identifying details (F5): only counts and durations.

function narrativeFor(d) {
  const onboarded = new Date(d.partner.onboarded_at).getTime();
  const days = Math.max(1, Math.floor((Date.now() - onboarded) / 86400000));
  let span;
  if (days < 7)        span = days + (days === 1 ? ' day' : ' days');
  else if (days < 70)  span = Math.floor(days / 7) + (Math.floor(days / 7) === 1 ? ' week' : ' weeks');
  else                 span = Math.floor(days / 30) + ' months';

  if (d.network_size === 0) {
    return 'Your dashboard is ready. As participants begin coming through your network’s link, '
      + 'this dashboard will populate. The first data should appear within hours of your first attributed traffic.';
  }
  if (d.in_formation < 5) {
    return 'Your network is forming. ' + d.network_size + (d.network_size === 1 ? ' person has' : ' people have')
      + ' started the journey. As more participants come through, this dashboard will show the patterns emerging in your network.';
  }
  return span + ' since you began driving traffic, your network has formed ' + d.in_formation
    + ' people through the Discernment Experience. ' + d.completed_journey
    + ' have completed the full journey. ' + d.teams_formed
    + (d.teams_formed === 1 ? ' team has' : ' teams have') + ' formed. ' + d.teams_sparked
    + ' of those teams have themselves sparked new teams. This is what’s becoming visible in your network.';
}

// ─── D4 — insight observation (4 templates + fallback; counts only) ─────────

const POPULATION_LABELS = {
  mixed_status_families: 'mixed-status families',
  asylum_refugees: 'asylum seekers and refugees',
  daca_undocumented_young_adults: 'DACA recipients and undocumented young adults',
  day_laborers_workers: 'day laborers and immigrant workers',
  immigrant_churches_pastors: 'immigrant churches and pastors',
  known_neighbors: 'neighbors they already know',
  immigrant_children_youth: 'immigrant children and youth',
  detention_deportation: 'people in detention or facing deportation',
  other: 'other populations',
};

function insightFor(d) {
  const topPop = d.population_focus && d.population_focus[0];
  const msas = (d.geographic_distribution && d.geographic_distribution.msa) || [];

  if (topPop && topPop.percentage > 50 && msas.length >= 3) {
    const cities = msas.slice(0, 3).map((m) => m.city);
    return 'Your network is heaviest in ' + cities[0] + ', ' + cities[1] + ', and ' + cities[2] + '. '
      + topPop.percentage + '% of completed discernments name ' + (POPULATION_LABELS[topPop.population] || topPop.population)
      + ' as the population people keep returning to. Worth considering: a regional infrastructure investment '
      + 'in any of these three cities would compound across the formation already happening.';
  }
  if (d.teams_formed > 0 && d.teams_sparked / d.teams_formed > 0.25) {
    return 'Multiplication is real in your network. ' + d.teams_sparked + ' of your ' + d.teams_formed
      + ' teams have themselves sparked new teams — meaning the second wave is forming. '
      + 'The invitation graph is starting to compound.';
  }
  const fullRate = d.completion_rates && d.completion_rates.full_journey;
  if (typeof fullRate === 'number' && fullRate < 40 && d.in_formation > 50) {
    return 'Your network has strong early engagement, but only ' + fullRate
      + '% are completing the full journey. Worth considering: what support could help more of them through Stage 3?';
  }
  if (topPop && d.teams_formed >= 3) {
    return 'A pattern is emerging: ' + topPop.percentage + '% of completed discernments in your network name '
      + (POPULATION_LABELS[topPop.population] || topPop.population) + '. Your ' + d.teams_formed
      + ' teams are forming around a shared center of gravity — that’s the raw material for coordinated next steps.';
  }
  return 'Your network is forming. Watch these numbers over the coming weeks as more participants '
    + 'complete the journey and more teams form.';
}

module.exports = {
  getNetworkPids, fetchNetworkRows,
  computeDashboard, computeGrowthSeries,
  narrativeFor, insightFor,
  THRESHOLD,
};
