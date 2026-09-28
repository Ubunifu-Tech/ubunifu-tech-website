import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/console/crypto';
import { runTurn } from '@/lib/console/agent';
import { createSiteConversation, resolveSiteConversation } from '@/lib/console/conversations';
import { LIMIT_COPY, SITE_FAILURE_COPY } from '@/lib/console/assistant-copy';
import {
  ASSISTANT_SYSTEM,
  EMAIL_OK,
  mayHandOff,
  passToTeam,
  recordEnquiryTool,
} from '@/lib/console/assistant';
import {
  ASSISTANT_SITE_PER_DAY,
  ASSISTANT_SITE_PER_HOUR,
  allow,
  noteCapReached,
  requestIp,
} from '@/lib/console/rate-limit';
import { siteKnowledge } from '@/lib/console/site-knowledge';
import { formatDate, parseDateInput, todayInput } from '@/lib/console/money';

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

// One short turn, kept inside 50 seconds by the agent's deadline.
export const maxDuration = 60;

const VISITOR_COOKIE = 'ubu_visitor';
const VISITOR_TTL_DAYS = 30;

/** Per visitor, so one person cannot spend the month's budget in an afternoon. */
const MAX_MESSAGES_PER_HOUR = 30;
/** Per address, which catches a script that clears its cookie between turns. */
const MAX_MESSAGES_PER_IP_PER_HOUR = 90;

const MAX_MESSAGE_LENGTH = 2000;

/**
 * A refusal says one sentence. `fallback` opens the window's message form
 * under it, so where the assistant cannot help the visitor still has a way
 * to reach a person without leaving the page.
 */
function refused(copy: { text: string; fallback: boolean }, status: number, extra?: object) {
  return NextResponse.json({ error: copy.text, fallback: copy.fallback, ...extra }, { status });
}

const HANDOFF_REFUSED = {
  error: 'That did not go through. Email info@ubunifutech.com and we will pick it up.',
  email: 'info@ubunifutech.com',
};

