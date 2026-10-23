import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { can, requireStaff } from '@/lib/console/auth';
import { formatMoney, formatShortDate, isPastDay, numbers } from '@/lib/console/money';
import { waitingOnClient } from '@/lib/console/live';
import { STAGE_LABEL, STAGE_OF, statusesIn } from '@/lib/console/stages';
import { ListFooter, ListToolbar, searchText } from '@/components/console/ListToolbar';
import { pageNumber, pageWindow } from '@/lib/console/paging';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Projects' };

/**
 * Work in progress is the default view: the projects actually moving, not
 * every project ever created. The view keys are the ones links have always
 * used, so an old bookmark still opens the same slice.
 */
const FILTERS = [
  { key: 'live', label: 'In progress' },
  { key: 'pipeline', label: 'Deals' },
  { key: 'waiting', label: 'Waiting on someone' },
  { key: 'done', label: 'Finished' },
  { key: 'all', label: 'Everything' },
] as const;

function filterToWhere(key: string): Prisma.ProjectWhereInput {
  switch (key) {
    case 'pipeline':
      return { status: { in: statusesIn('deal') } };
    case 'waiting':
      return { status: { in: ['proposal_sent', 'contract_sent', 'client_review', 'on_hold'] } };
    case 'done':
      return { status: { in: [...statusesIn('delivered'), 'closed', 'cancelled'] } };
    case 'all':
      return {};
    default:
      return { status: { in: statusesIn('in_progress') } };
  }
}

const SELECT = {
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
    select: { amountMinor: true, quantity: true, currency: true, billingKind: true },
  },
  assetRequests: { where: waitingOnClient, select: { id: true } },
  phases: { select: { deliverables: { select: { isComplete: true } } } },
  // A proposal or agreement sent back with changes: the next move is ours.
  documents: { where: { status: 'changes_requested' }, select: { id: true }, take: 1 },
} satisfies Prisma.ProjectSelect;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; view?: string; q?: string; page?: string }>;
}) {
  const staff = await requireStaff();
  const canRun = can(staff, 'projects');
  // What a project is worth is the fees on it: shown to those who see fees.
  const seesValue = can(staff, 'fees') || can(staff, 'invoices');
  // ?view=board and ?view=list are what old links carry; there is only the list now.
  const { show, q, page } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'live';
  const query = searchText(q);

  const now = new Date();
  const matching: Prisma.ProjectWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
        ],
      }
    : {};

  const viewCounts = await Promise.all(
    FILTERS.map((filter) =>
      db.project.count({
        where: { AND: [{ deletedAt: null }, filterToWhere(filter.key), matching] },
      }),
    ),
  );
  const total = viewCounts[FILTERS.findIndex((f) => f.key === active)] ?? 0;
  const shown = pageWindow(pageNumber(page), total);

  const projects = numbers(await db.project.findMany({
    where: { AND: [{ deletedAt: null }, filterToWhere(active), matching] },
    orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    skip: shown.skip,
    take: shown.take,
    select: SELECT,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Projects</h1>
        </div>
        {canRun && (
          <div className={styles.headActions}>
            <Link href="/projects/new" className={forms.button}>
              Start a project
            </Link>
          </div>
        )}
      </div>

      <div className={table.frame}>
        <ListToolbar
          path="/projects"
          views={FILTERS.map((filter, index) => ({ ...filter, count: viewCounts[index] ?? 0 }))}
          current={active}
          defaultView="live"
          query={query}
          searchLabel="Search projects"
        />

        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Project</th>
                <th className={table.th} scope="col">Number</th>
                <th className={table.th} scope="col">Client</th>
                <th className={table.th} scope="col">Lead</th>
                <th className={table.th} scope="col">Stage</th>
                <th className={table.th} scope="col">Progress</th>
                <th className={table.th} scope="col">Target</th>
                {seesValue && (
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Value</th>
                )}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={seesValue ? 8 : 7}>
                    <p className={table.emptyTitle}>
                      {query
                        ? `No projects match “${query}” here.`
                        : active === 'live'
                          ? 'Nothing in flight.'
                          : 'Nothing here.'}
                    </p>
                    <p className={table.emptyHint}>
                      {query
                        ? 'Try another view, or search for something else.'
                        : active === 'live'
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
                  // A usage fee is billed as used, so it needs no price.
                  const unpriced = project.lineItems.some(
                    (line) => line.amountMinor === 0 && line.billingKind !== 'usage',
                  );
                  const finished = ['launched', 'handover', 'closed', 'cancelled'].includes(
                    project.status,
                  );
                  const late = !finished && isPastDay(project.targetDate, now);

                  return (
                    <tr key={project.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/projects/${project.slug}`} className={table.link}>
                          {project.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{project.reference}</td>
                      <td className={`${table.td} ${table.name}`}>
                        <Link href={`/clients/${project.client.slug}`} className={table.link}>
                          {project.client.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {project.owner?.name ?? <span className={table.muted}>Nobody yet</span>}
                      </td>
                      <td className={table.td}>
                        <span className={`${forms.badge} ${project.documents.length > 0 ? forms.badgeWarn : ''}`}>
                          {project.documents.length > 0 ? 'Changes asked' : STAGE_LABEL[STAGE_OF[project.status]]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {deliverables.length === 0 ? (
                          <span className={table.muted}>No plan</span>
                        ) : (
                          <span className={table.progress}>
                            <span className={table.progressTrack} aria-hidden="true">
                              <span
                                className={table.progressFill}
                                style={{ width: `${Math.round((done / deliverables.length) * 100)}%` }}
                              />
                            </span>
                            {done} of {deliverables.length}
                          </span>
                        )}
                      </td>
                      <td
                        className={`${table.td} ${table.nowrap} ${late ? table.late : ''}`}
                        title={late ? 'Past its target date' : undefined}
                      >
                        {formatShortDate(project.targetDate)}
                      </td>
                      {seesValue && (
                        <td
                          className={`${table.td} ${table.numeric}`}
                          title={unpriced ? 'Some fee lines have no price yet' : undefined}
                        >
                          {formatMoney(committed, project.currency)}
                          {/* Said in the cell too: a phone has no hover. */}
                          {unpriced && <span className={table.muted}>, part priced</span>}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter
          shown={projects.length}
          total={total}
          noun={['project', 'projects']}
          query={query}
          paging={{ page: shown.page, path: '/projects', params: { show, q: query } }}
        />
      </div>
    </main>
  );
}
