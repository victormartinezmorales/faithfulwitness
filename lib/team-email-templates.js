// lib/team-email-templates.js — event notification / reminder / removal emails.
//
// SELF-CONTAINED ON PURPOSE: the Stage 1 / Stage 3 templates in
// lib/email-templates.js are frozen (guardrail: no changes to existing email
// templates), so the shared shell helpers below are mirrored from that file
// verbatim rather than imported. Visual style matches exactly: same header
// band, navy/gold/cream palette, Plus Jakarta Sans body, Libre Baskerville
// italic accents, table-based layout, dark-mode adaptation.

'use strict';

// ─── Tokens (mirrored from lib/email-templates.js) ──────────────────────────
const T = {
  navy: '#333858', navyLight: '#454B6F', navyDark: '#252940',
  gold: '#C49A3C', goldLight: '#d4ab3a', goldPale: '#f7f0dc', goldBg: '#fdf8ee',
  cream: '#faf8f4', warmWhite: '#ffffff',
  textPrimary: '#1a1a2e', textSecondary: '#4a4a6a', textMuted: '#7a7a9a',
  textMutedOnWhite: '#5a5a7a',
  border: '#e8e4f0', borderLight: '#f0edf8',
  pageLight: '#ececec',
  darkBg: '#1a1a2e', darkBgRaised: '#252940', darkBorder: '#333858',
  darkText: '#e8e4f0', darkTextMid: '#d8d8e8', darkTextMuted: '#b8b8d0', darkTextDim: '#9a9ab4',
};

const BASE_URL = 'https://faithful-witness.vercel.app';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function teamDashboardUrl(pid) {
  return BASE_URL + '/team?pid=' + encodeURIComponent(pid || '') + '#events';
}

// ─── Shell (mirrored from lib/email-templates.js) ───────────────────────────

