import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
import {
  ENGAGEMENTS,
  SERVICE_LABEL,
  SERVICE_LINES,
  STAFF_LABEL,
  STATUS_TONE,
} from '@/lib/console/project-status';
import {
  documentStage,
  guardsFor,
  loadGuardFacts,
  transitionsFor,
} from '@/lib/console/transitions';
import { activityFor } from '@/lib/console/activity';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { Figures } from '@/components/console/Figures';
import { StageCatchUp, StageTrack } from './StageTrack';
import { billableLines } from '@/lib/console/billing';
import { getOrg } from '@/lib/console/org';
import { periodLabel } from '@/lib/console/renewals';
import { fileSize } from '@/lib/console/uploads';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import {
  formatMoney,
  formatRelative,
  formatShortDate,
  toDateInputValue,
  todayInput,
} from '@/lib/console/money';
import { MoveControls, type StageAction } from './MoveControls';
import { FeeEditor, type FeeRow } from '@/components/console/FeeEditor';
import { Tabs } from '@/components/console/Tabs';
import { Callout } from '@/components/console/Callout';
import { LeadSelect, TaskRow } from './TaskRow';
import { AssetRequestRow } from './AssetRequestRow';
import { RaiseInvoice, type BillableLine } from './RaiseInvoice';
import { EarlyPayment } from './EarlyPayment';
import { UpdateComposer, type UpdateRow } from './UpdateComposer';
import { NewDocument } from './NewDocument';
import { AddPhase, AddTask, AskForSomething, PhaseHead, ProjectDetailsCard } from './PlanEditor';
import { BrandKitEditor } from './BrandKitEditor';
import { RemoveProject } from './RemoveProject';
import { ProjectDocuments } from '../../documents/ProjectDocuments';
import { currencyLabel } from '@/lib/console/currencies';
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

/** "21 Sept 2026 to 31 Oct 2026", or as much of it as is known. */
function dateRange(start: Date | null, end: Date | null): string {
  if (start && end) return `${formatShortDate(start)} to ${formatShortDate(end)}`;
  if (start) return `From ${formatShortDate(start)}`;
  if (end) return `Until ${formatShortDate(end)}`;
  return 'No dates yet';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await db.project.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true, reference: true },
  });
  return { title: project ? `${project.reference} · ${project.name}` : 'Project' };
}

