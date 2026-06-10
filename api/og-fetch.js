// api/og-fetch.js — Open Graph preview helper (B8).
//
// GET /api/og-fetch?url=...&pid=...
// Used by the Add Event modal for the live preview card when a leader pastes
// an event URL. 5-second timeout (lib/og.js). Returns
//   { title, description, image, host, platform }  on success
//   { error }                                       on failure
//
// Requires a valid ?pid= (any known participant) so the endpoint can't be
// used as an anonymous open proxy. It fetches PUBLIC pages only and returns
// metadata, never the page body.

'use strict';

const { fetchOgMetadata } = require('../lib/og.js');
const { getParticipant, isUuid } = require('../lib/team-data.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const pid = (req.query && req.query.pid) || '';
    if (!isUuid(pid) || !(await getParticipant(pid))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const url = (req.query && req.query.url) || '';
    const og = await fetchOgMetadata(url);
    return res.status(200).json({
      title:       og.title,
      description: og.description,
      image:       og.image,
      host:        og.host,
      platform:    og.platform,
    });
  } catch (err) {
    const msg = err.code === 'INVALID_URL' ? 'Invalid URL'
              : err.name === 'AbortError'  ? 'Timed out fetching that page'
              : 'Could not fetch that page';
    return res.status(200).json({ error: msg });
  }
};
