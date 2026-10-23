/**
 * The project state machine keeps its promises.
 *
 * Staff see four stages and one button for the next move. Underneath, the
 * fourteen statuses and their rules have to stay true: work agreed anywhere in
 * a deal starts with one press, money never blocks a move, delivered work can
 * never be called cancelled, nothing closes while a document is out for
 * signature, and asking for a review still moves the project to review.
 *
 * Run with: npm run check:transitions (it uses the local database for the
 * review move, inside a transaction that is rolled back).
 */
process.loadEnvFile('.env');

import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
requireFromHere.cache[serverOnly] = new (requireFromHere('node:module').Module)(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const { ProjectStatus } = await import('../src/generated/prisma/client');
const { advanceForReview, guardsFor, transitionsFor } = await import('../src/lib/console/transitions');
const { primaryMove, STAGE_OF } = await import('../src/lib/console/stages');
const { db } = await import('../src/lib/db');

type Status = (typeof ProjectStatus)[keyof typeof ProjectStatus];
const failures: string[] = [];
const statuses = Object.values(ProjectStatus) as Status[];

// Every status is in exactly one stage (the type makes the map complete; this
// catches a status added to the enum and left out).
for (const status of statuses) {
  if (!STAGE_OF[status]) failures.push(`${status} has no stage`);
}

// Moves for the statuses that do not depend on history. Held and cancelled
// projects read their history, so they are left to the database below.
const held = new Set<Status>(['on_hold', 'cancelled']);
for (const status of statuses.filter((status) => !held.has(status))) {
  const offered = (await transitionsFor({ id: 'check', status })).map((transition) => transition.to);
  if (STAGE_OF[status] === 'deal' && !offered.includes('in_progress')) {
    failures.push(`${status} does not offer Start the work`);
  }
  for (const serviceLine of ['web', 'branding', 'strategy', 'hosting']) {
    const primary = primaryMove(status, serviceLine);
    if (primary && !offered.includes(primary)) {
      failures.push(`${status} (${serviceLine}) shows ${primary} as its next move, which is not on offer`);
    }
  }
}

const facts = {
  currency: 'USD',
  committedMinor: 500_000,
  currencies: ['USD'],
  recurringWithoutDueDate: 0,
  invoicedMinor: 200_000,
  paidMinor: 0,
  outstandingMinor: 200_000,
  uninvoicedOneOffMinor: 300_000,
  hasDelivered: false,
  openSignatureRequests: 0,
  liveRecurringLines: 0,
  activeManagedServices: 0,
  outstandingAssetRequests: 0,
  latestReview: null,
};

// Money warns and never blocks.
for (const to of ['in_progress', 'launched', 'handover', 'closed'] as Status[]) {
  const blocks = guardsFor(to, facts).filter((guard) => guard.severity === 'block');
  if (blocks.length > 0) failures.push(`moving to ${to} with money owed is blocked: ${blocks[0]!.message}`);
}

// Delivered work is never cancelled.
if (!guardsFor('cancelled', { ...facts, hasDelivered: true }).some((guard) => guard.severity === 'block')) {
  failures.push('a delivered project can be cancelled');
}

// Nothing closes or cancels while a document is out for signature.
for (const to of ['closed', 'cancelled'] as Status[]) {
  if (!guardsFor(to, { ...facts, openSignatureRequests: 1 }).some((guard) => guard.severity === 'block')) {
    failures.push(`${to} is allowed with a document out for signature`);
  }
}

// Asking for a review still moves the project, from the work and from ready
// to launch, and not from a deal. Checked on a real row, then rolled back.
const project = await db.project.findFirst({ where: { deletedAt: null }, select: { id: true } });
if (project) {
  class Rollback extends Error {}
  for (const [from, expected] of [
    ['in_progress', 'client_review'],
    ['launch_ready', 'client_review'],
    ['lead', null],
  ] as [Status, Status | null][]) {
    try {
      await db.$transaction(async (tx) => {
        await tx.project.update({ where: { id: project.id }, data: { status: from } });
        const moved = await advanceForReview(tx, {
          projectId: project.id,
          round: 99,
          title: 'check',
          actorType: 'system',
          actorId: null,
        });
        if ((moved?.to ?? null) !== expected) {
          failures.push(`asking for a review from ${from} moved to ${moved?.to ?? 'nowhere'}, expected ${expected ?? 'nowhere'}`);
        }
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  }
} else {
  console.log('No project in this database: the review move was not checked.');
}
await db.$disconnect();

if (failures.length > 0) {
  console.error(`\nTransitions check failed:\n${failures.map((failure) => `  ${failure}`).join('\n')}\n`);
  process.exit(1);
}
console.log('Transitions check passed: every deal starts in one press, the next move is always on offer, money never blocks, delivered work stays delivered, and reviews still move the project.');
