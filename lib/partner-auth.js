// lib/partner-auth.js — magic-link authentication for the partner dashboard.
//
// Token model (Data Promise: defense in depth):
//   * Raw tokens are 32 random bytes hex (crypto.randomBytes).
//   * The DATABASE stores only sha256 hex digests — of the magic-link token
//     and of the session token. A database leak exposes no usable secrets.
//   * The raw magic-link token travels once, in the emailed link.
//   * The raw session token lives only in the HTTP-only, Secure cookie.
//
// Sessions: magic link valid 15 minutes, single-use (used_at). Session valid
// 24 hours. Logout nulls the session token server-side AND clears the cookie.

'use strict';

const crypto = require('crypto');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;        // 15 minutes
const SESSION_TTL_MS    = 24 * 60 * 60 * 1000;   // 24 hours
const COOKIE_NAME       = 'partner_session';

// ─── Supabase REST (same pattern as lib/team-data.js) ──────────────────────

async function sbGet(table, params) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Accept': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`Supabase GET ${table} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbWrite(method, table, params, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${method} ${table} failed: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

const sbInsert = (t, b)    => sbWrite('POST',  t, '', b);
const sbPatch  = (t, p, b) => sbWrite('PATCH', t, p, b);

async function sbRpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(args || {}),
  });
  if (!r.ok) throw new Error(`Supabase RPC ${fn} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// ─── Tokens ─────────────────────────────────────────────────────────────────

function newToken()  { return crypto.randomBytes(32).toString('hex'); }
function hashToken(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }

// ─── Cookies ────────────────────────────────────────────────────────────────

function readSessionCookie(req) {
  const header = (req.headers && req.headers.cookie) || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionCookieHeader(rawToken) {
  // HTTP-only + Secure + SameSite=Lax (the magic-link redirect is same-site).
  return `${COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ─── Flows ──────────────────────────────────────────────────────────────────

// B1: look up active partner_users for an email (an email may belong to
// several partners — staff accounts do). Returns [] silently for unknown
// emails; the endpoint must respond success either way (no enumeration).
async function findActiveUsersByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e || e.length > 320 || e.indexOf('@') < 1) return [];
  return sbGet('partner_users',
    `select=id,partner_id,email,full_name,role,is_active` +
    `&email=eq.${encodeURIComponent(e)}&is_active=eq.true&limit=10`);
}

async function createMagicLink(partnerUserId) {
  const raw = newToken();
  await sbInsert('partner_sessions', {
    partner_user_id:       partnerUserId,
    magic_link_token:      hashToken(raw),
    magic_link_expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString(),
    session_token:         null,
  });
  return raw;   // goes into the email only
}

// B2: exchange a magic-link token for a session. Returns { rawSession,
// partnerUser } or null (invalid / expired / already used).
async function redeemMagicLink(rawMagicToken) {
  if (!rawMagicToken || !/^[0-9a-f]{64}$/i.test(rawMagicToken)) return null;
  const rows = await sbGet('partner_sessions',
    `select=id,partner_user_id,magic_link_expires_at,used_at` +
    `&magic_link_token=eq.${hashToken(rawMagicToken)}&limit=1`);
  const s = rows[0];
  if (!s) return null;
  if (s.used_at) return null;                                         // single-use
  if (!s.magic_link_expires_at ||
      new Date(s.magic_link_expires_at).getTime() < Date.now()) return null;

  const users = await sbGet('partner_users',
    `select=id,partner_id,email,full_name,role,is_active&id=eq.${s.partner_user_id}&limit=1`);
  const user = users[0];
  if (!user || !user.is_active) return null;

  const rawSession = newToken();
  await sbPatch('partner_sessions', `id=eq.${s.id}`, {
    session_token:      hashToken(rawSession),
    session_expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    used_at:            new Date().toISOString(),
  });
  await sbPatch('partner_users', `id=eq.${user.id}`,
    { last_login_at: new Date().toISOString() });

  return { rawSession, partnerUser: user };
}

// B4: middleware — resolve the cookie to { partnerUser, partner, sessionId }
// or null. Every failure mode returns null; callers deny.
async function authenticate(req) {
  const raw = readSessionCookie(req);
  if (!raw || !/^[0-9a-f]{64}$/i.test(raw)) return null;

  const rows = await sbGet('partner_sessions',
    `select=id,partner_user_id,session_expires_at` +
    `&session_token=eq.${hashToken(raw)}&limit=1`);
  const s = rows[0];
  if (!s) return null;
  if (!s.session_expires_at ||
      new Date(s.session_expires_at).getTime() < Date.now()) return null;

  const users = await sbGet('partner_users',
    `select=id,partner_id,email,full_name,role,is_active&id=eq.${s.partner_user_id}&limit=1`);
  const user = users[0];
  if (!user || !user.is_active) return null;

  const partners = await sbGet('partners',
    `select=id,slug,organization_name,full_legal_name,is_active,onboarded_at,retired_at` +
    `&id=eq.${user.partner_id}&limit=1`);
  const partner = partners[0];
  if (!partner) return null;

  return { sessionId: s.id, partnerUser: user, partner };
}

// B5: logout — null the session token server-side.
async function destroySession(sessionId) {
  await sbPatch('partner_sessions', `id=eq.${sessionId}`,
    { session_token: null, session_expires_at: null });
}

// F3: audit log, with opportunistic 90-day retention (no new cron).
async function logAccess(ctx, req, endpoint) {
  try {
    await sbInsert('partner_access_log', {
      partner_user_id: ctx.partnerUser.id,
      partner_id:      ctx.partner.id,
      endpoint,
      user_agent:  String((req.headers && req.headers['user-agent']) || '').slice(0, 400),
      ip_address:  String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim().slice(0, 100),
    });
    // Retention: delete anything older than 90 days. Cheap at this scale.
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/partner_access_log?occurred_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
  } catch (err) {
    console.error('partner access log failed (non-fatal):', err.message);
  }
}

module.exports = {
  sbGet, sbInsert, sbPatch, sbRpc,
  newToken, hashToken,
  readSessionCookie, sessionCookieHeader, clearCookieHeader,
  findActiveUsersByEmail, createMagicLink, redeemMagicLink,
  authenticate, destroySession, logAccess,
  COOKIE_NAME,
};
