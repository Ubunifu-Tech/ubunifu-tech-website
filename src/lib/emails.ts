// Transactional email templates for the contact form. Table-based, inline
// styles, absolute links, built to render across email clients. The two
// exports return ready-to-send HTML strings.

const SITE = 'https://ubunifutech.com';
const EMAIL = 'info@ubunifutech.com';
const PHONE_TEL = '+255748548816';
const PHONE_DISPLAY = '+255 748 548 816';
const INSIGHT = 'https://insight.ubunifutech.com';
const SIFA = 'https://sifa.ubunifutech.com';
const LOGO = `${SITE}/brand/png/ubunifu-lockup-1600.png`;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
    <td class="email-pad" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:24px 32px;border-top:4px solid #FF6B2C;border-bottom:1px solid #ECE9E4;">
      <a href="${SITE}" style="display:inline-block;text-decoration:none;">
        <img class="brand-logo" src="${LOGO}" width="236" height="45" alt="Ubunifu Technologies" style="display:block;width:236px;height:45px;border:0;" />
      </a>
    </td>
  </tr>`;
}

/** Light footer with contact details and links. */
function footer(): string {
  const link = 'color:#A63A11;text-decoration:underline;font-weight:600;';
  return `
  <tr>
    <td class="email-pad" style="background:#F7F5F2;border-top:1px solid #E4E0DA;padding:28px 32px;font-family:${FONT};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td class="footer-cell" style="color:#4A4753;font-size:13px;line-height:1.9;vertical-align:top;">
            <div style="color:#1D1B22;font-weight:700;font-size:14px;margin-bottom:6px;">Ubunifu Technologies</div>
            <a href="mailto:${EMAIL}" style="${link}">${EMAIL}</a><br/>
            <a href="tel:${PHONE_TEL}" style="${link}">${PHONE_DISPLAY}</a> &nbsp;|&nbsp;
            <a href="${SITE}/contact?chat=open" style="${link}">Chat with us</a><br/>
            Tanzania
          </td>
          <td class="footer-cell footer-links" align="right" style="vertical-align:top;color:#4A4753;font-size:13px;line-height:1.9;">
            <a href="${SITE}" style="${link}">Website</a><br/>
            <a href="${SITE}/build" style="${link}">Services</a><br/>
            <a href="${SITE}/work" style="${link}">Our work</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="email-pad" style="background:#F7F5F2;border-top:1px solid #E4E0DA;padding:16px 32px;font-family:${FONT};color:#6D6975;font-size:12px;">
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
<body style="margin:0;padding:0;background:#F2F0EC;">
${preheader(preview)}
<table class="email-wrap" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F0EC;padding:24px 12px;">
  <tr>
    <td align="center">
      <table class="email-frame" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E4E0DA;">
        ${header()}
        <tr>
          <td class="email-pad" style="padding:36px 32px;font-family:${FONT};color:#1D1B22;">
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
  return `<a href="${href}" style="display:inline-block;padding:12px 23px;background:#FDF3EE;color:#A63A11;font-family:${FONT};font-weight:700;font-size:14px;line-height:1.4;text-decoration:none;border-radius:6px;border:1px solid #E9D3C6;">${label}</a>`;
}

/** Label and value rows, for the facts an email is about. Values are HTML. */
function facts(rows: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #ECE9E4;">${rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #ECE9E4;color:#6D6975;font-size:13px;width:110px;vertical-align:top;">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #ECE9E4;color:#1D1B22;font-size:14px;">${value}</td>
    </tr>`,
    )
    .join('')}</table>`;
}

/* ── Notification to the team ─────────────────── */

