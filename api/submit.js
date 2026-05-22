// api/submit.js — Vercel serverless function
// Receives form submissions and writes to Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('campaignOptIn received:', data.campaignOptIn);

    const row = {
      name:           data.name        || null,
      email:          data.email       || null,
      zip:            data.zip         || null,
      profile_name:   data.profileName || null,
      profile_type:   data.profileType || null,
      exposure:       data.exposure    || null,
      posture:        data.posture     || null,
      readiness:      data.readiness   || null,
      understanding:  data.understanding || null,
      motivation:     data.motivation  || null,
      gifting:        data.gifting     || null,
      church_context: data.churchContext || null,
      ready_flag:     data.readyFlag === true || data.readyFlag === 'true',
      campaign_optin: data.campaignOptIn === true || data.campaignOptIn === 'true',
      raw_answers:    data.rawAnswers  || null,
    };

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
