import Link from 'next/link';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { billableLines } from '@/lib/console/billing';
import { getOrg } from '@/lib/console/org';
import { liveInvoice } from '@/lib/console/live';
import { periodLabel } from '@/lib/console/renewals';
import { formatMoney, numbers, todayInput } from '@/lib/console/money';
import { RecordPaymentForm, type ClientChoice, type FeeChoice, type InvoiceChoice } from './RecordPaymentForm';
import styles from '../../Admin.module.css';

export const metadata = { title: 'Record a payment' };

/**
 * One place to record money that came in: on an invoice, on fees not invoiced
 * yet, or on a new fee for money paid before anything was priced. Opened from
 * anywhere money comes up, with what is already known filled in.
 */
export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; project?: string; client?: string }>;
}) {
  const staff = await requirePermission('invoices');
  const { invoice: invoiceNumber, project: projectSlug, client: clientSlug } = await searchParams;

  const [clientRows, invoiceRows, lastPayment, org] = await Promise.all([
    db.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        contacts: {
          where: { deletedAt: null, isPrimary: true },
          take: 1,
          select: { name: true, email: true, canSignIn: true },
        },
        projects: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, slug: true, currency: true },
        },
      },
    }),
    db.invoice
      .findMany({
        where: { ...liveInvoice, status: { in: ['draft', 'sent', 'part_paid', 'overdue'] } },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalMinor: true,
          paidMinor: true,
          clientId: true,
          projectId: true,
          project: { select: { name: true } },
        },
      })
      .then(numbers),
    db.payment.findFirst({
      where: { recordedById: staff.id },
      orderBy: { createdAt: 'desc' },
      select: { method: true },
    }),
    getOrg(),
  ]);

  const clients: ClientChoice[] = clientRows.map((client) => {
    const contact = client.contacts[0];
    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      contact: contact
        ? { name: contact.name, emailable: Boolean(contact.email && contact.canSignIn) }
        : null,
      projects: client.projects.map((project) => ({ id: project.id, name: project.name, currency: project.currency })),
    };
  });

  const invoices: InvoiceChoice[] = invoiceRows
    .filter((invoice) => invoice.totalMinor > invoice.paidMinor)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      projectName: invoice.project?.name ?? null,
      currency: invoice.currency,
      outstandingMinor: invoice.totalMinor - invoice.paidMinor,
      outstanding: formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency),
      draft: invoice.status === 'draft',
    }));

  // Fees not invoiced yet, on the projects that have any. Usage is left out:
  // what it comes to is only known when it is invoiced.
  const withFees = numbers(
    await db.project.findMany({
      where: { deletedAt: null, client: { deletedAt: null }, lineItems: { some: { status: { in: ['planned', 'active'] } } } },
      select: { id: true },
    }),
  );
  const fees: FeeChoice[] = (
    await Promise.all(
      withFees.map(async (project) =>
        (await billableLines(project.id))
          .filter((line) => !line.usage && line.amountMinor > 0)
          .map((line) => ({
            key: line.key,
            projectId: project.id,
            label: line.label,
            period: line.periodStart && line.periodEnd ? periodLabel(line.periodStart, line.periodEnd) : null,
            amountMinor: line.amountMinor,
            amount: formatMoney(line.amountMinor, line.currency),
            currency: line.currency,
          })),
      ),
    )
  ).flat();

  // What the address says is already known, from the most specific.
  const fromInvoice = invoiceNumber ? invoices.find((invoice) => invoice.number === invoiceNumber) : undefined;
  const fromProject = projectSlug
    ? clientRows.flatMap((client) => client.projects.map((project) => ({ client, project }))).find(
        ({ project }) => project.slug === projectSlug,
      )
    : undefined;
  const fromClient = clientSlug ? clientRows.find((client) => client.slug === clientSlug) : undefined;
  const clientId = fromInvoice?.clientId ?? fromProject?.client.id ?? fromClient?.id;

  let target: string | undefined;
  if (fromInvoice) {
    target = `invoice:${fromInvoice.id}`;
  } else if (fromProject) {
    const open = invoices.filter((invoice) => invoice.projectId === fromProject.project.id);
    const unbilled = fees.filter((fee) => fee.projectId === fromProject.project.id);
    target =
      open.length === 1
        ? `invoice:${open[0]!.id}`
        : unbilled.length > 0
          ? `fees:${fromProject.project.id}`
          : can(staff, 'fees')
            ? `new:${fromProject.project.id}`
            : undefined;
  }

  return (
    <main className={styles.page}>
      <Link href="/payments" className={styles.backLink}>
        ← Payments
      </Link>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Record a payment</h1>
        </div>
      </div>

      <RecordPaymentForm
        clients={clients}
        invoices={invoices}
        fees={fees}
        mayAddFee={can(staff, 'fees')}
        vatBps={org.chargesVat && org.vatRateBps > 0 ? org.vatRateBps : 0}
        today={todayInput()}
        defaultMethod={lastPayment?.method ?? 'mobile_money'}
        initialClientId={clientId}
        initialTarget={target}
      />
    </main>
  );
}