export function notificationEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Where the enquiry came from, when it was not the contact form. */
  via?: string;
  /** The enquiry in the console, with the whole chat. */
  consoleUrl?: string;
}): string {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #ECE9E4;color:#6D6975;font-size:13px;width:96px;vertical-align:top;">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #ECE9E4;color:#1D1B22;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 5px;color:#A63A11;font-size:14px;font-weight:700;">New enquiry${
      input.via ? ` from ${escapeHtml(input.via)}` : ''
    }</p>
    <h1 style="margin:0 0 22px;font-size:24px;font-weight:700;color:#1D1B22;">${name} got in touch</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      ${row('Name', name)}
      ${row('Email', `<a href="mailto:${email}" style="color:#A63A11;text-decoration:none;">${email}</a>`)}
      ${row('Subject', subject)}
    </table>
    <p style="margin:26px 0 8px;color:#A63A11;font-size:14px;font-weight:700;">Message</p>
    <div style="background:#FAF9F7;border:1px solid #E4E0DA;border-radius:8px;padding:18px;color:#1D1B22;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
    <div style="margin-top:26px;">${
      input.consoleUrl
        ? `${button(input.consoleUrl, 'Read the chat')}&nbsp;&nbsp;${buttonGhost(
            `mailto:${email}?subject=${encodeURIComponent('Re: ' + input.subject)}`,
            `Reply to ${name}`,
          )}`
        : button(
            `mailto:${email}?subject=${encodeURIComponent('Re: ' + input.subject)}`,
            `Reply to ${name}`,
          )
    }</div>
    <p style="margin:18px 0 0;color:#6D6975;font-size:12px;">Or just reply to this email. It goes straight to ${name}.</p>`;

  return shell(`New enquiry from ${input.name}: ${input.subject}`, body);
}

/* ── Acknowledgement to the sender ────────────── */

/** Longest excerpt echoed back before it is trimmed. */
const SUMMARY_LIMIT = 700;

function summarise(message: string): { text: string; trimmed: boolean } {
  const collapsed = message
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  // it acknowledges receipt itself; it does not report that a message was
  // passed to somebody else.
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1D1B22;">Thanks for reaching out, ${name}.</h1>
    <p style="margin:0 0 26px;color:#4A4753;font-size:15px;line-height:1.7;">
      We have your message about <strong style="color:#1D1B22;">${subject}</strong>. We read everything that comes in, and we will reply to this address directly. If it is easier to talk, say so in a reply and we will suggest a time.
    </p>
    <p style="margin:0 0 8px;color:#A63A11;font-size:14px;font-weight:700;">What you sent us</p>
    <div style="background:#FAF9F7;border:1px solid #E4E0DA;border-radius:8px;padding:18px;color:#1D1B22;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}${
      summary.trimmed
        ? '<span style="color:#6D6975;"> …</span><div style="margin-top:10px;color:#6D6975;font-size:12px;">Trimmed for length. We have the whole message.</div>'
        : ''
    }</div>
    <p style="margin:26px 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">While you wait, our live products are open to try:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
      <td class="button-cell" style="padding-right:10px;">${button(INSIGHT, 'Try Ubunifu Insight')}</td>
      <td class="button-cell">${buttonGhost(SIFA, 'Try Ubunifu Sifa')}</td>
    </tr></table>`;

  return shell(`We have your message about ${input.subject}. We will reply directly.`, body);
}

/* ── Console: sign-in and invitation ──────────── */

/**
 * A link is a credential, so these templates say plainly what the link does,
 * how long it lasts, and what to do if the recipient did not ask for it. No
 * marketing, no products, nothing else to click.
 */
function securityNote(minutesOrDays: string): string {
  return `<p style="margin:22px 0 0;color:#6D6975;font-size:13px;line-height:1.6;">
    This link works once and expires in ${minutesOrDays}. If you did not request it,
    you can ignore this email. Nothing has changed on your account.
  </p>`;
}

export function staffSignInEmail(input: { name: string; url: string }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Sign in to the console</h1>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. Use the button below to open the Ubunifu console.
    </p>
    ${button(input.url, 'Open the console')}
    ${securityNote('20 minutes')}`;

  return shell('Your link to sign in to the Ubunifu console.', body);
}

/** A colleague adding someone to the console. */
export function staffInviteEmail(input: { name: string; invitedBy: string; url: string }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const by = escapeHtml(input.invitedBy);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">You are on the team</h1>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. ${by} added you to the Ubunifu console, where we run clients,
      projects, documents and invoices. Use the button to sign in for the first time.
    </p>
    ${button(input.url, 'Open the console')}
    <p style="margin:22px 0 0;color:#6D6975;font-size:13px;line-height:1.6;">
      After today, sign in any time with your email address and we will send you a fresh link.
    </p>
    ${securityNote('14 days')}`;

  return shell(`${input.invitedBy} added you to the Ubunifu console.`, body);
}

