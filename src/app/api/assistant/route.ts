import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/console/crypto';
import { MAX_TURNS_PER_CONVERSATION, runTurn } from '@/lib/console/agent';
import {
  ASSISTANT_SYSTEM,
  EMAIL_OK,
  passToTeam,
  recordEnquiryTool,
} from '@/lib/console/assistant';
import { allow } from '@/lib/console/rate-limit';
import { siteBrief } from '@/lib/console/site-brief';

/**
 * The website assistant.
 *
 * A public endpoint that costs real money per request, so it is rate limited
 * before anything else happens, and every limit is counted in the database
 * rather than in memory — on Vercel each function instance keeps its own memory
 * and the real limit would be the cap multiplied by however many are warm.
 *
 * The conversation is keyed by a cookie so a visitor can refresh and carry on.
 * That key is random and means nothing on its own; it is not tied to a person
 * until they choose to give a name and an email.
 */

const VISITOR_COOKIE = 'ubu_visitor';
const VISITOR_TTL_DAYS = 30;

/** Per visitor, so one person cannot spend the month's budget in an afternoon. */
const MAX_MESSAGES_PER_HOUR = 30;
/** Per address, which catches a script that clears its cookie between turns. */
const MAX_MESSAGES_PER_IP_PER_HOUR = 90;

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Every refusal carries `fallback: true`, which turns the chat window into a
 * short message form. However the assistant fails, the visitor still has a
 * way to reach a person without leaving the page.
 */
function unavailable(error: string, status: number) {
  return NextResponse.json({ error, fallback: true }, { status });
}

/** A site path, and nothing else, so it is safe to show the model. */
function pagePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/[A-Za-z0-9/_#-]{0,120}$/.test(value) ? value : null;
}

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    // A public endpoint never returns a stack. Whatever broke, the visitor
    // gets a way to reach a person.
    console.error('Assistant failed', error);
    return unavailable('The assistant is not available right now. Leave us a message instead.', 503);
  }
}

async function handle(request: NextRequest) {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return NextResponse.json({ error: 'Expected a JSON request.' }, { status: 415 });
  }

  let payload: { message?: unknown; page?: unknown; handoff?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (payload.handoff !== undefined) return handoff(request, payload.handoff);

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (message.length < 1) {
    return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: 'That is longer than this window can take. Try a shorter message.' },
      { status: 413 },
    );
  }

  const jar = await cookies();
  const existingKey = jar.get(VISITOR_COOKIE)?.value;
  const visitorKey = existingKey && /^[A-Za-z0-9_-]{16,64}$/.test(existingKey)
    ? existingKey
    : generateToken();

  const ip = clientIp(request);
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const [byVisitor, byAddress] = await Promise.all([
    db.conversationMessage.count({
      where: {
        role: 'user',
        createdAt: { gte: since },
        conversation: { visitorKey },
      },
    }),
    ip
      ? db.conversationMessage.count({
          where: { role: 'user', createdAt: { gte: since }, conversation: { ip } },
        })
      : Promise.resolve(0),
  ]);

  if (byVisitor >= MAX_MESSAGES_PER_HOUR || byAddress >= MAX_MESSAGES_PER_IP_PER_HOUR) {
    return unavailable('That is a lot of questions for one hour. Leave us a message instead.', 429);
  }

  // One open conversation per visitor. A converted one stays open so they can
  // keep talking after their enquiry has been sent.
  let conversation = await db.conversation.findFirst({
    where: { visitorKey, kind: 'site_visitor', status: { in: ['open', 'converted'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, messageCount: true },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        kind: 'site_visitor',
        visitorKey,
        ip,
        userAgent: request.headers.get('user-agent'),
      },
      select: { id: true, messageCount: true },
    });
  }

  if (conversation.messageCount >= MAX_TURNS_PER_CONVERSATION) {
    return unavailable(
      'This is better continued by a person. Leave us a message and somebody will pick it up.',
      409,
    );
  }

  const page = pagePath(payload.page);
  const result = await runTurn({
    conversationId: conversation.id,
    kind: 'site_visitor',
    system: ASSISTANT_SYSTEM,
    brief: await siteBrief(),
    note: page ? `The visitor is on the page ${page}.` : undefined,
    userMessage: message,
    tools: [recordEnquiryTool],
    context: { conversationId: conversation.id, ip },
    // Short answers on purpose: this is a chat window, not a brochure.
    maxTokens: 2000,
  });

  const response = result.ok
    ? NextResponse.json({ reply: result.reply, sent: result.usedTools.includes('record_enquiry') })
    : // What the visitor typed is saved, and the window offers a message form,
      // so the answer is a way to reach a person rather than an apology.
      unavailable(`${result.error} Leave us a message and a person will reply.`, 502);

  response.cookies.set(VISITOR_COOKIE, visitorKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VISITOR_TTL_DAYS * 24 * 60 * 60,
  });

  return response;
}

/**
 * "Talk to a person", straight from the chat window, with no model involved.
 * It is the way through when the assistant is down, over its limit, or simply
 * not what somebody wants, and it keeps the chat attached for whoever reads it.
 */
async function handoff(request: NextRequest, raw: unknown) {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

  // A field people cannot see. Anything that fills it in is a script, and is
  // told it worked so it has no reason to try again.
  if (text(input.website, 200)) return NextResponse.json({ sent: true });

  const name = text(input.name, 120);
  const email = text(input.email, 254).toLowerCase();
  const details = text(input.details, 5000);

  if (name.length < 2) return NextResponse.json({ error: 'Add your name.' }, { status: 400 });
  if (!EMAIL_OK.test(email)) {
    return NextResponse.json({ error: 'Add an email address we can reply to.' }, { status: 400 });
  }
  if (details.length < 10) {
    return NextResponse.json({ error: 'Say a little about what you need.' }, { status: 400 });
  }

  const ip = clientIp(request);
  const [byAddress, byEmail] = await Promise.all([
    allow('site-handoff:ip', ip, { limit: 5, windowMinutes: 60 }),
    allow('site-handoff:email', email, { limit: 3, windowMinutes: 60 }),
  ]);
  if (!byAddress || !byEmail) {
    return NextResponse.json(
      { error: 'We already have your message. Somebody will reply by email.' },
      { status: 429 },
    );
  }

  const jar = await cookies();
  const visitorKey = jar.get(VISITOR_COOKIE)?.value;
  const conversation = visitorKey
    ? await db.conversation.findFirst({
        where: { visitorKey, kind: 'site_visitor', status: { in: ['open', 'converted'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
    : null;

  await passToTeam({
    conversationId: conversation?.id ?? null,
    name,
    email,
    subject: details.split('\n')[0].slice(0, 80) || 'A message from the website chat',
    details,
    ip,
  });

  return NextResponse.json({ sent: true });
}

/** The thread so far, so a refresh does not lose the conversation. */
export async function GET() {
  try {
    return await history();
  } catch (error) {
    console.error('Assistant history failed', error);
    return NextResponse.json({ messages: [] });
  }
}

async function history() {
  const jar = await cookies();
  const visitorKey = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorKey) return NextResponse.json({ messages: [] });

  const conversation = await db.conversation.findFirst({
    where: { visitorKey, kind: 'site_visitor', status: { in: ['open', 'converted'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      messages: {
        where: { role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true },
      },
    },
  });

  return NextResponse.json({
    sent: conversation?.status === 'converted',
    messages: (conversation?.messages ?? [])
      .filter((entry) => entry.content.trim().length > 0)
      .map((entry) => ({ id: entry.id, role: entry.role, content: entry.content })),
  });
}