function darkModeRules(prefix) {
  const p = prefix ? prefix + ' ' : '';
  return ''
    + p + '.fw-page-bg,'
    + p + '.fw-page-bg td{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    + p + '.fw-shell{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-head,'
    + p + '.fw-foot{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-campaign-mark{color:' + T.darkText + '!important}'
    + p + '.fw-coalition-mark{color:' + T.darkTextDim + '!important}'
    + p + '.fw-text,' + p + '.fw-text *{color:' + T.darkText + '!important}'
    + p + '.fw-text-mid,' + p + '.fw-text-mid *{color:' + T.darkTextMid + '!important}'
    + p + '.fw-text-muted,' + p + '.fw-text-muted *{color:' + T.darkTextDim + '!important}'
    + p + '.fw-event-card{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-event-title{color:' + T.darkText + '!important}'
    + p + '.fw-event-meta,' + p + '.fw-event-meta *{color:' + T.darkTextMuted + '!important}'
    + p + '.fw-platform-badge{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important;color:' + T.goldLight + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-rsvp-state{background:' + T.darkBgRaised + '!important;background-color:' + T.darkBgRaised + '!important;border-left-color:' + T.goldLight + '!important}'
    + p + '.fw-rsvp-state *{color:' + T.darkTextMid + '!important}'
    + p + '.fw-btn-primary{background:' + T.goldLight + '!important;background-color:' + T.goldLight + '!important;color:' + T.navyDark + '!important}'
    + p + '.fw-btn-primary-cell{background:' + T.goldLight + '!important;background-color:' + T.goldLight + '!important}'
    + p + '.fw-link-gold{color:' + T.goldLight + '!important;border-bottom-color:' + T.goldLight + '!important}'
    + p + '.fw-h-serif{color:' + T.darkText + '!important}'
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
    +   '<meta name="color-scheme" content="light dark">'
    +   '<meta name="supported-color-schemes" content="light dark">'
    +   '<title>' + esc(subject) + '</title>'
    +   '<link rel="preconnect" href="https://fonts.googleapis.com">'
    +   '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    +   '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">'
    +   '<style>'
    +     ':root{color-scheme:light dark;supported-color-schemes:light dark;}'
    +     'body,.fw-page-bg{color-scheme:light dark;supported-color-schemes:light dark;}'
    +     '@media only screen and (max-width:620px){'
    +       '.fw-shell{width:100%!important;max-width:100%!important}'
    +       '.fw-body{padding:28px 22px 28px!important}'
    +       '.fw-head{padding:22px 22px 18px!important}'
    +       '.fw-foot{padding:18px 22px 20px!important}'
    +       '.fw-event-img{height:140px!important}'
    +     '}'
    +     '@media (prefers-color-scheme: dark){' + darkModeRules('') + '}'
    +     '[data-ogsc] .fw-page-bg,'
    +     '[data-ogsc] .fw-page-bg td{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    +     darkModeRules('[data-ogsc]')
    +     'u + .body .fw-shell,'
    +     'u + .body .fw-page-bg{background:' + T.darkBg + '!important;background-color:' + T.darkBg + '!important}'
    +   '</style>'
    + '</head>'
    + '<body class="fw-page-bg body" bgcolor="' + T.pageLight + '" '
    +   'style="margin:0;padding:0;background:' + T.pageLight + ';background-color:' + T.pageLight + ';'
    +   'font-family:\'Plus Jakarta Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">'
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
function shellClose() { return '</td></tr></table>'; }

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

function tailBlock() { return '</td></tr></table></body></html>'; }

function primaryButton(label, url) {
  return ''
    + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">'
    + '<tr><td bgcolor="' + T.navy + '" class="fw-btn-primary-cell" style="border-radius:8px;">'
    +   '<a href="' + esc(url) + '" class="fw-btn-primary" '
    +     'style="display:inline-block;background:' + T.navy + ';color:' + T.warmWhite + ';'
    +     'font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;'
    +     'text-decoration:none;letter-spacing:0.02em;line-height:1.2;min-width:160px;text-align:center;">'
    +     esc(label) + ' &nbsp;&rarr;'
    +   '</a>'
    + '</td></tr></table>';
}

function goldLink(label, url) {
  return ''
    + '<a href="' + esc(url) + '" class="fw-link-gold" '
    +   'style="color:' + T.gold + ';font-weight:600;text-decoration:none;'
    +   'border-bottom:1px solid ' + T.gold + ';padding-bottom:2px;'
    +   'font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;">'
    +   esc(label) + ' &rarr;'
    + '</a>';
}

// ─── Event-specific pieces ──────────────────────────────────────────────────

const PLATFORM_BADGES = {
  eventbrite:      'Eventbrite',
  mobilize:        'Mobilize',
  facebook:        'Facebook',
  google_calendar: 'Google Calendar',
  internal:        'Team event',
  other:           'Event link',
};

// Display in Eastern Time (campaign home base; Cincinnati). Explicit label
// so recipients elsewhere aren't misled.
function formatEventDatetime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/New_York',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(d);
  return date + ' &middot; ' + time + ' ET';
}

// Card-style event block. Conditional image (spec C1): when og_image_url is
// null the card renders title / date / location / platform only.
function eventCardBlock(ev) {
  const badge = PLATFORM_BADGES[ev.source_platform] || PLATFORM_BADGES.other;
  let html = ''
    + '<table role="presentation" class="fw-event-card" cellpadding="0" cellspacing="0" border="0" width="100%" '
    +   'style="background:' + T.cream + ';border:1px solid ' + T.border + ';border-radius:10px;'
    +   'margin:0 0 24px;overflow:hidden;">';

  if (ev.og_image_url) {
    html += ''
      + '<tr><td>'
      +   '<img src="' + esc(ev.og_image_url) + '" alt="" width="520" class="fw-event-img" '
      +     'style="display:block;width:100%;max-width:100%;height:180px;object-fit:cover;border:0;">'
      + '</td></tr>';
  }

  html += ''
    + '<tr><td style="padding:18px 22px 20px;">'
    +   '<div class="fw-event-title" style="font-family:\'Libre Baskerville\',Georgia,serif;'
    +     'font-size:19px;font-weight:700;color:' + T.navy + ';line-height:1.3;margin-bottom:10px;">'
    +     esc(ev.title)
    +   '</div>'
    +   '<div class="fw-event-meta" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +     'font-size:13px;color:' + T.textSecondary + ';line-height:1.7;">'
    +     '&#128197;&nbsp; ' + formatEventDatetime(ev.event_datetime)
    +     (ev.location ? '<br>&#128205;&nbsp; ' + esc(ev.location) : '')
    +   '</div>'
    +   '<div style="margin-top:12px;">'
    +     '<span class="fw-platform-badge" style="display:inline-block;font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    +       'font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;'
    +       'color:' + T.gold + ';background:' + T.warmWhite + ';border:1px solid ' + T.border + ';'
    +       'padding:4px 10px;border-radius:100px;">'
    +       esc(badge)
    +     '</span>'
    +   '</div>'
    + '</td></tr>'
    + '</table>';
  return html;
}

function bodyOpen()  {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">'
    + '<tr><td class="fw-body" style="padding:36px 40px 32px;">';
}
function bodyClose() { return '</td></tr></table>'; }

function para(text, extra) {
  return '<div class="fw-text" style="font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;'
    + 'font-size:15px;color:' + T.textPrimary + ';line-height:1.7;margin:0 0 20px;' + (extra || '') + '">'
    + text + '</div>';
}

// ─── C1: creation notification ──────────────────────────────────────────────
// opts: { recipientFirstName, recipientPid, adderFirstName, teamName, event }
function renderEventNotificationEmail(opts) {
  const subject     = `${opts.teamName} · New event: ${opts.event.title}`;
  const previewText = `${opts.adderFirstName} added an event to your team.`;
  const dashUrl     = teamDashboardUrl(opts.recipientPid);

  const html = headBlock(subject, previewText)
    + shellOpen()
    + headerBand()
    + bodyOpen()
    +   para('Hi ' + esc(opts.recipientFirstName) + ',')
    +   para(esc(opts.adderFirstName) + ' just added an event to <strong>' + esc(opts.teamName) + '</strong>.')
    +   eventCardBlock(opts.event)
    +   primaryButton('View event details', opts.event.source_url)
    +   para(goldLink('RSVP on your team dashboard', dashUrl), 'margin:0 0 24px;')
    +   para('We’ll send you a reminder 24 hours before.',
          'font-size:13px;color:' + T.textMutedOnWhite + ';margin:0 0 24px;')
    +   para('Grace and peace,<br>The Faithful Witness team', 'margin:0;')
    + bodyClose()
    + footerBand('Return to your team dashboard', dashUrl)
    + shellClose()
    + tailBlock();

  return { subject, previewText, html };
}

// ─── C2: 24-hour reminder ───────────────────────────────────────────────────
// opts: { recipientFirstName, recipientPid, teamName, event, rsvpStatus }
function renderEventReminderEmail(opts) {
  const subject     = `Tomorrow: ${opts.event.title}`;
  const previewText = 'Your team has an event coming up tomorrow.';
  const dashUrl     = teamDashboardUrl(opts.recipientPid);

  const rsvpLine =
    opts.rsvpStatus === 'going' ? 'You said you’re going.' :
    opts.rsvpStatus === 'maybe' ? 'You said maybe.' :
    'You haven’t said yet.';

  const rsvpBlock = ''
    + '<div class="fw-rsvp-state" style="background:' + T.goldBg + ';border-left:3px solid ' + T.gold + ';'
    +   'border-radius:6px;padding:12px 16px;margin:0 0 24px;">'
    +   '<span style="font-family:\'Libre Baskerville\',Georgia,serif;font-style:italic;'
    +     'font-size:14px;color:' + T.navy + ';">' + rsvpLine + '</span>'
    + '</div>';

  const html = headBlock(subject, previewText)
    + shellOpen()
    + headerBand()
    + bodyOpen()
    +   para('Hi ' + esc(opts.recipientFirstName) + ',')
    +   para('Just a heads-up: <strong>' + esc(opts.event.title) + '</strong> is tomorrow.')
    +   eventCardBlock(opts.event)
    +   rsvpBlock
    +   primaryButton('View event details', opts.event.source_url)
    +   para(goldLink('Update your RSVP', dashUrl), 'margin:0 0 24px;')
    +   para('Grace and peace,<br>The Faithful Witness team', 'margin:0;')
    + bodyClose()
    + footerBand('Return to your team dashboard', dashUrl)
    + shellClose()
    + tailBlock();

  return { subject, previewText, html };
}

// ─── C3: removal notice ─────────────────────────────────────────────────────
// opts: { recipientFirstName, recipientPid, removerFirstName, teamName, event }
function renderEventRemovalEmail(opts) {
  const subject     = `Event removed: ${opts.event.title}`;
  const previewText = `${opts.removerFirstName} removed an event from your team.`;
  const dashUrl     = teamDashboardUrl(opts.recipientPid);

  const html = headBlock(subject, previewText)
    + shellOpen()
    + headerBand()
    + bodyOpen()
    +   para('Hi ' + esc(opts.recipientFirstName) + ',')
    +   para(esc(opts.removerFirstName) + ' removed <strong>' + esc(opts.event.title) + '</strong> ('
        + formatEventDatetime(opts.event.event_datetime) + ') from <strong>'
        + esc(opts.teamName) + '</strong>. No need to do anything — your RSVP has been cleared from the dashboard.')
    +   para(goldLink('Back to your team dashboard', dashUrl), 'margin:0 0 24px;')
    +   para('Grace and peace,<br>The Faithful Witness team', 'margin:0;')
    + bodyClose()
    + footerBand('Return to your team dashboard', dashUrl)
    + shellClose()
    + tailBlock();

  return { subject, previewText, html };
}

module.exports = {
  renderEventNotificationEmail,
  renderEventReminderEmail,
  renderEventRemovalEmail,
  formatEventDatetime,
  PLATFORM_BADGES,
};