/** A colleague giving someone a task. */
export function taskAssignedEmail(input: {
  name: string;
  by: string;
  task: string;
  project: string;
  due: string | null;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">A task for you</h1>
    <p style="margin:0 0 20px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. ${escapeHtml(input.by)} gave you this on <strong style="color:#1D1B22;">${escapeHtml(input.project)}</strong>.
    </p>
    ${facts([
      ['Task', escapeHtml(input.task)],
      ['Due', input.due ? escapeHtml(input.due) : 'No date yet'],
    ])}
    <div style="margin-top:24px;">${button(input.url, 'Open the plan')}</div>`;

  return shell(`${input.by} gave you a task on ${input.project}.`, body);
}

/** A client adding a colleague to their portal. */
export function colleagueInviteEmail(input: {
  name: string;
  invitedBy: string;
  clientName: string;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const by = escapeHtml(input.invitedBy);
  const org = escapeHtml(input.clientName);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Join ${org} on the Ubunifu portal</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. ${by} invited you to the portal where ${org} follows its work with
      Ubunifu Technologies: project progress, what we need from you, documents to sign,
      and invoices.
    </p>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Follow the link to choose a password and finish setting up your account.
    </p>
    ${button(input.url, 'Set up your account')}
    ${securityNote('14 days')}`;

  return shell(`${input.invitedBy} invited you to the ${input.clientName} portal.`, body);
}

/**
 * The first link a client ever receives. It is an invitation rather than a
 * sign-in: following it is where they set a password and the account begins.
 */
export function clientInviteEmail(input: {
  name: string;
  clientName: string;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const org = escapeHtml(input.clientName);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Your project portal is ready</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. We have set up a portal for <strong style="color:#1D1B22;">${org}</strong>.
      It is where you will find progress updates, anything we need from you,
      documents to review and sign, and your invoices and receipts.
    </p>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Follow the link to choose a password and finish setting up your account.
    </p>
    ${button(input.url, 'Set up your account')}
    ${securityNote('14 days')}`;

  return shell(`Set up your ${input.clientName} project portal.`, body);
}

export function clientSignInEmail(input: { name: string; url: string }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Sign in to your portal</h1>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. Use the button below to open your project portal. You can
      also sign in with your email and password at any time.
    </p>
    ${button(input.url, 'Open my portal')}
    ${securityNote('20 minutes')}`;

  return shell('Your link to sign in to the Ubunifu portal.', body);
}

export function passwordResetEmail(input: { name: string; url: string }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Choose a new password</h1>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. Use the button below to choose a new password for your
      project portal. Your current password keeps working until you do.
    </p>
    ${button(input.url, 'Choose a new password')}
    ${securityNote('30 minutes')}`;

  return shell('Your link to choose a new portal password.', body);
}

/**
 * Sent after a password changes, whichever way it changed. If it was not
 * them, this is how they find out, so it says what to do about it.
 */
export function passwordChangedEmail(input: { name: string; when: Date }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const when = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dar_es_Salaam',
    timeZoneName: 'short',
  }).format(input.when);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Your password was changed</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. The password for your Ubunifu project portal was changed on
      ${escapeHtml(when)}.
    </p>
    <p style="margin:0;color:#4A4753;font-size:15px;line-height:1.7;">
      If that was you, there is nothing more to do. If it was not, reply to this
      email straight away and we will help you secure the account.
    </p>`;

  return shell('The password for your Ubunifu portal was changed.', body);
}

/** Sent to the old address when we change the address someone signs in with. */
export function signInEmailChangedEmail(input: { name: string; newEmail: string }): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Your sign-in email changed</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. You now sign in to your Ubunifu project portal with
      <strong style="color:#1D1B22;">${escapeHtml(input.newEmail)}</strong>.
      Your password is the same, and emails about your projects will go there
      from now on.
    </p>
    <p style="margin:0;color:#4A4753;font-size:15px;line-height:1.7;">
      If you did not ask for this, reply to this email and we will put it right.
    </p>`;

  return shell('The email you sign in to the Ubunifu portal with has changed.', body);
}

/**
 * An invoice, with the amount and due date in the body rather than only behind
 * the link. Someone deciding whether to open a payment email at 9pm wants to
 * know what it is for first.
 */
export function invoiceEmail(input: {
  name: string;
  clientName: string;
  number: string;
  total: string;
  /** What has been received against it, or null when nothing has. */
  paid?: string | null;
  /** What is still owed, or null when it is settled. */
  outstanding?: string | null;
  dueAt: Date | null;
  url: string;
  /** Whether the invoice shows how to pay, which it does once our payment details are set. */
  showsHowToPay: boolean;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const org = escapeHtml(input.clientName);
  const strong = (value: string) => `<strong style="color:#1D1B22;">${escapeHtml(value)}</strong>`;
  const due = input.dueAt
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(input.dueAt)
    : null;
  const settled = input.outstanding === null && Boolean(input.paid);

  // Settled, part paid or not paid yet: each says only what is true of it. A
  // copy of a paid invoice must not ask for the money again.
  const standing = settled
    ? `It is paid in full. This copy is for your records.`
    : input.paid && input.outstanding
      ? `We have received ${strong(input.paid)}, and ${strong(input.outstanding)} is still due${due ? ` by ${strong(due)}` : ''}.`
      : due
        ? `It is due by ${strong(due)}.`
        : '';
  const next = settled
    ? 'Open it in your portal to see what it covered and the receipts for it.'
    : input.showsHowToPay
      ? 'Open it in your portal to see what it covers and how to pay. We will send a receipt as soon as the payment reaches us.'
      : 'Open it in your portal to see what it covers, and reply to this email for our payment details. We will send a receipt as soon as the payment reaches us.';

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Invoice ${escapeHtml(input.number)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. Here is invoice ${strong(input.number)} for ${org}, for ${strong(input.total)}. ${standing}
    </p>
    <p style="margin:0 0 24px;color:#4A4753;font-size:15px;line-height:1.7;">
      ${next}
    </p>
    ${button(input.url, 'View the invoice')}
    ${securityNote('30 days')}`;

  return shell(`Invoice ${input.number} for ${input.total}.`, body);
}

/** Proof of payment, sent the moment it is recorded. */
export function receiptEmail(input: {
  name: string;
  number: string;
  invoiceNumber: string;
  amount: string;
  issuedAt: Date;
  /** The receipt in the portal. */
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const issued = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(input.issuedAt);

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Thank you, payment received</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. We have recorded <strong style="color:#1D1B22;">${escapeHtml(input.amount)}</strong>
      against invoice <strong style="color:#1D1B22;">${escapeHtml(input.invoiceNumber)}</strong>.
    </p>
    <p style="margin:0 0 8px;color:#4A4753;font-size:15px;line-height:1.7;">
      This is receipt <strong style="color:#1D1B22;">${escapeHtml(input.number)}</strong>, issued ${escapeHtml(issued)}.
      Keep it for your records. It is also in your portal, ready to print or save as a PDF.
    </p>
    <div style="margin-top:24px;">${button(input.url, 'View the receipt')}</div>`;

  return shell(`Receipt ${input.number} for ${input.amount}.`, body);
}

/** Money sent back, with the refund note to keep. */
export function refundEmail(input: {
  name: string;
  number: string;
  receiptNumber: string | null;
  invoiceNumber: string;
  amount: string;
  refundedAt: Date;
  /** The refund note in the portal. */
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const on = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(input.refundedAt);
  const strong = (value: string) => `<strong style="color:#1D1B22;">${escapeHtml(value)}</strong>`;

  const body = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Your refund</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. We sent back ${strong(input.amount)} on ${escapeHtml(on)}, from your payment${
        input.receiptNumber ? ` on receipt ${strong(input.receiptNumber)}` : ''
      } for invoice ${strong(input.invoiceNumber)}.
    </p>
    <p style="margin:0 0 8px;color:#4A4753;font-size:15px;line-height:1.7;">
      This is refund note ${strong(input.number)}. Keep it for your records. It is also in your
      portal, ready to print or save as a PDF.
    </p>
    <div style="margin-top:24px;">${button(input.url, 'View the refund note')}</div>`;

  return shell(`Refund ${input.number} for ${input.amount}.`, body);
}

/**
 * A progress update.
 *
 * The update itself is in the body, not behind a link. A client who has to
 * sign in to find out whether anything happened will stop opening these, and
 * then the portal stops being read too. The link is for the detail and the
 * history; the email carries the news.
 */
export function projectUpdateEmail(input: {
  name: string;
  projectName: string;
  title: string;
  body: string;
  previewUrl: string | null;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  // Written as short paragraphs; kept as short paragraphs.
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.projectName)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(input.title)}</h1>
    <p style="margin:0 0 16px;color:#4A4753;font-size:15px;line-height:1.7;">Hello ${name},</p>
    ${paragraphs}
    ${input.previewUrl ? button(input.previewUrl, 'Take a look') : button(input.url, 'Open your portal')}
    <p style="margin:24px 0 0;color:#8B8793;font-size:13px;line-height:1.7;">
      Every update is kept in your portal, so you can always go back to one.
    </p>`;

  return shell(`${input.projectName}: ${input.title}`, body);
}

/** Written as short paragraphs; kept as short paragraphs. */
function paragraphsOf(text: string, gap = 16): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 ${gap}px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

/** A version of the work, ready for the client to approve or send back. */
export function reviewRequestEmail(input: {
  name: string;
  projectName: string;
  round: number;
  title: string;
  note: string | null;
  previewUrl: string | null;
  /** The review in their portal, where they answer. */
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.projectName)} · round ${input.round}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Ready for your review: ${escapeHtml(input.title)}</h1>
    <p style="margin:0 0 16px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. Please take a look, then approve it or tell us what to change
      from your portal.
    </p>
    ${input.note ? paragraphsOf(input.note) : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
      <tr>
        ${input.previewUrl ? `<td class="button-cell" style="padding:0 10px 0 0;">${buttonGhost(input.previewUrl, 'Open the preview')}</td>` : ''}
        <td class="button-cell">${button(input.url, 'Approve or ask for changes')}</td>
      </tr>
    </table>`;

  return shell(`${input.projectName}: ${input.title} is ready for your review.`, body);
}

/**
 * What we still need from the client, as one list. Sent when staff choose,
 * after adding what they need, so a client gets one email for five things
 * rather than five emails.
 */
export function itemsNeededEmail(input: {
  name: string;
  projectName: string;
  items: { title: string; detail: string | null; isNew: boolean }[];
  url: string;
  /** Whether the portal takes files, which needs file storage set up. */
  takesFiles: boolean;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const rows = input.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #ECE9E4;vertical-align:top;">
          <p style="margin:0;color:#1D1B22;font-size:15px;line-height:1.5;">
            ${escapeHtml(item.title)}${item.isNew ? ' <span style="color:#A63A11;font-size:13px;">New</span>' : ''}
          </p>
          ${item.detail ? `<p style="margin:4px 0 0;color:#6D6975;font-size:13px;line-height:1.6;">${escapeHtml(item.detail)}</p>` : ''}
        </td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.projectName)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">What we need from you</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. To keep the work moving, we need the following. ${
        input.takesFiles
          ? 'You can write an answer or attach files against each one in your portal.'
          : 'You can write an answer against each one in your portal, and reply to this email with any files.'
      }
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #ECE9E4;margin-bottom:24px;">${rows}</table>
    ${button(input.url, 'Send them from your portal')}`;

  return shell(`${input.projectName}: what we need from you.`, body);
}

/** Our own alert: a client answered something we asked for, or sent a file for it. */
export function clientSentEmail(input: {
  clientName: string;
  from: string;
  projectName: string;
  itemTitle: string;
  /** Their written answer, or null for a file. */
  answer: string | null;
  filename: string | null;
  url: string;
}): string {
  const headline = input.answer
    ? `${input.from} answered ${input.itemTitle}`
    : `${input.from} sent a file for ${input.itemTitle}`;
  const answer =
    input.answer && input.answer.length > 1200 ? `${input.answer.slice(0, 1200)}…` : input.answer;

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.clientName)} · ${escapeHtml(input.projectName)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(headline)}</h1>
    ${answer ? paragraphsOf(answer, 14) : ''}
    ${input.filename ? `<p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(input.filename)}</p>` : ''}
    ${button(input.url, 'Open the project')}`;

  return shell(`${input.projectName}: ${headline}`, body);
}

