import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { CLIENT_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatDate } from '@/lib/console/money';
import styles from './Portal.module.css';
import forms from '@/styles/forms.module.css';

/**
 * `absolute`, not a plain string. A layout's title template applies to route
 * segments BELOW it, not to its own sibling page — so without this the portal
 * dashboard falls through to the marketing template and a client's private
 * page ends up titled "… | Ubunifu Technologies".
 */
export const metadata = { title: { absolute: 'Your projects · Ubunifu portal' } };

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

export default async function PortalHome() {
  const actor = await requireClient();

  // Scoped to the signed-in contact's own client. Never by an id from the URL.
  const projects = await db.project.findMany({
    where: { clientId: actor.clientId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      reference: true,
      status: true,
      targetDate: true,
      assetRequests: {
        where: { status: 'requested' },
        select: { id: true },
      },
    },
  });

  const outstanding = projects.reduce((total, p) => total + p.assetRequests.length, 0);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          Your <span className={styles.headingAccent}>projects</span>
        </h1>
        <p className={styles.lead}>
          {outstanding === 0
            ? 'Everything we need from you is in. We will let you know when there is something to look at.'
            : `We are waiting on ${outstanding} thing${outstanding === 1 ? '' : 's'} from you. Open a project to see what.`}
        </p>
      </div>

      {projects.length === 0 ? (
        <p className={styles.empty}>
          Nothing here yet. We will add your project as soon as it starts.
        </p>
      ) : (
        <ul className={styles.projects}>
          {projects.map((project) => (
            <li key={project.id} className={styles.project}>
              <span className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}>
                {CLIENT_LABEL[project.status]}
              </span>
              <h2 className={styles.projectName}>
                <Link href={`/portal/projects/${project.slug}`} className={styles.projectLink}>
                  {project.name}
                </Link>
              </h2>
              <p className={styles.projectMeta}>
                {project.reference}
                {project.targetDate ? ` · aiming for ${formatDate(project.targetDate)}` : ''}
              </p>
              {project.assetRequests.length > 0 && (
                <p className={styles.projectMeta}>
                  {project.assetRequests.length} thing
                  {project.assetRequests.length === 1 ? '' : 's'} still needed from you
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
