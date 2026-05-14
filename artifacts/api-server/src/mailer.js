import nodemailer from 'nodemailer';

const SMTP_HOST   = process.env.SMTP_HOST;
const SMTP_PORT   = Number(process.env.SMTP_PORT || 587);
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;
const SMTP_FROM   = process.env.SMTP_FROM || (SMTP_USER ? `ShelfMaster <${SMTP_USER}>` : 'ShelfMaster <no-reply@shelfmaster.local>');
const SMTP_SECURE = String(process.env.SMTP_SECURE || (SMTP_PORT === 465)).toLowerCase() === 'true';

let transporter = null;
let mode = 'console';

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  mode = 'smtp';
}

export function getMailerMode() { return mode; }

export async function sendMail({ to, subject, html, text }) {
  if (!to) return { ok: false, error: 'No recipient' };

  if (!transporter) {
    console.log('\n📬 [mailer:console]');
    console.log('   To:      ', to);
    console.log('   Subject: ', subject);
    console.log('   Body:    ', text || html?.replace(/<[^>]+>/g, '').slice(0, 240));
    console.log('   (Set SMTP_HOST / SMTP_USER / SMTP_PASS to send real email.)\n');
    return { ok: true, mode: 'console' };
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || html?.replace(/<[^>]+>/g, ''),
      html,
    });
    return { ok: true, mode: 'smtp' };
  } catch (err) {
    console.error('[mailer] sendMail failed:', err.message);
    return { ok: false, error: err.message, mode: 'smtp' };
  }
}

const ACCENT = {
  default:  { bar: '#7b1f1f', btn: '#7b1f1f' },
  success:  { bar: '#15803d', btn: '#15803d' },
  warning:  { bar: '#b45309', btn: '#b45309' },
  danger:   { bar: '#b91c1c', btn: '#b91c1c' },
  info:     { bar: '#0369a1', btn: '#0369a1' },
};

function typeToAccent(type) {
  if (!type) return ACCENT.default;
  const t = type.toLowerCase();
  if (t.includes('approv') || t.includes('return') || t.includes('success')) return ACCENT.success;
  if (t.includes('declin') || t.includes('fine')   || t.includes('danger') || t.includes('overdue')) return ACCENT.danger;
  if (t.includes('warn')   || t.includes('due')    || t.includes('remind') || t.includes('reset') || t.includes('pending')) return ACCENT.warning;
  if (t.includes('info')   || t.includes('verif')  || t.includes('confirm')) return ACCENT.info;
  return ACCENT.default;
}

export function htmlEmail({ heading, body, ctaUrl, ctaLabel, type = 'default' }) {
  const accent = typeToAccent(type);
  const year   = new Date().getFullYear();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${heading} — ShelfMaster</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9">
    <tr><td align="center" style="padding:48px 16px 40px">

      <!-- ── Card ── -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09)">

        <!-- Brand header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7b1f1f 0%,#9f2323 60%,#b91c1c 100%);padding:36px 40px 28px;text-align:center">
            <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:14px;padding:10px 18px;margin-bottom:14px">
              <span style="font-size:26px;vertical-align:middle">📚</span>
              <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px">ShelfMaster</span>
            </div>
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600">Library Management System</div>
          </td>
        </tr>

        <!-- Accent bar -->
        <tr>
          <td style="background:${accent.bar};height:3px;line-height:3px;font-size:0">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 44px 32px">
            <h1 style="margin:0 0 18px;font-size:21px;font-weight:700;color:#1e293b;line-height:1.3">${heading}</h1>
            <div style="font-size:15px;line-height:1.75;color:#475569">${body}</div>

            ${ctaUrl ? `
            <div style="margin:34px 0 8px;text-align:center">
              <a href="${ctaUrl}"
                 style="display:inline-block;background:${accent.btn};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:9px;font-weight:700;font-size:15px;letter-spacing:0.1px;line-height:1">
                ${ctaLabel || 'Open ShelfMaster'}
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 44px">
            <div style="border-top:1px solid #e2e8f0"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 44px 36px;text-align:center">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6">
              This email was sent by <strong style="color:#64748b">ShelfMaster</strong> because of activity on your account.<br>
              If you did not request this, please disregard this message.
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#cbd5e1">
              &copy; ${year} ShelfMaster Library Management System &mdash; All rights reserved.
            </p>
          </td>
        </tr>

      </table>
      <!-- ── /Card ── -->

    </td></tr>
  </table>

</body>
</html>`;
}