/** Our own alert: a client answered a review. */
export function reviewAnsweredEmail(input: {
  clientName: string;
  from: string;
  projectName: string;
  round: number;
  title: string;
  approved: boolean;
  answer: string | null;
  url: string;
}): string {
  const headline = input.approved
    ? `${input.from} approved round ${input.round}`
    : `${input.from} asked for changes to round ${input.round}`;

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.clientName)} · ${escapeHtml(input.projectName)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      <strong style="color:#1D1B22;">${escapeHtml(input.title)}</strong>
    </p>
    ${input.answer ? paragraphsOf(input.answer, 14) : ''}
    ${button(input.url, 'Open the project')}`;

  return shell(`${input.projectName}: ${headline}`, body);
}

/**
 * A document waiting for signature.
 *
 * Names the terms the client will be accepting alongside it, because
 * "and by signing you agree to our terms" discovered at the last screen is how
 * people end up feeling tricked by something they would have agreed to anyway.
 */
export function documentToSignEmail(input: {
  name: string;
  clientName: string;
  documentTitle: string;
  kind: string;
  reference: string;
  termsTitle: string | null;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.kind)} · ${escapeHtml(input.reference)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(input.documentTitle)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Hello ${name}. This is ready for you to read and sign on behalf of
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong>.
    </p>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Signing takes a moment: read it through, type your initials, and confirm.
      ${
        input.termsTitle
          ? `You will also be accepting our <strong style="color:#1D1B22;">${escapeHtml(input.termsTitle)}</strong>, which is shown in full on the same page.`
          : ''
      }
      If anything is wrong, choose <strong style="color:#1D1B22;">Ask for changes</strong>
      on the same page rather than signing. We would much rather fix it first.
    </p>
    ${button(input.url, 'Read and sign')}
    ${securityNote('14 days')}
    <p style="margin:24px 0 0;color:#8B8793;font-size:13px;line-height:1.7;">
      If the link has expired, sign in to your portal at any time and it will be
      waiting for you there.
    </p>`;

  return shell(`${input.documentTitle} is ready for your signature.`, body);
}

