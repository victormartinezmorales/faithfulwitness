// test/local-server.js — local review harness for the v5 Team Dashboard.
//
// Runs the REAL api/ handlers and the REAL team.html against an in-memory
// mock of Supabase (PostgREST subset) and Resend. Nothing touches the live
// database (the v5 migration is NOT applied by this) and no real email is
// sent — "sent" emails are written to test/outbox/ as HTML files.
//
// Usage:   node test/local-server.js     → http://localhost:4173
//
// Review URLs (seeded fixtures):
//   leader      http://localhost:4173/team?pid=11111111-1111-4111-8111-111111111111
//   co-leader   http://localhost:4173/team?pid=22222222-2222-4222-8222-222222222222
//   participant http://localhost:4173/team?pid=55555555-5555-4555-8555-555555555555
//   non-member  http://localhost:4173/team?pid=dddddddd-dddd-4ddd-8ddd-dddddddddddd&team=11111111-1111-4111-8111-111111111111
//   cron        http://localhost:4173/api/send-event-reminders
//
// NOT part of the deployment: lives under test/, which Vercel ignores for
// functions (only api/ becomes functions).

'use strict';

process.env.SUPABASE_URL         = 'http://mock.supabase.local';
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
process.env.RESEND_API_KEY       = 'mock-resend-key';
delete process.env.CRON_SECRET;

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const OUTBOX = path.join(__dirname, 'outbox');
fs.mkdirSync(OUTBOX, { recursive: true });

