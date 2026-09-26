import { db } from '@/lib/db';
import { requireStaff } from '@/lib/console/auth';
import { staffDomains } from '@/lib/console/env';
import { formatRelative } from '@/lib/console/money';
import { ROLE_LABEL } from '@/lib/console/people';
import { SettingsTabs } from '../SettingsTabs';
import { InviteStaff, PermissionsGrid, RoleControl, RowActions } from './TeamControls';
import { PERMISSIONS, readRolePermissions } from '@/lib/console/permissions';
import styles from '../../Admin.module.css';
import team from './Team.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  const staff = await requireStaff();
  const isOwner = staff.role === 'owner';
  const now = new Date();

  const people = await db.staffUser.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
      isActive: true,
      lastSeenAt: true,
      _count: {
        select: {
          ownedProjects: { where: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } } },
          assignedTasks: {
            where: { isComplete: false, phase: { project: { deletedAt: null } } },
          },
        },
      },
    },
  });

  const active = people.filter((person) => person.isActive).length;
  const settings = await db.orgSettings.findUnique({
    where: { id: 'default' },
    select: { rolePermissions: true },
  });
  const granted = readRolePermissions(settings?.rolePermissions);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.lead}>
            Everyone who can sign in to the console. Projects and tasks can be given to anyone here.
          </p>
        </div>
        {isOwner && <InviteStaff domains={staffDomains()} />}
      </div>

      <SettingsTabs current="team" staff={staff} />

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>Team</h2>
            <span className={table.count}>{active} active</span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Person
                </th>
                <th className={table.th} scope="col">
                  Title
                </th>
                <th className={table.th} scope="col">
                  Email
                </th>
                <th className={table.th} scope="col">
                  Role
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Projects
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Open tasks
                </th>
                <th className={table.th} scope="col">
                  Last signed in
                </th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const invited = person.lastSeenAt === null;
                const you = person.id === staff.id;
                return (
                  <tr key={person.id} className={table.tr}>
                    <td className={`${table.td} ${table.primary}`}>
                      {person.name}
                      {you ? ' (you)' : ''}
                    </td>
                    <td className={table.td}>
                      {person.title ?? <span className={table.muted}>None</span>}
                    </td>
                    <td className={table.td}>{person.email}</td>
                    <td className={table.td}>
                      {isOwner && !you && person.isActive ? (
                        <RoleControl staffId={person.id} role={person.role} />
                      ) : (
                        ROLE_LABEL[person.role]
                      )}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {person.isActive ? (
                        person._count.ownedProjects
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.numeric}`}>
                      {person.isActive ? (
                        person._count.assignedTasks
                      ) : (
                        <span className={table.muted}>None</span>
                      )}
                    </td>
                    <td className={`${table.td} ${table.nowrap}`}>
                      {!person.isActive ? (
                        <span className={`${forms.badge}`}>Removed</span>
                      ) : invited ? (
                        <span className={`${forms.badge} ${forms.badgeWarn}`}>Invited</span>
                      ) : (
                        formatRelative(person.lastSeenAt!, now)
                      )}
                    </td>
                    <td className={`${table.td} ${table.actions}`}>
                      {isOwner && !you && (
                        <RowActions
                          staffId={person.id}
                          name={person.name}
                          title={person.title}
                          active={person.isActive}
                          invited={invited}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <section className={`${forms.card} ${team.permissionsCard}`}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>What each role can do</h2>
          <span className={forms.cardMeta}>
            {isOwner ? 'Changes apply straight away' : 'Only owners can change these'}
          </span>
        </div>
        <PermissionsGrid permissions={PERMISSIONS} granted={granted} editable={isOwner} />
      </section>
    </main>
  );
}
