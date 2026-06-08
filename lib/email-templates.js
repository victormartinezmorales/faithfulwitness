// lib/email-templates.js
// Shared email rendering for the Stage 1 results email and the Stage 3
// reflection email. CommonJS. No build step. Plain inline-CSS HTML strings.
//
// Two render functions are exported:
//
//   renderStage1Email({ firstName, profileKey, participantId })
//     → { subject, previewText, html }
//
//   renderStage3Email({ firstName, profileKey, participantId,
//                       burningQuestion, cantShakeText, cantShakeEmotions,
//                       specificNeighbor, actionShape, contextualFocus,
//                       senseOfCalling })
//     → { subject, previewText, html }
//
// Copy is verbatim from:
//   "Faithful Witness — Stage 1 Results Email v2" (Drive)
//   "Faithful Witness — Stage 3 Reflection Email v1" (Drive)
// Visual translation follows fw_email_design_preview.html in the project root.
//
// Conditional logic for Stage 3 (per spec §"Conditional templating"):
//   - burning_question empty       → drop "You came in carrying a question" line
//   - cant_shake_text empty        → drop the discernment paragraph
//   - all three of                 → drop the pattern paragraph entirely
//     specific_neighbor, action_shape, contextual_focus empty
//     (otherwise the pattern paragraph adjusts based on which are present)
//   - sense_of_calling empty       → drop the entire italic callout block
//                                    (including the profile-specific response)
//   - cant_shake_emotions filtering: "other" tag is stripped from the prose.
//     If only "other" was provided, the emotion gloss line drops entirely.
//
// No section ever renders an empty header, "(not provided)", or "you didn't
// answer this." Drops are silent.

'use strict';

// ─── Brand tokens (mirror the in-app :root tokens and the design preview) ─
const T = {
  navy:           '#333858',
  navyLight:      '#454B6F',
  navyDark:       '#252940',
  gold:           '#C49A3C',
  goldLight:      '#d4ab3a',
  goldPale:       '#f7f0dc',
  goldBg:         '#fdf8ee',
  cream:          '#faf8f4',
  warmWhite:      '#ffffff',
  textPrimary:    '#1a1a2e',
  textSecondary:  '#4a4a6a',
  textMuted:      '#7a7a9a',       // reserved for genuinely-tertiary, small metadata
                                   //   (coalition wordmark in header, blessing label, etc.)
                                   //   On cream backgrounds this hits ~3:1 — intentional
                                   //   low contrast for hierarchy. Do NOT use for body
                                   //   prose on white; use textMutedOnWhite below.
  textMutedOnWhite: '#5a5a7a',     // muted body-adjacent prose on white: passes WCAG AA
                                   //   (Stage 1 disclaimer, footer "you received this" note)
  border:         '#e8e4f0',
  borderLight:    '#f0edf8',

  // Page wrapper background (the band of color around the email card)
  pageLight:      '#ececec',

  // Dark-mode adaptations (see fw_email_design_preview.html .email.dark rules)
  darkBg:         '#1a1a2e',
  darkBgRaised:   '#252940',
  darkBorder:     '#333858',
  darkText:       '#e8e4f0',
  darkTextMid:    '#d8d8e8',
  darkTextMuted:  '#b8b8d0',
  darkTextDim:    '#9a9ab4',
};

// ─── Profile keys (canonical, used across the app) ─────────────────────────
const PROFILE_KEYS = [
  'open_explorer',
  'thoughtful_learner',
  'careful_seeker',
  'ready_responder',
  'faithful_witness',
];

// ─── Display-name map (used in Stage 1 subject + profile reveal) ───────────
const PROFILE_NAMES = {
  open_explorer:      'Open Explorer',
  thoughtful_learner: 'Thoughtful Learner',
  careful_seeker:     'Careful Seeker',
  ready_responder:    'Ready Responder',
  faithful_witness:   'Faithful Witness',
};

// ─── Indefinite article ("a" / "an") based on first sound. Simple first-letter
//     vowel check is sufficient for our fixed emotion vocab (anger, grief,
//     trouble, fear, confusion, shame, weariness). "an anger", "a grief", etc.
function articleFor(word) {
  if (!word) return 'a';
  const c = word.trim().charAt(0).toLowerCase();
  return ('aeiou'.indexOf(c) >= 0) ? 'an' : 'a';
}

// ─── Emotion code → noun for the gloss line (per spec) ─────────────────────
const EMOTION_NOUNS = {
  angry:      'anger',
  grieved:    'grief',
  troubled:   'trouble',
  frightened: 'fear',
  confused:   'confusion',
  ashamed:    'shame',
  weary:      'weariness',
};

// Map cant_shake_emotions (array of codes) → "an anger and a grief" style.
// "other" tag is always stripped from the joined prose. If the resulting
// array is empty, returns null so the caller can drop the whole gloss line.
function humanizeEmotions(emotionCodes) {
  if (!Array.isArray(emotionCodes) || !emotionCodes.length) return null;
  const nouns = emotionCodes
    .filter((c) => c !== 'other')
    .map((c) => EMOTION_NOUNS[c])
    .filter(Boolean);
  if (!nouns.length) return null;
  const phrases = nouns.map((n) => articleFor(n) + ' ' + n);
  return joinProse(phrases);
}

