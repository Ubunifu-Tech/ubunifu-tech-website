import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requirePermission } from '@/lib/console/auth';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { ENQUIRY_STATUS_LABEL } from '@/lib/console/enquiry-labels';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { ClientPicker } from '@/components/console/ClientPicker';
import { RowMenu } from '@/components/console/RowMenu';
import { EnquiryDetails, EnquiryMenu, RestoreEnquiry } from './EnquiryControls';
import { STATUS_BADGE } from '../badges';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Enquiry' };

/**
 * One enquiry: what they wrote, the chat if it came from one, the team's note,
 * and what happens next. The team's emails link here, so it opens whatever
 * has happened to the enquiry since, including a removed one.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission('enquiries');
  const mayOnboard = can(staff, 'clients');
  const mayStart = can(staff, 'projects');
  const { id } = await params;
  const now = new Date();

  const enquiry = await db.enquiry.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      status: true,
      serviceLine: true,
      internalNote: true,
      source: true,
      deletedAt: true,
      createdAt: true,
      client: { select: { name: true, slug: true, deletedAt: true } },
      project: { select: { name: true, slug: true, deletedAt: true } },
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          messages: {
            where: { role: { in: ['user', 'assistant'] } },
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, content: true },
          },
        },
      },
    },
  });
  if (!enquiry) notFound();

  const removed = Boolean(enquiry.deletedAt);
  const converted = enquiry.status === 'converted';
  const workable = !converted && !removed;

  // Somebody who is already a client, writing in about something new.
  const returning = workable
    ? await db.clientContact.findFirst({
        where: { email: enquiry.email, deletedAt: null, client: { deletedAt: null } },
        select: { client: { select: { name: true, slug: true } } },
      })
    : null;
  // Or a client writing from an address we do not have, chosen by hand.
  const clients =
    workable && !returning && mayStart
      ? await db.client.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: { name: true, slug: true },
        })
      : [];

  const messages = (enquiry.conversations[0]?.messages ?? []).filter((message) => message.content.trim());
  const startFor = (slug: string) => `/projects/new?client=${encodeURIComponent(slug)}&enquiry=${enquiry.id}`;

  return (
    <main className={styles.page}>
      <div className={styles.projectTop}>
        <Link href="/enquiries" className={styles.backLink}>
          ← Enquiries
        </Link>
        <div className={styles.projectTitleRow}>
          <div className={styles.headText}>
            <h1 className={styles.heading}>{enquiry.name}</h1>
            <p className={styles.projectMeta}>
              <span className={`${forms.badge} ${removed ? '' : STATUS_BADGE[enquiry.status]}`}>
                {removed ? 'Removed' : ENQUIRY_STATUS_LABEL[enquiry.status]}
              </span>
              <a href={`mailto:${enquiry.email}`} className={styles.inlineLink}>
                {enquiry.email}
              </a>
              <span>{enquiry.source === 'website_assistant' ? 'From the chat' : 'From the form'}</span>
              <span title={formatShortDate(enquiry.createdAt)}>{formatRelative(enquiry.createdAt, now)}</span>
            </p>
          </div>

          <div className={styles.headActions}>
            {removed ? (
              <RestoreEnquiry id={enquiry.id} />
            ) : workable ? (
              <>
                {clients.length > 0 && (
                  <RowMenu
                    label="Start a project for an existing client"
                    text="An existing client"
                    triggerClassName={`${forms.button} ${forms.quiet}`}
                    wide
                  >
                    <ClientPicker
                      clients={clients}
                      href={`/projects/new?client=:client&enquiry=${enquiry.id}`}
                      autoFocus
                    />
                  </RowMenu>
                )}
                {returning && mayStart ? (
                  <Link href={startFor(returning.client.slug)} className={forms.button}>
                    Start a project for {returning.client.name}
                  </Link>
                ) : mayOnboard ? (
                  <Link href={`/clients/new?enquiry=${enquiry.id}`} className={forms.button}>
                    {mayStart ? 'Make it a project' : 'Make them a client'}
                  </Link>
                ) : null}
              </>
            ) : null}
            {!removed && (
              <EnquiryMenu
                id={enquiry.id}
                name={enquiry.name}
                status={enquiry.status}
                reopenable={converted && (!enquiry.client || Boolean(enquiry.client.deletedAt))}
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.splitMain}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>{enquiry.subject}</h2>
            </div>
            <p className={styles.quote}>{enquiry.message}</p>
          </section>

          {messages.length > 0 && (
            <section className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>The chat</h2>
              </div>
              <ul className={styles.thread}>
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={`${styles.message} ${message.role === 'assistant' ? styles.fromUs : ''}`}
                  >
                    <p className={styles.messageWho}>
                      {message.role === 'assistant' ? 'Assistant' : enquiry.name}
                    </p>
                    {message.role === 'assistant' ? (
                      // Formatted as the visitor saw it, with links to the public site.
                      <div className={styles.messageBody}>
                        <ChatMarkdown text={message.content} variant="console" />
                      </div>
                    ) : (
                      <p className={styles.messageBody}>{message.content}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className={styles.splitAside}>
          {converted && (
            <section className={forms.card}>
              <p className={styles.note}>
                Became{' '}
                {enquiry.client && !enquiry.client.deletedAt ? (
                  <Link href={`/clients/${enquiry.client.slug}`} className={styles.inlineLink}>
                    {enquiry.client.name}
                  </Link>
                ) : enquiry.client ? (
                  `${enquiry.client.name}, since removed`
                ) : (
                  'a client'
                )}
                {enquiry.project && !enquiry.project.deletedAt && (
                  <>
                    {', '}
                    <Link href={`/projects/${enquiry.project.slug}`} className={styles.inlineLink}>
                      {enquiry.project.name}
                    </Link>
                  </>
                )}
                .
              </p>
            </section>
          )}
          {returning && (
            <section className={forms.card}>
              <p className={styles.note}>
                {enquiry.email} is a contact at{' '}
                <Link href={`/clients/${returning.client.slug}`} className={styles.inlineLink}>
                  {returning.client.name}
                </Link>
                .{' '}
                {mayOnboard && (
                  <Link href={`/clients/new?enquiry=${enquiry.id}`} className={styles.inlineLink}>
                    Add them as a new client instead
                  </Link>
                )}
              </p>
            </section>
          )}
          {!removed && (
            <section className={forms.card}>
              <EnquiryDetails
                key={enquiry.id}
                id={enquiry.id}
                note={enquiry.internalNote}
                serviceLine={enquiry.serviceLine}
              />
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
