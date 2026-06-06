// api/dashboard.js — Vercel serverless function
// Server-side proxy for the internal dashboard. Replaces the previous pattern of
// hitting Supabase directly from dashboard.html with a publishable anon key, which
// effectively made all submission data world-readable.
//
// What this endpoint does:
//   * Authenticates to Supabase with the service_role key (env: SUPABASE_SERVICE_KEY).
//   * Returns only the fields the dashboard actually renders. Sensitive fields are
//     stripped server-side — they never reach the browser:
//       - email           (PII, not used by the dashboard)
//       - raw_answers     (free-form, may contain anything)
//       - impact_proximity (per spec §6, never in dashboards or external syncs)
//   * Optional shared-secret check via DASHBOARD_TOKEN env var. If unset, the endpoint
//     is open (matches today's effective security). If set, requests must include
//     header "x-fw-dashboard-token: <value>" or query ?token=<value>.
//
// Env vars used: SUPABASE_URL, SUPABASE_SERVICE_KEY (existing), DASHBOARD_TOKEN (optional, new).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN; // optional

// Whitelist of columns the dashboard is allowed to see. Add new dashboard columns here
// explicitly; never use SELECT *. This is the column-level firewall.
const ALLOWED_COLUMNS = [
  'id',
  'created_at',
  'name',
  'zip',
  'profile_name',
  'profile_type',
  'profile_assigned',
  'exposure',
  'posture',
  'readiness',
  'understanding',
  'motivation',
  'gifting',
  'church_context',
  'ready_flag',
  'campaign_optin',
  // v3 typed dimensions (safe aggregates)
  'exposure_level',
  'understanding_informed',
  'understanding_confidence',
  'perspective_lean',
  'perspective_unsure',
  'posture_openness',
  'readiness_stage',
  'faith_tradition',
  'leadership_context',
  'engaging_for',
  'time_capacity',
  // v3 arrays — safe to expose
  'motivation_arr',
  'gifting_arr',
  // v3 identity / linking — safe
  'participant_id',
  'team_code',
  'assessment_version',
  // Explicitly NOT in this list (kept out of the dashboard intentionally):
  //   email, raw_answers, burning_question, impact_proximity, invited_by, referral_source
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fw-dashboard-token');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  // Optional token gate.
  if (DASHBOARD_TOKEN) {
    const supplied = req.headers['x-fw-dashboard-token'] || (req.query && req.query.token) || '';
    if (supplied !== DASHBOARD_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/submissions?select=${encodeURIComponent(ALLOWED_COLUMNS.join(','))}&order=created_at.desc`;
    const response = await fetch(url, {
      headers: {
        'apikey':         SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Accept':        'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Dashboard fetch failed:', response.status, text);
      return res.status(502).json({ error: 'Upstream fetch failed' });
    }

    const rows = await response.json();
    return res.status(200).json({ submissions: rows });

  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
