import { db } from '@/lib/db';
import { requireClient } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { AddPerson, PersonMenu } from '@/components/console/People';
import { invitedAmong } from '@/lib/console/contacts';
import {
  editColleague,
  handOverMain,
  inviteColleague,
  removeColleague,
  resendColleagueInvite,
} from './actions';
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
      phone: true,
      isPrimary: true,
      canSignIn: true,
      activatedAt: true,
      lastSeenAt: true,
    },
  });
  const iAmMain = people.some((person) => person.id === actor.id && person.isPrimary);
  const invited = await invitedAmong(
    people
      .filter((person) => !person.activatedAt && person.email && person.canSignIn)
      .map((person) => person.id),
  );

  // The hints that used to sit under each badge, gathered into one line each
  // below the table, and only when some row needs them.
  const names = (list: typeof people) =>
    new Intl.ListFormat('en-GB').format(list.map((person) => person.name));
  const accessOff = people.filter((person) => !person.canSignIn && person.id !== actor.id);
  const notSetUp = people.filter((person) => person.canSignIn && !person.activatedAt);
  const toInvite = notSetUp.filter((person) => person.email && !invited.has(person.id));
  const noEmail = notSetUp.filter((person) => !person.email);

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
                  Portal
                </th>
                <th className={table.th} scope="col">
                  Last seen
                </th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className={table.tr}>
                  <td className={`${table.td} ${table.primary}`}>
                    {person.name}
                    {person.id === actor.id ? ' (you)' : ''}
                    {person.isPrimary && (
                      <>
                        {' '}
                        <span className={forms.badge}>Main contact</span>
                      </>
                    )}
                  </td>
                  <td className={table.td}>
                    {person.role ?? <span className={table.muted}>None</span>}
                  </td>
                  <td className={table.td}>
                    {person.email ?? <span className={table.muted}>None yet</span>}
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    {!person.canSignIn ? (
                      <span className={forms.badge}>Access off</span>
                    ) : person.activatedAt ? (
                      <span className={`${forms.badge} ${forms.badgeGood}`}>Active</span>
                    ) : person.email && invited.has(person.id) ? (
                      <span className={forms.badge}>Invited</span>
                    ) : person.email ? (
                      <span className={forms.badge}>Not invited yet</span>
                    ) : (
                      <span className={forms.badge}>No email yet</span>
                    )}
                  </td>
                  <td className={`${table.td} ${table.nowrap}`}>
                    {person.lastSeenAt ? (
                      formatShortDate(person.lastSeenAt)
                    ) : (
                      <span className={table.muted}>Never</span>
                    )}
                  </td>
                  <td className={`${table.td} ${table.actions}`}>
                    {person.id !== actor.id && (
                      <PersonMenu
                        contact={{
                          id: person.id,
                          name: person.name,
                          email: person.email,
                          role: person.role,
                          phone: person.phone,
                          isPrimary: person.isPrimary,
                          activated: person.activatedAt !== null,
                          // Resending only makes sense before they have set up.
                          canSignIn: person.canSignIn && !person.activatedAt,
                        }}
                        hidden={{}}
                        invite={resendColleagueInvite}
                        makeMain={iAmMain ? handOverMain : undefined}
                        remove={iAmMain ? removeColleague : undefined}
                        edit={iAmMain && !person.activatedAt ? editColleague : undefined}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${styles.notes} ${styles.after}`}>
        {accessOff.length > 0 && (
          <p className={styles.note}>
            {names(accessOff)} cannot sign in at the moment. Ask us to turn their access back on.
          </p>
        )}
        {toInvite.length > 0 && (
          <p className={styles.note}>
            To invite {names(toInvite)}, choose Email the invitation from their menu.
          </p>
        )}
        {noEmail.length > 0 && (
          <p className={styles.note}>
            {iAmMain
              ? `Add an email for ${names(noEmail)} from their menu to invite them.`
              : `Your main contact can add an email for ${names(noEmail)}.`}
          </p>
        )}
        <p className={styles.note}>
          The main contact signs agreements and receives invoices.
          {iAmMain
            ? ' That is you.'
            : ' Ask them to add or remove people, or invite colleagues yourself.'}
        </p>
      </div>
    </main>
  );
}
