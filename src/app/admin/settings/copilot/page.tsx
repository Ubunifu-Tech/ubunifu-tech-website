import Link from 'next/link';
import { requireStaff } from '@/lib/console/auth';
import { formatShortDate } from '@/lib/console/money';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import { AGENTS, INSTRUCTION_LIMIT, allInstructions, notesFor } from '@/lib/console/staff-agent/memory';
import { SettingsTabs } from '../SettingsTabs';
import { AddNote, InstructionForm, RemoveNote } from './CopilotForms';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Copilot settings' };

/**
 * What the agents are told by the people who run the console: house
 * instructions for each of them, and the notes Copilot keeps in mind from one
 * chat to the next. Everyone can read both, so nobody wonders why it behaves
 * as it does. Owners write the instructions and the team's notes; anyone can
 * keep notes of their own.
 */
export default async function CopilotSettingsPage() {
  const staff = await requireStaff();
  const owner = staff.role === 'owner';
  const [instructions, notes] = await Promise.all([allInstructions(), notesFor(staff)]);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.lead}>
            What {COPILOT.name} and the other agents are told, and what {COPILOT.short} keeps in mind.
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/copilot?view=chats" className={`${forms.button} ${forms.quiet}`}>
            Chats, plans and usage
          </Link>
        </div>
      </div>

      <SettingsTabs current="copilot" staff={staff} />

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Kept in mind</h2>
              <span className={table.count}>Told to {COPILOT.short} at the start of every chat</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={`${table.table} ${table.compact}`}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Note</th>
                  <th className={table.th} scope="col">For</th>
                  <th className={table.th} scope="col">Saved</th>
                  <th className={table.th} scope="col">By</th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={5}>
                      <p className={table.emptyTitle}>Nothing kept in mind yet.</p>
                      <p className={table.emptyHint}>
                        Add a note below, or tell {COPILOT.short} in a chat to remember something. It asks you to
                        confirm before it keeps anything.
                      </p>
                    </td>
                  </tr>
                ) : (
                  notes.map((note) => (
                    <tr key={note.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{note.text}</td>
                      <td className={`${table.td} ${table.nowrap}`}>{note.mine ? 'Only you' : 'The team'}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {formatShortDate(note.createdAt)}
                        <span className={table.sub}>{note.source === 'chat' ? 'From a chat' : 'Typed here'}</span>
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{note.by ?? <span className={table.muted}>Unknown</span>}</td>
                      <td className={`${table.td} ${table.actions}`}>
                        {note.mine || owner ? <RemoveNote id={note.id} /> : <span className={table.muted}>Owners only</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className={styles.frameForm}>
            <AddNote owner={owner} />
          </div>
        </div>

        {AGENTS.map((agent) => {
          const saved = instructions[agent.kind];
          return (
            <section key={agent.kind} className={forms.card}>
              <div className={forms.cardHeader}>
                <h2 className={forms.cardTitle}>{agent.label}</h2>
                <span className={forms.cardMeta}>
                  {saved?.text
                    ? `Changed ${saved.updatedAt ? formatShortDate(saved.updatedAt) : ''}${saved.by ? ` by ${saved.by}` : ''}`
                    : 'Built-in rules only'}
                </span>
              </div>
              <p className={styles.note}>{agent.about}</p>
              <InstructionForm
                kind={agent.kind}
                label={agent.label}
                text={saved?.text ?? ''}
                limit={INSTRUCTION_LIMIT}
                editable={owner}
              />
            </section>
          );
        })}
      </div>
    </main>
  );
}
