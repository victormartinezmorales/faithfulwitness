// api/send-email.js — Vercel serverless function
// Sends branded results email via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Faithful Witness <discernment@faithfulwitness.us>';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, profileName, profileType, narrativeHTML, resources, continueUrl } = req.body;
    const journeyUrl = continueUrl || 'https://faithful-witness.vercel.app';

    if (!email) return res.status(400).json({ error: 'No email provided' });

    const profileColors = {
      mobilizing: '#2D3A6B', responding: '#B8942A',
      processing: '#8fa3d4', exploring: '#6b8fd4', careful: '#9a7ab8'
    };
    const accentColor = profileColors[profileType] || '#2D3A6B';

    const resourcesHtml = resources && resources.length > 0
      ? resources.slice(0, 4).map(r => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8e4f0;">
            <a href="${r.url || '#'}" style="color:#2D3A6B;font-weight:600;text-decoration:none;font-size:14px;">${r.title}</a>
            <div style="color:#888;font-size:12px;margin-top:3px;">${r.org || ''}</div>
          </td>
        </tr>`).join('')
      : '<tr><td style="padding:10px 0;color:#888;font-size:14px;">Visit faithfulwitness.us/resources for curated resources.</td></tr>';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0eef8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#2D3A6B;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#d4ab3a;margin-bottom:8px;font-weight:600;">Faithful Witness Campaign</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;">Your Discernment Results</div>
    </div>
    <div style="background:${accentColor};padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:6px;">Your Profile</div>
      <div style="font-size:26px;font-weight:700;color:#ffffff;">${profileName}</div>
    </div>
    <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="color:#4a4a6a;font-size:15px;line-height:1.6;margin:0 0 20px;">Dear ${name},</p>
      <p style="color:#4a4a6a;font-size:15px;line-height:1.6;margin:0 0 24px;">Thank you for taking time to go through the Faithful Witness Discernment Experience. Here is a summary of what we see in you.</p>
      <div style="background:#fdf8ee;border-left:3px solid #B8942A;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#B8942A;font-weight:600;margin-bottom:12px;">Based on what you shared</div>
        <div style="color:#333;font-size:14px;line-height:1.7;">${narrativeHTML || '<p>Your profile reflects someone on a meaningful journey of discernment.</p>'}</div>
      </div>
      <div style="margin-bottom:28px;">
        <div style="font-size:13px;font-weight:700;color:#2D3A6B;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">Resources for Your Journey</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${resourcesHtml}</table>
      </div>
      <div style="text-align:center;margin:32px 0 10px;">
        <a href="${journeyUrl}" style="background:#2D3A6B;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Continue the Journey</a>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <p style="font-size:13px;color:#7a7a9a;font-style:italic;margin:0;">Stages 2&#8211;4 are waiting for you &#8212; formation, discernment, and a clear next step shaped around who you are and where you&#39;re starting from.</p>
      </div>
      <div style="background:#fdf8ee;border:1px solid #e8d09a;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:#2D3A6B;margin-bottom:6px;">This journey is better together</div>
        <div style="font-size:13px;color:#7a7a9a;margin-bottom:16px;">Invite someone you trust to explore and discern alongside you.</div>
        <a href="mailto:?subject=An%20invitation%20to%20discern%20together&body=Hi%2C%0A%0AI%20just%20completed%20something%20I%20think%20you%27d%20find%20meaningful.%0A%0AIt%27s%20called%20the%20Faithful%20Witness%20Discernment%20Experience%20%E2%80%94%20a%20guided%20assessment%20that%20helps%20Christians%20think%20through%20their%20faithful%20response%20to%20immigration.%20It%27s%20not%20political.%20It%27s%20personal%2C%20pastoral%2C%20and%20grounded%20in%20Scripture.%0A%0AIt%20took%20me%20about%2010%20minutes%20and%20gave%20me%20a%20lot%20to%20think%20about.%0A%0AWould%20you%20consider%20doing%20it%20too%3F%20I%27d%20love%20to%20compare%20notes%20on%20what%20we%20each%20discover.%0A%0AStart%20here%3A%20https%3A%2F%2Ffaithful-witness.vercel.app" style="background:#B8942A;color:#ffffff;padding:11px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Invite Someone to Join You</a>
        <div style="font-size:11px;color:#aaa;font-style:italic;margin-top:12px;">Your responses are private and won&#39;t be shared.</div>
      </div>
      <div style="border-top:1px solid #e8e4f0;padding-top:20px;text-align:center;">
        <div style="font-size:12px;color:#aaa;line-height:1.8;">
          Faithful Witness Campaign<br>
          CCDA &middot; NaLEC &middot; World Relief &middot; Undivided<br>
          <a href="https://faithfulwitness.us" style="color:#B8942A;text-decoration:none;">faithfulwitness.us</a>
        </div>
      </div>
    </div>
  </div>
<\/body>
<\/html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `${name}, your Faithful Witness reflection is here`,
        html
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return res.status(500).json({ success: false, error: result.message || 'Email send failed' });
    }

    return res.status(200).json({ success: true, id: result.id });

  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
