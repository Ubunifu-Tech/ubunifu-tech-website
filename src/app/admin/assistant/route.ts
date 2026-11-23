import { NextResponse, type NextRequest } from 'next/server';
import { staffForAction, type StaffActor } from '@/lib/console/auth';
import { allow } from '@/lib/console/rate-limit';
import { readJsonBody, sameOrigin } from '@/lib/console/request-guards';
import { threadItems } from '@/lib/console/staff-agent/history';
import { confirmPlan, discardPlan } from '@/lib/console/staff-agent/plan';
import {
  closeConsoleConversation,
  consoleConversation,
  resumeConsoleConversation,
  runConsoleTurn,
} from '@/lib/console/staff-agent/turn';

/**
 * The console assistant, reached as admin.ubunifutech.com/assistant.
 *
 * On the console host only: the public host serves nothing under /admin, so
 * no visitor can reach this at all, and a staff session is checked here as on
 * every console page. Who is asking is always read from that session. The
 * request says what they typed or which plan they are confirming, and never
 * who they are.
 */

// Lookups, a plan and a reply, kept inside this by the agent's own deadline.
export const maxDuration = 300;

const MAX_MESSAGE_LENGTH = 6000;
const MAX_BODY_BYTES = 32_000;
/** Generous for a person at work, and a ceiling on what one session can spend. */
const TURNS_PER_HOUR = { limit: 80, windowMinutes: 60 };

const SIGNED_OUT = { error: 'You were signed out. Sign in again, then send that once more.', signedOut: true };

/**
 * A browser sends Origin with every POST. One with none, or from anywhere but
 * the console itself, is refused before the session is read, so no other site
 * can make a signed-in person's browser confirm a plan.
 */
function fromConsole(request: NextRequest): boolean {
  return request.headers.has('origin') && sameOrigin(request);
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    console.error('Console assistant failed', error);
    return NextResponse.json({ error: 'That did not go through. Try again.' }, { status: 500 });
  }
}

async function handle(request: NextRequest) {
  if (!fromConsole(request)) return new NextResponse(null, { status: 403 });

  const staff = await staffForAction();
  if (!staff) return NextResponse.json(SIGNED_OUT, { status: 401 });

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const payload: {
    message?: unknown;
    page?: unknown;
    confirm?: unknown;
    discard?: unknown;
    reset?: unknown;
    resume?: unknown;
  } = body.value;

  if (typeof payload.confirm === 'string') return decided(await confirmPlan(staff, payload.confirm));
  if (typeof payload.discard === 'string') return decided(await discardPlan(staff, payload.discard));
  if (payload.reset === true) {
    await closeConsoleConversation(staff);
    return NextResponse.json({ reset: true });
  }
  // Carrying on an earlier chat: it becomes the open one, and the panel reads it back.
  if (typeof payload.resume === 'string') {
    if (!(await resumeConsoleConversation(staff, payload.resume))) {
      return NextResponse.json({ error: 'That chat is not one of yours.' }, { status: 404 });
    }
    return NextResponse.json({ resumed: true });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (message.length < 1) return NextResponse.json({ error: 'Say what you need first.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'That is too long for the chat. Try a shorter message.' }, { status: 413 });
  }
  if (!(await allow('console-assistant', staff.id, TURNS_PER_HOUR))) {
    return NextResponse.json({ error: 'That is a lot for one hour. Try again a little later.' }, { status: 429 });
  }

  const turn = await runConsoleTurn({ staff, message, page: payload.page });
  if (!turn.ok) return NextResponse.json({ error: turn.message, full: turn.full ?? false }, { status: 502 });
  return NextResponse.json({ reply: turn.reply, plan: turn.plan, cards: turn.cards, read: turn.read });
}

function decided(decision: Awaited<ReturnType<typeof confirmPlan>>) {
  if (!decision.ok) return NextResponse.json({ error: decision.message }, { status: 409 });
  return NextResponse.json({ plan: decision.plan });
}

/** The person's open chat, so moving between pages or reloading does not lose it. */
export async function GET() {
  try {
    const staff = await staffForAction();
    if (!staff) return NextResponse.json(SIGNED_OUT, { status: 401 });
    return NextResponse.json(
      { items: await openThread(staff) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Console assistant history failed', error);
    return NextResponse.json({ items: [] });
  }
}

async function openThread(staff: StaffActor) {
  const conversationId = await consoleConversation(staff, false);
  return conversationId ? threadItems(conversationId) : [];
}
