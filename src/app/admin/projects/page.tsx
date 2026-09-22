import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Projects' };

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

const SERVICE_LABEL: Record<string, string> = {
  web: 'Web',
  hosting: 'Hosting',
  branding: 'Branding',
  data: 'Data',
  ai: 'AI',
  strategy: 'Strategy',
  product: 'Product',
  other: 'Other',
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
        status: {
          in: ['lead', 'proposal_draft', 'proposal_sent', 'proposal_accepted', 'contract_sent'],
        },
      };
    case 'waiting':
      return { status: { in: ['proposal_sent', 'contract_sent', 'client_review', 'on_hold'] } };
    case 'done':
      return { status: { in: ['launched', 'handover', 'closed', 'cancelled'] } };
    case 'all':
      return {};
    default:
      return { status: { in: ['contract_signed', 'in_progress', 'client_review', 'launch_ready'] } };
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
      client: { select: { name: true, slug: true } },
      owner: { select: { name: true } },
      lineItems: {
        where: { status: { in: ['planned', 'active'] } },
        select: { amountMinor: true, quantity: true, currency: true },
      },
      assetRequests: { where: { status: 'requested' }, select: { id: true } },
      phases: { select: { deliverables: { select: { isComplete: true } } } },
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
            Committed counts the lines we still expect to bill — planned and active. Deferred,
            paused and waived are left out, because a number that includes them is not one anyone
            can act on.
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

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>
              {FILTERS.find((f) => f.key === active)?.label ?? 'Projects'}
            </h2>
            <span className={table.count}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
        </div>

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Stage</th>
                <th className={table.th} scope="col">Progress</th>
                <th className={table.th} scope="col">Target</th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">Committed</th>
                <th className={table.th} scope="col">Owner</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={8}>
                    <p className={table.emptyTitle}>
                      {active === 'live' ? 'Nothing in flight.' : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {active === 'live'
                        ? 'Everything is either still in the pipeline or already finished.'
                        : 'Try another view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const deliverables = project.phases.flatMap((p) => p.deliverables);
                  const done = deliverables.filter((d) => d.isComplete).length;
                  const committed = project.lineItems
                    .filter((line) => line.currency === project.currency)
                    .reduce((total, line) => total + line.amountMinor * line.quantity, 0);
                  const unpriced = project.lineItems.some((line) => line.amountMinor === 0);

                  return (
                    <tr key={project.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/projects/${project.slug}`} className={table.link}>
                          {project.name}
                        </Link>
                        <span className={table.sub}>
                          {project.reference} · {SERVICE_LABEL[project.serviceLine]}
                        </span>
                      </td>
                      <td className={table.td}>
                        <Link href={`/clients/${project.client.slug}`} className={table.link}>
                          {project.client.name}
                        </Link>
                      </td>
                      <td className={table.td}>
                        <span
                          className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}
                        >
                          {STAFF_LABEL[project.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {deliverables.length === 0 ? (
                          <span className={table.muted}>No plan</span>
                        ) : (
                          `${done}/${deliverables.length}`
                        )}
                        {project.assetRequests.length > 0 && (
                          <span className={table.sub}>
                            waiting on {project.assetRequests.length} from them
                          </span>
                        )}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(project.targetDate)}
                      </td>
                      <td className={`${table.td} ${table.numeric}`}>
                        {formatMoney(committed, project.currency)}
                        {unpriced && <span className={table.sub}>some lines unpriced</span>}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {project.owner?.name ?? <span className={table.muted}>Nobody</span>}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <span className={table.actionGroup}>
                          <Link href={`/projects/${project.slug}`} className={table.action}>
                            Open
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
