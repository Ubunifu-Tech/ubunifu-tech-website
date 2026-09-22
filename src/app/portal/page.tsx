import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import styles from './Portal.module.css';

export const metadata = { title: 'Your projects' };

/** Human wording for the delivery state machine. Clients should not be shown
 *  enum names, and "proposal_sent" tells them nothing they did not know. */
const STATUS_LABEL: Record<string, string> = {
  lead: 'Getting started',
  proposal_draft: 'Preparing your proposal',
  proposal_sent: 'Proposal with you',
  proposal_accepted: 'Proposal accepted',
  contract_sent: 'Contract with you',
  contract_signed: 'Contract signed',
  in_progress: 'In progress',
  client_review: 'Waiting on your review',
  launch_ready: 'Ready to launch',
  launched: 'Live',
  handover: 'Handover',
  closed: 'Complete',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
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
      reference: true,
      status: true,
      targetDate: true,
      _count: { select: { assetRequests: true } },
    },
  });

  return (
    <>
      <header className={styles.bar}>
        <span className={styles.brand}>
          Ubunifu <span className={styles.org}>· {actor.clientName}</span>
        </span>
        <form action="/portal/sign-out" method="post">
          <button type="submit" className={styles.linkButton}>Sign out</button>
        </form>
      </header>

      <main className={styles.main}>
        <h1 className={styles.heading}>
          Your <span className={styles.headingAccent}>projects</span>
        </h1>

        {projects.length === 0 ? (
          <p className={styles.empty}>
            Nothing here yet. We will add your project as soon as it starts.
          </p>
        ) : (
          <ul className={styles.projects}>
            {projects.map((project) => (
              <li key={project.id} className={styles.project}>
                <span className={styles.status}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
                <h2 className={styles.projectName}>{project.name}</h2>
                <p className={styles.projectMeta}>
                  {project.reference}
                  {project.targetDate
                    ? ` · target ${project.targetDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}`
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
