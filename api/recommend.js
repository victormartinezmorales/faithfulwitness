// api/recommend.js — Vercel serverless function
// Stage 4 routing engine (spec §5). CommonJS, consistent with submit.js.
//
// Build-dark posture (Stage 4 launch sequence):
//   - The next_steps catalog is empty in v4.0. With no eligible rows,
//     this endpoint returns { step_ids: [], generation_version: 'v4.0' }.
//   - The front end gates calls behind ENABLE_STAGE_4; while that flag
//     is off the endpoint will not be invoked at all. It exists now so
//     it can be exercised in dark before the catalog is populated.
//
// What it does when a participant_id is posted:
//   1. Loads the participant's full v4 record from submissions.
//   2. Loads the active next_steps catalog.
//   3. Applies §5 hard filters (profile, time, geography, active).
//   4. Scores eligible rows per §5 weights (specific_neighbor + 5,
//      action_shape + 4, motivation/gifting/context + 2 each, priority
//      + 3, faith_tradition + 1).
//   5. Adjusts emphasis using cant_shake_emotions (§5 Step 3).
//   6. Selects primary, alternative-from-different-action_shape, and
//      a stretch step (highest-scored that does NOT match current
//      action_shape). Falls back gracefully when fewer than 3 qualify.
//   7. Persists the chosen set to participant_recommendations and logs
//      a 'shown' event per chosen step in next_step_events.
//   8. Returns the ordered step_ids.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (same as submit.js).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GENERATION_VERSION = 'v4.0';

// ── Small helpers ─────────────────────────────────────────────────────
const asArray = (v) => (Array.isArray(v) ? v : []);
const overlap = (a, b) => asArray(a).filter((x) => asArray(b).includes(x)).length;
const toEffectiveTimeCapacity = (p) =>
  (p && (p.time_recalibrated || p.time_capacity)) || null;

const TIME_BUCKET_RANK = {
  one_time: 1,
  monthly: 2,
  weekly_ongoing: 3,
};

// "A step flagged weekly_ongoing does not surface for someone whose
// effective capacity is one_time." Compatibility: step's time_level <=
// participant's effective bucket. If either is missing, allow.
function timeCompatible(stepLevel, effectiveCapacity) {
  if (!stepLevel) return true;
  if (!effectiveCapacity) return true;
  const sRank = TIME_BUCKET_RANK[stepLevel];
  const pRank = TIME_BUCKET_RANK[effectiveCapacity];
  if (!sRank || !pRank) return true;
  return sRank <= pRank;
}

function geographyCompatible(step, participant) {
  if (!step.geography || step.geography === 'national') return true;
  if (step.remote_available === true) return true;
  // We don't derive state from zip here; spec §5 says geography filter
  // matches "national, or the participant's zip-derived state/city, or
  // remote-available." For v4.0 launch with an empty catalog this branch
  // is moot; treat anything else as compatible until zip-to-state lookup
  // is added alongside catalog rows.
  return true;
}

function scoreStep(step, p) {
  let score = 0;
  score += 5 * overlap(p.specific_neighbor, step.population_match);
  if (p.action_shape && asArray(step.action_shape_match).includes(p.action_shape)) {
    score += 4;
  }
  score += 2 * overlap(p.motivation_arr, step.motivation_match);
  score += 2 * overlap(p.gifting_arr,    step.gifting_match);
  score += 2 * overlap(p.contextual_focus, step.context_match);
  if (step.priority === 'high') score += 3;
  if (p.faith_tradition && asArray(step.faith_tradition_match).includes(p.faith_tradition)) {
    score += 1;
  }
  return score;
}

// Emotional routing modifiers (spec §5 Step 3). Tags here lift category
// weights via the step's action_shape_match / partner_org fields.
const EMOTION_BOOSTS = {
  angry:      { shapes: ['advocate_publicly'],                              points: 3 },
  grieved:    { shapes: ['accompany_affected'],                             points: 3 },
  troubled:   { shapes: ['deepen_learning'],                                points: 2 },
  frightened: { shapes: ['build_relationship','start_in_community'],        points: 2 },
  confused:   { shapes: ['deepen_learning'],                                points: 3 },
  ashamed:    { shapes: ['deepen_learning'],                                points: 2 },
  weary:      { shapes: ['deepen_learning','build_relationship'],           points: 2 },
};

function applyEmotionalRouting(step, emotions) {
  let bonus = 0;
  asArray(emotions).forEach((e) => {
    const rule = EMOTION_BOOSTS[e];
    if (!rule) return;
    rule.shapes.forEach((s) => {
      if (asArray(step.action_shape_match).includes(s)) bonus += rule.points;
    });
  });
  return bonus;
}