/** Our own alert that a client has asked for something. */
export function ticketRaisedEmail(input: {
  reference: string;
  clientName: string;
  from: string;
  fromEmail: string;
  kind: string;
  subject: string;
  body: string;
  projectName: string | null;
  url: string;
}): string {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">
      ${escapeHtml(input.reference)} · ${escapeHtml(input.kind.replace(/_/g, ' '))}${
        input.projectName ? ` · ${escapeHtml(input.projectName)}` : ''
      }
    </p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(input.subject)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      From <strong style="color:#1D1B22;">${escapeHtml(input.from)}</strong> at
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong> (${escapeHtml(input.fromEmail)}).
    </p>
    ${paragraphs}
    ${button(input.url, 'Open it in the console')}`;

  return shell(`${input.reference}: ${input.subject}`, body);
}

/** A reply going the other way, to the client. */
export function ticketReplyEmail(input: {
  name: string;
  reference: string;
  subject: string;
  body: string;
  status: string;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.reference)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(input.subject)}</h1>
    <p style="margin:0 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">Hello ${name},</p>
    ${paragraphs}
    <p style="margin:0 0 24px;color:#8B8793;font-size:13px;line-height:1.7;">
      Where it stands: <strong style="color:#1D1B22;">${escapeHtml(input.status)}</strong>.
    </p>
    ${button(input.url, 'Reply in your portal')}`;

  return shell(`${input.reference}: ${input.subject}`, body);
}

