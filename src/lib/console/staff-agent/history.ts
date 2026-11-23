import 'server-only';
import { db } from '@/lib/db';
import type { StaffActor } from '@/lib/console/auth';
import type { Card, ReadRef } from './cards';
import { plansOf, type PlanView } from './plan';

/**
 * Copilot's record: every chat, what it read and showed in each, every plan
 * it laid out and what came of it, and what it has cost. Chats are kept when
 * a new one is started, so nothing it said or did is ever out of reach.
 *
 * A person sees their own chats. An owner sees everyone's, because a tool
 * that can prepare changes to client records has to be answerable to
 * somebody, and the page says so to both.
 */

export type ThreadItem =
  | { type: 'message'; id: string; role: 'user' | 'assistant'; content: string; at: number; cards: Card[]; read: ReadRef[] }
  | { type: 'plan'; at: number; plan: PlanView };

/** May this person open this chat: it is theirs, or they are an owner. */
const mayRead = (staff: StaffActor, chat: { actorId: string | null }) =>
  chat.actorId === staff.id || staff.role === 'owner';

/** One chat as it is shown: what was said, with what each reply read and showed, and its plans in place. */
export async function threadItems(conversationId: string): Promise<ThreadItem[]> {
  const [rows, plans] = await Promise.all([
    db.conversationMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true, toolResult: true, createdAt: true },
    }),
    plansOf(conversationId),
  ]);

  const said: Extract<ThreadItem, { type: 'message' }>[] = [];
  let cards: Card[] = [];
  let read = new Map<string, ReadRef>();
  for (const row of rows) {
    if (row.role === 'user') {
      cards = [];
      read = new Map();
      said.push({ type: 'message', id: row.id, role: 'user', content: row.content, at: row.createdAt.getTime(), cards: [], read: [] });
      continue;
    }
    if (row.role === 'tool') {
      const meta = (row.toolResult ?? {}) as { card?: Card; read?: ReadRef };
      if (meta.card) cards.push(meta.card);
      if (meta.read) read.set(meta.read.href, meta.read);
      continue;
    }
    if (row.role !== 'assistant' || row.content.trim().length === 0) continue;
    said.push({
      type: 'message',
      id: row.id,
      role: 'assistant',
      content: row.content,
      at: row.createdAt.getTime(),
      cards,
      read: [...read.values()],
    });
    cards = [];
    read = new Map();
  }

  // A plan is stored a moment before the reply that introduces it. It is
  // shown after that reply, as it was when it first appeared.
  const replyAfter = (at: number) =>
    said.find((message) => message.role === 'assistant' && message.at >= at)?.at ?? at;
  return [
    ...said,
    // A plan nobody acted on, replaced by a later one, is noise on a reload.
    ...plans
      .filter((plan) => plan.status !== 'superseded')
      .map(({ createdAt, ...plan }) => ({ type: 'plan' as const, at: replyAfter(createdAt.getTime()) + 0.5, plan })),
  ].sort((a, b) => a.at - b.at);
}

export type ChatRow = {
  id: string;
  title: string;
  open: boolean;
  by: string;
  mine: boolean;
  startedAt: Date;
  lastAt: Date;
  turns: number;
  plans: number;
  carriedOut: number;
};

const CHATS = { kind: 'console_staff', actorType: 'staff' } as const;

/** Chats, newest first: the person's own, or for an owner asking, everyone's. */
export async function chatsFor(
  staff: StaffActor,
  options: { everyone?: boolean; skip?: number; take?: number } = {},
): Promise<{ rows: ChatRow[]; total: number }> {
  const everyone = Boolean(options.everyone) && staff.role === 'owner';
  const where = { ...CHATS, messageCount: { gt: 0 }, ...(everyone ? {} : { actorId: staff.id }) };
  const [chats, total] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip: options.skip ?? 0,
      take: options.take ?? 30,
      select: {
        id: true,
        title: true,
        status: true,
        actorId: true,
        createdAt: true,
        lastMessageAt: true,
        plans: { select: { status: true } },
        _count: { select: { messages: { where: { role: 'user' } } } },
      },
    }),
    db.conversation.count({ where }),
  ]);
  const people = await namesOf(chats.map((chat) => chat.actorId));
  return {
    total,
    rows: chats.map((chat) => ({
      id: chat.id,
      title: chat.title?.trim() || 'Untitled chat',
      open: chat.status === 'open',
      by: people.get(chat.actorId ?? '') ?? 'Someone who has left',
      mine: chat.actorId === staff.id,
      startedAt: chat.createdAt,
      lastAt: chat.lastMessageAt ?? chat.createdAt,
      turns: chat._count.messages,
      plans: chat.plans.filter((plan) => plan.status !== 'superseded').length,
      carriedOut: chat.plans.filter((plan) => plan.status === 'done' || plan.status === 'stopped').length,
    })),
  };
}

