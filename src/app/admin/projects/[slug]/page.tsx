import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { guardsFor, loadGuardFacts, transitionsFor } from '@/lib/console/transitions';
import { billableLines } from '@/lib/console/billing';
import { periodLabel } from '@/lib/console/renewals';
import { INVOICE_STATUS_LABEL } from '@/lib/console/billing-labels';
import {
  formatMoney,
  formatRelative,
  formatShortDate,
  minorUnitScale,
  toDateInputValue,
} from '@/lib/console/money';
import { MoveControls } from './MoveControls';
import { LineItemRow } from './LineItemRow';
import { DeliverableToggle } from './DeliverableToggle';
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

/** Minor units back into something a person types, without touching a float. */
function amountInput(amountMinor: number, currency: string): string {
  if (amountMinor === 0) return '';
  const scale = minorUnitScale(currency);
  if (scale === 0) return String(amountMinor);
  const units = Math.trunc(amountMinor / 10 ** scale);
  const fraction = Math.abs(amountMinor % 10 ** scale);
  return `${units}.${String(fraction).padStart(scale, '0')}`;
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff();
  const { slug } = await params;
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
      client: { select: { id: true, name: true } },
      owner: { select: { name: true } },
      phases: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          goal: true,
          status: true,
          deliverables: {
            orderBy: { position: 'asc' },
            select: { id: true, title: true, isComplete: true },
          },
        },
      },
      assetRequests: {
        orderBy: { position: 'asc' },
        select: { id: true, title: true, detail: true, status: true },
      },
      lineItems: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          terms: true,
          amountMinor: true,
          quantity: true,
          currency: true,
          status: true,
          billingKind: true,
          nextDueAt: true,
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
        take: 12,
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

  // Shown before anything is clicked, so the blockers are visible while there
  // is still time to clear them rather than at the moment of refusal.
  const standingBlocks = [...new Set(transitions.flatMap((t) => guardsFor(t.to, facts)))].filter(
    (guard) => guard.severity === 'block',
  );

  const committed = project.lineItems
    .filter((line) => line.status === 'planned' || line.status === 'active')
    .reduce((total, line) => total + line.amountMinor * line.quantity, 0);

  const totalDeliverables = project.phases.reduce((n, p) => n + p.deliverables.length, 0);
  const doneDeliverables = project.phases.reduce(
    (n, p) => n + p.deliverables.filter((d) => d.isComplete).length,
    0,
  );

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/projects" className={styles.backLink}>
            ← Projects
          </Link>
          <h1 className={styles.heading}>{project.name}</h1>
          <p className={styles.lead}>
            {project.client.name} · {project.reference}
            {project.owner ? ` · ${project.owner.name}` : ''}
          </p>
        </div>
        <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
          {STAFF_LABEL[project.status]}
        </span>
      </div>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Where it goes next</h2>
              <span className={forms.cardMeta}>
                {doneDeliverables} of {totalDeliverables} items done
              </span>
            </div>

            {standingBlocks.length > 0 && (
              <ul className={styles.warnList}>
                {standingBlocks.map((guard, index) => (
                  <li key={index} className={styles.warnItem}>
                    {guard.message}
                  </li>
                ))}
              </ul>
            )}

            <MoveControls
              projectId={project.id}
              status={project.status}
              transitions={transitions}
            />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>The work</h2>
              <span className={forms.cardMeta}>
                {project.startDate ? `From ${formatShortDate(project.startDate)}` : 'No start date'}
                {project.targetDate ? ` to ${formatShortDate(project.targetDate)}` : ''}
              </span>
            </div>

            {project.phases.length === 0 ? (
              <p className={styles.note}>
                No phases yet. This project was started from an empty plan.
              </p>
            ) : (
              project.phases.map((phase) => (
                <div key={phase.id} className={styles.phase}>
                  <div className={styles.phaseHead}>
                    <h3 className={styles.phaseName}>{phase.name}</h3>
                    <span className={forms.cardMeta}>
                      {phase.deliverables.filter((d) => d.isComplete).length}/
                      {phase.deliverables.length}
                    </span>
                  </div>
                  {phase.goal && <p className={styles.phaseGoal}>{phase.goal}</p>}
                  <ul className={styles.checkList}>
                    {phase.deliverables.map((deliverable) => (
                      <li key={deliverable.id}>
                        <DeliverableToggle
                          id={deliverable.id}
                          title={deliverable.title}
                          complete={deliverable.isComplete}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>The money</h2>
              <span className={forms.cardMeta}>
                Committed {formatMoney(committed, project.currency)}
              </span>
            </div>

            {project.lineItems.length === 0 ? (
              <p className={styles.note}>No fee lines on this project yet.</p>
            ) : (
              <>
                {project.lineItems.map((line) => (
                  <LineItemRow
                    key={line.id}
                    id={line.id}
                    label={line.label}
                    terms={line.terms}
                    amount={amountInput(line.amountMinor, line.currency)}
                    currency={line.currency}
                    status={line.status}
                    recurring={
                      line.billingKind === 'recurring_monthly' ||
                      line.billingKind === 'recurring_annual'
                    }
                    nextDueAt={toDateInputValue(line.nextDueAt)}
                  />
                ))}
                <p className={styles.total}>
                  <span>Committed — planned and active only</span>
                  <span>{formatMoney(committed, project.currency)}</span>
                </p>
              </>
            )}
          </section>

          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Invoices</h2>
                <span className={table.count}>
                  {project.invoices.length === 0
                    ? 'Nothing raised yet'
                    : `${project.invoices.length} raised`}
                </span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">Number</th>
                    <th className={table.th} scope="col">State</th>
                    <th className={table.th} scope="col">Due</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Total</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Outstanding</th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {project.invoices.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={6}>
                        <p className={table.emptyTitle}>No invoices on this project.</p>
                        <p className={table.emptyHint}>
                          Raise one below from the fee lines that are due.
                        </p>
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
                        <td className={table.td}>
                          {INVOICE_STATUS_LABEL[invoice.status]}
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>
                          {formatShortDate(invoice.dueAt)}
                        </td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {formatMoney(invoice.totalMinor, invoice.currency)}
                        </td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {invoice.totalMinor - invoice.paidMinor <= 0 ? (
                            <span className={table.muted}>—</span>
                          ) : (
                            formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency)
                          )}
                        </td>
                        <td className={`${table.td} ${table.actions}`}>
                          <span className={table.actionGroup}>
                            <Link href={`/invoices/${invoice.number}`} className={table.action}>
                              Open
                            </Link>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Documents</h2>
                <span className={table.count}>
                  Proposals, agreements and anything else they have to read
                </span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={`${table.table} ${table.compact}`}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">Document</th>
                    <th className={table.th} scope="col">Kind</th>
                    <th className={table.th} scope="col">State</th>
                    <th className={`${table.th} ${table.numericHead}`} scope="col">Versions</th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {project.documents.length === 0 ? (
                    <tr>
                      <td className={table.emptyCell} colSpan={5}>
                        <p className={table.emptyTitle}>No documents on this project.</p>
                        <p className={table.emptyHint}>Start one below.</p>
                      </td>
                    </tr>
                  ) : (
                    project.documents.map((document) => (
                      <tr key={document.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/documents/${document.reference}`} className={table.link}>
                            {document.title}
                          </Link>
                          <span className={table.sub}>{document.reference}</span>
                        </td>
                        <td className={`${table.td} ${table.nowrap}`}>
                          {DOCUMENT_KIND_LABEL[document.kind]}
                        </td>
                        <td className={table.td}>{DOCUMENT_STATUS_LABEL[document.status]}</td>
                        <td className={`${table.td} ${table.numeric}`}>
                          {document.versions.length}
                        </td>
                        <td className={`${table.td} ${table.actions}`}>
                          <span className={table.actionGroup}>
                            <Link
                              href={`/documents/${document.reference}`}
                              className={table.action}
                            >
                              Open
                            </Link>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Start a document</h2>
              <span className={forms.cardMeta}>Written here, drafted with help if you want it</span>
            </div>
            <NewDocument projectId={project.id} projectName={project.name} />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Tell the client</h2>
              <span className={forms.cardMeta}>
                Goes to everyone on this client who can sign in
              </span>
            </div>
            <UpdateComposer projectId={project.id} updates={updates} />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Raise an invoice</h2>
              <span className={forms.cardMeta}>From what is still owed on this project</span>
            </div>
            <RaiseInvoice
              projectId={project.id}
              lines={toBill}
              defaultDue={toDateInputValue(defaultDue)}
            />
          </section>
        </div>

        <div className={styles.stack}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>From the client</h2>
              <span className={forms.cardMeta}>
                {facts.outstandingAssetRequests} outstanding
              </span>
            </div>
            {project.assetRequests.length === 0 ? (
              <p className={styles.note}>Nothing was asked for on this project.</p>
            ) : (
              <div className={styles.rows}>
                {project.assetRequests.map((request) => (
                  <AssetRequestRow
                    key={request.id}
                    id={request.id}
                    title={request.title}
                    detail={request.detail}
                    status={request.status}
                  />
                ))}
              </div>
            )}
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>What has happened</h2>
            </div>
            <ul className={styles.history}>
              {project.statusEvents.map((event) => (
                <li key={event.id} className={styles.historyItem}>
                  {event.from
                    ? `${STAFF_LABEL[event.from]} → ${STAFF_LABEL[event.to]}`
                    : `Created as ${STAFF_LABEL[event.to]}`}
                  <span className={styles.rowLabel}>
                    {' '}
                    · {formatRelative(event.createdAt, now)}
                  </span>
                  {event.note && <p className={styles.historyNote}>{event.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
