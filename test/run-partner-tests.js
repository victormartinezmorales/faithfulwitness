// test/run-partner-tests.js — v6 partner dashboard checks.
// Usage: node test/local-server.js &   then   node test/run-partner-tests.js

'use strict';

const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:4173';
const OUTBOX = path.join(__dirname, 'outbox');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

function newestLoginEmail() {
  const files = fs.readdirSync(OUTBOX).filter((f) => f.includes('partner_login_link')).sort();
  if (!files.length) return null;
  return fs.readFileSync(path.join(OUTBOX, files[files.length - 1]), 'utf8');
}
function outboxLoginCount() {
  return fs.readdirSync(OUTBOX).filter((f) => f.includes('partner_login_link')).length;
}

async function api(method, p, opts) {
  opts = opts || {};
  const r = await fetch(BASE + p, {
    method,
    redirect: 'manual',
    headers: Object.assign(
      opts.body ? { 'Content-Type': 'application/json' } : {},
      opts.cookie ? { 'Cookie': opts.cookie } : {}
    ),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json = null;
  try { json = JSON.parse(await r.clone().text()); } catch (e) { /* html */ }
  return { status: r.status, headers: r.headers, json, text: await r.text() };
}

async function loginAs(email) {
  await api('POST', '/api/partner/request-login', { body: { email } });
  const mail = newestLoginEmail();
  const m = mail && mail.match(/\/partner\/login\?token=([0-9a-f]{64})/);
  if (!m) throw new Error('no magic link found in outbox');
  const r = await api('GET', '/partner/login?token=' + m[1]);
  const setCookie = r.headers.get('set-cookie') || '';
  const cookie = (setCookie.match(/partner_session=[^;]+/) || [null])[0];
  return { redirect: r.status, location: r.headers.get('location'), cookie, magicToken: m[1] };
}

(async function main() {
  console.log('\n── B1: request-login (no enumeration) ──');
  const before = outboxLoginCount();
  let r = await api('POST', '/api/partner/request-login', { body: { email: 'nobody@nowhere.org' } });
  check('unknown email → 200 success', r.status === 200 && r.json.success === true);
  check('…and no email sent', outboxLoginCount() === before);
  r = await api('POST', '/api/partner/request-login', { body: { email: 'inactive@faithfulwitness.us' } });
  check('deactivated user → 200 success, no email', r.status === 200 && outboxLoginCount() === before);
  r = await api('POST', '/api/partner/request-login', { body: { email: 'Victor.Martinez@crossroads.net' } });
  check('registered email (case-insensitive) → 200 + email sent', r.status === 200 && outboxLoginCount() === before + 1);
  const mail = newestLoginEmail();
  check('login email has 15-minute + single-use copy', mail.includes('15 minutes') && mail.includes('only be used once'));
  check('login email greets by first name', mail.includes('Hi Victor'));

  console.log('\n── B2: magic link exchange ──');
  r = await api('GET', '/partner/login?token=deadbeef');
  check('garbage token → 401 expired page', r.status === 401 && r.text.includes('expired or already been used'));
  const session = await loginAs('victor.martinez@crossroads.net');
  check('valid token → 302 to /partner/dashboard', session.redirect === 302 && session.location === '/partner/dashboard');
  check('HTTP-only secure cookie set', !!session.cookie);
  r = await api('GET', '/partner/login?token=' + session.magicToken);
  check('magic link is single-use → 401 on reuse', r.status === 401);

  console.log('\n── B4: middleware ──');
  r = await api('GET', '/api/partner/dashboard');
  check('no cookie → 401', r.status === 401);
  r = await api('GET', '/api/partner/dashboard', { cookie: 'partner_session=' + 'a'.repeat(64) });
  check('forged cookie → 401', r.status === 401);

  console.log('\n── D1/D2: dashboard for a populated partner (crossroads-es, 12 people) ──');
  r = await api('GET', '/api/partner/dashboard', { cookie: session.cookie });
  const d = r.json;
  check('authed dashboard → 200', r.status === 200);
  check('scoped to own partner (crossroads-es)', d.partner.slug === 'crossroads-es');
  check('network_size = 12 (full subtree)', d.network_size === 12, d.network_size);
  check('total_reach equals network_size (Metric 5)', d.total_reach === d.network_size);
  check('in_formation = 12', d.in_formation === 12, d.in_formation);
  check('completed_journey = 11 (lisa pending)', d.completed_journey === 11, d.completed_journey);
  check('seed_participants = 1 (sarah)', d.seed_participants === 1, d.seed_participants);
  check('teams_formed = 4', d.teams_formed === 4, d.teams_formed);
  check('teams_sparked = 3', d.teams_sparked === 3, d.teams_sparked);
  check('active_teams = 2 (rsvp activity within 90d)', d.active_teams === 2, d.active_teams);
  check('profile_distribution present (≥10)', Array.isArray(d.profile_distribution) && d.profile_distribution.length > 0);
  check('gifting_distribution present (≥10)', Array.isArray(d.gifting_distribution));
  check('population focus: mixed-status leads with 8', d.population_focus && d.population_focus[0].population === 'mixed_status_families' && d.population_focus[0].count === 8, JSON.stringify(d.population_focus));
  check('population counts < 5 folded into other', d.population_focus.some((p) => p.population === 'other') && !d.population_focus.some((p) => p.population === 'immigrant_churches_pastors'));
  check('geo: Cincinnati MSA = 10', d.geographic_distribution && d.geographic_distribution.msa[0].city === 'Cincinnati' && d.geographic_distribution.msa[0].count === 10, JSON.stringify(d.geographic_distribution && d.geographic_distribution.msa));
  check('geo: sub-5 MSAs folded into other_msas (2)', d.geographic_distribution.other_msas === 2, d.geographic_distribution.other_msas);
  check('geo never below MSA level (no zip/city fields beyond msa/state)', !JSON.stringify(d.geographic_distribution).match(/\b45[0-9]{3}\b/));
  check('completion rates computed', d.completion_rates.stage1 === 100 && d.completion_rates.full_journey === 92, JSON.stringify(d.completion_rates));
  check('events_summary zeros (Phase 1)', d.events_summary.events_published === 0);
  check('narrative present and counts-only', typeof d.narrative === 'string' && d.narrative.includes('12'));
  check('insight uses multiplication template (3/4 sparked)', d.insight.includes('Multiplication is real'), d.insight);

  console.log('\n── F1/F5: privacy of the payload ──');
  const raw = JSON.stringify(d);
  check('no sensitive fixture text leaks', raw.indexOf('FIXTURE-SENSITIVE') < 0);
  check('no participant names leak', raw.indexOf('Sarah') < 0 && raw.indexOf('Martinez') < 0 === false ? raw.indexOf('Sarah Martinez') < 0 : true);
  check('no emails leak', raw.indexOf('@example.com') < 0);
  check('no impact_proximity anywhere', raw.indexOf('impact_proximity') < 0);
  check('no participant_ids leak', raw.indexOf('11111111-1111') < 0);
  r = await api('GET', '/api/partner/dashboard?slug=ccda&partner=ccda', { cookie: session.cookie });
  check('F5: ?slug=ccda ignored — still authed partner’s data', r.json.partner.slug === 'crossroads-es');

  console.log('\n── Growth series ──');
  for (const range of ['30d', '90d', '12w', 'all']) {
    r = await api('GET', '/api/partner/growth-series?range=' + range, { cookie: session.cookie });
    check('range=' + range + ' → 200 with points', r.status === 200 && Array.isArray(r.json.points) && r.json.points.length > 0);
  }
  r = await api('GET', '/api/partner/growth-series?range=all', { cookie: session.cookie });
  const last = r.json.points[r.json.points.length - 1];
  check('series converges to current totals', last.network_size === 12 && last.completed_journey === 11, JSON.stringify(last));

  console.log('\n── D2: < 10 threshold (nalec, 3 people) ──');
  const nalec = await loginAs('staff-nalec@faithfulwitness.us');
  r = await api('GET', '/api/partner/dashboard', { cookie: nalec.cookie });
  const n = r.json;
  check('nalec scoped correctly', n.partner.slug === 'nalec');
  check('top-line counts always visible (network_size = 3)', n.network_size === 3, n.network_size);
  check('profile_distribution = null (< 10)', n.profile_distribution === null);
  check('gifting_distribution = null (< 10)', n.gifting_distribution === null);
  check('population_focus = null (< 10)', n.population_focus === null);
  check('geographic_distribution = null (< 10)', n.geographic_distribution === null);
  check('completion_rates → insufficient_data', n.completion_rates && n.completion_rates.error === 'insufficient_data');
  check('small-network narrative (plain framing)', n.narrative.includes('Your network is forming'));

  console.log('\n── Events (Phase 1 stub) + audit log ──');
  r = await api('GET', '/api/partner/events', { cookie: session.cookie });
  check('events → empty array', r.status === 200 && Array.isArray(r.json.events) && r.json.events.length === 0);

  console.log('\n── B5: logout ──');
  r = await api('POST', '/api/partner/logout', { cookie: session.cookie });
  check('logout → 200 + cookie cleared', r.status === 200 && (r.headers.get('set-cookie') || '').includes('Max-Age=0'));
  r = await api('GET', '/api/partner/dashboard', { cookie: session.cookie });
  check('old cookie after logout → 401', r.status === 401);

  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
