import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ServiceLine } from '@/generated/prisma/client';
import { notificationEmail, acknowledgementEmail } from '@/lib/emails';
import {
  ACKNOWLEDGEMENTS_PER_DAY,
  CONTACT_PER_IP_DAY,
  TEAM_NOTICES_PER_DAY,
  allow,
  noteCapReached,
  requestIp,
} from '@/lib/console/rate-limit';
import { TEAM_INBOX } from '@/lib/console/alerts';
import { consoleEnv } from '@/lib/console/env';
import { sendConsoleEmail } from '@/lib/console/mailer';
import { contactSubjects } from '@/content/site';

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 16_000;
const MAX_RATE_BUCKETS = 1_000;
const submissions = new Map<string, number[]>();

// One list for the form and this check, in src/content/site.ts.
const SUBJECTS = new Set<string>(contactSubjects);

function recordRateAttempt(key: string, now: number): boolean {
  if (!submissions.has(key) && submissions.size >= MAX_RATE_BUCKETS) {
    for (const storedKey of submissions.keys()) {
      submissions.delete(storedKey);
      break;
    }
  }

  const recent = (submissions.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    submissions.set(key, recent);
    return true;
  }

  submissions.set(key, [...recent, now]);
  return false;
}

function rateLimitKey(req: NextRequest, email: string): string {
  if (process.env.VERCEL === '1') {
    // Vercel overwrites this header at its edge. Never trust forwarding
    // headers as caller identity on hosts that do not make that guarantee.
    const vercelIp = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (vercelIp) return `vercel-ip:${vercelIp}`;
  }

  return `email:${email.toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  return recordRateAttempt(key, Date.now());
}

async function readBodyWithinLimit(req: NextRequest): Promise<string | null> {
  if (!req.body) return '';

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // The connection may already be closing; the payload is rejected either way.
      }
      return null;
    }

    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();
  return body;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The subject the visitor picked, mapped to a service line where it is
 * unambiguous. Left null otherwise: "Project enquiry" could be any of six
 * things, and a wrong guess sitting in the record is worse than an empty field
 * somebody has to fill in on triage.
 */
const SERVICE_LINE_GUESS: Record<string, ServiceLine> = {
  'Product question': 'product',
  'Hosting, domains & email': 'hosting',
  'Branding & design': 'branding',
};

/**
 * Records the enquiry.
 *
 * Runs BEFORE the email, and the response no longer depends on the email
 * succeeding. Until the console existed, a Resend outage meant the enquiry was
 * gone — the visitor was told to email us directly and the lead was lost. Now
 * the row is the record and the email is a notification about it, which is the
 * right way round.
 *
 * submissionId is unique, so the double-submit the client already guards
 * against cannot produce two rows either. A repeat is treated as the same
 * enquiry rather than a new one.
 *
 * Returns the enquiry's id, so the emails can link to it, or null when it
 * could not be stored.
 */
async function recordEnquiry(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  submissionId: string;
  ip: string | null;
}): Promise<string | null> {
  try {
    const enquiry = await db.enquiry.upsert({
      where: { submissionId: input.submissionId },
      update: {},
      create: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        serviceLine: SERVICE_LINE_GUESS[input.subject] ?? null,
        submissionId: input.submissionId,
        ip: input.ip,
      },
      select: { id: true },
    });
    return enquiry.id;
  } catch (error) {
    // Logged, never thrown. A database that is briefly unreachable must not
    // stop the email going out — between the two of them the enquiry survives.
    console.error('Contact form: could not record the enquiry:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const mediaType = req.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return NextResponse.json({ error: 'Expected a JSON request.' }, { status: 415 });
    }

    const declaredLength = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Message payload is too large.' }, { status: 413 });
    }

    const rawBody = await readBodyWithinLimit(req);
    if (rawBody === null) {
      return NextResponse.json({ error: 'Message payload is too large.' }, { status: 413 });
    }

    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const companyUrl = asString(payload.company_url);
    // The honeypot intentionally returns a quiet success so automated
    // submitters do not get a useful signal.
    if (companyUrl) {
      return NextResponse.json({ success: true });
    }

    const name = asString(payload.name);
    const email = asString(payload.email).toLowerCase();
    const subject = asString(payload.subject);
    const message = asString(payload.message);
    const submissionId = asString(payload.submissionId);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (
      name.length < 2 ||
      name.length > 120 ||
      email.length > 254 ||
      /[\u0000-\u001F\u007F]/.test(name)
    ) {
      return NextResponse.json({ error: 'Please check your name and email.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!SUBJECTS.has(subject)) {
      return NextResponse.json({ error: 'Please choose a valid enquiry type.' }, { status: 400 });
    }

    if (message.length < 20 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Please write between 20 and 5,000 characters.' },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission identifier.' }, { status: 400 });
    }

    // Two layers: the in-memory one answers even when the database is down,
    // and the database one holds across every server instance.
    const ip = requestIp(req.headers);
    if (
      isRateLimited(rateLimitKey(req, email)) ||
      !(await allow('contact:ip', ip, { limit: 5, windowMinutes: 10 })) ||
      !(await allow('contact:ip-day', ip, CONTACT_PER_IP_DAY)) ||
      !(await allow('contact:email', email, { limit: 5, windowMinutes: 60 }))
    ) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a few minutes.' },
        { status: 429 },
      );
    }

    // Recorded first. Everything below is notification about a row that now
    // exists, rather than the only trace of the enquiry.
    const enquiryId = await recordEnquiry({
      name,
      email,
      subject,
      message,
      submissionId,
      ip:
        req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        null,
    });

    const recorded = enquiryId !== null;
    // Both emails are logged against the enquiry, so the console shows
    // whether the visitor was answered. The mailer reports a missing key or a
    // rejected send as a failure rather than throwing, so once the enquiry is
    // recorded neither is the visitor's problem.
    const about = enquiryId ? { entityType: 'Enquiry', entityId: enquiryId } : {};

    let notificationFailed = false;
    // Past the day's allowance the email is skipped, not failed: the enquiry
    // is in the console, so the team still sees it there. When it could not
    // be stored, the email is the only record, so it always goes.
    const mayAlert = !recorded || (await allow('team-notice', 'site', TEAM_NOTICES_PER_DAY));
    if (!mayAlert) {
      await noteCapReached(
        'team-notice',
        'team_notice.cap_reached',
        'The daily limit on team alert emails from the website was reached. New enquiries today are in the console but are not emailed.',
        24 * 60,
      );
    } else {
      const notification = await sendConsoleEmail({
        to: TEAM_INBOX,
        subject: `[Website] ${subject} from ${name}`,
        html: notificationEmail({
          name,
          email,
          subject,
          message,
          consoleUrl: enquiryId ? `${consoleEnv.adminOrigin}/enquiries/${enquiryId}` : undefined,
        }),
        template: 'contact_notification',
        // So "reply to this email" reaches the visitor, as the email says.
        replyTo: email,
        ...about,
        idempotencyKey: `contact-notify-${submissionId}`,
      });
      notificationFailed = !notification.ok;
    }

    if (notificationFailed && !recorded) {
      // Neither route worked. This is the only case where the visitor has to
      // do something, so it is the only case that reports a failure.
      return NextResponse.json(
        { error: 'We could not send your message. Please email info@ubunifutech.com directly.' },
        { status: 502 },
      );
    }

    // A ceiling on these replies across the whole site, whoever is asking,
    // so the form cannot be used to mail a long list of strangers. Past it
    // the enquiry still reaches us; only the reply is skipped.
    if (await allow('acknowledgement', 'site', ACKNOWLEDGEMENTS_PER_DAY)) {
      await sendConsoleEmail({
        to: email,
        subject: 'Thanks for reaching out | Ubunifu Technologies',
        // The subject is one of the form's own choices, checked above.
        html: acknowledgementEmail({ topic: subject }),
        template: 'contact_acknowledgement',
        ...about,
        idempotencyKey: `contact-ack-${submissionId}`,
      });
    } else {
      await noteCapReached(
        'acknowledgement',
        'acknowledgement.cap_reached',
        'The daily limit on confirmation emails was reached. Later senders today get no confirmation email.',
        24 * 60,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 },
    );
  }
}