// ─── Fixture pids ───────────────────────────────────────────────────────────
const P = {
  sarah:   '11111111-1111-4111-8111-111111111111',
  james:   '22222222-2222-4222-8222-222222222222',
  mike:    '33333333-3333-4333-8333-333333333333',
  rebecca: '44444444-4444-4444-8444-444444444444',
  lisa:    '55555555-5555-4555-8555-555555555555',
  john:    '66666666-6666-4666-8666-666666666666',
  emily:   '77777777-7777-4777-8777-777777777777',
  marcus:  '88888888-8888-4888-8888-888888888888',
  maria:   '99999999-9999-4999-8999-999999999999',
  david:   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nina:    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  omar:    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  outsider:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

function sub(pid, name, opts) {
  opts = opts || {};
  return Object.assign({
    participant_id: pid, name, email: name.toLowerCase().split(' ')[0] + '@example.com',
    created_at: opts.created_at || '2026-03-01T12:00:00Z',
    completed_at: '2026-03-01T13:00:00Z',
    stage3_started_at: opts.s3s !== undefined ? opts.s3s : '2026-03-05T12:00:00Z',
    stage3_completed_at: opts.s3c !== undefined ? opts.s3c : '2026-03-05T13:00:00Z',
    profile_assigned: opts.profile || 'open_explorer',
    gifting_arr: opts.gifting || ['relational'],
    specific_neighbor: opts.neighbors || [],
    specific_neighbor_other: null,
    invited_by: opts.invited_by || null,
    referral_source: opts.referral_source || null,
    zip: opts.zip || null,
    team_code: null, team_name: opts.team_name || null, team_role: opts.team_role || null,
    sense_of_calling: opts.calling || null,
    journal_share_team: !!opts.share,
    // Sensitive fields exist in the table; partner queries must never read
    // them. Present in fixtures so a leak would be caught by tests.
    burning_question: 'FIXTURE-SENSITIVE-BQ', cant_shake_text: 'FIXTURE-SENSITIVE-CS',
    journal_entry: 'FIXTURE-SENSITIVE-JE', impact_proximity: 2,
  }, {});
}

// v6 partner fixtures: Sarah's whole tree is attributed to crossroads-es
// (root referral_source). A separate 3-person nalec network exercises the
// < 10 threshold. The outsider stays unattributed.
const DB = {
  partners: [
    { id: 'p1p1p1p1-0000-4000-8000-000000000001', slug: 'ccda',          organization_name: 'CCDA', full_legal_name: 'Christian Community Development Association', is_active: true,  onboarded_at: '2026-03-15T00:00:00Z', retired_at: null, notes: null },
    { id: 'p1p1p1p1-0000-4000-8000-000000000002', slug: 'nalec',         organization_name: 'NaLEC', full_legal_name: 'National Latino Evangelical Coalition', is_active: true,  onboarded_at: '2026-05-20T00:00:00Z', retired_at: null, notes: null },
    { id: 'p1p1p1p1-0000-4000-8000-000000000003', slug: 'worldrelief',   organization_name: 'World Relief', full_legal_name: 'World Relief', is_active: true,  onboarded_at: '2026-05-01T00:00:00Z', retired_at: null, notes: null },
    { id: 'p1p1p1p1-0000-4000-8000-000000000004', slug: 'undivided',     organization_name: 'Undivided', full_legal_name: 'Undivided', is_active: false, onboarded_at: '2026-04-01T00:00:00Z', retired_at: '2026-06-01T00:00:00Z', notes: 'retired (fixture)' },
    { id: 'p1p1p1p1-0000-4000-8000-000000000005', slug: 'crossroads-es', organization_name: 'Crossroads en Español', full_legal_name: 'Crossroads en Español, Cincinnati', is_active: true, onboarded_at: '2026-03-18T00:00:00Z', retired_at: null, notes: null },
    { id: 'p1p1p1p1-0000-4000-8000-000000000006', slug: 'internal',      organization_name: 'Internal / staff', full_legal_name: 'Faithful Witness platform staff', is_active: true, onboarded_at: '2026-03-01T00:00:00Z', retired_at: null, notes: null },
  ],
  partner_users: [
    { id: 'u1u1u1u1-0000-4000-8000-000000000001', partner_id: 'p1p1p1p1-0000-4000-8000-000000000005', email: 'victor.martinez@crossroads.net', full_name: 'Victor Martinez', role: 'admin', is_active: true, invited_at: '2026-06-01T00:00:00Z', last_login_at: null },
    { id: 'u1u1u1u1-0000-4000-8000-000000000002', partner_id: 'p1p1p1p1-0000-4000-8000-000000000002', email: 'staff-nalec@faithfulwitness.us', full_name: 'Staff NaLEC View', role: 'viewer', is_active: true, invited_at: '2026-06-01T00:00:00Z', last_login_at: null },
    { id: 'u1u1u1u1-0000-4000-8000-000000000003', partner_id: 'p1p1p1p1-0000-4000-8000-000000000001', email: 'inactive@faithfulwitness.us', full_name: 'Inactive User', role: 'viewer', is_active: false, invited_at: '2026-06-01T00:00:00Z', last_login_at: null },
  ],
  partner_sessions: [],
  partner_access_log: [],
  submissions: [
    sub(P.sarah, 'Sarah Martinez', { profile: 'ready_responder', gifting: ['leading','advocacy'],
      neighbors: ['mixed_status_families'], team_name: 'Westside Welcome Team',
      referral_source: 'crossroads-es', zip: '45202',
      calling: 'I am being asked to organize the welcome our church keeps talking about.', share: false }),
    sub(P.james, 'James Reyes', { profile: 'faithful_witness', gifting: ['leading','learning'],
      neighbors: ['mixed_status_families','immigrant_churches_pastors'], invited_by: P.sarah, team_role: 'co-leader', zip: '45205',
      calling: "I think we're being asked to be the bridge between our church and the families on our block.", share: true }),
    sub(P.mike, 'Mike Chen', { profile: 'thoughtful_learner', gifting: ['learning','relational'],
      neighbors: ['mixed_status_families','immigrant_children_youth'], invited_by: P.sarah, zip: '45219',
      calling: 'I want to understand what real welcome looks like, not just speak about it.', share: true }),
    sub(P.rebecca, 'Rebecca Liu', { profile: 'careful_seeker', gifting: ['service','relational'],
      neighbors: ['immigrant_children_youth'], invited_by: P.sarah, zip: '41011',
      calling: "I keep coming back to the kids in our schools. I don't have a plan yet, but I can't look away.", share: true }),
    sub(P.lisa, 'Lisa Park', { profile: 'open_explorer', gifting: ['relational','service'],
      neighbors: ['immigrant_churches_pastors'], invited_by: P.sarah, s3c: null, zip: '45236',
      calling: 'Something is stirring but I cannot name it yet.', share: false }),   // NOT shared → must not appear
    // level 2
    sub(P.john,   'John Howard',  { profile: 'open_explorer',      invited_by: P.mike,  gifting: ['relational'], neighbors: ['mixed_status_families'], zip: '45209' }),
    sub(P.emily,  'Emily Moss',   { profile: 'ready_responder',    invited_by: P.mike,  gifting: ['advocacy'],   neighbors: ['mixed_status_families','immigrant_children_youth'], zip: '45040' }),
    sub(P.marcus, 'Marcus Kim',   { profile: 'thoughtful_learner', invited_by: P.mike,  gifting: ['learning'],   neighbors: ['immigrant_children_youth'], zip: '43215' }),
    sub(P.maria,  'Maria Alvarez',{ profile: 'faithful_witness',   invited_by: P.james, gifting: ['relational','service'], neighbors: ['mixed_status_families','immigrant_children_youth'], zip: '45011' }),
    sub(P.david,  'David Cho',    { profile: 'open_explorer',      invited_by: P.james, gifting: ['service'],    neighbors: ['mixed_status_families'], zip: '60614' }),
    // level 3
    sub(P.nina, 'Nina Patel',  { profile: 'thoughtful_learner', invited_by: P.john, gifting: ['learning','relational'], neighbors: ['immigrant_children_youth'], zip: '45227' }),
    sub(P.omar, 'Omar Reyes',  { profile: 'ready_responder',    invited_by: P.john, gifting: ['advocacy'], neighbors: ['mixed_status_families'], zip: '45014' }),
    // outsider: no invites, no inviter, NO partner attribution
    sub(P.outsider, 'Olivia Outsider', { profile: 'careful_seeker' }),
    // nalec mini-network (3 people) — exercises the < 10 threshold
    sub('eeeeeee1-0000-4000-8000-00000000000e', 'Nadia Flores', { profile: 'ready_responder', referral_source: 'nalec', zip: '10025', neighbors: ['asylum_refugees'] }),
    sub('eeeeeee2-0000-4000-8000-00000000000e', 'Pablo Ortiz',  { profile: 'open_explorer',   invited_by: 'eeeeeee1-0000-4000-8000-00000000000e', zip: '10456' }),
    sub('eeeeeee3-0000-4000-8000-00000000000e', 'Carmen Soto',  { profile: 'careful_seeker',  invited_by: 'eeeeeee1-0000-4000-8000-00000000000e', s3c: null }),
  ],
  team_events: [],
  team_event_rsvps: [],
};

// Seed one event ~36h out (inside the daily cron's 24-48h window) and one further out.
const in24h = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
const in9d  = new Date(Date.now() + 9 * 86400000).toISOString();
DB.team_events.push({
  id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', team_leader_id: P.sarah, added_by: P.james,
  title: 'Family Support Vigil at the Federal Building', description: 'Stand with families.',
  event_datetime: in24h, location: 'Cincinnati Federal Building',
  source_url: 'https://www.mobilize.us/event/12345', source_platform: 'mobilize',
  og_image_url: null, notification_sent_at: '2026-06-08T12:00:00Z', reminder_sent_at: null,
  is_removed: false, created_at: '2026-06-08T12:00:00Z', updated_at: '2026-06-08T12:00:00Z',
});
DB.team_events.push({
  id: 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2', team_leader_id: P.sarah, added_by: P.sarah,
  title: 'Welcome Workshop: Mixed-Status Families', description: null,
  event_datetime: in9d, location: 'World Relief Cincinnati',
  source_url: 'https://www.eventbrite.com/e/welcome-workshop-987', source_platform: 'eventbrite',
  og_image_url: 'https://img.evbuc.com/fake-workshop.jpg', notification_sent_at: '2026-06-05T12:00:00Z',
  reminder_sent_at: null, is_removed: false, created_at: '2026-06-05T12:00:00Z', updated_at: '2026-06-05T12:00:00Z',
});
DB.team_event_rsvps.push(
  { id: 'r1', event_id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', participant_id: P.sarah, rsvp_status: 'going',  created_at: '2026-06-08T13:00:00Z', updated_at: '2026-06-08T13:00:00Z' },
  { id: 'r2', event_id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', participant_id: P.mike,  rsvp_status: 'maybe',  created_at: '2026-06-08T13:00:00Z', updated_at: '2026-06-08T13:00:00Z' },
  { id: 'r3', event_id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', participant_id: P.lisa,  rsvp_status: 'cant',   created_at: '2026-06-08T13:00:00Z', updated_at: '2026-06-08T13:00:00Z' }
);

// ─── Mock PostgREST ─────────────────────────────────────────────────────────
function parseFilters(qs) {
  const pairs = [];
  for (const [k, v] of new URLSearchParams(qs).entries()) pairs.push([k, v]);
  return pairs;
}
function rowMatches(row, key, expr) {
  const v = row[key];
  if (expr.startsWith('eq.'))     return String(v) === expr.slice(3);
  if (expr.startsWith('gte.'))    return String(v) >= expr.slice(4);
  if (expr.startsWith('lte.'))    return String(v) <= expr.slice(4);
  if (expr.startsWith('lt.'))     return String(v) <  expr.slice(3);
  if (expr === 'is.null')         return v === null || v === undefined;
  if (expr === 'not.is.null')     return !(v === null || v === undefined);
  if (expr === 'eq.false')        return v === false;
  if (expr === 'eq.true')         return v === true;
  if (expr.startsWith('in.(')) {
    const list = expr.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
    return list.indexOf(String(v)) >= 0;
  }
  return true;
}
function applyQuery(rows, qs) {
  let out = rows.slice();
  let order = null, limit = null;
  for (const [k, v] of parseFilters(qs)) {
    if (k === 'select') continue;
    if (k === 'on_conflict') continue;
    if (k === 'order') { order = v; continue; }
    if (k === 'limit') { limit = parseInt(v, 10); continue; }
    out = out.filter((r) => rowMatches(r, k, v));
  }
  if (order) {
    const [col, dir] = order.split('.');
    out.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (dir === 'desc' ? -1 : 1));
  }
  if (limit) out = out.slice(0, limit);
  return out;
}

// Honor the select= projection like PostgREST: fields not requested are not
// returned. This makes "exclusion by design" (Data Promise) actually testable.
function project(rows, qs) {
  const select = new URLSearchParams(qs).get('select');
  if (!select || select === '*') return rows;
  const cols = select.split(',').map((s) => s.trim()).filter(Boolean);
  return rows.map((r) => {
    const o = {};
    for (const c of cols) if (c in r) o[c] = r[c];
    return o;
  });
}

// fw_network_members RPC emulation: latest row per pid; roots with the slug;
// BFS down the invited_by chain (mirrors the SQL in v6 migration).
function rpcNetworkMembers(slug) {
  const latest = new Map();
  for (const r of DB.submissions) {
    if (!r.participant_id) continue;
    const prev = latest.get(r.participant_id);
    if (!prev || String(r.created_at) > String(prev.created_at)) latest.set(r.participant_id, r);
  }
  const members = [];
  const queue = [];
  for (const r of latest.values()) {
    if (!r.invited_by && r.referral_source === slug) queue.push(r.participant_id);
  }
  const seen = new Set(queue);
  while (queue.length) {
    const pid = queue.shift();
    members.push({ member_pid: pid });
    for (const r of latest.values()) {
      if (r.invited_by === pid && !seen.has(r.participant_id)) {
        seen.add(r.participant_id); queue.push(r.participant_id);
      }
    }
  }
  return members;
}

let emailCounter = 0;
const realFetch = global.fetch;
global.fetch = async function mockFetch(url, opts) {
  url = String(url);
  opts = opts || {};

  // Supabase
  if (url.startsWith(process.env.SUPABASE_URL)) {
    const u = new URL(url);

    // RPC
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = u.pathname.replace('/rest/v1/rpc/', '');
      const args = JSON.parse(opts.body || '{}');
      if (fn === 'fw_network_members') {
        return new Response(JSON.stringify(rpcNetworkMembers(args.p_slug)), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'no rpc ' + fn }), { status: 404 });
    }

    const table = u.pathname.replace('/rest/v1/', '');
    const rows = DB[table];
    if (!rows) return new Response(JSON.stringify({ message: 'no table ' + table }), { status: 404 });

    if (!opts.method || opts.method === 'GET') {
      return new Response(JSON.stringify(project(applyQuery(rows, u.search.slice(1)), u.search.slice(1))), { status: 200 });
    }
    if (opts.method === 'DELETE') {
      const matched = applyQuery(rows, u.search.slice(1));
      for (const m of matched) { const i = rows.indexOf(m); if (i >= 0) rows.splice(i, 1); }
      return new Response('', { status: 204 });
    }
    if (opts.method === 'POST') {
      const body = JSON.parse(opts.body);
      const onConflict = new URLSearchParams(u.search).get('on_conflict');
      if (onConflict) {
        const keys = onConflict.split(',');
        const existing = rows.find((r) => keys.every((k) => String(r[k]) === String(body[k])));
        if (existing) { Object.assign(existing, body, { updated_at: new Date().toISOString() }); return new Response(JSON.stringify([existing]), { status: 200 }); }
      }
      const row = Object.assign({
        id: require('crypto').randomUUID(),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        is_removed: false, og_image_url: null, notification_sent_at: null, reminder_sent_at: null,
        description: null, location: null,
      }, body);
      rows.push(row);
      return new Response(JSON.stringify([row]), { status: 201 });
    }
    if (opts.method === 'PATCH') {
      const body = JSON.parse(opts.body);
      const matched = applyQuery(rows, u.search.slice(1));
      matched.forEach((r) => Object.assign(r, body, { updated_at: new Date().toISOString() }));
      return new Response(JSON.stringify(matched), { status: 200 });
    }
  }

  // Resend → outbox files
  if (url.startsWith('https://api.resend.com/')) {
    const body = JSON.parse(opts.body);
    emailCounter++;
    const safe = body.subject.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
    // Timestamp prefix: strictly increasing across server boots, so "newest
    // by filename" in the tests is always the genuinely newest email.
    const file = path.join(OUTBOX, Date.now() + '-' + String(emailCounter).padStart(2, '0') + '-' + safe + '.html');
    fs.writeFileSync(file, '<!-- TO: ' + body.to.join(',') + ' -->\n' + body.html);
    console.log('  ✉  outbox:', path.basename(file), '→', body.to.join(','));
    return new Response(JSON.stringify({ id: 'mock-email-' + emailCounter }), { status: 200 });
  }

  // Anything else = an external event page → fake OG HTML
  return new Response(
    '<html><head>' +
    '<title>Fallback Title</title>' +
    '<meta property="og:title" content="Prayer Vigil for Immigrant Neighbors">' +
    '<meta property="og:description" content="Join neighbors and congregations for an evening of prayer and presence.">' +
    '<meta property="og:image" content="https://images.example.com/vigil.jpg">' +
    '</head><body>mock event page</body></html>',
    { status: 200, headers: { 'content-type': 'text/html' } });
};

// ─── Load the real handlers (AFTER the fetch mock) ──────────────────────────
const teamHandler    = require(path.join(ROOT, 'api/team/[...path].js'));
const ogHandler      = require(path.join(ROOT, 'api/og-fetch.js'));
const cronHandler    = require(path.join(ROOT, 'api/send-event-reminders.js'));
const partnerHandler = require(path.join(ROOT, 'api/partner/[...path].js'));

// ─── Minimal Vercel req/res shims ───────────────────────────────────────────
function makeRes(res) {
  const shim = {
    _status: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(c) { this._status = c; return this; },
    json(obj) { res.statusCode = this._status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); },
    end(s) { res.statusCode = this._status; res.end(s || ''); },
  };
  return shim;
}
function collectBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const query = {};
  for (const [k, v] of u.searchParams.entries()) query[k] = v;

  try {
    if (u.pathname === '/team' || u.pathname === '/team.html') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(fs.readFileSync(path.join(ROOT, 'team.html')));
    }
    if (u.pathname === '/' || u.pathname === '/welcome-back') {
      res.setHeader('Content-Type', 'text/html');
      return res.end('<body style="font-family:sans-serif;padding:40px;"><h2>(' + u.pathname + ' — redirect target reached)</h2></body>');
    }
    if (u.pathname === '/partner' || u.pathname === '/partner.html') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(fs.readFileSync(path.join(ROOT, 'partner.html')));
    }
    if (u.pathname === '/partner/dashboard') {
      const f = path.join(ROOT, 'partner-dashboard.html');
      res.setHeader('Content-Type', 'text/html');
      if (fs.existsSync(f)) return res.end(fs.readFileSync(f));
      return res.end('<body style="font-family:sans-serif;padding:40px;">partner-dashboard.html not built yet (waiting on mockup)</body>');
    }
    if (u.pathname === '/partner/login') {
      const body = await collectBody(req);
      return partnerHandler({ method: req.method, query: Object.assign({ path: ['login'] }, query), headers: req.headers, body }, makeRes(res));
    }
    if (u.pathname.startsWith('/api/partner/')) {
      query.path = u.pathname.replace('/api/partner/', '').split('/').filter(Boolean);
      const body = await collectBody(req);
      return partnerHandler({ method: req.method, query, headers: req.headers, body }, makeRes(res));
    }
    if (u.pathname.startsWith('/api/team/')) {
      query.path = u.pathname.replace('/api/team/', '').split('/').filter(Boolean);
      const body = await collectBody(req);
      return teamHandler({ method: req.method, query, headers: req.headers, body }, makeRes(res));
    }
    if (u.pathname === '/api/og-fetch') {
      return ogHandler({ method: req.method, query, headers: req.headers }, makeRes(res));
    }
    if (u.pathname === '/api/send-event-reminders') {
      return cronHandler({ method: req.method, query, headers: req.headers }, makeRes(res));
    }
    res.statusCode = 404; res.end('not found');
  } catch (err) {
    console.error(err);
    res.statusCode = 500; res.end('server error: ' + err.message);
  }
});

const PORT = process.env.PORT || 4173;
server.listen(PORT, () => {
  console.log('Team dashboard local harness on http://localhost:' + PORT);
  console.log('  leader      /team?pid=' + P.sarah);
  console.log('  co-leader   /team?pid=' + P.james);
  console.log('  participant /team?pid=' + P.lisa);
  console.log('  non-member  /team?pid=' + P.outsider + '&team=' + P.sarah);
  console.log('  cron        /api/send-event-reminders');
});
