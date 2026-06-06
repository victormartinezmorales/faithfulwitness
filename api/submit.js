// api/submit.js — Vercel serverless function
// Receives form submissions and writes to Supabase.
//
// v3 update (assessment v3.0):
//   - ADD new columns alongside existing ones. Existing columns and behavior preserved per guardrail.
//   - impact_proximity is sensitive (spec §6). Only persisted when the client sent it (the
//     ENABLE_IMPACT_QUESTION flag was on). Row-level access restriction is enforced on the
//     Supabase side via the migration in migrations/v3_add_fields.sql.
//   - DO NOT add impact_proximity to any external sync. See the Mailchimp note on the front end.
//
// Env vars unchanged: SUPABASE_URL, SUPABASE_SERVICE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Small helpers
const toIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toArrayOrEmpty = (v) => (Array.isArray(v) ? v : []);
const toStringOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
const toBool = (v) => v === true || v === 'true';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('campaignOptIn received:', data.campaignOptIn);

    const row = {
      // ── Existing columns (preserved per guardrail) ──
      name:            data.name        || null,
      email:           data.email       || null,
      zip:             data.zip         || null,
      profile_name:    data.profileName || null,
      profile_type:    data.profileType || null,
      exposure:        data.exposure    || null,
      posture:         data.posture     || null,
      readiness:       data.readiness   || null,
      understanding:   data.understanding || null,
      motivation:      data.motivation  || null,
      gifting:         data.gifting     || null,
      church_context:  data.churchContext || null,
      ready_flag:      toBool(data.readyFlag),
      campaign_optin:  toBool(data.campaignOptIn),
      raw_answers:     data.rawAnswers  || null,

      // ── v3 new columns (spec §2 core record) ──
      participant_id:     toStringOrNull(data.participant_id),
      assessment_version: toStringOrNull(data.assessment_version) || '3.0',
      started_at:         toStringOrNull(data.started_at),
      completed_at:       toStringOrNull(data.completed_at),
      profile_assigned:   toStringOrNull(data.profile_assigned),
      team_code:          toStringOrNull(data.team_code),
      invited_by:         toStringOrNull(data.invited_by),
      referral_source:    toStringOrNull(data.referral_source),

      // ── v3 new columns (spec §3 dimensions) ──
      exposure_level:           toIntOrNull(data.exposure_level),
      understanding_informed:   toIntOrNull(data.understanding_informed),
      understanding_confidence: toIntOrNull(data.understanding_confidence),
      perspective_lean:         (data.perspective_lean === null || data.perspective_lean === undefined) ? null : toIntOrNull(data.perspective_lean),
      perspective_unsure:       toBool(data.perspective_unsure),
      posture_openness:         toIntOrNull(data.posture_openness),
      motivation_arr:           toArrayOrEmpty(data.motivation_arr),
      readiness_stage:          toIntOrNull(data.readiness_stage),
      gifting_arr:              toArrayOrEmpty(data.gifting_arr),

      // ── v3 new columns (spec §4 context) ──
      faith_tradition:    toStringOrNull(data.faith_tradition),
      leadership_context: toArrayOrEmpty(data.leadership_context),
      engaging_for:       toStringOrNull(data.engaging_for),
      time_capacity:      toStringOrNull(data.time_capacity),
      burning_question:   toStringOrNull(data.burning_question),
    };

    // ── C4 impact_proximity — sensitive, optional. Only included when the client sent it. ──
    // The migration restricts read/write to the service role (RLS), so this is never exposed
    // in any broad dashboard view or external sync. Never add this to Mailchimp or analytics.
    if (Object.prototype.hasOwnProperty.call(data, 'impact_proximity')) {
      row.impact_proximity = toIntOrNull(data.impact_proximity);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: 'Database write failed' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