/** One chat in full, for whoever may read it. Null when it is not theirs to see. */
export async function chatFor(staff: StaffActor, id: string) {
  const chat = await db.conversation.findFirst({
    where: { id, ...CHATS },
    select: {
      id: true,
      title: true,
      status: true,
      actorId: true,
      createdAt: true,
      lastMessageAt: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
    },
  });
  if (!chat || !mayRead(staff, chat)) return null;
  const people = await namesOf([chat.actorId]);
  return {
    ...chat,
    title: chat.title?.trim() || 'Untitled chat',
    by: people.get(chat.actorId ?? '') ?? 'Someone who has left',
    mine: chat.actorId === staff.id,
    items: await threadItems(chat.id),
  };
}

export type RunRow = {
  id: string;
  chatId: string;
  summary: string;
  status: PlanView['status'];
  by: string;
  at: Date;
  decidedAt: Date | null;
  steps: number;
  done: number;
  /** What it made or changed, each with where to see it. */
  outcomes: { label: string; summary: string; href?: string; failed?: boolean }[];
};

/** Every plan Copilot laid out and what came of it: the person's own, or for an owner, everyone's. */
export async function runsFor(
  staff: StaffActor,
  options: { everyone?: boolean; skip?: number; take?: number } = {},
): Promise<{ rows: RunRow[]; total: number }> {
  const everyone = Boolean(options.everyone) && staff.role === 'owner';
  const where = { status: { not: 'superseded' as const }, ...(everyone ? {} : { staffId: staff.id }) };
  const [plans, total] = await Promise.all([
    db.assistantPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options.skip ?? 0,
      take: options.take ?? 30,
      select: { id: true, conversationId: true, staffId: true, summary: true, status: true, steps: true, results: true, createdAt: true, decidedAt: true },
    }),
    db.assistantPlan.count({ where }),
  ]);
  const people = await namesOf(plans.map((plan) => plan.staffId));
  return {
    total,
    rows: plans.map((plan) => {
      const steps = plan.steps as unknown as { view: { label: string; subject: string } }[];
      const results = (plan.results as unknown as ({ state: string; summary?: string; href?: string; message?: string } | undefined)[] | null) ?? [];
      return {
        id: plan.id,
        chatId: plan.conversationId,
        summary: plan.summary,
        status: plan.status,
        by: people.get(plan.staffId) ?? 'Someone who has left',
        at: plan.createdAt,
        decidedAt: plan.decidedAt,
        steps: steps.length,
        done: results.filter((result) => result?.state === 'done').length,
        outcomes: steps.flatMap((step, index) => {
          const result = results[index];
          if (!result || result.state === 'not_run') return [];
          return [
            result.state === 'done'
              ? { label: `${step.view.label}: ${step.view.subject}`, summary: result.summary ?? 'Done', href: result.href }
              : { label: `${step.view.label}: ${step.view.subject}`, summary: result.message ?? 'Refused', failed: true },
          ];
        }),
      };
    }),
  };
}

export type UsageRow = { name: string; chats: number; messages: number; inputTokens: number; outputTokens: number };

/**
 * What every agent has used since a date, by surface, and Copilot by person.
 * Counted in tokens, which is what the bill is counted in; no price is
 * worked out here, because prices change and the invoice from the provider
 * is the figure that counts.
 */
export async function usageSince(since: Date): Promise<{ surfaces: UsageRow[]; people: UsageRow[] }> {
  const chats = await db.conversation.findMany({
    where: { lastMessageAt: { gte: since } },
    select: { kind: true, actorId: true, inputTokens: true, outputTokens: true, _count: { select: { messages: { where: { role: 'user' } } } } },
  });
  const LABEL: Record<string, string> = {
    console_staff: 'Copilot in the console',
    document_draft: 'Drafting documents',
    site_visitor: 'Website chat',
    portal_client: 'Portal Help',
  };
  const add = (into: Map<string, UsageRow>, key: string, name: string, chat: (typeof chats)[number]) => {
    const row = into.get(key) ?? { name, chats: 0, messages: 0, inputTokens: 0, outputTokens: 0 };
    row.chats += 1;
    row.messages += chat._count.messages;
    row.inputTokens += chat.inputTokens;
    row.outputTokens += chat.outputTokens;
    into.set(key, row);
  };
  const surfaces = new Map<string, UsageRow>();
  const people = new Map<string, UsageRow>();
  const names = await namesOf(chats.filter((chat) => chat.kind === 'console_staff').map((chat) => chat.actorId));
  for (const chat of chats) {
    add(surfaces, chat.kind, LABEL[chat.kind] ?? chat.kind, chat);
    if (chat.kind === 'console_staff') {
      add(people, chat.actorId ?? '', names.get(chat.actorId ?? '') ?? 'Someone who has left', chat);
    }
  }
  const sorted = (rows: Map<string, UsageRow>) => [...rows.values()].sort((a, b) => b.outputTokens - a.outputTokens);
  return { surfaces: sorted(surfaces), people: sorted(people) };
}

async function namesOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();
  const people = await db.staffUser.findMany({ where: { id: { in: wanted } }, select: { id: true, name: true } });
  return new Map(people.map((person) => [person.id, person.name]));
}
