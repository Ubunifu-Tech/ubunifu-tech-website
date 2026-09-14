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
const LOGO = `${SITE}/brand/png/ubunifu-lockup-1600.png`;

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

/** Branded header using the same transparent lockup as the website. */
function header(): string {
  return `
  <tr>
    <td class="email-pad" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:24px 32px;border-top:4px solid #FF6B2C;border-bottom:1px solid #E4DDF2;">
      <a href="${SITE}" style="display:inline-block;text-decoration:none;">
        <img class="brand-logo" src="${LOGO}" width="236" height="45" alt="Ubunifu Technologies" style="display:block;width:236px;height:45px;border:0;" />
      </a>
    </td>
  </tr>`;
}

/** Light footer with contact details and links. */
function footer(): string {
  const link =
    'color:#3D1FA0;text-decoration:underline;font-weight:600;';
  return `
  <tr>
    <td class="email-pad" style="background:#F6F2FF;border-top:1px solid #DDD4F0;padding:28px 32px;font-family:${FONT};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td class="footer-cell" style="color:#5A5170;font-size:13px;line-height:1.9;vertical-align:top;">
            <div style="color:#1F1A36;font-weight:700;font-size:14px;margin-bottom:6px;">Ubunifu Technologies</div>
            <a href="mailto:${EMAIL}" style="${link}">${EMAIL}</a><br/>
            <a href="tel:${PHONE_TEL}" style="${link}">${PHONE_DISPLAY}</a> &nbsp;|&nbsp;
            <a href="${WHATSAPP}" style="${link}">WhatsApp</a><br/>
            Tanzania
          </td>
          <td class="footer-cell footer-links" align="right" style="vertical-align:top;color:#5A5170;font-size:13px;line-height:1.9;">
            <a href="${SITE}" style="${link}">Website</a><br/>
            <a href="${SITE}/build" style="${link}">Services</a><br/>
            <a href="${SITE}/work" style="${link}">Our work</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="email-pad" style="background:#F6F2FF;border-top:1px solid #DDD4F0;padding:16px 32px;font-family:${FONT};color:#6B6385;font-size:12px;">
      &copy; ${year()} Ubunifu Technologies. All rights reserved.
    </td>
  </tr>`;
}

/** Wraps body content in the branded shell. */
function shell(preview: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @media only screen and (max-width:620px) {
    .email-wrap { padding:0 !important; }
    .email-frame { border-right:0 !important; border-left:0 !important; border-radius:0 !important; }
    .email-pad { padding-right:22px !important; padding-left:22px !important; }
    .footer-cell { display:block !important; width:100% !important; text-align:left !important; }
    .footer-links { padding-top:16px !important; }
    .button-cell { display:block !important; width:100% !important; padding:0 0 10px !important; }
    .brand-logo { width:220px !important; height:auto !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:#F7F5FB;">
${preheader(preview)}
<table class="email-wrap" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F5FB;padding:24px 12px;">
  <tr>
    <td align="center">
      <table class="email-frame" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #DDD4F0;">
        ${header()}
        <tr>
          <td class="email-pad" style="padding:36px 32px;font-family:${FONT};color:#1F1A36;">
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

/* Email cannot read CSS custom properties, so brand colours are literals here.
   They mirror globals.css. Change them together. */
function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:13px 24px;background:#A63A11;color:#FFFFFF;font-family:${FONT};font-weight:700;font-size:14px;line-height:1.4;text-decoration:none;border-radius:6px;">${label}</a>`;
}

function buttonGhost(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 23px;background:#F6F2FF;color:#3D1FA0;font-family:${FONT};font-weight:700;font-size:14px;line-height:1.4;text-decoration:none;border-radius:6px;border:1px solid #D8CCF4;">${label}</a>`;
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
      <td style="padding:11px 0;border-bottom:1px solid #EAE5F2;color:#6B6385;font-size:13px;width:96px;vertical-align:top;">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #EAE5F2;color:#1F1A36;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 5px;color:#A63A11;font-size:14px;font-weight:700;">New enquiry</p>
    <h1 style="margin:0 0 22px;font-size:24px;font-weight:700;color:#1F1A36;">${name} got in touch</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      ${row('Name', name)}
      ${row('Email', `<a href="mailto:${email}" style="color:#6D3FE8;text-decoration:none;">${email}</a>`)}
      ${row('Subject', subject)}
    </table>
    <p style="margin:26px 0 8px;color:#3D1FA0;font-size:14px;font-weight:700;">Message</p>
    <div style="background:#FAF8FF;border:1px solid #DDD4F0;border-radius:8px;padding:18px;color:#1F1A36;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
    <div style="margin-top:26px;">${button(`mailto:${email}?subject=${encodeURIComponent(
      'Re: ' + input.subject,
    )}`, `Reply to ${name}`)}</div>
    <p style="margin:18px 0 0;color:#6B6385;font-size:12px;">Or just reply to this email. It goes straight to ${name}.</p>`;

  return shell(`New enquiry from ${input.name}: ${input.subject}`, body);
}

/* ── Acknowledgement to the sender ────────────── */

/** Longest excerpt echoed back before it is trimmed. */
const SUMMARY_LIMIT = 700;

function summarise(message: string): { text: string; trimmed: boolean } {
  const collapsed = message.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (collapsed.length <= SUMMARY_LIMIT) return { text: collapsed, trimmed: false };
  // Cut on a word boundary so the excerpt does not end mid-word.
  const cut = collapsed.slice(0, SUMMARY_LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  return { text: (lastSpace > 400 ? cut.slice(0, lastSpace) : cut).trimEnd(), trimmed: true };
}

export function acknowledgementEmail(input: {
  name: string;
  subject: string;
  message: string;
}): string {
  const name = escapeHtml(input.name);
  const subject = escapeHtml(input.subject);
  const summary = summarise(input.message);
  const message = escapeHtml(summary.text);

  // Written in the first person throughout. This email comes FROM the team, so
  // it acknowledges receipt itself — it does not report that a message was
  // passed to somebody else.
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1F1A36;">Thanks for reaching out, ${name}.</h1>
    <p style="margin:0 0 26px;color:#5A5170;font-size:15px;line-height:1.7;">
      We have your message about <strong style="color:#1F1A36;">${subject}</strong>. We read everything that comes in, and we will reply to this address directly. If it is easier to talk, say so in a reply and we will suggest a time.
    </p>
    <p style="margin:0 0 8px;color:#3D1FA0;font-size:14px;font-weight:700;">What you sent us</p>
    <div style="background:#FAF8FF;border:1px solid #DDD4F0;border-radius:8px;padding:18px;color:#1F1A36;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}${
      summary.trimmed
        ? '<span style="color:#6B6385;"> …</span><div style="margin-top:10px;color:#6B6385;font-size:12px;">Trimmed for length. We have the whole message.</div>'
        : ''
    }</div>
    <p style="margin:26px 0 14px;color:#5A5170;font-size:15px;line-height:1.7;">While you wait, our live products are open to try:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
      <td class="button-cell" style="padding-right:10px;">${button(INSIGHT, 'Try Ubunifu Insight')}</td>
      <td class="button-cell">${buttonGhost(SIFA, 'Try Ubunifu Sifa')}</td>
    </tr></table>`;

  return shell(`We have your message about ${input.subject}. We will reply directly.`, body);
}
