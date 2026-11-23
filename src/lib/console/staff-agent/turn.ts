import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { runTurn, type AgentFailure, type AgentTool } from '@/lib/console/agent';
import type { StaffActor } from '@/lib/console/auth';
import { hashToken } from '@/lib/console/crypto';
import { PLAN_ACTIONS } from './actions';
import { recordOnPage, type Card, type ReadRef } from './cards';
import { LOOKUPS, pageRecord, type StaffContext } from './lookups';
import { houseInstructions, notesBrief } from './memory';
import { MAX_STEPS, planNote, proposePlan, type PlanView } from './plan';
import { CONSOLE_SYSTEM, consoleBrief, consolePage, todayLine } from './prompt';

/**
 * One turn of the console assistant: its tools, its thread and what the person
 * is told when it cannot answer.
 */

/**
 * The one tool that leads to a change. Its schema is written from the action
 * list, so an action added there is offered here and nowhere else needs to
 * know. A step is one of the actions with that action's own fields.
 */
const proposePlanTool: AgentTool<StaffContext> = {
  name: 'propose_plan',
  description: `Lay out a set of changes for the person to confirm. Nothing is changed by calling this: they see the steps as a table and press Confirm or Discard. Put every step of the job in one call, in the order it must happen, up to ${MAX_STEPS}. Calling it again replaces a plan that is still waiting.

The actions:
${PLAN_ACTIONS.map((action) => `- ${action.name}: ${action.description}`).join('\n')}`,
  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'One line saying what the plan is for, such as "Set up Usambara Destination as a paying client".',
      },
      steps: {
        type: 'array',
        description: 'The steps in order. Each has an action and that action\'s fields.',
        items: {
          anyOf: PLAN_ACTIONS.map((action) => ({
            type: 'object',
            properties: { action: { type: 'string', enum: [action.name] }, ...action.properties },
            required: ['action', ...action.required],
          })),
        },
      },
    },
    required: ['summary', 'steps'],
  },
  run: async (input, context) => {
    const { summary, steps } = (input ?? {}) as { summary?: unknown; steps?: unknown };
    const proposed = await proposePlan({
      staff: context.staff,
      conversationId: context.conversationId,
      summary,
      steps,
    });
    if (!proposed.ok) {
      return {
        result: `Not laid out. Nothing is waiting for the person.\n${proposed.problems.map((problem) => `- ${problem}`).join('\n')}`,
        done: false,
      };
    }
    return {
      result: `Laid out as a table of ${proposed.plan.steps.length} step${proposed.plan.steps.length === 1 ? '' : 's'}, waiting for the person to press Confirm. Nothing has been changed yet. Say briefly what it will do and that it needs confirming.`,
      meta: { planId: proposed.plan.id } satisfies Prisma.InputJsonValue,
    };
  },
};

export const CONSOLE_TOOLS = [...LOOKUPS, proposePlanTool];

