import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { can, requireStaff } from '@/lib/console/auth';
import { activityForClient } from '@/lib/console/activity';
import { ENQUIRY_STATUS_LABEL } from '@/lib/console/enquiry-labels';
import { SERVICE_LABEL, STAFF_LABEL, STATUS_TONE } from '@/lib/console/project-status';
import { formatMoney, formatRelative, formatShortDate } from '@/lib/console/money';
import { liveEnquiry } from '@/lib/console/live';
import { clientRemovalCounts } from '@/lib/console/removal';
import { ActivityFeed } from '@/components/console/ActivityFeed';
import { AddPerson, PersonMenu } from '@/components/console/People';
import {
  addClientContact,
  inviteContact,
  removeClientContact,
  saveClientContact,
  setMainContact,
  setPortalAccess,
} from '../actions';
import { RestoreProject } from './RestoreProject';
import { ClientDetails } from './ClientDetails';
import { BringBack } from './BringBack';
import { Callout } from '@/components/console/Callout';
import { Figures } from '@/components/console/Figures';
import { SetupLink } from './SetupLink';
import { RemoveClient } from './RemoveClient';
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
  const client = await db.client.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true },
  });
  return { title: client?.name ?? 'Client' };
}

/**
 * The client record as a hub.
 *
 * Everything about one organisation in one place: their people, their work,
 * what they owe, and the whole history of what has passed between us. This is
 * the screen someone opens when a client rings, so it answers the questions a
 * client asks on the phone rather than the ones a database would.
 */
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ restored?: string; kept?: string }>;
}) {
  const { restored, kept } = await searchParams;
  const leftOut = Number(kept) > 0 ? Number(kept) : 0;
  const staff = await requireStaff();
  const mayManage = can(staff, 'clients');
  const seesMoney = can(staff, 'invoices');
  const seesValue = seesMoney || can(staff, 'fees');
  const { slug } = await params;
  const now = new Date();

  const client = await db.client.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      legalName: true,
      country: true,
      currency: true,
      website: true,
      notes: true,
      createdAt: true,
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isPrimary: true,
          canSignIn: true,
          activatedAt: true,
          lastSeenAt: true,
        },
      },
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          reference: true,
          status: true,
          serviceLine: true,
          currency: true,
          targetDate: true,
          lineItems: {
            where: { status: { in: ['planned', 'active'] } },
            select: { amountMinor: true, quantity: true, currency: true },
          },
        },
      },
      invoices: {
        // Not those on a removed project: they are out of sight everywhere else.
        where: {
          status: { notIn: ['draft', 'void'] },
          OR: [{ projectId: null }, { project: { deletedAt: null } }],
        },
        select: { totalMinor: true, paidMinor: true, currency: true },
      },
      enquiries: {
        where: liveEnquiry,
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, subject: true, createdAt: true, status: true },
      },
    },
  });

  if (!client) notFound();

  const mayRunProjects = can(staff, 'projects');
  const [activity, removal, removedProjects, removedPeople] = await Promise.all([
    activityForClient(staff, client.id),
    mayManage
      ? clientRemovalCounts(client.id).then((counts) =>
          // What is owed is named only to those who handle invoices.
          can(staff, 'invoices') ? counts : { ...counts, unpaidOwed: '' },
        )
      : null,
    mayRunProjects
      ? db.project.findMany({
          where: { clientId: client.id, deletedAt: { not: null } },
          orderBy: { deletedAt: 'desc' },
          select: { id: true, name: true, reference: true, deletedAt: true },
        })
      : [],
    mayManage
      ? db.clientContact.findMany({
          where: { clientId: client.id, deletedAt: { not: null } },
          orderBy: { deletedAt: 'desc' },
          select: { id: true, name: true, email: true, deletedAt: true },
        })
      : [],
  ]);

  /**
   * Summed only within the client's own currency. There is no FX rate anywhere
   * in this system, so adding a TZS line into a USD total would print a figure
   * that is not money. Anything outside it is named rather than folded in.
   */
  const ownCurrency = <T extends { currency: string }>(rows: T[]) =>
    rows.filter((row) => row.currency === client.currency);

  const allLines = client.projects.flatMap((p) => p.lineItems);
  const committed = ownCurrency(allLines).reduce(
    (total, line) => total + line.amountMinor * line.quantity,
    0,
  );
  const outstanding = ownCurrency(client.invoices).reduce(
    (total, invoice) => total + Math.max(0, invoice.totalMinor - invoice.paidMinor),
    0,
  );
  const received = ownCurrency(client.invoices).reduce(
    (total, invoice) => total + invoice.paidMinor,
    0,
  );
  const mixed = [
    ...new Set(
      [...allLines, ...client.invoices]
        .filter((row) => row.currency !== client.currency)
        .map((row) => row.currency),
    ),
  ];

  const live = client.projects.filter((p) => !['closed', 'cancelled'].includes(p.status)).length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/clients" className={styles.backLink}>
            ← Clients
          </Link>
          <h1 className={styles.heading}>{client.name}</h1>
          <p className={styles.facts}>
            {client.legalName && (
              <span>
                <span className={styles.factLabel}>Registered as</span> {client.legalName}
              </span>
            )}
            <span>
              <span className={styles.factLabel}>Country</span> {client.country}
            </span>
            <span>
              <span className={styles.factLabel}>Billed in</span> {client.currency}
            </span>
            {client.website && (
              <a href={client.website} target="_blank" rel="noreferrer noopener">
                {client.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span>
              <span className={styles.factLabel}>Client since</span>{' '}
              {formatShortDate(client.createdAt)}
            </span>
          </p>
        </div>
        {mayManage && (
          <div className={styles.headActions}>
            <ClientDetails client={client} />
          </div>
        )}
      </div>

      {restored && (
        <Callout kind="good">
          {client.name} is back. Portal access is off for each person until you turn it on from
          their menu.
          {leftOut > 0 &&
            ` ${leftOut === 1 ? 'One person was' : `${leftOut} people were`} not brought back, because their email now belongs to someone at another client. They are under Removed people.`}
        </Callout>
      )}

      <Figures
        label="This client at a glance"
        items={[
          {
            label: 'Projects',
            value: client.projects.length,
            note: `${live} still open`,
          },
          ...(seesMoney
            ? [
                {
                  label: 'Committed',
                  value: formatMoney(committed, client.currency),
                  note: 'Planned and active fee lines',
                },
                {
                  label: 'Received',
                  value: formatMoney(received, client.currency),
                  note: 'Recorded against invoices',
                },
                {
                  label: 'Outstanding',
                  value: formatMoney(outstanding, client.currency),
                  note: outstanding > 0 ? 'Invoiced and not settled' : 'Nothing owed',
                },
              ]
            : []),
          {
            label: 'People',
            value: client.contacts.length,
            note: `${client.contacts.filter((c) => c.activatedAt).length} with a portal account`,
          },
        ]}
      />

      {mixed.length > 0 && (
        <p className={styles.note}>
          This client also has amounts in {mixed.join(', ')}, which are not in the totals above.
        </p>
      )}

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Projects</h2>
              <span className={table.count}>
                {client.projects.length} in total, {live} open
              </span>
            </div>
            {can(staff, 'projects') && (
              <div className={table.toolbarActions}>
                <Link
                  href={`/projects/new?client=${client.slug}`}
                  className={`${forms.button} ${forms.quiet}`}
                >
                  Start a project
                </Link>
              </div>
            )}
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Project
                  </th>
                  <th className={table.th} scope="col">
                    Number
                  </th>
                  <th className={table.th} scope="col">
                    Service
                  </th>
                  <th className={table.th} scope="col">
                    Stage
                  </th>
                  <th className={table.th} scope="col">
                    Target
                  </th>
                  {seesValue && (
                    <th className={`${table.th} ${table.numericHead}`} scope="col">
                      Committed
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {client.projects.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={seesValue ? 6 : 5}>
                      <p className={table.emptyTitle}>No projects for this client yet.</p>
                      <p className={table.emptyHint}>
                        They are on the books, but nothing has been agreed.
                      </p>
                    </td>
                  </tr>
                ) : (
                  client.projects.map((project) => (
                    <tr key={project.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/projects/${project.slug}`} className={table.link}>
                          {project.name}
                        </Link>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{project.reference}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {SERVICE_LABEL[project.serviceLine] ?? project.serviceLine}
                      </td>
                      <td className={table.td}>
                        <span
                          className={`${forms.badge} ${TONE_CLASS[STATUS_TONE[project.status]]}`}
                        >
                          {STAFF_LABEL[project.status]}
                        </span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(project.targetDate)}
                      </td>
                      {seesValue && (
                        <td className={`${table.td} ${table.numeric}`}>
                          {formatMoney(
                            project.lineItems.reduce((t, l) => t + l.amountMinor * l.quantity, 0),
                            project.currency,
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {removedProjects.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Removed projects</h2>
                <span className={table.count}>{removedProjects.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Project
                    </th>
                    <th className={table.th} scope="col">
                      Number
                    </th>
                    <th className={table.th} scope="col">
                      Removed
                    </th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {removedProjects.map((project) => (
                    <tr key={project.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{project.name}</td>
                      <td className={`${table.td} ${table.nowrap}`}>{project.reference}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(project.deletedAt)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <RestoreProject projectId={project.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>People</h2>
              <span className={table.count}>
                {client.contacts.length} {client.contacts.length === 1 ? 'person' : 'people'}
              </span>
            </div>
            {mayManage && (
              <AddPerson action={addClientContact} hidden={{ clientId: client.id }} canSkipInvite />
            )}
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Name
                  </th>
                  <th className={table.th} scope="col">
                    Job title
                  </th>
                  <th className={table.th} scope="col">
                    Email
                  </th>
                  <th className={table.th} scope="col">
                    Phone
                  </th>
                  <th className={table.th} scope="col">
                    Portal
                  </th>
                  <th className={table.th} scope="col">
                    Last seen
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.contacts.map((contact) => (
                  <tr key={contact.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      {contact.name}
                      {contact.isPrimary && (
                        <>
                          {' '}
                          <span className={forms.badge}>Main contact</span>
                        </>
                      )}
                    </td>
                    <td className={table.td}>
                      {contact.role ?? <span className={table.muted}>None</span>}
                    </td>
                    <td className={table.td}>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className={table.link}>
                          {contact.email}
                        </a>
                      ) : (
                        <span className={table.muted}>None yet</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {contact.phone ?? <span className={table.muted}>Not given</span>}
                    </td>
                    <td className={table.td}>
                      {!contact.canSignIn ? (
                        <span className={`${forms.badge} ${forms.badgeBad}`}>Off</span>
                      ) : contact.activatedAt ? (
                        <span className={`${forms.badge} ${forms.badgeGood}`}>Active</span>
                      ) : (
                        <span className={`${forms.badge} ${forms.badgeWarn}`}>Not set up</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {contact.lastSeenAt ? (
                        formatShortDate(contact.lastSeenAt)
                      ) : (
                        <span className={table.muted}>Never</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      {mayManage && (
                        <PersonMenu
                          contact={{
                            id: contact.id,
                            name: contact.name,
                            email: contact.email,
                            role: contact.role,
                            phone: contact.phone,
                            isPrimary: contact.isPrimary,
                            activated: contact.activatedAt !== null,
                            canSignIn: contact.canSignIn,
                          }}
                          hidden={{ clientId: client.id }}
                          edit={saveClientContact}
                          invite={inviteContact}
                          makeMain={setMainContact}
                          remove={removeClientContact}
                          access={setPortalAccess}
                          setupLink={<SetupLink contactId={contact.id} name={contact.name} />}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {removedPeople.length > 0 && (
          <div className={table.frame}>
            <div className={table.toolbar}>
              <div className={table.toolbarText}>
                <h2 className={table.title}>Removed people</h2>
                <span className={table.count}>{removedPeople.length}</span>
              </div>
            </div>
            <div className={table.scroll}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th} scope="col">
                      Name
                    </th>
                    <th className={table.th} scope="col">
                      Email
                    </th>
                    <th className={table.th} scope="col">
                      Removed
                    </th>
                    <th className={`${table.th} ${table.actionsHead}`} scope="col">
                      <span className={table.muted}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {removedPeople.map((person) => (
                    <tr key={person.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{person.name}</td>
                      <td className={table.td}>
                        {person.email ?? <span className={table.muted}>None</span>}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(person.deletedAt)}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <BringBack clientId={client.id} contactId={person.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.columns}>
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Everything that has happened</h2>
              <span className={forms.cardMeta}>Actions and emails, newest first</span>
            </div>
            <ActivityFeed items={activity} now={now} />
          </section>

          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Notes</h2>
            </div>
            {client.notes ? (
              <p className={styles.quote}>{client.notes}</p>
            ) : (
              <p className={styles.note}>Nothing noted about this client.</p>
            )}

            {can(staff, 'enquiries') && client.enquiries.length > 0 && (
              <>
                <div className={`${forms.cardHeader} ${styles.spaced}`}>
                  <h3 className={forms.cardTitle}>How they found us</h3>
                </div>
                <ul className={styles.timeline}>
                  {client.enquiries.map((enquiry) => (
                    <li key={enquiry.id} className={styles.event}>
                      <p className={styles.eventText}>
                        <Link href={`/enquiries/${enquiry.id}`} className={styles.inlineLink}>
                          {enquiry.subject}
                        </Link>
                      </p>
                      <p className={styles.eventMeta}>
                        {formatRelative(enquiry.createdAt, now)} ·{' '}
                        {ENQUIRY_STATUS_LABEL[enquiry.status]}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {removal && (
          <section className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>Remove this client</h2>
            </div>
            <RemoveClient clientId={client.id} clientName={client.name} counts={removal} />
          </section>
        )}
      </div>
    </main>
  );
}
