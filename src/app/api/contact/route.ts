import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notificationEmail, acknowledgementEmail } from '@/lib/emails';

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 16_000;
const MAX_RATE_BUCKETS = 1_000;
const submissions = new Map<string, number[]>();

const SUBJECTS = new Set([
  'Project enquiry',
  'Product question',
  'Hosting, domains & email',
  'Branding & design',
  'Support',
  'Partnership',
  'Careers',
  'Other',
]);

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

    if (isRateLimited(rateLimitKey(req, email))) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a few minutes.' },
        { status: 429 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Contact form: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Email is not configured. Please email info@ubunifutech.com directly.' },
        { status: 503 },
      );
    }

    const resend = new Resend(apiKey);
    const notification = await resend.emails.send(
      {
        from: 'Ubunifu Website <notifications@ubunifutech.com>',
        to: 'info@ubunifutech.com',
        replyTo: email,
        subject: `[Website] ${subject} from ${name}`,
        html: notificationEmail({ name, email, subject, message }),
      },
      { idempotencyKey: `contact-notify-${submissionId}` },
    );

    if (notification.error) {
      console.error('Contact form: team notification rejected:', notification.error);
      return NextResponse.json(
        { error: 'We could not send your message. Please email info@ubunifutech.com directly.' },
        { status: 502 },
      );
    }

    try {
      const acknowledgement = await resend.emails.send(
        {
          from: 'Ubunifu Technologies <notifications@ubunifutech.com>',
          to: email,
          replyTo: 'info@ubunifutech.com',
          subject: 'Thanks for reaching out | Ubunifu Technologies',
          html: acknowledgementEmail({ name, subject, message }),
        },
        { idempotencyKey: `contact-ack-${submissionId}` },
      );

      if (acknowledgement.error) {
        console.warn('Contact form: acknowledgement email rejected:', acknowledgement.error);
      }
    } catch (error) {
      console.warn('Contact form: acknowledgement email failed:', error);
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