const TABS = ['overview', 'plan', 'brand', 'fees', 'documents', 'updates', 'activity'] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const staff = await requireStaff();
  const { slug } = await params;
  const mayRun = can(staff, 'projects');
  const mayFees = can(staff, 'fees');
  const mayMoney = can(staff, 'invoices');
  const mayDocs = can(staff, 'documents');
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as Tab)
    : 'overview';
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
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              canSignIn: true,
              activatedAt: true,
            },
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
          startDate: true,
          endDate: true,
          deliverables: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              isComplete: true,
              dueAt: true,
              assigneeId: true,
              isClientVisible: true,
            },
          },
        },
      },
      brandKit: {
        select: {
          typography: true,
          principles: true,
          imageryDirection: true,
          notes: true,
          colors: { orderBy: { position: 'asc' }, select: { name: true, hex: true, usage: true } },
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
          response: true,
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

  const [transitions, facts, billable, org] = await Promise.all([
    transitionsFor(project),
    loadGuardFacts(project.id),
    billableLines(project.id),
    getOrg(),
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
        item.periodStart && item.periodEnd ? periodLabel(item.periodStart, item.periodEnd) : null,
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
    blockedFix:
      guardsFor(transition.to, facts).find((guard) => guard.severity === 'block')?.fix ?? null,
  }));

  // What the client has agreed to pay, split by how often: a one-off build and
  // a yearly renewal added into one number is a figure nobody is charged.
  const agreed = project.lineItems.filter(
    (line) => line.status === 'planned' || line.status === 'active',
  );
  const agreedSum = (kinds: string[]) =>
    agreed
      .filter((line) => kinds.includes(line.billingKind))
      .reduce((total, line) => total + line.amountMinor * line.quantity, 0);
  const agreedParts = [
    { amount: agreedSum(['one_off', 'installment', 'usage']), per: '' },
    { amount: agreedSum(['recurring_monthly']), per: ' a month' },
    { amount: agreedSum(['recurring_annual']), per: ' a year' },
  ]
    .filter((part) => part.amount > 0)
    .map((part) => `${formatMoney(part.amount, project.currency)}${part.per}`);
  const notChargedNow = project.lineItems.filter(
    (line) => line.status === 'deferred' || line.status === 'paused',
  ).length;

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
  // A draft has not been sent, so nobody has been asked for it yet.
  const invoiced = project.invoices
    .filter(
      (invoice) =>
        invoice.status !== 'void' &&
        invoice.status !== 'draft' &&
        invoice.currency === project.currency,
    )
    .reduce((total, invoice) => total + invoice.totalMinor, 0);
  const paid = project.invoices
    .filter((invoice) => invoice.currency === project.currency)
    .reduce((total, invoice) => total + invoice.paidMinor, 0);
  const unpriced = fees.filter(
    (fee) => (fee.status === 'planned' || fee.status === 'active') && fee.amountMinor === 0,
  ).length;
  const outstandingAssets = project.assetRequests.filter(
    (request) => request.status === 'requested',
  ).length;

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
    ...team.map((person) => ({
      value: person.id,
      label: person.name,
      hint: person.title ?? undefined,
    })),
  ];
  const theirPeople = [
    { value: '', label: 'Anyone at the client' },
    ...project.client.contacts.map((contact) => ({ value: contact.id, label: contact.name })),
  ];

  // Documents already further on than the project: a signed agreement on a
  // project that still reads "Lead", from before documents moved projects on.
  const behind = documentStage(project.status, project.documents);

  const overdue = project.invoices
    .filter(
      (invoice) =>
        invoice.currency === project.currency &&
        (invoice.status === 'sent' ||
          invoice.status === 'part_paid' ||
          invoice.status === 'overdue') &&
        invoice.dueAt !== null &&
        invoice.dueAt < now,
    )
    .reduce((total, invoice) => total + Math.max(0, invoice.totalMinor - invoice.paidMinor), 0);

  const delivered = ['launched', 'handover', 'closed', 'cancelled'].includes(project.status);
  const daysToTarget = project.targetDate
    ? Math.ceil((project.targetDate.getTime() - now.getTime()) / 86_400_000)
    : null;
  const late = !delivered && daysToTarget !== null && daysToTarget < 0;
  const targetNote =
    daysToTarget === null
      ? 'No date agreed yet'
      : delivered
        ? 'Delivered'
        : late
          ? `${-daysToTarget} ${daysToTarget === -1 ? 'day' : 'days'} late`
          : daysToTarget === 0
            ? 'Today'
            : `In ${daysToTarget} ${daysToTarget === 1 ? 'day' : 'days'}`;

  const signedAgreement = project.documents.find(
    (document) =>
      document.status === 'signed' &&
      (document.kind === 'contract' || document.kind === 'statement_of_work'),
  );
  // Invoice and payment lines only for those who handle money.
  const activityIds = [
    project.id,
    ...project.documents.map((d) => d.id),
    ...(mayMoney ? project.invoices.map((i) => i.id) : []),
  ];
  const recent = await activityFor(activityIds, tab === 'activity' ? 60 : 6);

  const href = (key: Tab) =>
    key === 'overview' ? `/projects/${project.slug}` : `/projects/${project.slug}?tab=${key}`;
  const percent =
    totalDeliverables > 0 ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0;

  return (
    <main className={styles.page}>
      <div className={styles.projectTop}>
        <Link href="/projects" className={styles.backLink}>
          ← Projects
        </Link>
        <div className={styles.projectTitleRow}>
          <div className={styles.headText}>
            <h1 className={styles.heading}>{project.name}</h1>
            <p className={styles.projectMeta}>
              <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
                {STAFF_LABEL[project.status]}
              </span>
              <Link href={`/clients/${project.client.slug}`} className={styles.inlineLink}>
                {project.client.name}
              </Link>
              <span>{project.reference}</span>
              <span>{SERVICE_LABEL[project.serviceLine] ?? project.serviceLine}</span>
            </p>
          </div>
          <div className={styles.headActions}>
            {mayRun ? (
              <LeadSelect projectId={project.id} ownerId={project.ownerId ?? ''} people={people} />
            ) : (
              <span className={styles.leadRead}>
                Owner: {team.find((person) => person.id === project.ownerId)?.name ?? 'nobody yet'}
              </span>
            )}
          </div>
        </div>
        <StageTrack
          status={project.status}
          statusLabel={STAFF_LABEL[project.status]}
          pausedAt={
            project.status === 'on_hold' || project.status === 'cancelled'
              ? (project.statusEvents.find((event) => event.to === project.status)?.from ?? null)
              : null
          }
          heldFrom={
            project.status === 'cancelled'
              ? (project.statusEvents.find((event) => event.to === 'on_hold')?.from ?? null)
              : null
          }
        />
      </div>

      {mayRun && behind && (
        <StageCatchUp
          projectId={project.id}
          reference={behind.reference}
          what={behind.milestone === 'signed' ? 'signed' : 'with the client to sign'}
          to={STAFF_LABEL[behind.to].toLowerCase()}
        />
      )}

      <Figures
        label="This project at a glance"
        items={[
          {
            label: 'Progress',
            value:
              totalDeliverables === 0
                ? 'No plan yet'
                : `${doneDeliverables} of ${totalDeliverables}`,
            note:
              totalDeliverables === 0
                ? 'Add phases and tasks on the Plan tab'
                : `${percent}% of tasks done`,
            href: href('plan'),
          },
          ...(mayFees || mayMoney
            ? [
                {
                  label: 'Agreed fees',
                  value:
                    agreedParts[0] ??
                    (fees.length === 0 ? 'None yet' : formatMoney(0, project.currency)),
                  note:
                    fees.length === 0
                      ? 'No fees set yet'
                      : unpriced > 0
                        ? `${unpriced} ${unpriced === 1 ? 'fee needs' : 'fees need'} a price`
                        : [
                            agreedParts.length > 1
                              ? `plus ${agreedParts.slice(1).join(' and ')}`
                              : `${agreed.length} ${agreed.length === 1 ? 'fee' : 'fees'}`,
                            notChargedNow > 0 ? `${notChargedNow} not charged for now` : null,
                          ]
                            .filter(Boolean)
                            .join(', '),
                  tone: unpriced > 0 ? ('warn' as const) : undefined,
                  href: href('fees'),
                },
              ]
            : []),
          ...(mayMoney
            ? [
                {
                  label: 'Invoiced',
                  value: formatMoney(invoiced, project.currency),
                  note:
                    project.invoices.length === 0
                      ? 'Nothing invoiced yet'
                      : `${project.invoices.length} ${project.invoices.length === 1 ? 'invoice' : 'invoices'}`,
                  href: href('fees'),
                },
                {
                  label: 'Paid',
                  value: formatMoney(paid, project.currency),
                  note:
                    overdue > 0
                      ? `${formatMoney(overdue, project.currency)} past due`
                      : invoiced - paid > 0
                        ? `${formatMoney(invoiced - paid, project.currency)} still to come in`
                        : invoiced > 0
                          ? 'All invoiced money is in'
                          : 'Nothing to collect yet',
                  tone: overdue > 0 ? ('bad' as const) : undefined,
                },
              ]
            : []),
          {
            label: 'Target date',
            value: project.targetDate ? formatShortDate(project.targetDate) : 'Not set',
            note: targetNote,
            tone: late ? ('bad' as const) : undefined,
          },
        ]}
      />

      <Tabs
        current={tab}
        tabs={[
          { key: 'overview', label: 'Overview', href: href('overview') },
          {
            key: 'plan',
            label: 'Plan',
            href: href('plan'),
            count: totalDeliverables - doneDeliverables,
          },
          { key: 'brand', label: 'Brand', href: href('brand') },
          ...(mayFees || mayMoney
            ? [
                {
                  key: 'fees',
                  label: mayMoney ? 'Fees & billing' : 'Fees',
                  href: href('fees'),
                  count: mayMoney ? project.invoices.length : undefined,
                },
              ]
            : []),
          {
            key: 'documents',
            label: 'Documents',
            href: href('documents'),
            count: project.documents.length,
          },
          {
            key: 'updates',
            label: 'Updates',
            href: href('updates'),
            count: project.updates.length,
          },
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
              {mayRun ? (
                <MoveControls
                  projectId={project.id}
                  projectSlug={project.slug}
                  status={project.status}
                  actions={actions}
                />
              ) : (
                <p className={styles.note}>
                  {STAFF_LABEL[project.status]}. Moving a project on is for roles that run projects.
                </p>
              )}
            </section>

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>From the client</h2>
                <span className={forms.cardMeta}>
                  {outstandingAssets === 0
                    ? 'Nothing outstanding'
                    : `${outstandingAssets} outstanding`}
                </span>
              </div>
              {project.assetRequests.length === 0 ? (
                <p className={styles.note}>Nothing asked of the client yet.</p>
              ) : (
                <div className={styles.assetList}>
                  {project.assetRequests.map((request) => (
                    <AssetRequestRow
                      key={request.id}
                      id={request.id}
                      title={request.title}
                      detail={request.detail}
                      status={request.status}
                      response={request.response}
                      assigneeId={request.assigneeId ?? ''}
                      contacts={theirPeople}
                      editable={mayRun}
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
              {mayRun && (
                <AskForSomething
                  projectId={project.id}
                  first={project.assetRequests.length === 0}
                />
              )}
            </section>

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>At a glance</h2>
              </div>
              <ul className={styles.glance}>
                <li>
                  <Link href={href('plan')}>
                    {totalDeliverables === 0
                      ? 'No plan yet'
                      : totalDeliverables - doneDeliverables === 0
                        ? 'All tasks done'
                        : `${totalDeliverables - doneDeliverables} tasks still to do`}
                  </Link>
                </li>
                {(mayFees || mayMoney) && (
                  <li>
                    <Link href={href('fees')}>
                      {fees.length === 0
                        ? 'No fees set yet'
                        : unpriced > 0
                          ? `${unpriced} ${unpriced === 1 ? 'fee needs' : 'fees need'} a price`
                          : agreedParts.length > 0
                            ? `${agreed.length} ${agreed.length === 1 ? 'fee' : 'fees'} agreed: ${agreedParts.join(' and ')}`
                            : `${fees.length} ${fees.length === 1 ? 'fee' : 'fees'}, none charged for now`}
                    </Link>
                  </li>
                )}
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

            <ProjectDetailsCard
              editable={mayRun}
              details={{
                id: project.id,
                name: project.name,
                summary: project.summary ?? '',
                serviceLine: project.serviceLine,
                engagementType: project.engagementType,
                currency: project.currency,
                startDate: toDateInputValue(project.startDate),
                targetDate: toDateInputValue(project.targetDate),
                currencyFixed:
                  project.invoices.length > 0
                    ? 'Stays as it is now that the project has invoices.'
                    : project.lineItems.some((line) => line.amountMinor > 0)
                      ? 'Stays as it is while fees have prices. Clear the prices first to change it.'
                      : null,
              }}
            >
              <dl className={styles.details}>
                <div className={styles.detailsWide}>
                  <dt>What the work is</dt>
                  <dd>{project.summary || 'Not written yet'}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{SERVICE_LINES.find((line) => line.value === project.serviceLine)?.label}</dd>
                </div>
                <div>
                  <dt>How it is billed</dt>
                  <dd>
                    {ENGAGEMENTS.find((kind) => kind.value === project.engagementType)?.label}
                  </dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd>{currencyLabel(project.currency)}</dd>
                </div>
                <div>
                  <dt>Runs</dt>
                  <dd>{dateRange(project.startDate, project.targetDate)}</dd>
                </div>
              </dl>
            </ProjectDetailsCard>
          </div>

          <div className={styles.stack}>
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>People</h2>
              </div>
              <ul className={styles.people}>
                <li>
                  <span className={styles.personName}>
                    {team.find((person) => person.id === project.ownerId)?.name ?? 'Nobody yet'}
                  </span>
                  <span className={styles.personMeta}>Owner at Ubunifu</span>
                </li>
                {project.client.contacts.map((contact) => (
                  <li key={contact.id}>
                    <span className={styles.personName}>
                      {contact.name}
                      <span
                        className={`${forms.badge} ${
                          contact.activatedAt
                            ? forms.badgeGood
                            : contact.canSignIn && contact.email
                              ? forms.badgeWarn
                              : ''
                        }`}
                      >
                        {contact.activatedAt
                          ? 'In the portal'
                          : !contact.canSignIn
                            ? 'No portal'
                            : contact.email
                              ? 'Invited'
                              : 'Needs a setup link'}
                      </span>
                    </span>
                    <span className={styles.personMeta}>
                      {[contact.role, project.client.name].filter(Boolean).join(', ')} ·{' '}
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      ) : (
                        'no email yet'
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Dates</h2>
              </div>
              <dl className={styles.dates}>
                <div>
                  <dt>Started</dt>
                  <dd>{project.startDate ? formatShortDate(project.startDate) : 'Not yet'}</dd>
                </div>
                <div>
                  <dt>Agreement signed</dt>
                  <dd>
                    {signedAgreement ? formatShortDate(signedAgreement.updatedAt) : 'Not yet'}
                  </dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd className={late ? styles.dateLate : ''}>
                    {project.targetDate ? formatShortDate(project.targetDate) : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt>Launched</dt>
                  <dd>{project.launchedAt ? formatShortDate(project.launchedAt) : 'Not yet'}</dd>
                </div>
              </dl>
            </section>

            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>Lately</h2>
                <Link href={href('activity')} className={table.action}>
                  All of it
                </Link>
              </div>
              <ActivityFeed items={recent} now={now} />
            </section>

            {mayRun && (
              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>Remove this project</h2>
                </div>
                <RemoveProject projectId={project.id} projectName={project.name} />
              </section>
            )}
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
          {project.phases.length === 0 && (
            <p className={styles.note}>
              {mayRun
                ? 'No plan yet. Start with the first phase, then add its tasks.'
                : 'This project has no plan yet.'}
            </p>
          )}
          {project.phases.map((phase) => (
            <div key={phase.id} className={styles.phase}>
              <PhaseHead
                editable={mayRun}
                taskCount={phase.deliverables.length}
                phase={{
                  id: phase.id,
                  name: phase.name,
                  goal: phase.goal ?? '',
                  startDate: toDateInputValue(phase.startDate),
                  endDate: toDateInputValue(phase.endDate),
                }}
              >
                <span className={styles.phaseTitle}>
                  <h3 className={styles.phaseName}>{phase.name}</h3>
                  {(phase.startDate || phase.endDate) && (
                    <span className={styles.phaseDates}>
                      {dateRange(phase.startDate, phase.endDate)}
                    </span>
                  )}
                </span>
                <span className={forms.cardMeta}>
                  {phase.deliverables.filter((d) => d.isComplete).length} of{' '}
                  {phase.deliverables.length}
                </span>
              </PhaseHead>
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
                    teamOnly={!deliverable.isClientVisible}
                    editable={mayRun}
                  />
                ))}
              </div>
              {mayRun && <AddTask phaseId={phase.id} />}
            </div>
          ))}
          {mayRun && <AddPhase projectId={project.id} first={project.phases.length === 0} />}
        </section>
      )}

      {tab === 'brand' && (
        <BrandKitEditor projectId={project.id} kit={project.brandKit} editable={mayRun} />
      )}

      {tab === 'fees' && (mayFees || mayMoney) && (
        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Fees</h2>
              <span className={forms.cardMeta}>These appear in every proposal and agreement</span>
            </div>
            {unpriced > 0 && (
              <Callout kind="warn">
                {unpriced === 1 ? 'One fee has' : `${unpriced} fees have`} no price yet. A contract
                cannot be sent until every fee is priced.
              </Callout>
            )}
            <FeeEditor
              projectId={project.id}
              currency={project.currency}
              fees={fees}
              readOnly={!mayFees}
            />
          </section>

          {mayMoney && (
            <>
              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>Raise an invoice</h2>
                  <span className={forms.cardMeta}>From fees not yet invoiced</span>
                </div>
                <RaiseInvoice
                  projectId={project.id}
                  lines={toBill}
                  defaultDue={toDateInputValue(defaultDue)}
                />
              </section>

              <section className={forms.card}>
                <div className={forms.cardHeader}>
                  <h2 className={forms.cardTitle}>Record a payment</h2>
                  <span className={forms.cardMeta}>Paid before an invoice or a signature</span>
                </div>
                <EarlyPayment
                  projectId={project.id}
                  lines={toBill}
                  today={todayInput()}
                  vatBps={org.chargesVat ? org.vatRateBps : 0}
                  reason={
                    fees.length === 0
                      ? 'This project has no fees yet. Add the fee the money is for, then record it here.'
                      : unpriced > 0 && toBill.length === 0
                        ? 'The fees still need prices. Price the one the money is for, then record it here.'
                        : 'Everything due now is already on an invoice. Record the payment on that invoice.'
                  }
                />
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
                        <th className={table.th} scope="col">
                          Number
                        </th>
                        <th className={table.th} scope="col">
                          Status
                        </th>
                        <th className={table.th} scope="col">
                          Due
                        </th>
                        <th className={`${table.th} ${table.numericHead}`} scope="col">
                          Total
                        </th>
                        <th className={`${table.th} ${table.numericHead}`} scope="col">
                          Unpaid
                        </th>
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
                            <td className={`${table.td} ${table.nowrap}`}>
                              {formatShortDate(invoice.dueAt)}
                            </td>
                            <td className={`${table.td} ${table.numeric}`}>
                              {formatMoney(invoice.totalMinor, invoice.currency)}
                            </td>
                            <td className={`${table.td} ${table.numeric}`}>
                              {invoice.totalMinor - invoice.paidMinor <= 0
                                ? 'Paid'
                                : formatMoney(
                                    invoice.totalMinor - invoice.paidMinor,
                                    invoice.currency,
                                  )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className={styles.columns}>
          <ProjectDocuments projectId={project.id} now={now} staff={staff} />

          {mayDocs && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>New document</h2>
              </div>
              <NewDocument projectId={project.id} projectName={project.name} />
            </section>
          )}
        </div>
      )}

      {tab === 'updates' && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Updates for the client</h2>
            <span className={forms.cardMeta}>Shown in their portal and emailed to them</span>
          </div>
          <UpdateComposer projectId={project.id} updates={updates} readOnly={!mayRun} />
        </section>
      )}

      {tab === 'activity' && (
        <div className={styles.columns}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Everything that happened</h2>
            </div>
            <ActivityFeed items={recent} now={now} />
          </section>
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
        </div>
      )}
    </main>
  );
}
