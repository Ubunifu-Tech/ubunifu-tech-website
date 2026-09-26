import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  FileSignature,
  MessageSquare,
  Receipt,
  Upload,
  UserRound,
} from 'lucide-react';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { liveInvoice, liveTicket, waitingOnClient } from '@/lib/console/live';
import { clientStage } from '@/lib/console/project-status';
import { formatDate, formatMoney } from '@/lib/console/money';
import styles from './Portal.module.css';
import forms from '@/styles/forms.module.css';

/**
 * `absolute`, not a plain string. A layout's title template applies to route
 * segments BELOW it, not to its own sibling page, so without this the portal
 * home falls through to the marketing template.
 */
export const metadata = { title: { absolute: 'Your projects · Ubunifu portal' } };

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  live: forms.badgeLive,
  good: forms.badgeGood,
  warn: forms.badgeWarn,
  bad: forms.badgeBad,
};

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Africa/Dar_es_Salaam',
    }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type Need = {
  key: string;
  href: string;
  icon: typeof Upload;
  title: string;
  detail: string;
  urgent?: boolean;
};

export default async function PortalHome() {
  const actor = await requireClient();
  const now = new Date();

  // Scoped to the signed-in contact's own client. Never by an id from the URL.
  const [projects, documents, invoices, tickets] = await Promise.all([
    db.project.findMany({
      where: { clientId: actor.clientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        reference: true,
        status: true,
        targetDate: true,
        owner: { select: { name: true } },
        phases: {
          select: {
            deliverables: { where: { isClientVisible: true }, select: { isComplete: true } },
          },
        },
        assetRequests: { where: waitingOnClient, select: { id: true } },
        reviews: {
          where: { status: { not: 'withdrawn' } },
          orderBy: { round: 'desc' },
          take: 1,
          select: { round: true, title: true, status: true },
        },
      },
    }),
    db.document.findMany({
      where: {
        project: { clientId: actor.clientId, deletedAt: null },
        status: { in: ['sent', 'viewed'] },
      },
      select: { reference: true, title: true },
    }),
    db.invoice.findMany({
      where: { clientId: actor.clientId, ...liveInvoice, status: { in: ['sent', 'overdue', 'part_paid'] } },
      orderBy: { dueAt: 'asc' },
      select: {
        number: true,
        totalMinor: true,
        paidMinor: true,
        currency: true,
        dueAt: true,
        status: true,
      },
    }),
    db.ticket.findMany({
      where: { clientId: actor.clientId, ...liveTicket, status: 'waiting_on_client' },
      select: { reference: true, subject: true },
    }),
  ]);

  const needs: Need[] = [
    ...invoices.map((invoice) => ({
      key: `invoice-${invoice.number}`,
      href: `/portal/invoices/${invoice.number}`,
      icon: Receipt,
      title: `Pay ${invoice.number}`,
      detail: `${formatMoney(invoice.totalMinor - invoice.paidMinor, invoice.currency)}${
        invoice.dueAt ? `, due ${formatDate(invoice.dueAt)}` : ''
      }`,
      urgent: invoice.status === 'overdue',
    })),
    ...projects.flatMap((project) =>
      project.reviews[0]?.status === 'open'
        ? [
            {
              key: `review-${project.id}`,
              href: `/portal/projects/${project.slug}#review`,
              icon: Eye,
              title: `Review round ${project.reviews[0].round} of ${project.name}`,
              detail: project.reviews[0].title,
            },
          ]
        : [],
    ),
    ...documents.map((document) => ({
      key: `document-${document.reference}`,
      href: `/portal/documents/${document.reference}`,
      icon: FileSignature,
      title: `Read and sign ${document.title}`,
      detail: document.reference,
    })),
    ...projects
      .filter((project) => project.assetRequests.length > 0)
      .map((project) => ({
        key: `items-${project.id}`,
        href: `/portal/projects/${project.slug}`,
        icon: Upload,
        title: `Send ${project.assetRequests.length} ${project.assetRequests.length === 1 ? 'item' : 'items'} for ${project.name}`,
        detail: 'Upload them on the project page',
      })),
    ...tickets.map((ticket) => ({
      key: `ticket-${ticket.reference}`,
      href: `/portal/requests/${ticket.reference}`,
      icon: MessageSquare,
      title: `Reply about ${ticket.subject}`,
      detail: ticket.reference,
    })),
  ];

  const active = projects.filter((project) => !['closed', 'cancelled'].includes(project.status));

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>
          {greeting(now)}, {actor.name.split(' ')[0]}
        </h1>
        <p className={styles.lead}>
          {needs.length === 0
            ? 'Nothing is waiting on you. We will let you know when there is something to look at.'
            : `${needs.length} ${needs.length === 1 ? 'thing needs' : 'things need'} you.`}
        </p>
      </div>

      {needs.length > 0 && (
        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Needs you</h2>
          </div>
          <ul className={styles.needsList}>
            {needs.map((need) => {
              const Icon = need.icon;
              return (
                <li key={need.key}>
                  <Link href={need.href} className={styles.needLink}>
                    <span
                      className={`${styles.needIcon} ${need.urgent ? styles.needUrgent : ''}`}
                      aria-hidden="true"
                    >
                      <Icon size={17} strokeWidth={1.9} />
                    </span>
                    <span className={styles.needText}>
                      <span className={styles.needTitleText}>{need.title}</span>
                      <span className={styles.needDetail}>
                        {need.urgent ? 'Overdue · ' : ''}
                        {need.detail}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.8}
                      className={styles.needArrow}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Your projects</h2>
        <span className={styles.sectionMeta}>
          {active.length} in progress
          {projects.length > active.length ? `, ${projects.length - active.length} finished` : ''}
        </span>
      </div>

      {projects.length === 0 ? (
        <div className={styles.empty}>
          Your first project will appear here once it is set up. Questions in the meantime? Use Help
          at the bottom of the page.
        </div>
      ) : (
        <ul className={styles.projects}>
          {projects.map((project) => {
            const tasks = project.phases.flatMap((phase) => phase.deliverables);
            const done = tasks.filter((task) => task.isComplete).length;
            const percent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
            const stage = clientStage(project.status, project.reviews[0]);
            return (
              <li key={project.id}>
                <Link href={`/portal/projects/${project.slug}`} className={styles.project}>
                  <span className={styles.projectTop}>
                    <span className={`${forms.badge} ${TONE_CLASS[stage.tone]}`}>
                      {stage.label}
                    </span>
                    <span className={styles.projectRef}>{project.reference}</span>
                  </span>
                  <span className={styles.projectName}>{project.name}</span>
                  <span className={styles.progress}>
                    <span className={styles.progressBar} aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </span>
                    <span className={styles.progressText}>
                      {tasks.length === 0 ? 'Plan coming soon' : `${done} of ${tasks.length} done`}
                    </span>
                  </span>
                  <span className={styles.projectFoot}>
                    {project.owner ? (
                      <span className={styles.projectLead}>
                        <UserRound size={14} strokeWidth={2} aria-hidden="true" />
                        {project.owner.name}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className={styles.projectDate}>
                      {project.assetRequests.length > 0
                        ? `${project.assetRequests.length} waiting on you`
                        : project.targetDate
                          ? `Aiming for ${formatDate(project.targetDate)}`
                          : ''}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
