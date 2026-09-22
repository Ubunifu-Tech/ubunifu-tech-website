import 'server-only';
import { Resend } from 'resend';
import { db } from '@/lib/db';

/**
 * Outgoing console email, always logged.
 *
 * Every send writes an EmailLog row first and updates it with the outcome, so
 * "did the client ever get that signing link" is answerable from our own
 * database rather than from the Resend dashboard. The log row is written even
 * when sending fails, which is the case you actually need it for.
 */

const FROM = 'Ubunifu Technologies <notifications@ubunifutech.com>';
const REPLY_TO = 'info@ubunifutech.com';

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendConsoleEmail(options: {
  to: string;
  subject: string;
  html: string;
  /** Template name, for the log. */
  template: string;
  /** What this email is about, so the log can be read alongside the record. */
  entityType?: string;
  entityId?: string;
  /**
   * Idempotency key. Two clicks on "resend link" inside the same second should
   * not produce two emails.
   */
  idempotencyKey?: string;
  /** Who a reply reaches. Our inbox unless the email is about someone else. */
  replyTo?: string;
}): Promise<SendResult> {
  const log = await db.emailLog.create({
    data: {
      toAddress: options.to,
      template: options.template,
      subject: options.subject,
      status: 'queued',
      entityType: options.entityType,
      entityId: options.entityId,
    },
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = 'RESEND_API_KEY is not set';
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: 'failed', error },
    });

    /**
     * In development, print the links so there is still a way in — but report
     * the failure honestly.
     *
     * This used to return ok:true while writing the log row as failed, which
     * put every caller's audit line ("invitation sent") in direct
     * contradiction with the email log ("failed"). That is the exact fault
     * this log exists to prevent, and having it in the mailer meant no caller
     * could get it right no matter how carefully they handled the result.
     * The caller decides what to show; this function only reports what
     * happened.
     */
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `\n[mailer] RESEND_API_KEY is not set, so nothing was sent.\n` +
          `[mailer] To: ${options.to}\n` +
          `[mailer] Subject: ${options.subject}\n` +
          `[mailer] Links in this email:\n` +
          extractLinks(options.html)
            .map((link) => `[mailer]   ${link}`)
            .join('\n') +
          '\n',
      );
      return {
        ok: false,
        error: 'email is not configured here, so the link was printed to the server console',
      };
    }

    return { ok: false, error };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send(
      {
        from: FROM,
        to: options.to,
        replyTo: options.replyTo ?? REPLY_TO,
        subject: options.subject,
        html: options.html,
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );

    if (response.error) {
      await db.emailLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: String(response.error.message ?? response.error) },
      });
      return { ok: false, error: 'The email provider rejected the message.' };
    }

    await db.emailLog.update({
      where: { id: log.id },
      data: { status: 'sent', providerId: response.data?.id, sentAt: new Date() },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: 'failed', error: message },
    });
    return { ok: false, error: 'The email could not be sent.' };
  }
}

/** Development convenience only — pulls hrefs out so a link is reachable. */
function extractLinks(html: string): string[] {
  const matches = html.matchAll(/href="(https?:\/\/[^"]+)"/g);
  const links = new Set<string>();
  for (const match of matches) {
    const href = match[1]!;
    // Skip the boilerplate in the shared footer.
    if (href.includes('/build') || href.includes('/work') || href === 'https://ubunifutech.com') {
      continue;
    }
    links.add(href);
  }
  return [...links];
}
