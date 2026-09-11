// Transactional email templates for the contact form. Table-based, inline
// styles, absolute links — built to render across email clients. The two
// exports return ready-to-send HTML strings.

const SITE = 'https://ubunifutech.com';
const EMAIL = 'info@ubunifutech.com';
const PHONE_TEL = '+255748548816';
const PHONE_DISPLAY = '+255 748 548 816';
const WHATSAPP = 'https://wa.me/255748548816';
const INSIGHT = 'https://insight.ubunifutech.com';
const SIFA = 'https://sifa.ubunifutech.com';

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function year(): string {
  // Plain server route; Date is available.
  return String(new Date().getFullYear());
}

/** Hidden inbox-preview text. */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(
    text,
  )}</div>`;
}

/** Branded header using the same Ubunifu Ligature as the website. */
function header(): string {
  return `
  <tr>
    <td bgcolor="#1F1A36" style="background-color:#1F1A36;padding:26px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="46" height="46" style="width:46px;height:46px;vertical-align:middle;"><img src="${SITE}/logo-v2.png" width="46" height="46" alt="" style="display:block;width:46px;height:46px;border:0;border-radius:9px;background:#1F1A36;" /></td>
          <td style="padding-left:13px;vertical-align:middle;">
            <div style="color:#FFFFFF;font-family:${FONT};font-weight:700;font-size:17px;line-height:1.15;">Ubunifu <span style="font-weight:600;">Technologies</span></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Dark footer with contact details and links. */
function footer(): string {
  const link =
    'color:#F4F2FB;text-decoration:underline;font-weight:600;';
  return `
  <tr>
    <td style="background:#1F1A36;padding:28px 32px;font-family:${FONT};">
      <div style="color:#FFFFFF;font-weight:700;font-size:14px;margin-bottom:4px;">Ubunifu Technologies</div>
      <div style="color:#F4F2FB;font-size:13px;margin-bottom:18px;">Consulting + products, built in Tanzania.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="color:#F4F2FB;font-size:13px;line-height:1.9;">
            <a href="mailto:${EMAIL}" style="${link}">${EMAIL}</a><br/>
            <a href="tel:${PHONE_TEL}" style="${link}">${PHONE_DISPLAY}</a> ·
            <a href="${WHATSAPP}" style="${link}">WhatsApp</a><br/>
            Tanzania
          </td>
          <td align="right" style="vertical-align:top;color:#F4F2FB;font-size:13px;line-height:1.9;">
            <a href="${SITE}" style="${link}">Website</a><br/>
            <a href="${SITE}/build" style="${link}">Services</a><br/>
            <a href="${SITE}/work" style="${link}">Our work</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#1F1A36;border-top:1px solid #5A5170;padding:16px 32px;font-family:${FONT};color:#F4F2FB;font-size:11px;">
      &copy; ${year()} Ubunifu Technologies. All rights reserved.
    </td>
  </tr>`;
}

/** Wraps body content in the branded shell. */
function shell(preview: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F4F2FB;">
${preheader(preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2FB;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #F0EDF9;">
        ${header()}
        <tr>
          <td style="padding:34px 32px;font-family:${FONT};color:#1F1A36;">
            ${body}
          </td>
        </tr>
        ${footer()}
      </table>
    </td>
  </tr>
</table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:13px 26px;background:#BF4314;color:#FFFFFF;font-family:${FONT};font-weight:700;font-size:14px;text-decoration:none;border-radius:4px;">${label}</a>`;
}

function buttonGhost(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#F4F2FB;color:#3D1FA0;font-family:${FONT};font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;border:1px solid #F0EDF9;">${label}</a>`;
}

/* ── Notification to the team ─────────────────── */

export function notificationEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #F0EDF9;color:#6B6385;font-size:13px;width:96px;vertical-align:top;">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #F0EDF9;color:#1F1A36;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 4px;color:#6B6385;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">New enquiry</p>
    <h1 style="margin:0 0 22px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1F1A36;">${name} got in touch</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      ${row('Name', name)}
      ${row('Email', `<a href="mailto:${email}" style="color:#6D3FE8;text-decoration:none;">${email}</a>`)}
      ${row('Subject', subject)}
    </table>
    <p style="margin:26px 0 8px;color:#6B6385;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
    <div style="background:#FAF8FE;border:1px solid #F0EDF9;border-radius:10px;padding:18px;color:#1F1A36;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
    <div style="margin-top:26px;">${button(`mailto:${email}?subject=${encodeURIComponent(
      'Re: ' + input.subject,
    )}`, `Reply to ${name}`)}</div>
    <p style="margin:18px 0 0;color:#6B6385;font-size:12px;">Or just reply to this email. It goes straight to ${name}.</p>`;

  return shell(`New enquiry from ${input.name}: ${input.subject}`, body);
}

/* ── Acknowledgement to the sender ────────────── */

export function acknowledgementEmail(input: {
  name: string;
  subject: string;
}): string {
  const name = escapeHtml(input.name);
  const subject = escapeHtml(input.subject);

  const step = (n: string, text: string) => `
    <tr>
      <td style="width:30px;vertical-align:top;padding-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#F0EDF9;color:#3D1FA0;font-family:${FONT};font-weight:700;font-size:12px;text-align:center;line-height:24px;">${n}</div>
      </td>
      <td style="padding-bottom:12px;color:#5A5170;font-size:14px;line-height:1.6;vertical-align:top;padding-top:2px;">${text}</td>
    </tr>`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:23px;font-weight:800;letter-spacing:-0.02em;color:#1F1A36;">Thanks for reaching out, ${name}.</h1>
    <p style="margin:0 0 18px;color:#5A5170;font-size:15px;line-height:1.7;">
      We sent your message about <strong style="color:#1F1A36;">${subject}</strong> to the Ubunifu team. If we can help, a team member will follow up directly.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:8px 0 26px;">
      ${step('1', 'You told us what you need.')}
      ${step('2', 'A member of our team reviews the context and whether we can help.')}
      ${step('3', 'If useful, we suggest a short call. No obligation.')}
    </table>
    <p style="margin:0 0 14px;color:#5A5170;font-size:15px;line-height:1.7;">In the meantime, take our live products for a spin:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:10px;">${button(INSIGHT, 'Try Ubunifu Insight')}</td>
      <td>${buttonGhost(SIFA, 'Try Ubunifu Sifa')}</td>
    </tr></table>`;

  return shell(
    `Thanks for reaching out. We received your message about ${input.subject}.`,
    body,
  );
}
