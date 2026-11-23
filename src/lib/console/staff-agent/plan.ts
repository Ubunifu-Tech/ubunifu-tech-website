import 'server-only';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, recordAudit, type StaffActor } from '@/lib/console/auth';
import {
  PLAN_ACTIONS,
  StepRefused,
  planAction,
  type ClientFacts,
  type PlanEnv,
  type Produced,
  type ProjectFacts,
} from './actions';

/**
 * Plans: the only way the console assistant changes anything.
 *
 * The assistant lays out steps. Each is checked here, with the same rules the
 * console's own forms use, and what the person is shown is written from those
 * checked values, never from the assistant's description of them. Nothing is
 * carried out until the person who asked presses Confirm, and then every step
 * is checked again, as them, against the records as they stand.
 */

export const MAX_STEPS = 12;

/** A step as the review table shows it. */
export type StepView = {
  action: string;
  label: string;
  subject: string;
  details: string[];
  sends?: string;
};

export type StepOutcome =
  | { state: 'done'; summary: string; href?: string }
  | { state: 'failed'; message: string }
  | { state: 'not_run' };

type StoredStep = {
  action: string;
  input: Record<string, unknown>;
  view: StepView;
  /** What the step pinned when it was laid out. See Checked.pin. */
  pin?: string;
};

const MOVED = 'This is no longer what the plan showed. Ask again to see it as it stands now.';

export type PlanView = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'stopped' | 'discarded' | 'superseded';
  summary: string;
  steps: StepView[];
  outcomes: StepOutcome[] | null;
};

const STEP_REF = /^step:(\d{1,2})$/i;

/**
 * How steps find the records they are about. `produced` holds what earlier
 * steps leave behind: planned facts while a plan is being laid out, real
 * records while it is carried out. Lookups are kept for the length of one
 * pass, so two fees on one project are checked against the same list.
 */
function planEnv(staff: StaffActor, produced: Map<number, Produced>): PlanEnv {
  const clients = new Map<string, ClientFacts | string>();
  const projects = new Map<string, ProjectFacts | string>();
  const named = (ref: unknown) => (typeof ref === 'string' ? ref.trim().slice(0, 200) : '');

  return {
    staff,
    client: async (ref) => {
      const name = named(ref);
      if (!name) return 'Say which client: "step:N" or its exact name.';
      const step = STEP_REF.exec(name);
      if (step) {
        return produced.get(Number(step[1]))?.client ?? `Step ${step[1]} does not add a client before this step.`;
      }
      const key = name.toLowerCase();
      if (!clients.has(key)) clients.set(key, await findClient(name));
      return clients.get(key)!;
    },
    project: async (ref) => {
      const name = named(ref);
      if (!name) return 'Say which project: "step:N" or its reference.';
      const step = STEP_REF.exec(name);
      if (step) {
        return produced.get(Number(step[1]))?.project ?? `Step ${step[1]} does not start a project before this step.`;
      }
      const key = name.toLowerCase();
      if (!projects.has(key)) projects.set(key, await findProject(name));
      return projects.get(key)!;
    },
  };
}

async function findClient(name: string): Promise<ClientFacts | string> {
  const found = await db.client.findMany({
    where: {
      deletedAt: null,
      OR: [{ slug: name.toLowerCase() }, { name: { equals: name, mode: 'insensitive' } }],
    },
    take: 2,
    select: {
      id: true,
      slug: true,
      name: true,
      currency: true,
      contacts: {
        where: { isPrimary: true, deletedAt: null },
        take: 1,
        select: { id: true, name: true, email: true, activatedAt: true },
      },
    },
  });
  if (found.length === 0) return `There is no client called exactly "${name}". Look it up with find_records.`;
  if (found.length > 1) return `More than one client is called "${name}". Use the slug from find_records.`;
  const client = found[0]!;
  return {
    id: client.id,
    slug: client.slug,
    name: client.name,
    currency: client.currency,
    contact: client.contacts[0] ?? null,
  };
}

async function findProject(name: string): Promise<ProjectFacts | string> {
  const found = await db.project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reference: name.toUpperCase() },
        { slug: name.toLowerCase() },
        { name: { equals: name, mode: 'insensitive' } },
      ],
    },
    take: 2,
    select: {
      id: true,
      slug: true,
      name: true,
      currency: true,
      client: { select: { name: true } },
      lineItems: { where: { status: { not: 'cancelled' } }, select: { label: true } },
    },
  });
  if (found.length === 0) return `There is no project "${name}". Look it up with find_records and use its reference.`;
  if (found.length > 1) return `More than one project is called "${name}". Use its reference, such as UBU-2026-004.`;
  const project = found[0]!;
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    currency: project.currency,
    clientName: project.client.name,
    feeLabels: project.lineItems.map((line) => line.label),
  };
}

