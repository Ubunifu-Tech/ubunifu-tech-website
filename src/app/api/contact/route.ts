import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notificationEmail, acknowledgementEmail } from '@/lib/emails';

// Best-effort in-memory rate limiting (per warm serverless instance).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const submissions = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  recent.push(now);
  submissions.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, company_url, elapsedMs } =
      await req.json();

    // Honeypot - a hidden field only bots fill in. Pretend success silently.
    if (typeof company_url === 'string' && company_url.trim() !== '') {
      return NextResponse.json({ success: true });
    }

    // Submitted implausibly fast for a human-filled form. Pretend success.
    if (typeof elapsedMs === 'number' && elapsedMs < 3000) {
      return NextResponse.json({ success: true });
    }

    // Rate limit by IP address.
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Basic format and length validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }
    if (
      String(name).length > 200 ||
      String(email).length > 200 ||
      String(subject).length > 200 ||
      String(message).length > 5000
    ) {
      return NextResponse.json(
        { error: 'One or more fields are too long.' },
        { status: 400 }
      );
    }

    // Email is configured per-deployment; fail clearly if it isn't.
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Contact form: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Email is not configured. Please email info@ubunifutech.com directly.' },
        { status: 503 }
      );
    }
    const resend = new Resend(apiKey);

    // Notify the team.
    await resend.emails.send({
      from: 'Ubunifu Website <notifications@ubunifutech.com>',
      to: 'info@ubunifutech.com',
      replyTo: email,
      subject: `[Website] ${subject} from ${name}`,
      html: notificationEmail({ name, email, subject, message }),
    });

    // Acknowledge the sender — best-effort; a failure here must not fail the
    // request, since the team notification already went out.
    try {
      await resend.emails.send({
        from: 'Ubunifu Technologies <notifications@ubunifutech.com>',
        to: email,
        replyTo: 'info@ubunifutech.com',
        subject: 'Thanks for reaching out | Ubunifu Technologies',
        html: acknowledgementEmail({ name, subject }),
      });
    } catch (ackError) {
      console.warn('Contact form: acknowledgement email failed:', ackError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
