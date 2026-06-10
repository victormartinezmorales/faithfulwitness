// test/run-tests.js — automated checks against test/local-server.js.
// Usage: node test/local-server.js &   then   node test/run-tests.js

'use strict';

const BASE = 'http://localhost:4173';
const P = {
  sarah: '11111111-1111-4111-8111-111111111111',
  james: '22222222-2222-4222-8222-222222222222',
  mike:  '33333333-3333-4333-8333-333333333333',
  rebecca: '44444444-4444-4444-8444-444444444444',
  lisa:  '55555555-5555-4555-8555-555555555555',
  john:  '66666666-6666-4666-8666-666666666666',
  outsider: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};
const E1 = 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
async function call(method, path, pid, body) {
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  const r = await fetch(BASE + path + sep + 'pid=' + pid, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

(async function main() {
  console.log('\n── Part F: privacy enforcement ──');
  let r = await call('GET', '/api/team/' + P.sarah, P.outsider);
  check('non-member GET team → 403', r.status === 403);
  check('non-member 403 body reveals nothing', JSON.stringify(r.json).indexOf('Sarah') < 0);

  r = await call('GET', '/api/team/' + P.sarah, P.john);
  check('level-2 invitee (not direct member) GET team → 403 (deny by default)', r.status === 403);

  r = await call('GET', '/api/team/' + P.sarah, 'not-a-uuid');
  check('garbage pid → 403', r.status === 403);

  r = await call('GET', '/api/team/context', P.outsider);
  check('outsider context → no default team', r.status === 200 && r.json.defaultTeamLeaderId === null);

  r = await call('GET', '/api/team/context', P.lisa);
  check('participant context → inviter team', r.json.defaultTeamLeaderId === P.sarah && !r.json.leadsOwnTeam);

  r = await call('GET', '/api/team/context', P.mike);
  check('mike (invited people) context → own team', r.json.defaultTeamLeaderId === P.mike && r.json.leadsOwnTeam);

  r = await call('GET', '/api/team/' + P.sarah, P.lisa);
  const body = JSON.stringify(r.json);
  check('participant GET team → 200', r.status === 200);
  check('viewer role = participant, canManage=false', r.json.viewer.role === 'participant' && r.json.viewer.canManage === false);
  check('no emails leak in payload', body.indexOf('@example.com') < 0);
  check('no sensitive cols leak (burning_question/journal_entry/cant_shake)',
    body.indexOf('burning_question') < 0 && body.indexOf('journal_entry') < 0 && body.indexOf('cant_shake') < 0);
  check('themes only from journal_share_team=true (3 of 5)',
    r.json.themes.length === 3 && !r.json.themes.some(t => t.firstName === 'Lisa' || t.firstName === 'Sarah'));
  check('unshared sense_of_calling text absent from payload', body.indexOf('Something is stirring') < 0);

  console.log('\n── Roles & writes ──');
  r = await call('POST', '/api/team/' + P.sarah + '/name', P.lisa, { teamName: 'Hacked' });
  check('participant rename → 403', r.status === 403);
  r = await call('POST', '/api/team/' + P.sarah + '/role', P.james, { participantId: P.rebecca, role: 'co-leader' });
  check('co-leader promoting → 403 (leader only)', r.status === 403);
  r = await call('POST', '/api/team/' + P.sarah + '/events', P.lisa, { sourceUrl: 'https://x.com/e', eventDatetime: new Date(Date.now() + 86400000 * 3).toISOString(), title: 'x' });
  check('participant create event → 403', r.status === 403);

  r = await call('POST', '/api/team/' + P.sarah + '/name', P.james, { teamName: 'Westside Welcome Team' });
  check('co-leader rename → 200', r.status === 200);
  r = await call('POST', '/api/team/' + P.sarah + '/name', P.sarah, { teamName: '' });
  check('empty name rejected → 400', r.status === 400);
  r = await call('POST', '/api/team/' + P.sarah + '/name', P.sarah, { teamName: 'x'.repeat(61) });
  check('61-char name rejected → 400', r.status === 400);

  r = await call('POST', '/api/team/' + P.sarah + '/role', P.sarah, { participantId: P.rebecca, role: 'co-leader' });
  check('leader promotes rebecca → 200', r.status === 200);
  r = await call('POST', '/api/team/' + P.sarah + '/role', P.sarah, { participantId: P.rebecca, role: 'participant' });
  check('leader demotes rebecca → 200', r.status === 200);
  r = await call('POST', '/api/team/' + P.sarah + '/role', P.sarah, { participantId: P.sarah, role: 'participant' });
  check('founder demotion blocked → 400', r.status === 400);
  r = await call('POST', '/api/team/' + P.sarah + '/role', P.sarah, { participantId: P.john, role: 'co-leader' });
  check('promoting a non-member (level 2) → 403', r.status === 403);
  r = await call('POST', '/api/team/' + P.sarah + '/role', P.sarah, { participantId: P.rebecca, role: 'leader' });
  check("assigning 'leader' rejected → 400", r.status === 400);

  console.log('\n── OG fetch ──');
  let raw = await fetch(BASE + '/api/og-fetch?url=https://www.mobilize.us/whatever');
  check('og-fetch without pid → 403', raw.status === 403);
  r = await call('GET', '/api/og-fetch?url=' + encodeURIComponent('https://www.mobilize.us/event/999'), P.sarah);
  check('og-fetch returns title + platform', r.json.title === 'Prayer Vigil for Immigrant Neighbors' && r.json.platform === 'mobilize');
  r = await call('GET', '/api/og-fetch?url=' + encodeURIComponent('http://localhost/secret'), P.sarah);
  check('og-fetch rejects localhost (SSRF)', !!r.json.error);

  console.log('\n── Events lifecycle ──');
  r = await call('POST', '/api/team/' + P.sarah + '/events', P.sarah, {
    sourceUrl: 'https://www.eventbrite.com/e/test-event-555',
    eventDatetime: new Date(Date.now() + 5 * 86400000).toISOString(),
    location: 'Crossroads en Español',
  });
  check('leader creates event (title from OG) → 201', r.status === 201 && r.json.event.title === 'Prayer Vigil for Immigrant Neighbors');
  check('platform derived = eventbrite', r.json.event.source_platform === 'eventbrite');
  check('og image stored', r.json.event.og_image_url === 'https://images.example.com/vigil.jpg');
  check('creation notified team minus adder (4)', r.json.notified === 4);
  const newEvent = r.json.event.id;

  r = await call('POST', '/api/team/' + P.sarah + '/events/' + newEvent + '/rsvp', P.lisa, { rsvp_status: 'going' });
  check('participant RSVP → 200', r.status === 200);
  r = await call('POST', '/api/team/' + P.sarah + '/events/' + newEvent + '/rsvp', P.lisa, { rsvp_status: 'maybe' });
  check('RSVP upsert (change) → 200', r.status === 200 && r.json.rsvp.rsvp_status === 'maybe');
  r = await call('POST', '/api/team/' + P.sarah + '/events/' + newEvent + '/rsvp', P.outsider, { rsvp_status: 'going' });
  check('non-member RSVP → 403', r.status === 403);
  r = await call('POST', '/api/team/' + P.sarah + '/events/' + newEvent + '/rsvp', P.lisa, { rsvp_status: 'banana' });
  check('invalid rsvp_status → 400', r.status === 400);

  r = await call('GET', '/api/team/' + P.sarah, P.lisa);
  const ev = r.json.events.find(e => e.id === newEvent);
  check('event visible with counts + viewerRsvp', ev && ev.viewerRsvp === 'maybe' && ev.rsvpCounts.maybe === 1);

  r = await call('PATCH', '/api/team/' + P.sarah + '/events/' + newEvent, P.james, { title: 'Renamed Vigil', location: 'New spot' });
  check('co-leader PATCH event → 200', r.status === 200 && r.json.event.title === 'Renamed Vigil');
  r = await call('PATCH', '/api/team/' + P.sarah + '/events/' + newEvent, P.lisa, { title: 'nope' });
  check('participant PATCH event → 403', r.status === 403);

  r = await call('DELETE', '/api/team/' + P.sarah + '/events/' + newEvent, P.james);
  check('co-leader DELETE (soft) → 200, notifies going/maybe minus deleter', r.status === 200 && r.json.notified === 1);
  r = await call('GET', '/api/team/' + P.sarah, P.sarah);
  check('removed event gone from dashboard', !r.json.events.some(e => e.id === newEvent));

  console.log('\n── Start a team (name-first creation) ──');
  r = await call('GET', '/api/team/context', P.outsider);
  check('outsider starts with no team', r.json.leadsOwnTeam === false && r.json.defaultTeamLeaderId === null);
  r = await call('POST', '/api/team/' + P.outsider + '/name', P.outsider, { teamName: 'New Hope Team' });
  check('naming own (empty) team → 200', r.status === 200);
  r = await call('GET', '/api/team/context', P.outsider);
  check('named team ⇒ leads own team, default = own', r.json.leadsOwnTeam === true && r.json.defaultTeamLeaderId === P.outsider);
  r = await call('GET', '/api/team/' + P.outsider, P.outsider);
  check('empty own-team dashboard loads (1 member, leader role)',
    r.status === 200 && r.json.members.length === 1 && r.json.viewer.role === 'leader' && r.json.team.teamName === 'New Hope Team');
  r = await call('GET', '/api/team/' + P.outsider, P.lisa);
  check('others still denied from the new team → 403', r.status === 403);
  r = await call('POST', '/api/team/' + P.lisa + '/name', P.outsider, { teamName: 'Hijack' });
  check('cannot name someone ELSE’s team → 403', r.status === 403);
  r = await call('GET', '/api/team/context', P.lisa);
  check('lisa (member of Sarah’s team) default stays Sarah’s team', r.json.defaultTeamLeaderId === P.sarah);

  console.log('\n── Cron (Part D) ──');
  raw = await fetch(BASE + '/api/send-event-reminders');
  let cron = await raw.json();
  check('cron finds the 24h-out event', cron.summary.events_found === 1);
  check("reminder sent to all except 'cant' (4 of 5)", cron.summary.succeeded === 4);
  raw = await fetch(BASE + '/api/send-event-reminders');
  cron = await raw.json();
  check('cron idempotent: second run sends nothing', cron.summary.events_found === 0 && cron.summary.succeeded === 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