/**
 * A client did not sign.
 *
 * Deliberately quotes their words in full rather than summarising them. This
 * email exists so somebody reads the objection today, not so it can be filed.
 */
export function documentResponseEmail(input: {
  reference: string;
  title: string;
  clientName: string;
  from: string;
  fromEmail: string;
  declined: boolean;
  note: string;
  version: number;
  url: string;
}): string {
  const paragraphs = input.note
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const headline = input.declined
    ? `${input.from} declined to sign it`
    : `${input.from} has asked for changes`;

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">
      ${escapeHtml(input.reference)} · version ${input.version}
    </p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      <strong style="color:#1D1B22;">${escapeHtml(input.title)}</strong>, sent to
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong>
      (${escapeHtml(input.fromEmail)}). Nothing has been signed and nothing has been charged.
    </p>
    ${paragraphs}
    ${button(input.url, 'Open it in the console')}`;

  return shell(`${input.reference}: ${headline}`, body);
}

/** Our own alert: the time to sign ran out, and the client would still like to. */
export function documentFreshCopyEmail(input: {
  reference: string;
  title: string;
  clientName: string;
  from: string;
  url: string;
}): string {
  const headline = `${input.from} asked for a fresh copy to sign`;
  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.reference)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      The time to sign <strong style="color:#1D1B22;">${escapeHtml(input.title)}</strong> ran out
      before <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong> signed it.
      Send it again from the console and they can sign the new copy.
    </p>
    ${button(input.url, 'Open it in the console')}`;

  return shell(`${input.reference}: ${headline}`, body);
}

