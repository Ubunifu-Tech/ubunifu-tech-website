import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { formatDate } from '@/lib/console/money';
import { Avatar } from '@/components/console/Avatar';
import { AddPerson, PersonActions } from '@/components/console/People';
import { handOverMain, inviteColleague, removeColleague, resendColleagueInvite } from './actions';
import styles from '../Portal.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Your team' };

export default async function PortalTeam() {
  const actor = await requireClient();

  const people = await db.clientContact.findMany({
    where: { clientId: actor.clientId, deletedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isPrimary: true,
      canSignIn: true,
      activatedAt: true,
      lastSeenAt: true,
    },
  });
  const iAmMain = people.some((person) => person.id === actor.id && person.isPrimary);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.heading}>Your team</h1>
        <p className={styles.lead}>
          Everyone at {actor.clientName} who can use this portal. Anyone here can see your projects,
          documents and invoices.
        </p>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>People</h2>
            <span className={table.count}>{people.length}</span>
          </div>
          <AddPerson action={inviteColleague} hidden={{}} label="Invite a colleague" />
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">Person</th>
                <th className={table.th} scope="col">Portal</th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className={table.tr}>
                  <td className={`${table.td} ${table.primary}`}>
                    <span className={table.who}>
                      <Avatar name={person.name} size="md" />
                      <span>
                        {person.name}
                        {person.id === actor.id ? ' (you)' : ''}
                        <span className={table.sub}>
                          {[person.isPrimary ? 'Main contact' : null, person.role, person.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    {person.activatedAt ? (
                      <>
                        <span className={`${forms.badge} ${forms.badgeGood}`}>Active</span>
                        {person.lastSeenAt && (
                          <span className={table.sub}>Last in {formatDate(person.lastSeenAt)}</span>
                        )}
                      </>
                    ) : person.email ? (
                      <span className={`${forms.badge} ${forms.badgeWarn}`}>Invited</span>
                    ) : (
                      <span className={forms.badge}>No email yet</span>
                    )}
                  </td>
                  <td className={`${table.td} ${table.actions}`}>
                    {person.id !== actor.id && (
                      <PersonActions
                        contactId={person.id}
                        isPrimary={person.isPrimary}
                        activated={person.activatedAt !== null}
                        canSignIn={person.canSignIn && !person.activatedAt}
                        hidden={{}}
                        // Nothing to send an invitation to until they have an email.
                        invite={person.email ? resendColleagueInvite : undefined}
                        makeMain={iAmMain ? handOverMain : undefined}
                        remove={iAmMain ? removeColleague : undefined}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className={`${styles.note} ${styles.after}`}>
        The main contact signs agreements and receives invoices.
        {iAmMain ? ' That is you.' : ' Ask them to add or remove people, or invite colleagues yourself.'}
      </p>
    </main>
  );
}