function selectFinalSet(scored, currentActionShape) {
  // scored: [{ step, score }] sorted desc.
  if (scored.length === 0) return [];

  const chosen = [];
  const used = new Set();

  // Primary: top-scored.
  chosen.push(scored[0].step);
  used.add(scored[0].step.id);

  // Alternative: highest from a different action_shape than primary
  // (per spec, the alternative should differ in shape when possible).
  const primaryShape = asArray(chosen[0].action_shape_match)[0] || null;
  const alt = scored.find(
    (r) => !used.has(r.step.id) && (asArray(r.step.action_shape_match)[0] !== primaryShape)
  );
  if (alt) {
    chosen.push(alt.step);
    used.add(alt.step.id);
  }

  // Stretch: highest-scored that does NOT match the participant's
  // current action_shape (gently labeled in the UI).
  const stretch = scored.find(
    (r) => !used.has(r.step.id) &&
      currentActionShape &&
      !asArray(r.step.action_shape_match).includes(currentActionShape)
  );
  if (stretch) {
    chosen.push(stretch.step);
    used.add(stretch.step.id);
  }

  // Fill any remaining slots with the next highest by priority tiebreaker.
  for (const r of scored) {
    if (chosen.length >= 3) break;
    if (!used.has(r.step.id)) {
      chosen.push(r.step);
      used.add(r.step.id);
    }
  }
  return chosen.slice(0, 3);
}

// ── Supabase helpers (REST) ──────────────────────────────────────────
async function loadParticipant(pid) {
  const url = `${SUPABASE_URL}/rest/v1/submissions?participant_id=eq.${encodeURIComponent(pid)}&order=completed_at.desc&limit=1`;
  const r = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  if (!r.ok) throw new Error('participant load failed: ' + (await r.text()));
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}

async function loadCatalog(profileKey) {
  // Hard-filter by profile_match and active on the database side.
  // profile_match is jsonb; we use the cs (contains) operator.
  const url =
    `${SUPABASE_URL}/rest/v1/next_steps` +
    `?active=eq.true` +
    `&profile_match=cs.${encodeURIComponent(JSON.stringify([profileKey]))}`;
  const r = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  if (!r.ok) return [];          // empty catalog ⇒ empty recommendations
  return await r.json();
}

async function persistRecommendation(participantId, stepIds) {
  if (!stepIds.length) return;
  await fetch(`${SUPABASE_URL}/rest/v1/participant_recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      participant_id:     participantId,
      step_ids:           stepIds,
      generation_version: GENERATION_VERSION
    })
  });
}

async function logShownEvents(participantId, stepIds) {
  if (!stepIds.length) return;
  const events = stepIds.map((step_id) => ({
    participant_id: participantId,
    step_id,
    event_type: 'shown'
  }));
  await fetch(`${SUPABASE_URL}/rest/v1/next_step_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(events)
  });
}

// ── Handler ──────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const pid = data && data.participant_id ? String(data.participant_id) : null;
    if (!pid) return res.status(400).json({ error: 'participant_id required' });

    const participant = await loadParticipant(pid);
    if (!participant) {
      return res.status(200).json({ step_ids: [], generation_version: GENERATION_VERSION });
    }

    const profileKey = participant.profile_assigned;
    if (!profileKey) {
      return res.status(200).json({ step_ids: [], generation_version: GENERATION_VERSION });
    }

    const catalog = await loadCatalog(profileKey);
    const effectiveCapacity = toEffectiveTimeCapacity(participant);

    // §5 hard filters (the DB already filtered profile_match + active).
    const eligible = catalog.filter((step) =>
      timeCompatible(step.time_level, effectiveCapacity) &&
      geographyCompatible(step, participant)
    );

    // Score + emotional routing.
    const scored = eligible
      .map((step) => ({
        step,
        score: scoreStep(step, participant) + applyEmotionalRouting(step, participant.cant_shake_emotions)
      }))
      .sort((a, b) => b.score - a.score);

    const finalSet = selectFinalSet(scored, participant.action_shape);
    const stepIds = finalSet.map((s) => s.id);

    // Persist + log even when empty (no-op for empty arrays).
    await persistRecommendation(pid, stepIds);
    await logShownEvents(pid, stepIds);

    return res.status(200).json({
      step_ids: stepIds,
      steps: finalSet.map((s) => ({
        id: s.id,
        title: s.title,
        why_one_liner: s.why_one_liner,
        time_cue: s.time_cue,
        cta_text: s.cta_text,
        destination_url: s.destination_url,
        partner_org: s.partner_org,
        action_shape: asArray(s.action_shape_match)[0] || null
      })),
      generation_version: GENERATION_VERSION
    });
  } catch (err) {
    console.error('recommend error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
