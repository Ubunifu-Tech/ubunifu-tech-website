import Link from 'next/link';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { requireStaff } from '@/lib/console/auth';
import { STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatShortDate } from '@/lib/console/money';
import { transitionsFor } from '@/lib/console/transitions';
import { Avatar } from '@/components/console/Avatar';
import { Board, type BoardCard } from './Board';
import { KanbanSquare, List } from 'lucide-react';
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
    select: { amountMinor: true, quantity: true, currency: true },
  },
  assetRequests: { where: { status: 'requested' }, select: { id: true } },
  phases: { select: { deliverables: { select: { isComplete: true } } } },
} satisfies Prisma.ProjectSelect;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; view?: string }>;
}) {
  await requireStaff();
  const { show, view } = await searchParams;
  const active = FILTERS.some((f) => f.key === show) ? show! : 'live';
  const asList = view === 'list';

  if (!asList) return <BoardView />;

  const projects = await db.project.findMany({
    where: { deletedAt: null, ...filterToWhere(active) },
    orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    select: SELECT,
  });

  return (
    <main className={styles.page}>
      <ProjectsHeader view="list" />

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === 'live' ? '/projects?view=list' : `/projects?view=list&show=${filter.key}`}
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
                <th className={`${table.th} ${table.numericHead}`} scope="col">Value</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className={table.muted}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={7}>
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
                          {project.reference} · {SERVICE_LABEL[project.serviceLine]} ·{' '}
                          {/* The owner is a fact about the project, not a column
                              anybody sorts by — it reads better under the name. */}
                          {project.owner?.name ?? 'nobody yet'}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.name}`}>
                        <span className={table.who}>
                          <Avatar name={project.client.name} size="sm" />
                          <Link href={`/clients/${project.client.slug}`} className={table.link}>
                            {project.client.name}
                          </Link>
                        </span>
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

/** Title, one line of help, and the switch between the board and the list. */
function ProjectsHeader({ view }: { view: 'board' | 'list' }) {
  return (
    <div className={styles.pageHead}>
      <div className={styles.headText}>
        <h1 className={styles.heading}>Projects</h1>
        <p className={styles.lead}>
          {view === 'board'
            ? 'Drag a project to move it to its next stage.'
            : 'Every project, with its value and how far along it is.'}
        </p>
      </div>
      <div className={styles.headActions}>
        <nav className={styles.viewSwitch} aria-label="View">
          <Link href="/projects" className={styles.viewOption} aria-current={view === 'board' ? 'page' : undefined}>
            <KanbanSquare size={16} strokeWidth={2} aria-hidden="true" />
            Board
          </Link>
          <Link href="/projects?view=list" className={styles.viewOption} aria-current={view === 'list' ? 'page' : undefined}>
            <List size={16} strokeWidth={2} aria-hidden="true" />
            List
          </Link>
        </nav>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>
    </div>
  );
}

/**
 * Every project on the board except cancelled ones, and finished ones only
 * from the last three months — a Done lane that keeps every project ever
 * closed stops being something anyone looks at.
 */
async function BoardView() {
  const now = new Date();
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 90);

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      status: { not: 'cancelled' },
      OR: [{ status: { not: 'closed' } }, { closedAt: { gte: recent } }],
    },
    orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    select: SELECT,
  });

  const cards: BoardCard[] = await Promise.all(
    projects.map(async (project) => {
      const deliverables = project.phases.flatMap((phase) => phase.deliverables);
      const committed = project.lineItems
        .filter((line) => line.currency === project.currency)
        .reduce((total, line) => total + line.amountMinor * line.quantity, 0);
      // Only a held project needs the database for this; every other state's
      // next steps are a fixed table.
      const allowed = (await transitionsFor(project)).map((transition) => transition.to);
      const finished = ['launched', 'handover', 'closed'].includes(project.status);
      return {
        id: project.id,
        slug: project.slug,
        name: project.name,
        reference: project.reference ?? '',
        status: project.status,
        client: project.client.name,
        owner: project.owner?.name ?? null,
        target: project.targetDate ? formatShortDate(project.targetDate) : null,
        overdue: !finished && project.targetDate !== null && project.targetDate < now,
        done: deliverables.filter((deliverable) => deliverable.isComplete).length,
        total: deliverables.length,
        waitingOn: project.assetRequests.length,
        committed: committed > 0 ? formatMoney(committed, project.currency) : null,
        allowed,
      };
    }),
  );

  return (
    <main className={`${styles.page} ${styles.pageWide}`}>
      <ProjectsHeader view="board" />
      <Board cards={cards} />
    </main>
  );
}
