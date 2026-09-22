/**
 * A recurring line must be billable every period, not once.
 *
 * This is the bug this whole layer exists to fix: before RenewalEvent was
 * used, billing a renewal once made the difference between its worth and what
 * had been invoiced zero, so year two was never offered and the line sat on
 * the renewals list at its year-one date for ever.
 *
 * Run with: npx tsx scripts/check-renewal-cycle.mts
 */
process.loadEnvFile('.env');

/**
 * `server-only` throws on import by design; Next swaps it for an empty module
 * when the importer really is server code. Outside Next nothing does that, so
 * the cache is primed with an empty module before the real files load —
 * otherwise this test could not import the code it exists to test.
 */
import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);
const serverOnly = requireFromHere.resolve('server-only');
requireFromHere.cache[serverOnly] = new (requireFromHere('node:module').Module)(serverOnly);
requireFromHere.cache[serverOnly]!.filename = serverOnly;
requireFromHere.cache[serverOnly]!.loaded = true;
requireFromHere.cache[serverOnly]!.exports = {};

const { PrismaPg } = await import('@prisma/adapter-pg');
const { PrismaClient } = await import('../src/generated/prisma/client');
const { billableLines } = await import('../src/lib/console/billing');
const { markRenewalInvoiced } = await import('../src/lib/console/renewals');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/**
 * Pinned to ONE line, because several clients can hold a line with the same
 * label and the same dates — a first version of this test compared periods
 * alone and reported two different clients' domains as a duplicate.
 */
const line = await db.lineItem.findFirst({
  where: {
    billingKind: 'recurring_annual',
    status: { in: ['planned', 'active'] },
    nextDueAt: { not: null },
    project: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } },
  },
  select: {
    id: true,
    label: true,
    nextDueAt: true,
    project: { select: { id: true, reference: true, clientId: true } },
  },
});

if (!line) {
  console.log('No recurring line with a due date to test against.');
  process.exit(0);
}

const project = line.project;
const originalNextDueAt = line.nextDueAt!;
console.log(`Testing ${line.label} on ${project.reference}, from ${originalNextDueAt.toISOString().slice(0, 10)}\n`);

const failures: string[] = [];
const billedPeriods: string[] = [];

for (let year = 1; year <= 3; year += 1) {
  // A long horizon, so three consecutive years are all in view at once.
  const billable = await billableLines(project.id, 1200);
  const renewal = billable.find(
    (item) => item.renewalEventId !== null && item.lineItemId === line.id,
  );

  if (!renewal) {
    failures.push(`Year ${year}: no renewal period was offered for billing.`);
    break;
  }

  const period = `${renewal.periodStart?.toISOString().slice(0, 10)} → ${renewal.periodEnd?.toISOString().slice(0, 10)}`;
  if (billedPeriods.includes(period)) {
    failures.push(`Year ${year}: offered the same period twice (${period}).`);
    break;
  }
  billedPeriods.push(period);

  // Bill it the way the real action does.
  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number: `TEST-${Date.now()}-${year}`,
        clientId: project.clientId,
        projectId: project.id,
        status: 'draft',
        currency: renewal.currency,
      },
      select: { id: true },
    });
    await markRenewalInvoiced(tx, renewal.renewalEventId!, invoice.id);
  });

  console.log(`Year ${year}: billed ${renewal.label} for ${period}`);
}

// Clean up after ourselves — this is a real database.
await db.renewalEvent.updateMany({
  where: { invoice: { number: { startsWith: 'TEST-' } } },
  data: { status: 'pending', invoiceId: null },
});
await db.invoice.deleteMany({ where: { number: { startsWith: 'TEST-' } } });
await db.lineItem.update({ where: { id: line.id }, data: { nextDueAt: originalNextDueAt } });
await db.renewalEvent.deleteMany({
  where: { lineItemId: line.id, periodStart: { gt: originalNextDueAt } },
});

await db.$disconnect();

if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  console.log(`\nRenewal cycle check passed: ${billedPeriods.length} consecutive periods were each billable exactly once.`);
}
