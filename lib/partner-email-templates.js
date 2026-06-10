// lib/partner-email-templates.js — partner magic-link login email.
// Shell helpers mirrored from the frozen lib/email-templates.js pattern
// (same header band, navy/gold/cream, Plus Jakarta Sans, Libre Baskerville).

'use strict';

const T = {
  navy: '#333858', navyDark: '#252940', gold: '#C49A3C', goldLight: '#d4ab3a',
  cream: '#faf8f4', warmWhite: '#ffffff', textPrimary: '#1a1a2e',
  textMuted: '#7a7a9a', textMutedOnWhite: '#5a5a7a',
  border: '#e8e4f0', borderLight: '#f0edf8', pageLight: '#ececec',
  darkBg: '#1a1a2e', darkBgRaised: '#252940', darkBorder: '#333858',
  darkText: '#e8e4f0', darkTextDim: '#9a9ab4',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function darkRules(p) {
  p = p ? p + ' ' : '';
  return p + '.fw-page-bg,' + p + '.fw-page-bg td{background:' + T.darkBg + '!important}'
    + p + '.fw-shell{background:' + T.darkBg + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-head,' + p + '.fw-foot{background:' + T.darkBgRaised + '!important;border-color:' + T.darkBorder + '!important}'
    + p + '.fw-campaign-mark{color:' + T.darkText + '!important}'
    + p + '.fw-coalition-mark{color:' + T.darkTextDim + '!important}'
    + p + '.fw-text,' + p + '.fw-text *{color:' + T.darkText + '!important}'
    + p + '.fw-btn-primary{background:' + T.goldLight + '!important;color:' + T.navyDark + '!important}'
    + p + '.fw-btn-primary-cell{background:' + T.goldLight + '!important}'
    + p + '.fw-foot-note{color:' + T.darkTextDim + '!important}';
}

// opts: { firstName, loginUrl }
function renderPartnerLoginEmail(opts) {
  const subject = 'Your Faithful Witness partner login link';
  const previewText = 'A login link for the partner dashboard.';
  const name = (opts.firstName || '').trim() || 'there';

  const html = ''
    + '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">'
    + '<title>' + esc(subject) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">'
    + '<style>@media (prefers-color-scheme: dark){' + darkRules('') + '}'
    + '[data-ogsc] .fw-page-bg{background:' + T.darkBg + '!important}' + darkRules('[data-ogsc]')
    + '@media only screen and (max-width:620px){.fw-shell{width:100%!important}.fw-body{padding:28px 22px!important}}'
    + '</style></head>'
    + '<body class="fw-page-bg" bgcolor="' + T.pageLight + '" style="margin:0;padding:0;background:' + T.pageLight + ';'
    + 'font-family:\'Plus Jakarta Sans\',-apple-system,Helvetica,Arial,sans-serif;">'
    + '<div style="display:none;font-size:1px;max-height:0;overflow:hidden;">' + esc(previewText) + '</div>'
    + '<table role="presentation" class="fw-page-bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + T.pageLight + '">'
    + '<tr><td align="center" style="padding:24px 16px;">'
    + '<table role="presentation" class="fw-shell" width="600" cellpadding="0" cellspacing="0" '
    +   'style="width:600px;max-width:600px;background:' + T.warmWhite + ';border:1px solid ' + T.border + ';border-radius:12px;overflow:hidden;"><tr><td>'
    // header band
    + '<table role="presentation" class="fw-head" width="100%" cellpadding="0" cellspacing="0" '
    +   'style="background:' + T.cream + ';border-bottom:1px solid ' + T.borderLight + ';"><tr><td align="center" style="padding:28px 40px 24px;">'
    + '<div class="fw-campaign-mark" style="font-size:12px;font-weight:700;letter-spacing:0.18em;color:' + T.navy + ';margin-bottom:6px;">FAITHFUL WITNESS CAMPAIGN</div>'
    + '<div class="fw-coalition-mark" style="font-size:11px;color:' + T.textMuted + ';letter-spacing:0.05em;">CCDA &middot; NaLEC &middot; World Relief &middot; Undivided</div>'
    + '<div style="width:36px;height:2px;background:' + T.gold + ';margin:16px auto 0;font-size:0;">&nbsp;</div>'
    + '</td></tr></table>'
    // body
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="fw-body" style="padding:36px 40px 32px;">'
    + '<div class="fw-text" style="font-size:15px;color:' + T.textPrimary + ';line-height:1.7;margin:0 0 20px;">Hi ' + esc(name) + ',</div>'
    + '<div class="fw-text" style="font-size:15px;color:' + T.textPrimary + ';line-height:1.7;margin:0 0 24px;">'
    + 'You requested a login link for the Faithful Witness partner dashboard.</div>'
    + '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>'
    + '<td bgcolor="' + T.navy + '" class="fw-btn-primary-cell" style="border-radius:8px;">'
    + '<a href="' + esc(opts.loginUrl) + '" class="fw-btn-primary" style="display:inline-block;background:' + T.navy + ';color:' + T.warmWhite + ';'
    + 'font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Log in &nbsp;&rarr;</a>'
    + '</td></tr></table>'
    + '<div class="fw-text" style="font-size:13px;color:' + T.textMutedOnWhite + ';line-height:1.7;margin:0 0 8px;">'
    + 'This link expires in 15 minutes and can only be used once.</div>'
    + '<div class="fw-text" style="font-size:13px;color:' + T.textMutedOnWhite + ';line-height:1.7;margin:0 0 24px;">'
    + 'If you didn’t request this, you can ignore this email.</div>'
    + '<div class="fw-text" style="font-size:15px;color:' + T.textPrimary + ';line-height:1.7;">Grace and peace,<br>The Faithful Witness team</div>'
    + '</td></tr></table>'
    // footer
    + '<table role="presentation" class="fw-foot" width="100%" cellpadding="0" cellspacing="0" '
    +   'style="background:' + T.cream + ';border-top:1px solid ' + T.borderLight + ';"><tr><td align="center" style="padding:20px 40px 22px;">'
    + '<div class="fw-foot-note" style="font-size:11px;color:' + T.textMutedOnWhite + ';line-height:1.5;">'
    + 'You received this because your email is registered for partner dashboard access.</div>'
    + '</td></tr></table>'
    + '</td></tr></table></td></tr></table></body></html>';

  return { subject, previewText, html };
}

module.exports = { renderPartnerLoginEmail };