/**
 * A client sent back their own wording for a document.
 *
 * The wording itself stays in the console, where it can be compared with what
 * was sent; an email is the wrong place to read a contract side by side. What
 * comes here is who, which version, how much they changed and their note.
 */
export function documentWordingEmail(input: {
  reference: string;
  title: string;
  clientName: string;
  from: string;
  fromEmail: string;
  note: string | null;
  version: number;
  /** Paragraphs taken out and put in, from the comparison. */
  removed: number;
  added: number;
  url: string;
}): string {
  const paragraphs = (input.note ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:#4A4753;font-size:15px;line-height:1.7;">${escapeHtml(
          block,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const headline = `${input.from} suggested new wording`;
  const count = (n: number) => `${n} ${n === 1 ? 'paragraph' : 'paragraphs'}`;

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">
      ${escapeHtml(input.reference)} · version ${escapeHtml(String(input.version))}
    </p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      <strong style="color:#1D1B22;">${escapeHtml(input.title)}</strong>, sent to
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong>
      (${escapeHtml(input.fromEmail)}). Nothing has been signed and nothing has been charged.
    </p>
    ${facts([
      ['Taken out', escapeHtml(count(input.removed))],
      ['Put in', escapeHtml(count(input.added))],
    ])}
    <div style="height:18px;line-height:18px;">&nbsp;</div>
    ${paragraphs}
    ${button(escapeHtml(input.url), 'Compare it in the console')}`;

  return shell(`${input.reference}: ${headline}`, body);
}

/** The signer's own copy: what they signed, when, and where it is kept. */
export function documentSignedEmail(input: {
  name: string;
  clientName: string;
  documentTitle: string;
  kind: string;
  reference: string;
  initials: string;
  signedOn: string;
  fingerprint: string;
  url: string;
}): string {
  const name = escapeHtml(input.name.split(' ')[0] ?? input.name);

  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">${escapeHtml(input.kind)} · ${escapeHtml(input.reference)}</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">Signed: ${escapeHtml(input.documentTitle)}</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      Thank you, ${name}. You signed this on behalf of
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong>. The signed
      copy stays in your portal, where you can read it or save it as a PDF at any time.
    </p>
    ${facts([
      ['Signed by', escapeHtml(`${input.name} (${input.initials})`)],
      ['Signed on', escapeHtml(input.signedOn)],
      ['Fingerprint', escapeHtml(input.fingerprint)],
    ])}
    ${button(input.url, 'Open your signed copy')}
    <p style="margin:24px 0 0;color:#8B8793;font-size:13px;line-height:1.7;">
      Keep this email with your records. If a question about the document ever
      comes up, quote the fingerprint above.
    </p>`;
  // The fingerprint is a short form of the SHA-256 of exactly what was signed.
  // Any change to the text would give a different one, which is why quoting it
  // settles which version someone signed. The client needs what to do with
  // it, not how it works.

  return shell(`You signed ${input.documentTitle}.`, body);
}

/** Our own notice that a client has signed. */
export function documentSignedNoticeEmail(input: {
  reference: string;
  title: string;
  clientName: string;
  from: string;
  fromEmail: string;
  version: number;
  projectMoved: string | null;
  url: string;
}): string {
  const body = `
    <p style="margin:0 0 6px;color:#8B8793;font-size:13px;line-height:1.5;">
      ${escapeHtml(input.reference)} · version ${input.version}
    </p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1D1B22;">${escapeHtml(input.from)} signed it</h1>
    <p style="margin:0 0 18px;color:#4A4753;font-size:15px;line-height:1.7;">
      <strong style="color:#1D1B22;">${escapeHtml(input.title)}</strong>, for
      <strong style="color:#1D1B22;">${escapeHtml(input.clientName)}</strong>, signed by
      ${escapeHtml(input.from)} (${escapeHtml(input.fromEmail)}).
      ${input.projectMoved ? `The project is now ${escapeHtml(input.projectMoved)}.` : ''}
    </p>
    ${button(input.url, 'Open it in the console')}`;

  return shell(`${input.reference} is signed`, body);
}
