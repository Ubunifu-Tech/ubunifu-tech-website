import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { guardsFor, loadGuardFacts, transitionsFor } from '@/lib/console/transitions';
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
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

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
      statusEvents: {
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, from: true, to: true, note: true, createdAt: true, actorType: true },
      },
    },
  });

  if (!project) notFound();

  const [transitions, facts] = await Promise.all([
    transitionsFor(project),
    loadGuardFacts(project.id),
  ]);

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
