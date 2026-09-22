import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { formatRelative } from '@/lib/console/money';
import { InviteButton } from './InviteButton';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Clients' };

export default async function ClientsPage() {
  await requireStaff();
  const now = new Date();

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      country: true,
      currency: true,
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          isPrimary: true,
          activatedAt: true,
          canSignIn: true,
          lastSeenAt: true,
        },
      },
      _count: { select: { projects: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>
            Clients <span className={styles.headingAccent}>and contacts</span>
          </h1>
          <p className={styles.lead}>
            Send a contact their invitation and they set a password from the link.
          </p>
        </div>
        <Link href="/clients/new" className={forms.button}>
          Add a client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className={styles.empty}>
          No clients yet. Add the first one, or onboard an enquiry that has come in.
        </p>
      ) : (
        <div className={styles.stack}>
          {clients.map((client) => (
            <article key={client.id} className={styles.record}>
              <div className={styles.recordHead}>
                <h2 className={styles.recordName}>{client.name}</h2>
                <span className={forms.badge}>
                  {client._count.projects === 0
                    ? 'No project yet'
                    : `${client._count.projects} project${client._count.projects === 1 ? '' : 's'}`}
                </span>
              </div>
              <p className={styles.recordMeta}>
                {client.country} · billed in {client.currency}
              </p>

              <div className={styles.rows}>
                {client.contacts.map((contact) => (
                  <div key={contact.id} className={styles.row}>
                    <span>
                      {contact.name}
                      {contact.isPrimary && ' · main contact'}
                      <span className={styles.rowLabel}> · {contact.email}</span>
                    </span>
                    <span className={styles.rowValue}>
                      {!contact.canSignIn ? (
                        <span className={`${forms.badge} ${forms.badgeBad}`}>Access off</span>
                      ) : contact.activatedAt ? (
                        <span className={`${forms.badge} ${forms.badgeGood}`}>
                          {contact.lastSeenAt
                            ? `Last seen ${formatRelative(contact.lastSeenAt, now)}`
                            : 'Account active'}
                        </span>
                      ) : (
                        <span className={`${forms.badge} ${forms.badgeWarn}`}>Not set up</span>
                      )}
                    </span>
                    <InviteButton
                      contactId={contact.id}
                      activated={contact.activatedAt !== null}
                    />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
