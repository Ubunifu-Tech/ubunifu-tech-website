import Link from 'next/link';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { InviteButton } from './InviteButton';
import styles from '../Admin.module.css';

export const metadata = { title: 'Clients · Ubunifu Console' };

export default async function ClientsPage() {
  await requireStaff();

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
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
        },
      },
      _count: { select: { projects: true } },
    },
  });

  return (
    <main className={`${styles.panel} ${styles.wide}`}>
      <h1 className={styles.heading}>
        Clients <span className={styles.headingAccent}>and contacts</span>
      </h1>
      <p className={styles.lead}>
        Send a contact their invitation, and they set a password from the link.
      </p>

      <p className={styles.actions}>
        <Link href="/clients/new" className={styles.button}>
          Add a client
        </Link>
        <span className={styles.payoff}>
          For work that came in by phone or WhatsApp rather than the website form.
        </span>
      </p>

      {clients.length === 0 ? (
        <p className={styles.note}>No clients yet.</p>
      ) : (
        clients.map((client) => (
          <section key={client.id} className={styles.status}>
            <div className={styles.statusRow}>
              <strong>{client.name}</strong>
              <span className={styles.statusLabel}>
                {client._count.projects === 0
                  ? 'No project yet'
                  : `${client._count.projects} project${client._count.projects === 1 ? '' : 's'}`}
              </span>
            </div>

            {client.contacts.map((contact) => (
              <div key={contact.id} className={styles.statusRow}>
                <span>
                  {contact.name}
                  <span className={styles.statusLabel}> · {contact.email}</span>
                </span>
                <span className={styles.statusLabel}>
                  {contact.activatedAt ? 'Account active' : 'Not yet set up'}
                  {contact.canSignIn ? '' : ' · access off'}
                </span>
                <InviteButton
                  contactId={contact.id}
                  activated={contact.activatedAt !== null}
                />
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
