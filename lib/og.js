// lib/og.js — Open Graph metadata fetch + source-platform derivation.
// Used by GET /api/og-fetch (live preview in the Add Event modal) and by
// POST /api/team/:id/events (server-side fetch at creation time).

'use strict';

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES   = 300 * 1024;   // parse at most the first 300KB

function validateEventUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // Reject obvious SSRF targets: localhost / private hosts. (The serverless
  // egress environment has no internal network, but deny anyway.)
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '[::1]') return null;
  return u;
}

function derivePlatform(urlObj) {
  const h = urlObj.hostname.toLowerCase().replace(/^www\./, '');
  if (h.endsWith('eventbrite.com') || h.endsWith('eventbrite.co.uk')) return 'eventbrite';
  if (h.endsWith('mobilize.us'))                                      return 'mobilize';
  if (h.endsWith('facebook.com') || h === 'fb.me' || h === 'fb.com')  return 'facebook';
  if (h === 'calendar.google.com')                                    return 'google_calendar';
  if (h === 'faithful-witness.vercel.app' || h.endsWith('faithfulwitness.us')) return 'internal';
  return 'other';
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

// Pull <meta property="og:X" content="..."> regardless of attribute order.
function metaContent(html, prop) {
  const re1 = new RegExp(
    '<meta[^>]+(?:property|name)\\s*=\\s*["\']' + prop + '["\'][^>]*\\scontent\\s*=\\s*["\']([^"\']*)["\']', 'i');
  const re2 = new RegExp(
    '<meta[^>]+content\\s*=\\s*["\']([^"\']*)["\'][^>]*(?:property|name)\\s*=\\s*["\']' + prop + '["\']', 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeEntities(m[1]).trim() : '';
}

// Fetch a URL and extract { title, description, image, url, host, platform }.
// Never throws for content problems — returns nulls; throws only on
// timeout/network so callers can distinguish "no OG tags" from "unreachable".
async function fetchOgMetadata(rawUrl) {
  const u = validateEventUrl(rawUrl);
  if (!u) { const e = new Error('Invalid URL'); e.code = 'INVALID_URL'; throw e; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html = '';
  try {
    const r = await fetch(u.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Some platforms gate OG tags behind a crawler-ish UA.
        'User-Agent': 'Mozilla/5.0 (compatible; FaithfulWitnessBot/1.0; +https://faithfulwitness.us)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!r.ok) { const e = new Error('Fetch failed: ' + r.status); e.code = 'FETCH_FAILED'; throw e; }
    const buf = await r.arrayBuffer();
    html = Buffer.from(buf.slice(0, MAX_HTML_BYTES)).toString('utf8');
  } finally {
    clearTimeout(timer);
  }

  const titleTag = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  const image = metaContent(html, 'og:image') || metaContent(html, 'og:image:url');

  return {
    title:       metaContent(html, 'og:title') || decodeEntities(titleTag).trim() || null,
    description: metaContent(html, 'og:description') || metaContent(html, 'description') || null,
    image:       /^https?:\/\//i.test(image) ? image : null,
    url:         metaContent(html, 'og:url') || u.toString(),
    host:        u.hostname.replace(/^www\./, ''),
    platform:    derivePlatform(u),
  };
}

module.exports = { fetchOgMetadata, validateEventUrl, derivePlatform };