/** The model's steps, read defensively: anything not shaped like a step is refused, not guessed at. */
function readSteps(raw: unknown): { action: string; input: Record<string, unknown> }[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return 'A plan needs at least one step.';
  if (raw.length > MAX_STEPS) return `A plan can have at most ${MAX_STEPS} steps. Split the work into two plans.`;
  const steps: { action: string; input: Record<string, unknown> }[] = [];
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return `Step ${index + 1} is not a step.`;
    const { action, ...input } = entry as Record<string, unknown>;
    if (typeof action !== 'string' || !planAction(action)) {
      return `Step ${index + 1} names an action that does not exist. The actions are: ${PLAN_ACTIONS.map((known) => known.name).join(', ')}.`;
    }
    steps.push({ action, input });
  }
  return steps;
}

/**
 * Lays a plan out for the person to confirm. Refused whole when any step
 * would not go through, with the reason for each, so the assistant can put it
 * right or say why it cannot be done. A plan still waiting in the same chat is
 * replaced: there is only ever one to confirm.
 */
export async function proposePlan(input: {
  staff: StaffActor;
  conversationId: string;
  summary: unknown;
  steps: unknown;
}): Promise<{ ok: true; plan: PlanView } | { ok: false; problems: string[] }> {
  const summary = typeof input.summary === 'string' ? input.summary.trim().slice(0, 200) : '';
  if (summary.length < 4) return { ok: false, problems: ['Say in one line what the plan is for.'] };

  const steps = readSteps(input.steps);
  if (typeof steps === 'string') return { ok: false, problems: [steps] };

  const produced = new Map<number, Produced>();
  const env = planEnv(input.staff, produced);
  const stored: StoredStep[] = [];
  const problems: string[] = [];

  for (const [index, step] of steps.entries()) {
    const action = planAction(step.action)!;
    if (action.permission && !can(input.staff, action.permission)) {
      problems.push(
        `Step ${index + 1} (${action.label}): this person's role does not allow it. Tell them so, and that an owner can change roles on the Team page.`,
      );
      continue;
    }
    const checked = await action.check(step.input, env);
    if (!checked.ok) {
      problems.push(`Step ${index + 1} (${action.label}): ${checked.message}`);
      continue;
    }
    if (checked.produces) produced.set(index + 1, checked.produces);
    stored.push({
      ...step,
      view: {
        action: action.name,
        label: action.label,
        subject: checked.subject,
        details: checked.details,
        ...(checked.sends ? { sends: checked.sends } : {}),
      },
      ...(checked.pin !== undefined ? { pin: checked.pin } : {}),
    });
  }
  if (problems.length > 0) return { ok: false, problems };

  const [, plan] = await db.$transaction([
    db.assistantPlan.updateMany({
      where: { conversationId: input.conversationId, status: 'pending' },
      data: { status: 'superseded', decidedAt: new Date() },
    }),
    db.assistantPlan.create({
      data: {
        conversationId: input.conversationId,
        staffId: input.staff.id,
        summary,
        steps: stored as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    }),
  ]);

  await recordAudit({
    actorType: 'staff',
    actorId: input.staff.id,
    action: 'assistant.plan_proposed',
    entityType: 'AssistantPlan',
    entityId: plan.id,
    summary: `${summary}: ${stored.length} step${stored.length === 1 ? '' : 's'}, waiting to be confirmed`,
  });

  return {
    ok: true,
    plan: { id: plan.id, status: 'pending', summary, steps: stored.map((step) => step.view), outcomes: null },
  };
}

export type Decision = { ok: true; plan: PlanView } | { ok: false; message: string };

const NOT_WAITING = 'That plan is no longer waiting. Ask again if it is still needed.';

/**
 * Carries a plan out, as the person who asked for it and nobody else.
 *
 * Claimed in one statement, so pressing Confirm twice carries it out once.
 * Steps run in order and each is checked again first. The first one that is
 * refused stops the plan: what was already done stays done and is shown as
 * done, and the rest is shown as not carried out.
 */
export async function confirmPlan(staff: StaffActor, planId: string): Promise<Decision> {
  const claimed = await db.assistantPlan.updateMany({
    where: { id: planId, staffId: staff.id, status: 'pending' },
    data: { status: 'running', decidedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, message: NOT_WAITING };

  const plan = await db.assistantPlan.findUniqueOrThrow({
    where: { id: planId },
    select: { id: true, summary: true, steps: true },
  });
  const steps = plan.steps as unknown as StoredStep[];
  const produced = new Map<number, Produced>();
  const env = planEnv(staff, produced);
  const outcomes: StepOutcome[] = [];
  let stopped = false;

  for (const [index, step] of steps.entries()) {
    if (stopped) {
      outcomes.push({ state: 'not_run' });
      continue;
    }
    const action = planAction(step.action);
    try {
      if (!action) throw new StepRefused('This action is no longer available.');
      // Roles are read on every request, so a permission taken away since the
      // plan was laid out is honoured here.
      if (action.permission && !can(staff, action.permission)) throw new StepRefused('Your role does not allow this.');
      const checked = await action.check(step.input, env);
      if (!checked.ok) throw new StepRefused(checked.message);
      // What was pinned when the person was shown the plan must still hold.
      if (step.pin !== undefined && checked.pin !== step.pin) throw new StepRefused(MOVED);
      const ran = await action.run(checked.value as never, env);
      if (ran.produces) produced.set(index + 1, ran.produces);
      outcomes.push({ state: 'done', summary: ran.summary, ...(ran.href ? { href: ran.href } : {}) });
    } catch (error) {
      if (!(error instanceof StepRefused)) console.error(`Plan step ${step.action} failed`, error);
      outcomes.push({
        state: 'failed',
        message:
          error instanceof StepRefused
            ? error.message
            : 'Something went wrong on our side. This step changed nothing.',
      });
      stopped = true;
    }
  }

  const status = stopped ? 'stopped' : 'done';
  await db.assistantPlan.update({
    where: { id: plan.id },
    data: { status, results: outcomes as unknown as Prisma.InputJsonValue },
  });
  const done = outcomes.filter((outcome) => outcome.state === 'done').length;
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'assistant.plan_confirmed',
    entityType: 'AssistantPlan',
    entityId: plan.id,
    summary: `${plan.summary}: ${done} of ${steps.length} steps carried out`,
  });
  revalidatePath('/admin', 'layout');

  return {
    ok: true,
    plan: { id: plan.id, status, summary: plan.summary, steps: steps.map((step) => step.view), outcomes },
  };
}

export async function discardPlan(staff: StaffActor, planId: string): Promise<Decision> {
  const dropped = await db.assistantPlan.updateMany({
    where: { id: planId, staffId: staff.id, status: 'pending' },
    data: { status: 'discarded', decidedAt: new Date() },
  });
  if (dropped.count !== 1) return { ok: false, message: NOT_WAITING };
  const plan = await db.assistantPlan.findUniqueOrThrow({
    where: { id: planId },
    select: { id: true, summary: true, steps: true },
  });
  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'assistant.plan_discarded',
    entityType: 'AssistantPlan',
    entityId: plan.id,
    summary: `${plan.summary}: nothing was changed`,
  });
  return {
    ok: true,
    plan: {
      id: plan.id,
      status: 'discarded',
      summary: plan.summary,
      steps: (plan.steps as unknown as StoredStep[]).map((step) => step.view),
      outcomes: null,
    },
  };
}