/** The person's open chat, or a new one. One at a time each, until they start afresh. */
export async function consoleConversation(staff: StaffActor, create: boolean): Promise<string | null> {
  const open = await db.conversation.findFirst({
    where: { kind: 'console_staff', actorType: 'staff', actorId: staff.id, status: 'open' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (open || !create) return open?.id ?? null;
  const created = await db.conversation.create({
    data: { kind: 'console_staff', actorType: 'staff', actorId: staff.id, title: `Console chat, ${staff.name}` },
    select: { id: true },
  });
  return created.id;
}

/** Closes the person's chat, so the next message starts a new one. A plan still waiting goes with it. */
export async function closeConsoleConversation(staff: StaffActor): Promise<void> {
  const open = await db.conversation.findMany({
    where: { kind: 'console_staff', actorType: 'staff', actorId: staff.id, status: 'open' },
    select: { id: true },
  });
  const ids = open.map((conversation) => conversation.id);
  if (ids.length === 0) return;
  await db.$transaction([
    db.assistantPlan.updateMany({
      where: { conversationId: { in: ids }, status: 'pending' },
      data: { status: 'discarded', decidedAt: new Date() },
    }),
    db.conversation.updateMany({ where: { id: { in: ids } }, data: { status: 'closed' } }),
  ]);
}

export type ConsoleTurn =
  | {
      ok: true;
      reply: string;
      plan: PlanView | null;
      /** What it showed this turn, each written from its record. */
      cards: Card[];
      /** The records it read to answer, for the person to see what it went on. */
      read: ReadRef[];
    }
  | { ok: false; message: string; full?: boolean };

/** What the tools of one turn left for the window: cards shown and records read, once each. */
export function shownAndRead(used: { name: string; meta: unknown }[]): { cards: Card[]; read: ReadRef[] } {
  const cards: Card[] = [];
  const read = new Map<string, ReadRef>();
  for (const tool of used) {
    const meta = (tool.meta ?? {}) as { card?: Card; read?: ReadRef };
    if (meta.card) cards.push(meta.card);
    if (meta.read) read.set(meta.read.href, meta.read);
  }
  return { cards, read: [...read.values()] };
}

/**
 * Brings one of the person's earlier chats back as the open one. The chat
 * that was open is closed, and a plan still waiting in it goes with it, as
 * when a new chat is started.
 */
export async function resumeConsoleConversation(staff: StaffActor, conversationId: string): Promise<boolean> {
  const chat = await db.conversation.findFirst({
    where: { id: conversationId, kind: 'console_staff', actorType: 'staff', actorId: staff.id },
    select: { id: true, status: true },
  });
  if (!chat) return false;
  if (chat.status === 'open') return true;
  await closeConsoleConversation(staff);
  await db.conversation.update({ where: { id: chat.id }, data: { status: 'open' } });
  return true;
}

const FAILURE: Record<AgentFailure, string> = {
  declined: 'The assistant declined that request.',
  unavailable: 'The assistant could not finish that. The reason is in Activity.',
  not_configured: 'The assistant is not set up here yet. An owner can see why in Activity.',
  busy: 'The assistant is busy. Try again in a minute.',
  stuck: 'The assistant could not finish that. Try asking for one thing at a time.',
  too_long: 'This chat has grown too long. Start a new chat to carry on.',
  cut_short: 'That reply ran out of room. Try asking for one thing at a time.',
  empty: 'That reply did not come through. Try again.',
  thread_full: 'This chat is full. Start a new chat to carry on.',
  closed: 'That chat was closed. Send the message again to start a new one.',
  missing: 'That chat was closed. Send the message again to start a new one.',
};

export async function runConsoleTurn(input: {
  staff: StaffActor;
  message: string;
  page: unknown;
  /** Only for the check script: a thread of its own, so a person's open chat is never touched. */
  conversationId?: string;
}): Promise<ConsoleTurn> {
  const { staff } = input;
  const conversationId = input.conversationId ?? (await consoleConversation(staff, true))!;
  const page = consolePage(input.page);
  // The record on their screen, so "this" needs no lookup and no question.
  const onPage = await pageRecord(staff, recordOnPage(page)).catch(() => null);
  const [brief, notes, house] = await Promise.all([
    consoleBrief(staff),
    notesBrief(staff),
    houseInstructions('console_staff'),
  ]);
  // A chat is named after what it began with, so it can be found again.
  await db.conversation.updateMany({
    where: { id: conversationId, messageCount: 0 },
    data: { title: input.message.replace(/\s+/g, ' ').trim().slice(0, 90) },
  });

  const result = await runTurn<StaffContext>({
    conversationId,
    kind: 'console_staff',
    system: CONSOLE_SYSTEM,
    house,
    brief: notes ? `${brief}\n\n${notes}` : brief,
    // After the cached blocks and never stored: the date, the page they are
    // on with its record, and where the last plan stands now that buttons may
    // have been pressed.
    note: `${todayLine()}${page ? ` They are looking at ${page}.` : ''}${
      onPage ? `\n\nTHE RECORD ON THEIR SCREEN (${onPage.label})\n${onPage.text}` : ''
    }\n\n${await planNote(conversationId)}`,
    userMessage: input.message,
    authorId: staff.id,
    tools: CONSOLE_TOOLS,
    context: { staff, conversationId },
    effort: 'medium',
    maxTokens: 24_000,
    // A few lookups, a plan, perhaps a corrected plan, then the reply.
    maxRounds: 8,
    timeoutMs: 120_000,
    deadlineMs: 270_000,
    // The window gives the words back to send again whenever no answer came.
    withdrawOn: Object.keys(FAILURE) as AgentFailure[],
    userRef: hashToken(staff.id).slice(0, 32),
  });

  if (!result.ok) {
    return {
      ok: false,
      message: FAILURE[result.cause],
      ...(result.cause === 'thread_full' || result.cause === 'too_long' ? { full: true } : {}),
    };
  }

  // The plan as stored, not as the model described it. Only one can be waiting.
  const planned = [...result.used].reverse().find((tool) => tool.name === 'propose_plan');
  const planId = (planned?.meta as { planId?: string } | null)?.planId;
  const plan = planId
    ? await db.assistantPlan.findFirst({
        where: { id: planId, status: 'pending' },
        select: { id: true, summary: true, steps: true },
      })
    : null;

  return {
    ok: true,
    reply: result.reply,
    ...shownAndRead(result.used),
    plan: plan
      ? {
          id: plan.id,
          status: 'pending',
          summary: plan.summary,
          steps: (plan.steps as unknown as { view: PlanView['steps'][number] }[]).map((step) => step.view),
          outcomes: null,
        }
      : null,
  };
}