/** The visitor's key, on every answer to a message, so a refresh carries on the same thread. */
function withVisitor(response: NextResponse, visitorKey: string): NextResponse {
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
 * A subject line from what somebody wrote: their first sentence when it is a
 * reasonable length, otherwise the start of it, ended at a word.
 */
function headline(text: string, max = 80): string {
  const first = text.split('\n')[0]?.trim() ?? '';
  const sentence = first.match(/^.+?[.?!](?=\s|$)/)?.[0] ?? first;
  const pick = sentence.length >= 12 ? sentence : first;
  if (pick.length <= max) return pick;
  const cut = pick.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

/** A site path, and nothing else, so it is safe to show the model. */
function pagePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/[A-Za-z0-9/_#-]{0,120}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    // A public endpoint never returns a stack. Whatever broke, the visitor
    // gets a way to reach a person.
    console.error('Assistant failed', error);
    return refused(SITE_FAILURE_COPY.unavailable, 503);
  }
}

async function handle(request: NextRequest) {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return NextResponse.json({ error: 'Expected a JSON request.' }, { status: 415 });
  }

  let payload: { message?: unknown; page?: unknown; handoff?: unknown; hadThread?: unknown };
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

  const ip = requestIp(request.headers);
  // Counted before the model is asked, so messages sent together cannot all
  // go through on the same count.
  const [byVisitor, byAddress] = await Promise.all([
    allow('assistant:visitor', visitorKey, { limit: MAX_MESSAGES_PER_HOUR, windowMinutes: 60 }),
    allow('assistant:ip', ip, { limit: MAX_MESSAGES_PER_IP_PER_HOUR, windowMinutes: 60 }),
  ]);

  if (!byVisitor || !byAddress) return withVisitor(refused(LIMIT_COPY.visitor, 429), visitorKey);

  // The whole site's ceiling, whoever is asking: past it the chat is paused
  // and visitors get the message form. Noted once an hour on Activity.
  const [siteHour, siteDay] = await Promise.all([
    allow('assistant:site', 'all', ASSISTANT_SITE_PER_HOUR),
    allow('assistant:site-day', 'all', ASSISTANT_SITE_PER_DAY),
  ]);
  if (!siteHour || !siteDay) {
    await noteCapReached(
      'assistant:site',
      'assistant.site_cap_reached',
      'The website chat hit its limit for now. Visitors are offered the message form instead.',
      60,
    );
    return withVisitor(refused(LIMIT_COPY.site, 429), visitorKey);
  }

  // One thread per visitor. A finished one (full, quiet for a month, or its
  // enquiry settled) is closed here and a fresh one started, never refused.
  const resolved = await resolveSiteConversation(visitorKey, { forWrite: true });
  const conversation =
    resolved.conversation ??
    (await createSiteConversation({
      visitorKey,
      ip,
      userAgent: request.headers.get('user-agent'),
    }));
  // The window was showing an earlier thread, and this message began a new one.
  const fresh = !resolved.conversation && payload.hadThread === true;

  // The page and today's date go in the uncached note, so the knowledge
  // before it is the same for every visitor and stays cached.
  const page = pagePath(payload.page);
  const today = formatDate(parseDateInput(todayInput())!);
  const result = await runTurn({
    conversationId: conversation.id,
    kind: 'site_visitor',
    system: ASSISTANT_SYSTEM,
    shared: await siteKnowledge(),
    note: `${page ? `The visitor is on ${page}. ` : ''}Today in Tanzania is ${today}.`,
    userMessage: message,
    tools: [recordEnquiryTool],
    context: { conversationId: conversation.id, ip, previous: resolved.previous },
    effort: 'low',
    maxTokens: 4096,
    maxRounds: 3,
    timeoutMs: 20_000,
    deadlineMs: 50_000,
    userRef: hashToken(visitorKey).slice(0, 32),
  });

  // CH14: visitor chats that never became an enquiry are pruned from here.

  if (!result.ok) {
    // What the visitor typed is saved, so the answer is one sentence and,
    // where the assistant cannot help, a way to reach a person.
    return withVisitor(
      refused(SITE_FAILURE_COPY[result.cause], 502, fresh ? { fresh: true } : undefined),
      visitorKey,
    );
  }

  const handed = result.used.find((tool) => tool.name === 'record_enquiry')?.meta as
    | { outcome: 'created' | 'appended'; acknowledged: boolean }
    | undefined;
  return withVisitor(
    NextResponse.json({
      reply: result.reply,
      handoff: handed ? { outcome: handed.outcome, acknowledged: handed.acknowledged } : null,
      // Kept for the window until it reads `handoff`.
      sent: Boolean(handed),
      ...(fresh ? { fresh: true } : {}),
    }),
    visitorKey,
  );
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

  const ip = requestIp(request.headers);
  if (!(await mayHandOff(ip, email))) return NextResponse.json(HANDOFF_REFUSED, { status: 429 });

  const jar = await cookies();
  const visitorKey = jar.get(VISITOR_COOKIE)?.value;
  const { conversation, previous } = visitorKey
    ? await resolveSiteConversation(visitorKey, { forWrite: true })
    : { conversation: null, previous: null };

  const handed = await passToTeam({
    conversationId: conversation?.id ?? null,
    name,
    email,
    subject: headline(details) || 'A message from the website chat',
    details,
    ip,
    previous,
  });

  return NextResponse.json({
    sent: true,
    outcome: handed.outcome,
    acknowledged: handed.acknowledged,
  });
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

  // Shows the thread the next message would continue, and nothing once it is finished.
  const { conversation: current } = await resolveSiteConversation(visitorKey, { forWrite: false });
  const conversation = current
    ? await db.conversation.findUnique({
        where: { id: current.id },
        select: {
          enquiryId: true,
          messages: {
            where: { role: { in: ['user', 'assistant'] } },
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, content: true },
          },
        },
      })
    : null;

  return NextResponse.json({
    // The resolver lets go of a thread whose enquiry was settled or removed,
    // so an enquiry here is one the team is still working.
    sent: Boolean(conversation?.enquiryId),
    messages: (conversation?.messages ?? [])
      .filter((entry) => entry.content.trim().length > 0)
      .map((entry) => ({ id: entry.id, role: entry.role, content: entry.content })),
  });
}