/** A chat's plans, oldest first, for showing the thread again. */
export async function plansOf(conversationId: string): Promise<(PlanView & { createdAt: Date })[]> {
  const plans = await db.assistantPlan.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, status: true, summary: true, steps: true, results: true, createdAt: true },
  });
  return plans.map((plan) => ({
    id: plan.id,
    status: plan.status,
    summary: plan.summary,
    steps: (plan.steps as unknown as StoredStep[]).map((step) => step.view),
    outcomes: (plan.results as unknown as StepOutcome[] | null) ?? null,
    createdAt: plan.createdAt,
  }));
}

/**
 * Where the chat's latest plan stands, for the assistant's next turn. It
 * cannot see a button being pressed, so without this it would not know
 * whether what it laid out was carried out.
 */
export async function planNote(conversationId: string): Promise<string> {
  const plan = await db.assistantPlan.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: { status: true, summary: true, steps: true, results: true },
  });
  if (!plan) return 'No plan has been laid out in this chat yet.';
  const steps = plan.steps as unknown as StoredStep[];
  const outcomes = (plan.results as unknown as StepOutcome[] | null) ?? [];
  const lines = steps.map((step, index) => {
    const outcome = outcomes[index];
    const state = !outcome
      ? ''
      : outcome.state === 'done'
        ? `: done, ${outcome.summary}${outcome.href ? `, page ${outcome.href}` : ''}`
        : outcome.state === 'failed'
          ? `: refused, ${outcome.message}`
          : ': not carried out';
    return `${index + 1}. ${step.view.label}, ${step.view.subject}${state}`;
  });
  const standing: Record<string, string> = {
    pending: 'is waiting for them to press Confirm. It has not been carried out.',
    running: 'is being carried out now.',
    done: 'was confirmed and carried out in full.',
    stopped: 'was confirmed but stopped part way. Steps marked done stand.',
    discarded: 'was discarded by them. Nothing was changed.',
    superseded: 'was replaced before it was confirmed. Nothing was changed.',
  };
  return `THE LATEST PLAN IN THIS CHAT ("${plan.summary}") ${standing[plan.status]}\n${lines.join('\n')}`;
}
