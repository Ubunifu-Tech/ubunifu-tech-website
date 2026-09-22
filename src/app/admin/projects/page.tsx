import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Projects' };

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

/**
 * "Live" is the default view, and it means work that is actually moving — not
 * every project ever created. A list that opens on all of them is a list
 * nobody reads by the third month.
 */
const FILTERS = [
  { key: 'live', label: 'Live' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'waiting', label: 'Waiting on someone' },
  { key: 'done', label: 'Finished' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.ProjectWhereInput {
  switch (key) {
    case 'pipeline':
      return {
        status: { in: ['lead', 'proposal_draft', 'proposal_sent', 'proposal_accepted', 'contract_sent'] },
      };
    case 'waiting':
      return { status: { in: ['proposal_sent', 'contract_sent', 'client_review', 'on_hold'] } };
    case 'done':
      return { status: { in: ['launched', 'handover', 'closed', 'cancelled'] } };
    case 'all':
      return {};
    default:
      return {
        status: { in: ['contract_signed', 'in_progress', 'client_review', 'launch_ready'] },
      };
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireStaff();
  const { show } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'live';

  const projects = await db.project.findMany({
    where: { deletedAt: null, ...filterToWhere(active) },
    orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      reference: true,
      status: true,
      serviceLine: true,
      currency: true,
      targetDate: true,
      client: { select: { name: true } },
      owner: { select: { name: true } },
      lineItems: {
        where: { status: { in: ['planned', 'active'] } },
        select: { amountMinor: true, quantity: true },
      },
      assetRequests: { where: { status: 'requested' }, select: { id: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            The <span className={styles.headingAccent}>work</span>
          </h1>
          <p className={styles.lead}>
            Committed value counts the lines we still expect to bill — planned and active. Deferred,
            paused and waived lines are excluded, because a number that includes them is not a
            number anyone can act on.
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'live' ? '/projects' : `/projects?show=${filter.key}`}
            className={styles.filter}
            aria-current={filter.key === active}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <p className={styles.empty}>
          {active === 'live'
            ? 'Nothing in flight. Everything is either still in the pipeline or finished.'
            : 'Nothing here.'}
        </p>
      ) : (
        <div className={styles.stack}>
          {projects.map((project) => {
            const committed = project.lineItems.reduce(
              (total, line) => total + line.amountMinor * line.quantity,
              0,
            );
            const unpriced = project.lineItems.some((line) => line.amountMinor === 0);

            return (
              <article key={project.id} className={styles.record}>
                <div className={styles.recordHead}>
                  <h2 className={styles.recordName}>
                    <Link href={`/projects/${project.slug}`} className={styles.recordLink}>
                      {project.name}
                    </Link>
                  </h2>
                  <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
                    {STAFF_LABEL[project.status]}
                  </span>
                </div>
                <p className={styles.recordMeta}>
                  {project.client.name} · {project.reference}
                  {project.owner ? ` · ${project.owner.name}` : ''}
                  {project.targetDate ? ` · target ${formatShortDate(project.targetDate)}` : ''}
                </p>

                <div className={styles.rows}>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>Committed</span>
                    <span className={styles.rowValue}>
                      {formatMoney(committed, project.currency)}
                      {unpriced && (
                        <span className={`${forms.badge} ${forms.badgeWarn}`}>
                          {' '}
                          Some lines have no price yet
                        </span>
                      )}
                    </span>
                  </div>
                  {project.assetRequests.length > 0 && (
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Waiting on the client</span>
                      <span className={styles.rowValue}>
                        {project.assetRequests.length} thing
                        {project.assetRequests.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
