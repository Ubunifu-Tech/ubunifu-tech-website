import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getClientActor, type ClientActor } from '@/lib/console/auth';
import { runTurn } from '@/lib/console/agent';
import { createPortalConversation, resolvePortalConversation } from '@/lib/console/conversations';
import { interimFailure } from '@/lib/console/assistant-copy';
import { allow } from '@/lib/console/rate-limit';
import {
  PORTAL_SYSTEM,
  handOff,
  portalBrief,
  raiseRequestTool,
} from '@/lib/console/portal-assistant';

/**
 * The portal assistant.
 *
 * Only for a signed-in, activated client contact, and only ever about their
 * own client: the brief is built from the session, never from the request.
 * Every failure answers with `fallback: true`, which turns the chat window
 * into a "send this to the team" form that needs no model at all.
 */

// One short turn, kept inside 50 seconds by the agent's deadline.
export const maxDuration = 60;

const MAX_MESSAGES_PER_HOUR = 40;
const MAX_MESSAGE_LENGTH = 2000;

function unavailable(error: string, status: number) {
  return NextResponse.json({ error, fallback: true }, { status });
}

function pagePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/portal[A-Za-z0-9/_-]{0,120}$/.test(value) ? value : null;
}

async function actorOrNull(): Promise<ClientActor | null> {
  const actor = await getClientActor();
  return actor && actor.isActivated ? actor : null;
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    console.error('Portal assistant failed', error);
    return unavailable('The assistant is not available right now. Send this to the team instead.', 503);
  }
}

async function handle(request: NextRequest) {
  const actor = await actorOrNull();
  if (!actor) return NextResponse.json({ error: 'Sign in again to carry on.' }, { status: 401 });

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

  // "Talk to a person": a request with the chat attached, no model involved.
  if (payload.handoff !== undefined) {
    if (!(await allow('portal-handoff', actor.id, { limit: 5, windowMinutes: 60 }))) {
      return NextResponse.json(
        { error: 'You have sent a few already. The team will reply in Requests.' },
        { status: 429 },
      );
    }
    const note =
      typeof payload.handoff === 'object' && payload.handoff !== null
        ? String((payload.handoff as { details?: unknown }).details ?? '').trim().slice(0, 4000)
        : '';
    // A typed note is a new request; pressing through with nothing typed
    // means this chat, whether or not it became a request already.
    const current = await resolvePortalConversation(actor, { forWrite: false });
    const conversation = note && current?.status === 'converted' ? null : current;
    if (conversation?.ticket) {
      return NextResponse.json({
        reference: conversation.ticket.reference,
        url: `/portal/requests/${conversation.ticket.reference}`,
        existing: true,
      });
    }
    if (!note && !conversation?.messageCount) {
      return NextResponse.json({ error: 'Say what you need first.' }, { status: 400 });
    }
    const ticket = await handOff({
      actor,
      conversationId: conversation?.id ?? null,
      subject: note.split('\n')[0]!.slice(0, 80) || 'Question from the portal chat',
      details: note || 'Asked to talk to a person.',
    });
    return NextResponse.json({
      reference: ticket.reference,
      url: `/portal/requests/${ticket.reference}`,
      existing: false,
    });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (message.length < 1) {
    return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'That is too long for the chat. Try a shorter message.' }, { status: 413 });
  }

  // Counted before the model is asked, so messages sent together cannot all
  // go through on the same count.
  if (!(await allow('portal-assistant', actor.id, { limit: MAX_MESSAGES_PER_HOUR, windowMinutes: 60 }))) {
    return unavailable('That is a lot of questions for one hour. Send this to the team instead.', 429);
  }

  // Carries on the chat, including one that became a request today; a
  // finished one is closed here and a fresh one started, never refused.
  const current = await resolvePortalConversation(actor, { forWrite: true });
  const conversation =
    current ?? (await createPortalConversation(actor, request.headers.get('user-agent')));
  const fresh = !current && payload.hadThread === true;

  const page = pagePath(payload.page);
  const result = await runTurn({
    conversationId: conversation.id,
    kind: 'portal_client',
    system: PORTAL_SYSTEM,
    brief: await portalBrief(actor),
    note: page ? `They are looking at ${page}.` : undefined,
    userMessage: message,
    tools: [raiseRequestTool],
    context: { actor, conversationId: conversation.id },
    effort: 'low',
    maxTokens: 4096,
    maxRounds: 3,
    timeoutMs: 20_000,
    deadlineMs: 50_000,
  });

  if (!result.ok) {
    return unavailable(`${interimFailure(result.cause)} You can send this to the team instead.`, 502);
  }
  return NextResponse.json({
    reply: result.reply,
    sent: result.used.some((tool) => tool.name === 'raise_request'),
    ...(fresh ? { fresh: true } : {}),
  });
}

/** The thread so far, so moving between pages does not lose it. */
export async function GET() {
  try {
    const actor = await actorOrNull();
    if (!actor) return NextResponse.json({ messages: [] }, { status: 401 });

    const current = await resolvePortalConversation(actor, { forWrite: false });
    const conversation = current
      ? await db.conversation.findUnique({
          where: { id: current.id },
          select: {
            ticket: { select: { reference: true } },
            messages: {
              where: { role: { in: ['user', 'assistant'] } },
              orderBy: { createdAt: 'asc' },
              select: { id: true, role: true, content: true },
            },
          },
        })
      : null;

    return NextResponse.json({
      sent: Boolean(conversation?.ticket),
      reference: conversation?.ticket?.reference ?? null,
      messages: (conversation?.messages ?? [])
        .filter((entry) => entry.content.trim().length > 0)
        .map((entry) => ({ id: entry.id, role: entry.role, content: entry.content })),
    });
  } catch (error) {
    console.error('Portal assistant history failed', error);
    return NextResponse.json({ messages: [] });
  }
}
