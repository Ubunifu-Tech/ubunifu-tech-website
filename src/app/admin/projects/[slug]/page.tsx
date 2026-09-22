import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { guardsFor, loadGuardFacts, transitionsFor } from '@/lib/console/transitions';
import { billableLines } from '@/lib/console/billing';
import { periodLabel } from '@/lib/console/renewals';
import { fileSize } from '@/lib/console/uploads';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import { formatMoney, formatRelative, formatShortDate, toDateInputValue } from '@/lib/console/money';
import { MoveControls, type StageAction } from './MoveControls';
import { FeeEditor, type FeeRow } from '@/components/console/FeeEditor';
import { Tabs } from '@/components/console/Tabs';
import { Callout } from '@/components/console/Callout';
import { LeadSelect, TaskRow } from './TaskRow';
import { AssetRequestRow } from './AssetRequestRow';
import { RaiseInvoice, type BillableLine } from './RaiseInvoice';
import { UpdateComposer, type UpdateRow } from './UpdateComposer';
import { NewDocument } from './NewDocument';
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from '@/lib/console/documents';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { name: true, reference: true },
  });
  return { title: project ? `${project.reference} · ${project.name}` : 'Project' };
}

const TABS = ['overview', 'plan', 'fees', 'documents', 'updates', 'activity'] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff();
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'overview';
  const now = new Date();

  const project = await db.project.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      reference: true,
      status: true,
      serviceLine: true,
      engagementType: true,
      currency: true,
      summary: true,
      startDate: true,
      targetDate: true,
      launchedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
          contacts: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
            select: { id: true, name: true },
          },
        },
      },
      ownerId: true,
      phases: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          goal: true,
          status: true,
          deliverables: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              isComplete: true,
              dueAt: true,
              assigneeId: true,
            },
          },
        },
      },
      assetRequests: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          detail: true,
          status: true,
          assigneeId: true,
          uploads: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, filename: true, sizeBytes: true, createdAt: true },
          },
        },
      },
      lineItems: {
        where: { status: { not: 'cancelled' } },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          description: true,
          terms: true,
          amountMinor: true,
          quantity: true,
          currency: true,
          status: true,
          billingKind: true,
          nextDueAt: true,
          _count: { select: { invoiceLines: true } },
        },
      },
      documents: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          reference: true,
          title: true,
          kind: true,
          status: true,
          updatedAt: true,
          versions: { select: { id: true } },
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          bodyMarkdown: true,
          previewUrl: true,
          status: true,
          publishedAt: true,
          notifiedAt: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalMinor: true,
          paidMinor: true,
          dueAt: true,
        },
      },
      statusEvents: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, from: true, to: true, note: true, createdAt: true, actorType: true },
      },
    },
  });

  if (!project) notFound();

  const [transitions, facts, billable] = await Promise.all([
    transitionsFor(project),
    loadGuardFacts(project.id),
    billableLines(project.id),
  ]);

  const toBill: BillableLine[] = billable
    .filter((item) => item.amountMinor > 0)
    .map((item) => ({
      key: item.key,
      label: item.label,
      terms: item.terms,
      amount: formatMoney(item.amountMinor, item.currency),
      amountMinor: item.amountMinor,
      currency: item.currency,
      // A renewal says which period it covers; a one-off says when it is due.
      period:
        item.periodStart && item.periodEnd
          ? periodLabel(item.periodStart, item.periodEnd)
          : null,
      due: item.dueAt ? formatShortDate(item.dueAt) : null,
    }));

  // Fourteen days, unless somebody changes it on the form.
  const defaultDue = new Date(now);
  defaultDue.setDate(defaultDue.getDate() + 14);

  const updates: UpdateRow[] = project.updates.map((update) => ({
    id: update.id,
    title: update.title,
    body: update.bodyMarkdown,
    previewUrl: update.previewUrl,
    published: update.status === 'published',
    when: formatShortDate(update.publishedAt ?? update.createdAt),
    notified: update.notifiedAt !== null,
  }));

  // Each next step carries its own blocker, shown greyed on the step itself,
  // rather than one warning box about steps nobody has tried to take.
  const actions: StageAction[] = transitions.map((transition) => ({
    ...transition,
    blocked:
      guardsFor(transition.to, facts).find((guard) => guard.severity === 'block')?.message ?? null,
  }));

  const committed = project.lineItems
    .filter((line) => line.status === 'planned' || line.status === 'active')
    .reduce((total, line) => total + line.amountMinor * line.quantity, 0);

  const fees: FeeRow[] = project.lineItems.map((line) => ({
    id: line.id,
    label: line.label,
    description: line.description,
    billingKind: line.billingKind,
    amountMinor: line.amountMinor,
    quantity: line.quantity,
    terms: line.terms,
    nextDueAt: toDateInputValue(line.nextDueAt),
    status: line.status,
    invoiced: line._count.invoiceLines > 0,
  }));
  const invoiced = project.invoices
    .filter((invoice) => invoice.status !== 'void' && invoice.currency === project.currency)
    .reduce((total, invoice) => total + invoice.totalMinor, 0);
  const paid = project.invoices
    .filter((invoice) => invoice.currency === project.currency)
    .reduce((total, invoice) => total + invoice.paidMinor, 0);
  const unpriced = fees.filter(
    (fee) => (fee.status === 'planned' || fee.status === 'active') && fee.amountMinor === 0,
  ).length;
  const outstandingAssets = project.assetRequests.filter((request) => request.status === 'requested').length;

  const totalDeliverables = project.phases.reduce((n, p) => n + p.deliverables.length, 0);
  const doneDeliverables = project.phases.reduce(
    (n, p) => n + p.deliverables.filter((d) => d.isComplete).length,
    0,
  );

  // Who work can be given to: the active team, plus whoever already holds it.
  const team = await db.staffUser.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, title: true },
  });
  const people = [
    { value: '', label: 'Nobody yet' },
    ...team.map((person) => ({ value: person.id, label: person.name, hint: person.title ?? undefined })),
  ];
  const theirPeople = [
    { value: '', label: 'Anyone at the client' },
    ...project.client.contacts.map((contact) => ({ value: contact.id, label: contact.name })),
  ];

  const href = (key: Tab) => (key === 'overview' ? `/projects/${project.slug}` : `/projects/${project.slug}?tab=${key}`);
  const percent = totalDeliverables > 0 ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/projects" className={styles.backLink}>
            ← Projects
          </Link>
          <h1 className={styles.heading}>{project.name}</h1>
          <p className={styles.lead}>
            <Link href={`/clients/${project.client.slug}`} className={styles.inlineLink}>
              {project.client.name}
            </Link>
            {' · '}
            {project.reference}
          </p>
        </div>
        <div className={styles.headActions}>
          <LeadSelect projectId={project.id} ownerId={project.ownerId ?? ''} people={people} />
          <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
            {STAFF_LABEL[project.status]}
          </span>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Progress</span>
          <span className={styles.summaryValue}>
            {doneDeliverables}/{totalDeliverables} tasks
          </span>
          <span className={styles.summaryBar} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Agreed fees</span>
          <span className={styles.summaryValue}>{formatMoney(committed, project.currency)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Invoiced</span>
          <span className={styles.summaryValue}>{formatMoney(invoiced, project.currency)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Paid</span>
          <span className={styles.summaryValue}>{formatMoney(paid, project.currency)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Target date</span>
          <span className={styles.summaryValue}>
            {project.targetDate ? formatShortDate(project.targetDate) : 'Not set'}
          </span>
        </div>
      </div>

      <Tabs
        current={tab}
        tabs={[
          { key: 'overview', label: 'Overview', href: href('overview') },
          { key: 'plan', label: 'Plan', href: href('plan'), count: totalDeliverables - doneDeliverables },
          { key: 'fees', label: 'Fees & billing', href: href('fees'), count: project.invoices.length },
          { key: 'documents', label: 'Documents', href: href('documents'), count: project.documents.length },
          { key: 'updates', label: 'Updates', href: href('updates'), count: project.updates.length },
          { key: 'activity', label: 'Activity', href: href('activity') },
        ]}
      />

      {tab === 'overview' && (
        <div className={styles.columns}>
          <div className={styles.stack}>
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Next step</h2>
              </div>
              <MoveControls projectId={project.id} status={project.status} actions={actions} />
            </section>

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>At a glance</h2>
              </div>
              <ul className={styles.glance}>
                <li>
                  <Link href={href('plan')}>
                    {totalDeliverables - doneDeliverables === 0
                      ? 'All tasks done'
                      : `${totalDeliverables - doneDeliverables} tasks still to do`}
                  </Link>
                </li>
                <li>
                  <Link href={href('fees')}>
                    {fees.length === 0
                      ? 'No fees set yet'
                      : unpriced > 0
                        ? `${unpriced} ${unpriced === 1 ? 'fee needs' : 'fees need'} a price`
                        : `${fees.length} ${fees.length === 1 ? 'fee' : 'fees'} set, ${formatMoney(committed, project.currency)}`}
                  </Link>
                </li>
                <li>
                  <Link href={href('documents')}>
                    {project.documents.length === 0
                      ? 'No proposal or agreement yet'
                      : `${project.documents.length} ${project.documents.length === 1 ? 'document' : 'documents'}`}
                  </Link>
                </li>
                <li>
                  <Link href={href('updates')}>
                    {project.updates.length === 0
                      ? 'No updates sent to the client yet'
                      : `Last update ${formatRelative(project.updates[0]!.createdAt, now)}`}
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          <div className={styles.stack}>
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>From the client</h2>
                <span className={forms.cardMeta}>
                  {outstandingAssets === 0 ? 'Nothing outstanding' : `${outstandingAssets} outstanding`}
                </span>
              </div>
              {project.assetRequests.length === 0 ? (
                <p className={styles.note}>Nothing requested from the client.</p>
              ) : (
                <div className={styles.assetList}>
                  {project.assetRequests.map((request) => (
                    <AssetRequestRow
                      key={request.id}
                      id={request.id}
                      title={request.title}
                      detail={request.detail}
                      status={request.status}
                      assigneeId={request.assigneeId ?? ''}
                      contacts={theirPeople}
                      files={request.uploads.map((file) => ({
                        id: file.id,
                        filename: file.filename,
                        size: fileSize(file.sizeBytes),
                        when: formatRelative(file.createdAt, now),
                      }))}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Plan</h2>
            <span className={forms.cardMeta}>
              {project.startDate ? formatShortDate(project.startDate) : 'No start date'}
              {project.targetDate ? ` to ${formatShortDate(project.targetDate)}` : ''}
            </span>
          </div>
          {project.phases.length === 0 ? (
            <p className={styles.note}>This project has no plan yet.</p>
          ) : (
            project.phases.map((phase) => (
              <div key={phase.id} className={styles.phase}>
                <div className={styles.phaseHead}>
                  <h3 className={styles.phaseName}>{phase.name}</h3>
                  <span className={forms.cardMeta}>
                    {phase.deliverables.filter((d) => d.isComplete).length} of {phase.deliverables.length}
                  </span>
                </div>
                {phase.goal && <p className={styles.phaseGoal}>{phase.goal}</p>}
                <div className={styles.taskList}>
                  {phase.deliverables.map((deliverable) => (
                    <TaskRow
                      key={deliverable.id}
                      id={deliverable.id}
                      title={deliverable.title}
                      complete={deliverable.isComplete}
                      dueAt={toDateInputValue(deliverable.dueAt)}
                      assigneeId={deliverable.assigneeId ?? ''}
                      people={people}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'fees' && (
        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Fees</h2>
              <span className={forms.cardMeta}>These appear in every proposal and agreement</span>
            </div>
            {unpriced > 0 && (
              <Callout kind="warn">
                {unpriced === 1 ? 'One fee has' : `${unpriced} fees have`} no price yet. A contract cannot be
                sent until every fee is priced.
              </Callout>
            )}
            <FeeEditor projectId={project.id} currency={project.currency} fees={fees} />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Raise an invoice</h2>
              <span className={forms.cardMeta}>From fees not yet invoiced</span>
            </div>
            <RaiseInvoice projectId={project.id} lines={toBill} defaultDue={toDateInputValue(defaultDue)} />
          </section>

          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Invoices</h2>
                <span className={table.count}>{project.invoices.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">Number</th>
                    <th className={table.th} scope="col">Status</th>
                    <th className={table.th} scope="col">Due</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Total</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Unpaid</th>
                  </tr>
                </thead>
                <tbody>
                  {project.invoices.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={5}>
                        <p className={table.emptyTitle}>No invoices yet</p>
                        <p className={table.emptyHint}>Raise one above once a fee is due.</p>
                      </td>
                    </tr>
                  ) : (
                    project.invoices.map((invoice) => (
                      <tr key={invoice.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary} ${table.nowrap}`}>
                          <Link href={`/invoices/${invoice.number}`} className={table.link}>
                            {invoice.number}
                          </Link>
                        </td>
                        <td className={table.td}>{INVOICE_STATUS_LABEL[invoice.status]}</td>
                        <td className={`${table.td} ${table.nowrap}`}>{formatShortDate(invoice.dueAt)}</td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {formatMoney(invoice.totalMinor, invoice.currency)}
                        </td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {invoice.totalMinor - invoice.paidMinor <= 0
                            ? 'Paid'
                            : formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className={styles.columns}>
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Documents</h2>
                <span className={table.count}>{project.documents.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">Document</th>
                    <th className={table.th} scope="col">Status</th>
                    <th className={table.th} scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {project.documents.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={3}>
                        <p className={table.emptyTitle}>No documents yet</p>
                        <p className={table.emptyHint}>Start a proposal or agreement on the right.</p>
                      </td>
                    </tr>
                  ) : (
                    project.documents.map((document) => (
                      <tr key={document.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/documents/${document.reference}`} className={table.link}>
                            {document.title}
                          </Link>
                          <span className={table.sub}>
                            {DOCUMENT_KIND_LABEL[document.kind]} · {document.reference}
                          </span>
                        </td>
                        <td className={table.td}>
                          <span className={`${forms.badge} ${document.status === 'signed' ? forms.badgeGood : document.status === 'declined' ? forms.badgeBad : ['sent', 'viewed', 'changes_requested'].includes(document.status) ? forms.badgeWarn : ''}`}>
                            {DOCUMENT_STATUS_LABEL[document.status]}
                          </span>
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>{formatRelative(document.updatedAt, now)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>New document</h2>
            </div>
            <NewDocument projectId={project.id} projectName={project.name} />
          </section>
        </div>
      )}

      {tab === 'updates' && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Updates for the client</h2>
            <span className={forms.cardMeta}>Shown in their portal and emailed to them</span>
          </div>
          <UpdateComposer projectId={project.id} updates={updates} />
        </section>
      )}

      {tab === 'activity' && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Stage history</h2>
          </div>
          <ul className={styles.history}>
            {project.statusEvents.map((event) => (
              <li key={event.id} className={styles.historyItem}>
                {event.from
                  ? `${STAFF_LABEL[event.from]} to ${STAFF_LABEL[event.to]}`
                  : `Created as ${STAFF_LABEL[event.to]}`}
                <span className={styles.rowLabel}> · {formatRelative(event.createdAt, now)}</span>
                {event.note && <p className={styles.historyNote}>{event.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
