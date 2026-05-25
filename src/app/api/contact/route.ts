import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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
  const resend = new Resend(process.env.RESEND_API_KEY);
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

    // Send notification to Ubunifu team
    await resend.emails.send({
      from: 'Ubunifu Website <notifications@ubunifutech.com>',
      to: 'info@ubunifutech.com',
      replyTo: email,
      subject: `[Website] ${subject} - ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
          <div style="background: #0a0a0a; padding: 32px; text-align: center;">
            <div style="display: inline-block; width: 40px; height: 40px; background: linear-gradient(135deg, #FF6B2C, #6D3FE8); border-radius: 10px; line-height: 40px; color: white; font-weight: 700; font-size: 18px;">U</div>
            <h2 style="color: #fafafa; margin: 16px 0 4px; font-size: 20px;">New Contact Form Submission</h2>
            <p style="color: rgba(255,255,255,0.5); margin: 0; font-size: 14px;">ubunifutech.com</p>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 100px;">Name</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;"><a href="mailto:${escapeHtml(email)}" style="color: #6D3FE8;">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Subject</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(subject)}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <p style="color: #6b7280; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; color: #111827; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message)}</div>
            </div>
            <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
          </div>
        </div>
      `,
    });

    // Send acknowledgement to the sender
    await resend.emails.send({
      from: 'Ubunifu Technologies <notifications@ubunifutech.com>',
      to: email,
      replyTo: 'info@ubunifutech.com',
      subject: `We received your message - Ubunifu Technologies`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
          <div style="background: #0a0a0a; padding: 32px; text-align: center;">
            <div style="display: inline-block; width: 40px; height: 40px; background: linear-gradient(135deg, #FF6B2C, #6D3FE8); border-radius: 10px; line-height: 40px; color: white; font-weight: 700; font-size: 18px;">U</div>
            <h2 style="color: #fafafa; margin: 16px 0 4px; font-size: 20px;">Thanks for reaching out!</h2>
          </div>
          <div style="padding: 32px;">
            <p style="color: #111827; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">Hi ${escapeHtml(name)},</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
              Thank you for contacting Ubunifu Technologies. We have received your message regarding <strong>"${escapeHtml(subject)}"</strong> and will get back to you as soon as possible.
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
              In the meantime, feel free to explore our products:
            </p>
            <div style="margin-bottom: 24px;">
              <a href="https://insight.ubunifutech.com" style="display: inline-block; padding: 10px 20px; background: #6D3FE8; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 8px;">Try Ubunifu Insight</a>
              <a href="https://sifa.ubunifutech.com" style="display: inline-block; padding: 10px 20px; background: transparent; color: #6D3FE8; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #6D3FE8;">Try Ubunifu Sifa</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Best regards,<br />
              <strong style="color: #111827;">Ubunifu Technologies</strong><br />
              Arusha, Tanzania<br />
              <a href="mailto:info@ubunifutech.com" style="color: #6D3FE8;">info@ubunifutech.com</a> · <a href="https://ubunifutech.com" style="color: #6D3FE8;">ubunifutech.com</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
