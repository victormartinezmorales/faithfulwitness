// api/send-event-reminders.js — Vercel serverless function (cron, Part D).
//
// Extends the existing cron MECHANISM (same pattern as
// api/send-pending-stage3-emails.js: CRON_SECRET gate, idempotent dedupe
// column, per-recipient failure isolation). The existing Stage 3 cron is
// untouched; this is a SECOND cron entry in vercel.json, every 4 hours.
//
// Selects team_events where:
//   * event_datetime between 24 and 48 hours from now
//   * reminder_sent_at IS NULL
//   * is_removed = false
// and sends the C2 reminder email to team members who RSVP'd 'going' or
// 'maybe' OR have not RSVP'd at all. NOT sent to 'cant'. Updates
// reminder_sent_at on success — re-runs are idempotent.
//
// CADENCE NOTE: originally specced every 4 hours with a 23-25h window, but
// Vercel Hobby limits crons to daily. Daily at 12:00 UTC with a 24-48h
// lookahead still delivers exactly one reminder per event (the
// reminder_sent_at check dedupes), arriving "the day before" rather than
// precisely 24h out. If the project moves to Pro, restore 0 */4 * * * and
// the 23-25h window for tighter timing.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY,
// CRON_SECRET (optional bearer gate, same as the Stage 3 cron).

'use strict';

const { sbGet, sbPatch, firstNameOf, resolveTeam, teamDisplayName, teamRecipients } =
  require('../lib/team-data.js');
const { renderEventReminderEmail } = require('../lib/team-email-templates.js');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CRON_SECRET    = process.env.CRON_SECRET || null;
const FROM_EMAIL     = 'Faithful Witness <discernment@faithfulwitness.us>';

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

async function queryDueEvents(now) {
  const from = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const to   = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
  return sbGet('team_events',
    'select=id,team_leader_id,added_by,title,description,event_datetime,location,' +
    'source_url,source_platform,og_image_url' +
    `&event_datetime=gte.${encodeURIComponent(from)}` +
    `&event_datetime=lte.${encodeURIComponent(to)}` +
    '&reminder_sent_at=is.null' +
    '&is_removed=eq.false' +
    '&order=event_datetime.asc&limit=100');
}

async function remindOneEvent(event, summary) {
  const team = await resolveTeam(event.team_leader_id);
  if (!team) { summary.skipped++; return; }

  const rsvps = await sbGet('team_event_rsvps',
    `select=participant_id,rsvp_status&event_id=eq.${encodeURIComponent(event.id)}&limit=500`);
  const statusByPid = {};
  for (const r of rsvps) statusByPid[r.participant_id] = r.rsvp_status;

  const teamName = teamDisplayName(team);
  let anySent = false;
  let anyFailed = false;

  for (const member of teamRecipients(team)) {
    const status = statusByPid[member.participant_id] || null;
    if (status === 'cant') continue;   // explicitly opted out of this event

    summary.attempted++;
    try {
      const { subject, html } = renderEventReminderEmail({
        recipientFirstName: firstNameOf(member),
        recipientPid:       member.participant_id,
        teamName,
        event,
        rsvpStatus:         status,
      });
      const id = await sendViaResend(member.email, subject, html);
      summary.succeeded++;
      if (id) summary.sent_ids.push(id);
      anySent = true;
    } catch (err) {
      anyFailed = true;
      summary.failed++;
      summary.failures.push({ event_id: event.id, participant_id: member.participant_id, error: err.message });
      console.error('event reminder failed for', member.participant_id, err);
    }
  }

  // Mark sent when delivery succeeded (or there was no one to send to, so
  // re-runs don't spin on an empty team). If EVERY send failed, leave NULL
  // so the next tick retries — same retry posture as the Stage 3 cron.
  if (anySent || !anyFailed) {
    await sbPatch('team_events', `id=eq.${event.id}`,
      { reminder_sent_at: new Date().toISOString() });
    summary.events_marked++;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (CRON_SECRET) {
    const auth = (req.headers && req.headers.authorization) || '';
    if (auth !== ('Bearer ' + CRON_SECRET)) return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const startedAt = new Date();
  const summary = {
    started_at_iso: startedAt.toISOString(),
    events_found: 0, events_marked: 0,
    attempted: 0, succeeded: 0, skipped: 0, failed: 0,
    failures: [], sent_ids: [],
  };

  try {
    const events = await queryDueEvents(startedAt);
    summary.events_found = events.length;
    for (const event of events) {
      await remindOneEvent(event, summary);
    }
    summary.finished_at_iso = new Date().toISOString();
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    console.error('send-event-reminders fatal:', err);
    summary.fatal = err.message;
    summary.finished_at_iso = new Date().toISOString();
    return res.status(500).json({ success: false, summary });
  }
};
