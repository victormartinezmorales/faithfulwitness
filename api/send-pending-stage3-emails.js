// api/send-pending-stage3-emails.js — Vercel serverless function (cron)
//
// Sends the Stage 3 reflection email to participants who completed Stage 3
// more than 8 hours ago and have not yet received the email. Idempotent:
// updates submissions.stage3_email_sent_at on successful send so re-runs
// skip already-sent participants.
//
// Scheduled by vercel.json at 12:00 UTC daily (08:00 ET / 05:00 PT).
// The 8-hour delay window means a participant who finishes Stage 3 late
// at night gets the email the NEXT morning, not the same morning.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY.
// Optional env var CRON_SECRET enforces a bearer-token check on inbound
// requests so the endpoint isn't abusable by anyone with the URL. Vercel
// cron jobs automatically include this header when CRON_SECRET is set in
// the project's environment variables.

'use strict';

const { renderStage3Email } = require('../lib/email-templates.js');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const CRON_SECRET          = process.env.CRON_SECRET || null;

const FROM_EMAIL = 'Faithful Witness <discernment@faithfulwitness.us>';

// Map the canonical legacy/loose profile keys onto the five canonical ones.
// Older submissions may have stored profile_assigned in a slightly different
// shape; this normalizes safely.
const PROFILE_NORMALIZE = {
  open_explorer:      'open_explorer',
  thoughtful_learner: 'thoughtful_learner',
  careful_seeker:     'careful_seeker',
  ready_responder:    'ready_responder',
  faithful_witness:   'faithful_witness',
};

function firstNameOf(row) {
  // The "name" column stores what the participant typed in the first-name
  // field of the assessment. Use the first whitespace-delimited token as
  // the first name; fall back to "friend" if empty.
  const raw = (row && row.name ? String(row.name) : '').trim();
  if (!raw) return 'friend';
  return raw.split(/\s+/)[0];
}

async function querySupabasePending(now) {
  // Per spec: stage3_completed_at < (now - 8 hours) AND stage3_email_sent_at IS NULL.
  // We use Supabase's REST API + PostgREST filters. The "lt" filter on a
  // timestamptz column accepts an ISO string.
  const cutoff = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();
  const params = [
    'select=' + encodeURIComponent(
      'participant_id,name,email,profile_assigned,burning_question,' +
      'cant_shake_text,cant_shake_emotions,specific_neighbor,specific_neighbor_other,' +
      'action_shape,contextual_focus,contextual_focus_specific_place,sense_of_calling,' +
      'stage3_completed_at,stage3_email_sent_at'
    ),
    'stage3_completed_at=not.is.null',
    'stage3_completed_at=lt.' + encodeURIComponent(cutoff),
    'stage3_email_sent_at=is.null',
    'email=not.is.null',
    'order=stage3_completed_at.asc',
    'limit=200',
  ].join('&');

  const url = `${SUPABASE_URL}/rest/v1/submissions?${params}`;
  const r = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error('Supabase select failed: ' + r.status + ' ' + errText);
  }
  return await r.json();
}

async function markSent(participantId, sentAtIso) {
  // PATCH the row by participant_id. We send on individual rows even if
  // the same pid had multiple rows (rare; defensive).
  const url = `${SUPABASE_URL}/rest/v1/submissions?participant_id=eq.${encodeURIComponent(participantId)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({ stage3_email_sent_at: sentAtIso }),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error('Supabase patch failed: ' + r.status + ' ' + errText);
  }
}

async function sendOneEmail(row) {
  const firstName = firstNameOf(row);
  const profileKey = PROFILE_NORMALIZE[row.profile_assigned] || 'open_explorer';

  // jsonb fields come back from PostgREST as already-parsed JS objects
  // when stored as jsonb. Defensive parse otherwise.
  const parseArr = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
    }
    return [];
  };

  const { subject, html } = renderStage3Email({
    firstName,
    profileKey,
    participantId:                row.participant_id || '',
    burningQuestion:              row.burning_question || '',
    cantShakeText:                row.cant_shake_text || '',
    cantShakeEmotions:            parseArr(row.cant_shake_emotions),
    specificNeighbor:             parseArr(row.specific_neighbor),
    specificNeighborOther:        row.specific_neighbor_other || '',
    actionShape:                  row.action_shape || '',
    contextualFocus:              parseArr(row.contextual_focus),
    contextualFocusSpecificPlace: row.contextual_focus_specific_place || '',
    senseOfCalling:               row.sense_of_calling || '',
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [row.email],
      subject: subject,
      html:    html,
    }),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error('Resend error ' + resp.status + ': ' + (result && result.message ? result.message : 'unknown'));
  }
  return result && result.id ? result.id : null;
}

module.exports = async function handler(req, res) {
  // CORS-friendly, but the cron path is server-to-server.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  // Vercel cron uses GET. Allow GET and POST for manual / curl re-runs.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional bearer-token gate. If CRON_SECRET is set in the env, every
  // inbound request must present it. Vercel cron supplies it automatically.
  if (CRON_SECRET) {
    const auth = (req.headers && req.headers.authorization) || '';
    if (auth !== ('Bearer ' + CRON_SECRET)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const startedAt = new Date();
  const summary = {
    started_at_iso: startedAt.toISOString(),
    attempted:      0,
    succeeded:      0,
    skipped:        0,   // matched but had no email / no profile after normalization
    failed:         0,
    failures:       [],  // [{ participant_id, error }]
    sent_ids:       [],  // resend message ids for trace
  };

  try {
    const rows = await querySupabasePending(startedAt);

    for (const row of rows) {
      if (!row.email || !row.participant_id) {
        summary.skipped++;
        continue;
      }
      summary.attempted++;
      try {
        const sendId = await sendOneEmail(row);
        await markSent(row.participant_id, new Date().toISOString());
        summary.succeeded++;
        if (sendId) summary.sent_ids.push(sendId);
      } catch (err) {
        summary.failed++;
        summary.failures.push({
          participant_id: row.participant_id,
          error: (err && err.message) ? err.message : String(err),
        });
        // Continue to the next recipient; do NOT mark sent on failure so
        // the next cron tick will retry.
        // eslint-disable-next-line no-console
        console.error('stage3 email send failed for', row.participant_id, err);
      }
    }

    summary.finished_at_iso = new Date().toISOString();
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('send-pending-stage3-emails fatal:', err);
    summary.finished_at_iso = new Date().toISOString();
    summary.fatal = (err && err.message) ? err.message : String(err);
    return res.status(500).json({ success: false, summary });
  }
};
