// api/partner/[...path].js — all /api/partner/* routes (v6 Phase 1).
//
//   POST /api/partner/request-login   — B1: send magic link (no auth; never enumerates)
//   GET  /api/partner/login?token=…   — B2: redeem magic link → cookie → redirect
//   POST /api/partner/logout          — B5: destroy session + clear cookie
//   GET  /api/partner/dashboard       — D1: full metrics payload + narrative + insight
//   GET  /api/partner/growth-series   — Metric 12 (range=30d|90d|12w|all)
//   GET  /api/partner/events          — Phase 1: always [] (publishing is Phase 2)
//
// PRIVACY (Part F): every authed route is scoped to the AUTHENTICATED
// partner only — no query parameter can select a different partner (F5).
// Thresholds are applied in lib/partner-metrics.js before data reaches this
// layer. Sensitive fields are never queried (see NETWORK_COLUMNS there).

'use strict';

const auth = require('../../lib/partner-auth.js');
const metrics = require('../../lib/partner-metrics.js');
const { renderPartnerLoginEmail } = require('../../lib/partner-email-templates.js');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = 'Faithful Witness <discernment@faithfulwitness.us>';
const BASE_URL       = process.env.FW_BASE_URL || 'https://faithful-witness.vercel.app';

function json(res, code, body) { return res.status(code).json(body); }

function parseBody(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body || {};
}

async function sendViaResend(to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error('Resend error ' + r.status);
}

// ─── B1 ─────────────────────────────────────────────────────────────────────

async function handleRequestLogin(req, res) {
  const body = parseBody(req);
  const email = String(body.email || '').trim().toLowerCase();

  // Uniform response shape & timing posture: do the work quietly, reveal nothing.
  try {
    const users = await auth.findActiveUsersByEmail(email);
    // An email may map to several partner_users (staff). One magic link per
    // request: use the first active mapping; the session carries partner_id.
    // (Multi-partner switcher is a v2 nicety; staff can use per-partner links.)
    if (users.length > 0) {
      const user = users[0];
      const rawToken = await auth.createMagicLink(user.id);
      const loginUrl = BASE_URL + '/partner/login?token=' + rawToken;
      const firstName = ((user.full_name || '').trim().split(/\s+/)[0]) || '';
      const { subject, html } = renderPartnerLoginEmail({ firstName, loginUrl });
      await sendViaResend(email, subject, html);
    }
  } catch (err) {
    // Log but still return success — never leak registration state via errors.
    console.error('request-login error:', err.message);
  }
  return json(res, 200, { success: true, message: 'If that email is registered, a login link has been sent.' });
}

// ─── B2 ─────────────────────────────────────────────────────────────────────

const EXPIRED_PAGE = ''
  + '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>Link expired — Faithful Witness</title>'
  + '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@1&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">'
  + '<style>body{font-family:"Plus Jakarta Sans",sans-serif;background:#f0eee8;color:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}'
  + '.card{background:#fff;border-radius:12px;padding:44px 40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(51,56,88,0.08);}'
  + 'h1{font-family:"Libre Baskerville",serif;font-style:italic;font-size:24px;color:#333858;margin:0 0 12px;}'
  + 'p{font-size:14.5px;color:#4a4a6a;line-height:1.7;margin:0 0 22px;}'
  + 'a{display:inline-block;background:#333858;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;}</style></head>'
  + '<body><div class="card"><h1>This link has expired or already been used.</h1>'
  + '<p>Login links are valid for 15 minutes and can only be used once. Request a new one and check your inbox.</p>'
  + '<a href="/partner">Request a new link</a></div></body></html>';

async function handleLogin(req, res) {
  const token = (req.query && req.query.token) || '';
  const result = await auth.redeemMagicLink(token);
  if (!result) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).end(EXPIRED_PAGE);
  }
  res.setHeader('Set-Cookie', auth.sessionCookieHeader(result.rawSession));
  res.setHeader('Location', '/partner/dashboard');
  return res.status(302).end();
}

// ─── B5 ─────────────────────────────────────────────────────────────────────

async function handleLogout(req, res) {
  const ctx = await auth.authenticate(req);
  if (ctx) await auth.destroySession(ctx.sessionId);
  res.setHeader('Set-Cookie', auth.clearCookieHeader());
  return json(res, 200, { success: true });
}

// ─── Authed data routes ─────────────────────────────────────────────────────

async function handleDashboard(req, res, ctx) {
  // F5: the authenticated partner is the ONLY scope. Query params (e.g. a
  // ?slug= someone might try) are deliberately ignored.
  const d = await metrics.computeDashboard(ctx.partner);
  d.narrative = metrics.narrativeFor(d);
  d.insight   = metrics.insightFor(d);
  d.viewer = {
    full_name: ctx.partnerUser.full_name || ctx.partnerUser.email,
    role: ctx.partnerUser.role,
  };
  await auth.logAccess(ctx, req, '/api/partner/dashboard');
  return json(res, 200, d);
}

async function handleGrowthSeries(req, res, ctx) {
  const range = ['30d', '90d', '12w', 'all'].indexOf(req.query.range) >= 0 ? req.query.range : '12w';
  const series = await metrics.computeGrowthSeries(ctx.partner, range);
  await auth.logAccess(ctx, req, '/api/partner/growth-series');
  return json(res, 200, series);
}

async function handleEvents(req, res, ctx) {
  await auth.logAccess(ctx, req, '/api/partner/events');
  return json(res, 200, { events: [] });   // Phase 2 builds publishing
}

// ─── Router ─────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // NOTE: no Access-Control-Allow-Origin here — partner routes are same-site
  // only, and the session cookie must never be readable cross-origin.

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return json(res, 500, { error: 'Missing required environment variables' });
  }

  try {
    let path = req.query.path || [];
    if (typeof path === 'string') path = path.split('/').filter(Boolean);
    const route = path[0] || '';

    // Unauthenticated routes
    if (route === 'request-login' && req.method === 'POST') return handleRequestLogin(req, res);
    if (route === 'login' && req.method === 'GET')          return handleLogin(req, res);
    if (route === 'logout' && req.method === 'POST')        return handleLogout(req, res);

    // Everything else requires a valid session (B4). Fail → 401.
    const ctx = await auth.authenticate(req);
    if (!ctx) return json(res, 401, { error: 'Not authenticated', redirect: '/partner' });

    if (route === 'dashboard' && req.method === 'GET')      return handleDashboard(req, res, ctx);
    if (route === 'growth-series' && req.method === 'GET')  return handleGrowthSeries(req, res, ctx);
    if (route === 'events' && req.method === 'GET')         return handleEvents(req, res, ctx);

    return json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('partner api error:', err);
    return json(res, 500, { error: 'Server error' });
  }
};
