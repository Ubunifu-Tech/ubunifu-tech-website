import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/console/crypto';
import { MAX_TURNS_PER_CONVERSATION, runTurn } from '@/lib/console/agent';
import { ASSISTANT_SYSTEM, recordEnquiryTool } from '@/lib/console/assistant';

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
    return NextResponse.json(
      {
        error:
          'The assistant is not available right now. Email info@ubunifutech.com and a person will pick it up.',
      },
      { status: 503 },
    );
  }
}

async function handle(request: NextRequest) {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return NextResponse.json({ error: 'Expected a JSON request.' }, { status: 415 });
  }

  let payload: { message?: unknown };
  try {
    payload = (await request.json()) as { message?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (message.length < 1) {
    return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: 'That is longer than this window can take. Email info@ubunifutech.com instead.' },
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
    return NextResponse.json(
      {
        error:
          'That is a lot of questions for one hour. Email info@ubunifutech.com and a person will pick it up.',
      },
      { status: 429 },
    );
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
    return NextResponse.json(
      {
        error:
          'This has gone on long enough that it is better continued by a person. Email info@ubunifutech.com and somebody will pick it up from here.',
      },
      { status: 409 },
    );
  }

  const result = await runTurn({
    conversationId: conversation.id,
    kind: 'site_visitor',
    system: ASSISTANT_SYSTEM,
    userMessage: message,
    tools: [recordEnquiryTool],
    context: { conversationId: conversation.id, ip },
    // Short answers on purpose: this is a chat window, not a brochure.
    maxTokens: 2000,
  });

  const response = result.ok
    ? NextResponse.json({ reply: result.reply, sent: result.usedTools.includes('record_enquiry') })
    : NextResponse.json(
        {
          // What the visitor typed is already saved, so the fallback is a way
          // to reach a person rather than an apology.
          error: `${result.error} Email info@ubunifutech.com and a person will pick it up — what you have written here is already with us.`,
        },
        { status: 502 },
      );

  response.cookies.set(VISITOR_COOKIE, visitorKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VISITOR_TTL_DAYS * 24 * 60 * 60,
  });

  return response;
}

/** The thread so far, so a refresh does not lose the conversation. */
export async function GET() {
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