// Join an array of strings into prose: "a, b, and c" (Oxford comma at 3+).
function joinProse(items) {
  const arr = (items || []).filter((s) => s && String(s).trim().length);
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ', and ' + arr[1];   // per spec: comma + and at 2
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

// ─── Q1 specific_neighbor codes → human label (lowercase prose form) ───────
// Sourced from the Stage 3 Q1 options (index.html). The "human label" is the
// natural-prose noun phrase, slightly trimmed for inline use.
const NEIGHBOR_LABELS = {
  mixed_status_families:          'mixed-status families',
  asylum_refugees:                'asylum seekers and refugees',
  daca_undocumented_young_adults: 'DACA recipients and undocumented young adults',
  day_laborers_workers:           'day laborers and immigrant workers',
  immigrant_churches_pastors:     'immigrant churches and pastors near you',
  known_neighbors:                'families you already know in your neighborhood, workplace, or congregation',
  immigrant_children_youth:       'immigrant children and youth',
  detention_deportation:          'people in detention or facing deportation',
  other_specific:                 null,   // handled separately via the open-text field if needed
  not_yet_clear:                  null,   // pattern paragraph drops if this is the only selection
};
function humanizeNeighbor(codes, otherText) {
  if (!Array.isArray(codes) || !codes.length) return '';
  // not_yet_clear is mutually exclusive — drop the pattern entirely.
  if (codes.indexOf('not_yet_clear') >= 0) return '';
  const labels = codes
    .map((c) => c === 'other_specific'
      ? (otherText && otherText.trim() ? otherText.trim().toLowerCase() : null)
      : NEIGHBOR_LABELS[c])
    .filter(Boolean);
  return joinProse(labels);
}

// ─── Q2 action_shape code → human prose noun phrase ────────────────────────
const ACTION_SHAPE_LABELS = {
  deepen_learning:     'going deeper in learning and prayer before acting',
  build_relationship:  'building one real relationship with someone affected',
  join_existing:       'joining an effort that is already underway',
  start_in_community:  'starting or strengthening something in your church or community',
  advocate_publicly:   'speaking up publicly, advocating, or organizing',
  accompany_affected:  'walking with people who are directly affected',
  not_yet:             null,   // drops from pattern paragraph
};
function humanizeActionShape(code) {
  if (!code) return '';
  return ACTION_SHAPE_LABELS[code] || '';
}

// ─── Q3 contextual_focus codes → human prose noun phrase ───────────────────
const CONTEXT_LABELS = {
  neighborhood:   'your neighborhood',
  workplace:      'your workplace',
  church:         'your church or faith community',
  city_region:    'your city or region',
  specific_place: null,   // handled via the open-text field if needed
  not_yet:        null,
};
function humanizeContext(codes, specificPlaceText) {
  if (!Array.isArray(codes) || !codes.length) return '';
  if (codes.indexOf('not_yet') >= 0) return '';
  const labels = codes
    .map((c) => c === 'specific_place'
      ? (specificPlaceText && specificPlaceText.trim() ? specificPlaceText.trim() : null)
      : CONTEXT_LABELS[c])
    .filter(Boolean);
  return joinProse(labels);
}

// Build the pattern paragraph ("The people you keep returning to…")
// per the spec's conditional cascade. Returns the inner sentence, no trailing period.
// Empty string means: drop the entire <div class="reflected"> paragraph.
function patternSentence({ peopleProse, actionProse, contextProse }) {
  const hasP = !!peopleProse;
  const hasA = !!actionProse;
  const hasC = !!contextProse;
  if (!hasP && !hasA && !hasC) return '';

  // All three
  if (hasP && hasA && hasC) {
    return 'The people you keep returning to are ' + peopleProse +
           '. The shape of response that felt right for this season is ' + actionProse +
           ', and you sense it belongs in ' + contextProse + '.';
  }
  // People + action only
  if (hasP && hasA && !hasC) {
    return 'The people you keep returning to are ' + peopleProse +
           ', and the shape of response that felt right for this season is ' + actionProse + '.';
  }
  // People + context only
  if (hasP && !hasA && hasC) {
    return 'The people you keep returning to are ' + peopleProse +
           ', and you sense this belongs in ' + contextProse + '.';
  }
  // Action + context only
  if (!hasP && hasA && hasC) {
    return 'The shape of response that felt right for this season is ' + actionProse +
           ', and you sense it belongs in ' + contextProse + '.';
  }
  // People only
  if (hasP && !hasA && !hasC) {
    return 'The people you keep returning to are ' + peopleProse + '.';
  }
  // Action only
  if (!hasP && hasA && !hasC) {
    return 'The shape of response that felt right for this season is ' + actionProse + '.';
  }
  // Context only
  if (!hasP && !hasA && hasC) {
    return 'You sense this belongs in ' + contextProse + '.';
  }
  return '';
}

// ─── HTML escape for any user-provided text ────────────────────────────────
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Link builders ─────────────────────────────────────────────────────────
const BASE_URL = 'https://faithful-witness.vercel.app';
function continueStage3Url(pid, profileKey) {
  let url = BASE_URL + '/stage3?pid=' + encodeURIComponent(pid || '');
  if (profileKey) url += '&profile=' + encodeURIComponent(profileKey);
  return url;
}
function inviteUrl(pid) {
  // The participant's pid becomes the invited_by for anyone they refer.
  return BASE_URL + '/?ref=' + encodeURIComponent(pid || '');
}
function guideMailto() {
  const subject = 'Faithful Witness guide conversation';
  const body =
    'Hi, I just completed the Faithful Witness Discernment Experience. ' +
    'I would like to talk through what came up with a guide.\n\n' +
    'A little context (feel free to skip):\n\n';
  return 'mailto:discernment@faithfulwitness.us' +
    '?subject=' + encodeURIComponent(subject) +
    '&body='    + encodeURIComponent(body);
}
function welcomeBackUrl(pid) {
  return BASE_URL + '/welcome-back?pid=' + encodeURIComponent(pid || '');
}

// =========================================================================
// STAGE 1 — profile content (verbatim from Drive doc v2)
// =========================================================================
const STAGE1_PROFILES = {
  open_explorer: {
    preview: "What you've named today is the beginning of something. Here's where to start.",
    definition: "That means you're open to engaging immigration as a matter of faith, and you're approaching it without the heavy contact or sustained involvement that comes with deep proximity. You may have thought about this topic before in other ways, through politics, through the news, through conversations at church. What this profile recognizes is that you're at the start of a particular journey: working out what faithful engagement looks like, with curiosity rather than resistance.",
    bullets: [
      "You're approaching this as a matter of faith, not just opinion or politics",
      "You haven't had much personal contact with immigrant communities yet",
      "You're motivated by a sense that your faith calls you toward something here",
      "You're ready to learn before you're ready to act",
    ],
    means: "For Open Explorers, the most important thing isn't to act quickly. It's to let real stories and real faces shape how you understand what's at stake. Information without relationship becomes noise. Relationship without information becomes naive. You need both, in that order.",
    watch: "Curiosity is a beautiful starting place, but it can become an end in itself. You can read for years, listen to a hundred podcasts, follow every story, and still never know one person whose life has been shaped by the immigration system. Don't let learning become a substitute for the closer, harder work of relationship.",
    step1Lead: "Continue the journey.",
    step1Body: "Stage 2 (Formation) and Stage 3 (Discernment) will help you move from initial curiosity to a deeper understanding of what your faith is asking. Stage 3 is where the real shift happens.",
    step2Lead: "Bring someone with you.",
    step2Body: "Open Explorers often move best alongside one other person who's also starting fresh. Invite a friend, a spouse, or someone from your small group to take this journey with you.",
    inviteLabel: "Invite someone",
    prayer: "God, you welcomed me before I welcomed anyone. Help me see who you've already placed in my path, and give me the courage to take one small step toward them.",
  },
  thoughtful_learner: {
    preview: "Understanding is the foundation. Here's what it's for.",
    definition: "That means you've already engaged with immigration in some real ways. You've read, listened, maybe had a few hard conversations. You want to think well about this, not just feel right about it. That kind of seriousness is worth naming.",
    bullets: [
      "You have some personal exposure to immigrant communities or stories",
      "You want to understand more deeply before you act",
      "You're motivated by a desire to think faithfully, not just react",
      "You're holding questions rather than jumping to conclusions",
    ],
    means: "For Thoughtful Learners, the work is moving from understanding about this to discernment toward something specific. You've built a foundation. The question now is what that foundation is for. Knowledge that doesn't move us isn't really knowledge. It's furniture.",
    watch: "The biggest risk for Thoughtful Learners is using understanding as a way to delay action. There's always another book to read, another angle to consider, another nuance to wrestle with. At some point the most faithful thing you can do is move on what you already know, even imperfectly. Don't let depth become a hiding place.",
    step1Lead: "Continue to Stage 3: Discernment.",
    step1Body: "This is where your learning starts becoming direction. The questions in Stage 3 are designed for someone in exactly your position. You have enough information to discern; the work now is listening for what you're being called to.",
    step2Lead: "Find a conversation partner.",
    step2Body: "Thoughtful Learners do their best discernment in dialogue. Invite someone you respect to take this journey alongside you and talk through what comes up.",
    inviteLabel: "Invite someone",
    prayer: "God of Abraham, Hagar, and Ruth. You have always been a God who moves with people on the road. Show me what I now know that I didn't know before, and help me carry it into how I live.",
  },
  careful_seeker: {
    preview: "You showed up to a hard conversation. That's worth more than easy answers.",
    definition: "That means you came to this with some honest hesitation, maybe some resistance, maybe just caution. You showed up anyway. That's not a small thing. Many people who feel what you feel about this topic never make it this far.",
    bullets: [
      "You feel some tension or hesitation about how to engage immigration",
      "You're approaching this with care rather than enthusiasm",
      "You want to be honest about your questions rather than performing certainty",
      "You're open enough to keep listening",
    ],
    means: "For Careful Seekers, the most faithful posture isn't to push past your hesitation. It's to listen to what's underneath it. What are you protecting? What are you wrestling with? What's true even when it's uncomfortable? The journey from here is about reasoning together with Scripture, with people you trust, and with God. The point isn't forcing a resolution before you have one.",
    watch: "Caution is a gift, but it can harden into permanent fence-sitting. The fence is a real place to stand for a season; it shouldn't become your address. Be honest with yourself about whether your hesitation is still doing real discernment work, or whether it's become a way to avoid moving at all.",
    step1Lead: "Continue to Stage 3: Discernment.",
    step1Body: "Stage 3 is designed to honor the tension you feel, not resolve it for you. It asks questions you can answer honestly without pretending.",
    step2Lead: "Talk with someone, not at someone.",
    step2Body: "Careful Seekers do their best work in conversation with one trusted person. Not a debate, just an honest exchange. Invite someone who will hold your questions seriously.",
    inviteLabel: "Invite someone",
    prayer: "God of truth and grace. You don't ask me to pretend my questions away. You meet me in them. Walk with me as I keep wrestling, and help me hear what you're saying even when it isn't what I expected.",
  },
  ready_responder: {
    preview: "You're ready, and that readiness is worth naming. Here's how to channel it.",
    definition: "That means you're not just learning anymore. You're ready to do something. You just want to make sure it's the right something. Ready Responders are people for whom this has stopped being theoretical. The question now is what faithfulness actually looks like when you take a step.",
    bullets: [
      "You're already aware of the issue and have moved past initial learning",
      "You're motivated by compassion, conviction, or both",
      "You're looking for a clear, guided next step",
      "You may be more ready to engage than you've fully named yet",
    ],
    means: "For Ready Responders, the work isn't building more conviction. You have it. The work is channeling that readiness into something sustainable. Movement is easier than direction. The most faithful thing you can do right now is make sure the action you take is the one you're actually called to, not the loudest one in front of you.",
    watch: "Readiness can turn into pressure if you try to carry too much too quickly. You don't have to solve everything. The biggest risk for Ready Responders isn't inaction. It's burning out within six months because you said yes to everything. Start with one faithful next step. Sustain before you scale.",
    step1Lead: "Continue to Stage 3: Discernment.",
    step1Body: "Stage 3 is where you find your specific shape: which population, which kind of action, which context. That's how the readiness you already have lands somewhere real.",
    step2Lead: "Don't move alone.",
    step2Body: "Ready Responders often move best with someone beside them, a trusted friend, a pastor, a colleague. Action without community burns out. Invite someone to discern this with you.",
    inviteLabel: "Invite someone",
    prayer: "God who sends, and God who sustains. Keep me from confusing my own urgency with your call. Show me clearly the place you've prepared for me, and help me walk toward it without burning out on the way.",
  },
  faithful_witness: {
    preview: "You're not new to this. Here's what sustains the road ahead.",
    definition: "That means you're already in this work. You've given time, relationships, hope, maybe more than you sometimes know how to name. The profile recognizes what's already true: you're not at a beginning, you're somewhere along the road, and you're looking for what sustains the walking.",
    bullets: [
      "You're already actively engaged with immigration in some form",
      "You have meaningful relationships with immigrants or immigrant communities",
      "You're motivated by deep conviction shaped by experience",
      "You're not looking for orientation, you're looking for depth and sustenance",
    ],
    means: "For Faithful Witnesses, the work has shifted. You're not building conviction anymore; you're maintaining it. You're not finding the first step; you're walking the long road. The most faithful thing you can do isn't another initiative. It's making sure what you do continues to flow from who you are in God, and that you're sustained well enough to keep going.",
    watch: "The biggest risk for Faithful Witnesses isn't apathy. It's weariness. You can give and give until what was once a calling becomes a job. And the people you're walking with deserve more than your tiredness. Sustain before you scale. And consider: who's sustaining you?",
    step1Lead: "Continue to Stage 3: Discernment.",
    step1Body: "Stage 3 is designed for what someone in your position rarely gets: time to listen to what's becoming clearer in you, not just what's needed around you. Take longer than you think you need.",
    step2Lead: "Bring your people with you.",
    step2Body: "Faithful Witnesses are often already leading others. The people you're walking with are your team. Bring them through this journey, lead them well, and let them sharpen what you're already doing.",
    inviteLabel: "Invite your team",
    prayer: "God of the long road. You have walked with your people through deserts and exiles, and you walk with them still. Refresh me where I'm weary, sharpen me where I've grown dull, and let what I do continue to flow from who I am in you.",
  },
};

// =========================================================================
// STAGE 3 — profile content (verbatim from Drive doc v1)
// =========================================================================
const STAGE3_PROFILES = {
  open_explorer: {
    opener:        "You sat with hard questions yesterday. We held this for a day before sending it, because reflection has its own timing.",
    emotionGloss:  "Whatever it is, it's worth honoring.",
    callingNote:   "That's a quiet sentence, but it's the most important thing you put down yesterday. Don't lose it.",
    word:          "You're at the start of a particular journey. The way to begin isn't to act fast. It's to let real people teach you what they need. The most faithful next thing isn't more research. It's getting closer to one person.",
    whatNow:       "Don't walk this alone. Invite three to five people from your life to take this same journey, and walk into what comes next together.",
    guideLine:     "Or, if you'd rather start with one conversation first,",
    guideLink:     "connect with a Faithful Witness guide",
    inviteLabel:   "Invite people to your team",
    blessing:      "May the things you couldn't shake stay with you long enough to do their work. May the people you keep returning to become not a category but a face. And may you have the courage to take one small, honest step before you have the whole map.",
  },
  thoughtful_learner: {
    opener:        "You did serious work yesterday. We held this for a day before sending it, because reflection has its own timing.",
    emotionGloss:  "That weight is information.",
    callingNote:   "Most people don't get to the point of writing something like that. You did. Don't put it back down too quickly.",
    word:          "You've built the foundation. The shape you've named is what gives that foundation a use. The temptation will be to keep studying. The discipline will be to take a step while the questions stay open.",
    whatNow:       "Find a conversation partner, or a few. Invite three to five people you respect to take this same journey, and walk through what comes up together.",
    guideLine:     "Or, if you'd rather start with one trusted person first,",
    guideLink:     "connect with a Faithful Witness guide",
    inviteLabel:   "Invite people to your team",
    blessing:      "May what you know start to shape what you do. May the questions you can't answer become companions rather than excuses. And may you have the wisdom to act on what's clear while the rest remains unresolved.",
  },
  careful_seeker: {
    opener:        "You showed up to hard questions yesterday. We held this for a day before sending it, because reflection has its own timing.",
    emotionGloss:  "You let yourself name it, when it would have been easier not to.",
    callingNote:   "It's okay if it's vague. It's okay if you don't fully trust it. The fact that you wrote it down means it's worth coming back to.",
    word:          "You didn't have to show up to this. You did, and that's not a small thing. The shape you've named is small enough to be true, and that's better than a large action you don't yet believe in.",
    whatNow:       "Bring one trusted person with you. Invite three to five people who'll hold your questions seriously, who won't push, who'll walk with you. Have them take this same journey too.",
    guideLine:     "Or, if you'd rather start with one conversation,",
    guideLink:     "connect with a Faithful Witness guide",
    guideTail:     "Someone who won't ask you to be further along than you are.",
    inviteLabel:   "Invite people to your team",
    blessing:      "May the honesty you brought yesterday stay with you. May your hesitation continue to do real work, and may you know when it's time to take the next step even before you're sure. And may God meet you in the questions, not only on the other side of them.",
  },
  ready_responder: {
    opener:        "You did real discernment yesterday. We held this for a day before sending it, even for those of us who tend to move fast.",
    emotionGloss:  "That's part of what's driving you. Let it fuel you without driving you.",
    callingNote:   "Don't move on it yet. Sit with it for a week. Tell three people. Let it sharpen. Then move.",
    word:          "The discernment you just did is what keeps your readiness from becoming a problem. Move in the shape you named, not the louder shape someone else will offer you next week.",
    whatNow:       "Don't move alone. Action without community burns out. Invite three to five people to take this same journey and walk into action with you.",
    guideLine:     "Or, if you'd rather start with one trusted person first,",
    guideLink:     "connect with a Faithful Witness guide",
    guideTail:     "Someone who can help you channel readiness without burning the candle on both ends.",
    inviteLabel:   "Invite people to your team",
    blessing:      "May your readiness be matched by your patience. May the urgency you feel become faithful endurance. And may the people around you sustain you as you sustain them.",
  },
  faithful_witness: {
    opener:        "You sat with these questions yesterday in a way only people already in the work can. We held this for a day before sending it, because rest is part of the work.",
    emotionGloss:  "That you can still feel this, after everything, is grace.",
    callingNote:   "You've heard things like this before. Some you acted on, some you held. The discernment is which kind this one is. Take the time to know.",
    word:          "You know enough about this work to know what's yours and what isn't. The question isn't whether to act, you'll act. It's where to spend the energy that's left.",
    whatNow:       "Bring your people with you. The people you're walking with are your team. Invite them to take this same journey, so what's becoming clearer in you can become clearer in them.",
    guideLine:     "Or, if you'd rather connect with another Faithful Witness first,",
    guideLink:     "we can arrange that",
    inviteLabel:   "Invite your team",
    blessing:      "May the work continue to flow from who you are, not just what you do. May you be sustained as you sustain others. And may you know when to rest before the people you serve need you to know it.",
  },
};

// ─── Universal head + dark-mode style block ────────────────────────────────
// Inline styles dominate; the <style> block holds web-font load and the
// prefers-color-scheme rules (the only thing inline styles can't express).
// All in-style selectors are class-scoped so clients that strip <style>
// fall back gracefully to the inline styles on every element.
// Dark-mode override declarations. These are the SAME rules emitted in two
// different selector contexts: @media (prefers-color-scheme: dark) for the
// modern Apple / iOS / Gmail-iOS / Outlook.com path, and [data-ogsc]/[data-ogsb]
// for Outlook.com / Outlook Office 365 web (which rewrites those attributes
// onto your elements when dark mode is active and ignores standard @media).
//
// Page-bg overrides (the band of color around the email card AND the card
// itself) are critical here — the prior version only flipped .fw-shell, so
// in dark mode the body and outer wrapper stayed light gray while the card
// went dark. Now everything flips together.
function darkModeRules(prefix) {
  const p = prefix ? prefix + ' ' : '';   // '' for @media, '[data-ogsc] ' for OWA
  return ''
    + p + '.fw-page-bg,'
    + p + '.fw-page-bg td{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    + p + '.fw-shell{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-head,'
    + p + '.fw-foot{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-campaign-mark{color:' + T.darkText + '!important}'
    + p + '.fw-coalition-mark{color:' + T.darkTextDim + '!important}'
    + p + '.fw-text,'
    + p + '.fw-text *{color:' + T.darkText + '!important}'
    + p + '.fw-text-mid,'
    + p + '.fw-text-mid *{color:' + T.darkTextMid + '!important}'
    + p + '.fw-text-muted,'
    + p + '.fw-text-muted *{color:' + T.darkTextDim + '!important}'
    + p + '.fw-profile-name{color:' + T.goldLight + '!important}'
    + p + '.fw-callout{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-left-color:' + T.goldLight + '!important}'
    + p + '.fw-callout-label{color:' + T.goldLight + '!important}'
    + p + '.fw-reflected{border-left-color:' + T.goldLight + '!important;color:' + T.darkTextMid + '!important}'
    + p + '.fw-reflected *{color:' + T.darkTextMid + '!important}'
    + p + '.fw-calling{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-left-color:' + T.goldLight + '!important}'
    + p + '.fw-calling-quote{color:' + T.darkText + '!important}'
    + p + '.fw-calling-response{color:' + T.darkTextMuted + '!important}'
    + p + '.fw-quote-block{border-left-color:' + T.goldLight + '!important}'
    + p + '.fw-quote-block .fw-quote-label{color:' + T.goldLight + '!important}'
    + p + '.fw-quote-block .fw-quote-text{color:' + T.darkTextMid + '!important}'
    + p + '.fw-btn-primary{background:' + T.goldLight + '!important;background-color:' + T.goldLight + '!important;color:' + T.navyDark + '!important}'
    + p + '.fw-btn-primary-cell{background:' + T.goldLight + '!important;background-color:' + T.goldLight + '!important}'
    + p + '.fw-link-gold{color:' + T.goldLight + '!important;border-bottom-color:' + T.goldLight + '!important}'
    + p + '.fw-blessing{border-top-color:' + T.darkBorder + '!important}'
    + p + '.fw-blessing .fw-blessing-label{color:' + T.darkTextDim + '!important}'
    + p + '.fw-blessing .fw-blessing-text{color:' + T.darkText + '!important}'
    + p + '.fw-h-serif{color:' + T.darkText + '!important}'
    + p + '.fw-disclaimer{color:' + T.darkTextDim + '!important}'
    + p + '.fw-foot a{color:' + T.goldLight + '!important}'
    + p + '.fw-foot-note{color:' + T.darkTextDim + '!important}';
}

function headBlock(subject, previewText) {
  return ''
    + '<!DOCTYPE html>'
    + '<html lang="en" dir="ltr">'
    + '<head>'
    +   '<meta charset="UTF-8">'
    +   '<meta name="viewport" content="width=device-width,initial-scale=1">'
    +   '<meta name="x-apple-disable-message-reformatting">'
    // color-scheme metas tell Apple Mail and iOS Mail "we have explicit dark
    // styles; do NOT auto-invert." Without these, Apple Mail tries to invert
    // light emails into a synthetic dark mode and fights our @media rules.
    +   '<meta name="color-scheme" content="light dark">'
    +   '<meta name="supported-color-schemes" content="light dark">'
    +   '<title>' + esc(subject) + '</title>'
    +   '<link rel="preconnect" href="https://fonts.googleapis.com">'
    +   '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    +   '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">'
    +   '<style>'
    // Tell the user-agent we have both schemes (CSS-level, for completeness).
    +     ':root{color-scheme:light dark;supported-color-schemes:light dark;}'
    +     'body,.fw-page-bg{color-scheme:light dark;supported-color-schemes:light dark;}'
    // Mobile responsiveness
    +     '@media only screen and (max-width:620px){'
    +       '.fw-shell{width:100%!important;max-width:100%!important}'
    +       '.fw-body{padding:28px 22px 28px!important}'
    +       '.fw-head{padding:22px 22px 18px!important}'
    +       '.fw-foot{padding:18px 22px 20px!important}'
    +       '.fw-profile-name{font-size:30px!important;line-height:1.15!important}'
    +     '}'
    // Standard prefers-color-scheme: dark — Apple Mail, iOS Mail, modern Outlook,
    // Gmail iOS app. Honored when the meta tags above are present.
    +     '@media (prefers-color-scheme: dark){'
    +       darkModeRules('')
    +     '}'
    // Outlook.com / Outlook Office 365 web — rewrites colors using [data-ogsc]
    // and [data-ogsb] attributes that it injects onto elements with explicit
    // colors. Mirror the same overrides so dark mode lands there too.
    +     '[data-ogsc] .fw-page-bg,'
    +     '[data-ogsc] .fw-page-bg td{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    +     darkModeRules('[data-ogsc]')
    +     // Gmail Android web sometimes prefers a different selector path
    +     'u + .body .fw-shell,'
    +     'u + .body .fw-page-bg{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    +   '</style>'
    + '</head>'
    // body and outer wrapper carry: (1) inline bgcolor attr (legacy clients),
    // (2) inline background style (modern clients), (3) the .fw-page-bg class
    // so dark-mode @media + [data-ogsc] rules can override.
    + '<body class="fw-page-bg body" bgcolor="' + T.pageLight + '" '
    +   'style="margin:0;padding:0;background:' + T.pageLight + ';background-color:' + T.pageLight + ';'
    +   'font-family:\'Plus Jakarta Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
    // Hidden preview text (inbox preview pane only).
    + '<div style="display:none;font-size:1px;color:' + T.pageLight + ';line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">'
    +   esc(previewText)
    + '</div>'
    + '<table role="presentation" class="fw-page-bg" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'bgcolor="' + T.pageLight + '" '
    +   'style="background:' + T.pageLight + ';background-color:' + T.pageLight + ';">'
    + '<tr><td class="fw-page-bg" bgcolor="' + T.pageLight + '" align="center" '
    +   'style="padding:24px 16px;background:' + T.pageLight + ';background-color:' + T.pageLight + ';">';
}

function shellOpen() {
  return ''
    + '<table role="presentation" class="fw-shell" cellpadding="0" cellspacing="0" border="0" width="600" '
    +   'style="width:600px;max-width:600px;background:' + T.warmWhite + ';'
    +   'border:1px solid ' + T.border + ';border-radius:12px;overflow:hidden;">'
    + '<tr><td>';
}

function shellClose() {
  return '</td></tr></table>';
}

function headerBand() {
  return ''
    + '<table role="presentation" class="fw-head" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'style="background:' + T.cream + ';border-bottom:1px solid ' + T.borderLight + ';">'
    + '<tr><td align="center" style="padding:28px 40px 24px;">'
    +   '<div class="fw-campaign-mark" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:12px;font-weight:700;letter-spacing:0.18em;color:' + T.navy + ';margin-bottom:6px;">'
    +     'FAITHFUL WITNESS CAMPAIGN'
    +   '</div>'
    +   '<div class="fw-coalition-mark" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:11px;color:' + T.textMuted + ';letter-spacing:0.05em;">'
    +     'CCDA &middot; NaLEC &middot; World Relief &middot; Undivided'
    +   '</div>'
    +   '<div style="width:36px;height:2px;background:' + T.gold + ';margin:16px auto 0;line-height:2px;font-size:0;">&nbsp;</div>'
    + '</td></tr>'
    + '</table>';
}

function footerBand(returnLabel, returnUrl) {
  return ''
    + '<table role="presentation" class="fw-foot" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'style="background:' + T.cream + ';border-top:1px solid ' + T.borderLight + ';">'
    + '<tr><td align="center" style="padding:20px 40px 22px;">'
    +   '<a href="' + esc(returnUrl) + '" '
    +     'style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'color:' + T.gold + ';font-size:13px;font-weight:600;text-decoration:none;">'
    +     esc(returnLabel) + ' &rarr;'
    +   '</a>'
    +   '<div class="fw-foot-note" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:11px;color:' + T.textMutedOnWhite + ';margin-top:10px;line-height:1.5;">'
    +     'You received this because you completed the Faithful Witness Discernment Experience.'
    +   '</div>'
    + '</td></tr>'
    + '</table>';
}

function tailBlock() {
  return ''
    + '</td></tr></table>'  // outer width table close
    + '</body></html>';
}

// Primary CTA button — bulletproof-ish (table-wrapped <a> for Outlook).
function primaryButton(label, url) {
  return ''
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">'
    + '<tr><td bgcolor="' + T.navy + '" style="border-radius:8px;">'
    +   '<a href="' + esc(url) + '" class="fw-btn-primary" '
    +     'style="display:inline-block;background:' + T.navy + ';color:' + T.warmWhite + ';'
    +     'font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;'
    +     'text-decoration:none;letter-spacing:0.02em;line-height:1.2;min-width:160px;text-align:center;">'
    +     esc(label) + ' &nbsp;&rarr;'
    +   '</a>'
    + '</td></tr></table>';
}

// Gold underlined inline link with arrow (secondary CTA).
function goldLink(label, url) {
  return ''
    + '<a href="' + esc(url) + '" class="fw-link-gold" '
    +   'style="color:' + T.gold + ';font-weight:600;text-decoration:none;'
    +   'border-bottom:1px solid ' + T.gold + ';padding-bottom:2px;'
    +   'font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;">'
    +   esc(label) + ' &rarr;'
    + '</a>';
}

// =========================================================================
// STAGE 1 RENDERER
// =========================================================================
function renderStage1Email(opts) {
  opts = opts || {};
  const firstName     = (opts.firstName || 'friend').trim();
  const profileKey    = PROFILE_KEYS.indexOf(opts.profileKey) >= 0 ? opts.profileKey : 'open_explorer';
  const participantId = opts.participantId || '';

  const P = STAGE1_PROFILES[profileKey];
  const profileName = PROFILE_NAMES[profileKey];

  const subject = 'Your Faithful Witness Discernment Results: ' + profileName;
  const previewText = P.preview;

  const bulletsHtml = P.bullets.map((b) =>
    '<div style="margin-bottom:8px;">&bull; ' + esc(b) + '</div>'
  ).join('');

  const html = ''
    + headBlock(subject, previewText)
    + shellOpen()
    + headerBand()
    // ── BODY ──
    + '<table role="presentation" class="fw-body" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'style="padding:36px 40px 32px;">'
    + '<tr><td>'

    // Salutation
    +   '<div class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:16px;line-height:1.6;color:' + T.navy + ';margin-bottom:28px;">'
    +     'Hi ' + esc(firstName) + ','
    +   '</div>'

    // Profile reveal
    +   '<div style="margin-bottom:24px;">'
    +     '<div class="fw-text-mid" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:15px;color:' + T.textSecondary + ';margin-bottom:4px;">You\'re a</div>'
    +     '<div class="fw-profile-name" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +       'font-style:italic;font-size:36px;color:' + T.navy + ';line-height:1.1;">'
    +       esc(profileName) + '.'
    +     '</div>'
    +   '</div>'

    // Definition paragraph
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 24px;">'
    +     esc(P.definition)
    +   '</p>'

    // Callout: "Based on what you shared"
    +   '<div class="fw-callout" style="background:' + T.goldBg + ';border-left:3px solid ' + T.gold + ';'
    +     'padding:20px 24px;margin-bottom:28px;border-radius:4px;">'
    +     '<div class="fw-callout-label" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + T.navy + ';margin-bottom:12px;">'
    +       'Based on what you shared'
    +     '</div>'
    +     '<div class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:14.5px;line-height:1.7;color:' + T.navy + ';">'
    +       bulletsHtml
    +     '</div>'
    +   '</div>'

    // Disclaimer — uses textMutedOnWhite (#5a5a7a) for WCAG AA on white.
    +   '<div class="fw-disclaimer" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:14px;line-height:1.6;color:' + T.textMutedOnWhite + ';font-style:italic;margin-bottom:32px;">'
    +     'This profile reflects where you are right now, not who you are. It\'s meant to help you find a faithful next step, not put you in a box.'
    +   '</div>'

    // What this means for you
    +   '<h3 class="fw-h-serif" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +     'font-size:20px;color:' + T.navy + ';font-weight:700;margin:0 0 12px;">'
    +     'What this means for you'
    +   '</h3>'
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 24px;">'
    +     esc(P.means)
    +   '</p>'

    // Watch out for
    +   '<h3 class="fw-h-serif" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +     'font-size:20px;color:' + T.navy + ';font-weight:700;margin:0 0 12px;">'
    +     'Watch out for'
    +   '</h3>'
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 24px;">'
    +     esc(P.watch)
    +   '</p>'

    // Your next faithful step
    +   '<h3 class="fw-h-serif" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +     'font-size:20px;color:' + T.navy + ';font-weight:700;margin:0 0 12px;">'
    +     'Your next faithful step'
    +   '</h3>'
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 16px;">'
    +     '<strong>1. ' + esc(P.step1Lead) + '</strong> ' + esc(P.step1Body)
    +   '</p>'
    +   primaryButton('Continue to Stage 3', continueStage3Url(participantId, profileKey))

    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 16px;">'
    +     '<strong>2. ' + esc(P.step2Lead) + '</strong> ' + esc(P.step2Body)
    +   '</p>'
    +   '<div style="margin-bottom:36px;">'
    +     goldLink(P.inviteLabel, inviteUrl(participantId))
    +   '</div>'

    // Prayer
    +   '<div class="fw-quote-block" style="border-left:3px solid ' + T.gold + ';padding:4px 0 4px 22px;margin-bottom:24px;">'
    +     '<div class="fw-quote-label" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + T.navy + ';margin-bottom:10px;">'
    +       'A short prayer to carry'
    +     '</div>'
    +     '<p class="fw-quote-text" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +       'font-style:italic;font-size:16px;line-height:1.75;color:' + T.navy + ';margin:0;">'
    +       esc(P.prayer)
    +     '</p>'
    +   '</div>'

    // Closing
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 8px;">'
    +     'We\'re glad you showed up.'
    +   '</p>'
    +   '<div class="fw-text-mid" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:14px;color:' + T.textSecondary + ';">'
    +     '<div style="margin-bottom:2px;">The Faithful Witness Team</div>'
    +     '<div class="fw-text-muted" style="font-size:13px;color:' + T.textMuted + ';">'
    +       'CCDA &middot; NaLEC &middot; World Relief &middot; Undivided'
    +     '</div>'
    +   '</div>'

    + '</td></tr></table>'

    + footerBand('Return to your results anytime', welcomeBackUrl(participantId))
    + shellClose()
    + tailBlock();

  return { subject, previewText, html };
}

// =========================================================================
// STAGE 3 RENDERER
// =========================================================================
function renderStage3Email(opts) {
  opts = opts || {};
  const firstName     = (opts.firstName || 'friend').trim();
  const profileKey    = PROFILE_KEYS.indexOf(opts.profileKey) >= 0 ? opts.profileKey : 'open_explorer';
  const participantId = opts.participantId || '';

  const burningQuestion         = (opts.burningQuestion || '').trim();
  const cantShakeText           = (opts.cantShakeText || '').trim();
  const cantShakeEmotions       = Array.isArray(opts.cantShakeEmotions) ? opts.cantShakeEmotions : [];
  const specificNeighbor        = Array.isArray(opts.specificNeighbor) ? opts.specificNeighbor : [];
  const specificNeighborOther   = (opts.specificNeighborOther || '').trim();
  const actionShape             = (opts.actionShape || '').trim();
  const contextualFocus         = Array.isArray(opts.contextualFocus) ? opts.contextualFocus : [];
  const contextualFocusSpecific = (opts.contextualFocusSpecificPlace || '').trim();
  const senseOfCalling          = (opts.senseOfCalling || '').trim();

  const P = STAGE3_PROFILES[profileKey];

  const subject     = 'Your Faithful Witness Discernment Reflection, ' + firstName;
  const previewText = 'Your reflection from the Faithful Witness journey';

  // Compute conditional pieces.
  const emotionPhrase = humanizeEmotions(cantShakeEmotions);
  const peopleProse   = humanizeNeighbor(specificNeighbor, specificNeighborOther);
  const actionProse   = humanizeActionShape(actionShape);
  const contextProse  = humanizeContext(contextualFocus, contextualFocusSpecific);
  const pattern       = patternSentence({ peopleProse, actionProse, contextProse });

  // ── Conditional fragments ──
  let mirrorBack = '';

  // Burning question line
  if (burningQuestion) {
    mirrorBack += ''
      + '<div class="fw-reflected" style="border-left:3px solid ' + T.gold + ';padding:6px 0 6px 22px;'
      +   'margin-bottom:22px;font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
      +   'font-size:15px;line-height:1.75;color:' + T.navy + ';">'
      +   'You came in carrying a question: '
      +   '<em style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;font-style:italic;color:' + T.navy + ';">'
      +     '&ldquo;' + esc(burningQuestion) + '&rdquo;'
      +   '</em>'
      + '</div>';
  }

  // Can't-shake paragraph
  if (cantShakeText) {
    let paragraph = ''
      + 'In the discernment, you named what you can\'t shake: '
      + '<em style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;font-style:italic;color:' + T.navy + ';">'
      +   '&ldquo;' + esc(cantShakeText) + '&rdquo;'
      + '</em>'
      + '.';
    if (emotionPhrase) {
      paragraph += ' The feeling that came with it: ' + esc(emotionPhrase) + '.';
      paragraph += ' ' + esc(P.emotionGloss);
    }
    mirrorBack += ''
      + '<div class="fw-reflected" style="border-left:3px solid ' + T.gold + ';padding:6px 0 6px 22px;'
      +   'margin-bottom:22px;font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
      +   'font-size:15px;line-height:1.75;color:' + T.navy + ';">'
      +   paragraph
      + '</div>';
  }

  // Pattern paragraph (people / shape / context)
  if (pattern) {
    mirrorBack += ''
      + '<div class="fw-reflected" style="border-left:3px solid ' + T.gold + ';padding:6px 0 6px 22px;'
      +   'margin-bottom:22px;font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
      +   'font-size:15px;line-height:1.75;color:' + T.navy + ';">'
      +   esc(pattern)
      + '</div>';
  }

  // Sense-of-calling callout block (italic quote + profile response)
  let callingBlock = '';
  if (senseOfCalling) {
    callingBlock = ''
      + '<div class="fw-calling" style="background:' + T.goldBg + ';border-left:3px solid ' + T.gold + ';'
      +   'padding:22px 26px;margin-bottom:32px;border-radius:4px;">'
      +   '<p class="fw-calling-quote" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
      +     'font-style:italic;font-size:17px;line-height:1.7;color:' + T.navy + ';margin:0 0 12px;">'
      +     'And you wrote: &ldquo;' + esc(senseOfCalling) + '&rdquo;'
      +   '</p>'
      +   '<p class="fw-calling-response" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
      +     'font-size:14px;line-height:1.7;color:' + T.textSecondary + ';margin:0;">'
      +     esc(P.callingNote)
      +   '</p>'
      + '</div>';
  }

  // Universal "Here's what you named." line — drop ONLY if there's literally
  // no mirror-back content AND no calling block to introduce.
  const hasAnyMirror = !!(mirrorBack || callingBlock);
  const hereLine = hasAnyMirror
    ? '<p class="fw-text" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
      + 'font-style:italic;font-size:22px;color:' + T.navy + ';margin:0 0 24px;line-height:1.4;">'
      + 'Here\'s what you named.'
      + '</p>'
    : '';

  // Guide secondary line. The faithful_witness variant frames it differently
  // ("connect with another Faithful Witness ... we can arrange that").
  const guideTail = P.guideTail ? (' ' + esc(P.guideTail)) : '';
  const guideLineHtml = ''
    + '<p class="fw-text-mid" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +   'font-size:14.5px;color:' + T.textSecondary + ';margin:0 0 32px;line-height:1.65;">'
    +   esc(P.guideLine) + ' '
    +   '<a href="' + esc(guideMailto()) + '" class="fw-link-gold" '
    +     'style="color:' + T.gold + ';font-weight:600;text-decoration:none;'
    +     'border-bottom:1px solid ' + T.gold + ';padding-bottom:2px;">'
    +     esc(P.guideLink) + ' &rarr;'
    +   '</a>'
    +   guideTail
    + '</p>';

  const html = ''
    + headBlock(subject, previewText)
    + shellOpen()
    + headerBand()

    + '<table role="presentation" class="fw-body" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'style="padding:36px 40px 32px;">'
    + '<tr><td>'

    // Salutation
    +   '<div class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:16px;line-height:1.6;color:' + T.navy + ';margin-bottom:28px;">'
    +     'Hi ' + esc(firstName) + ','
    +   '</div>'

    // Profile-specific opener
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 24px;">'
    +     esc(P.opener)
    +   '</p>'

    // "Here's what you named." (drops if no mirror-back content)
    +   hereLine

    // Mirror-back conditional paragraphs
    +   mirrorBack

    // Sense-of-calling callout
    +   callingBlock

    // A word for where you are
    +   '<h3 class="fw-h-serif" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +     'font-size:20px;color:' + T.navy + ';font-weight:700;margin:0 0 12px;">'
    +     'A word for where you are'
    +   '</h3>'
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 24px;">'
    +     esc(P.word)
    +   '</p>'

    // What now
    +   '<h3 class="fw-h-serif" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +     'font-size:20px;color:' + T.navy + ';font-weight:700;margin:0 0 12px;">'
    +     'What now'
    +   '</h3>'
    +   '<p class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:15px;line-height:1.75;color:' + T.navy + ';margin:0 0 20px;">'
    +     esc(P.whatNow)
    +   '</p>'
    +   primaryButton(P.inviteLabel, inviteUrl(participantId))
    +   guideLineHtml

    // Blessing block
    +   '<div class="fw-blessing" style="border-top:1px solid ' + T.borderLight + ';padding-top:28px;margin-bottom:28px;">'
    +     '<div class="fw-blessing-label" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:' + T.textMuted + ';margin-bottom:12px;">'
    +       'A blessing as you carry this'
    +     '</div>'
    +     '<p class="fw-blessing-text" style="font-family:\'Libre Baskerville\',Georgia,\'Times New Roman\',serif;'
    +       'font-style:italic;font-size:16px;line-height:1.8;color:' + T.navy + ';margin:0;">'
    +       esc(P.blessing)
    +     '</p>'
    +   '</div>'

    // Signature
    +   '<div class="fw-text-mid" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:14px;color:' + T.textSecondary + ';">'
    +     '<div style="margin-bottom:2px;">The Faithful Witness Team</div>'
    +     '<div class="fw-text-muted" style="font-size:13px;color:' + T.textMuted + ';">'
    +       'CCDA &middot; NaLEC &middot; World Relief &middot; Undivided'
    +     '</div>'
    +   '</div>'

    + '</td></tr></table>'

    + footerBand('Return to your reflection anytime', welcomeBackUrl(participantId))
    + shellClose()
    + tailBlock();

  return { subject, previewText, html };
}

module.exports = {
  // Renderers
  renderStage1Email,
  renderStage3Email,
  // Constants (for tests + other api files)
  PROFILE_KEYS,
  PROFILE_NAMES,
  // Helpers (exported so the cron endpoint can compose payloads)
  humanizeEmotions,
  humanizeNeighbor,
  humanizeActionShape,
  humanizeContext,
  joinProse,
  articleFor,
};
