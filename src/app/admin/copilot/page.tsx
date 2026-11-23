import Link from 'next/link';
import { requireStaff } from '@/lib/console/auth';
import { formatRelative, formatShortDate } from '@/lib/console/money';
import { chatsFor, runsFor, usageSince } from '@/lib/console/staff-agent/history';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import { Tabs } from '@/components/console/Tabs';
import styles from '../Admin.module.css';
import page from './Copilot.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Copilot' };

const PLAN_STATE: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Waiting', badge: forms.badgeWarn },
  running: { label: 'In progress', badge: forms.badgeLive },
  done: { label: 'Carried out', badge: forms.badgeGood },
  stopped: { label: 'Stopped part way', badge: forms.badgeBad },
  discarded: { label: 'Discarded', badge: '' },
};

const number = (value: number) => value.toLocaleString('en-GB');

/**
 * Copilot's record. Chats: everything it was asked and said. Plans: every set
 * of changes it laid out, who confirmed it, and what it made. Usage: what all
 * the agents have used this month. A person sees their own; an owner can
 * switch to everyone's.
 */
export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; who?: string }>;
}) {
  const staff = await requireStaff();
  const { view, who } = await searchParams;
  const owner = staff.role === 'owner';
  const current = view === 'plans' ? 'plans' : view === 'usage' && owner ? 'usage' : 'chats';
  const everyone = owner && who === 'everyone';
  const now = new Date();
  const href = (key: string, all = everyone) => {
    const params = new URLSearchParams();
    if (key !== 'chats') params.set('view', key);
    if (all && key !== 'usage') params.set('who', 'everyone');
    const query = params.toString();
    return query ? `/copilot?${query}` : '/copilot';
  };

  const [chats, runs] = await Promise.all([
    current === 'chats' ? chatsFor(staff, { everyone }) : null,
    current === 'plans' ? runsFor(staff, { everyone }) : null,
  ]);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const usage = current === 'usage' ? await usageSince(monthStart) : null;

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>{COPILOT.name}</h1>
          <p className={styles.lead}>
            Everything it was asked, every plan it laid out and what came of each.
            {owner ? ' As an owner you can read everyone’s.' : ' Owners can read these too.'}
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/settings/copilot" className={`${forms.button} ${forms.quiet}`}>
            Instructions and notes
          </Link>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'chats', label: 'Chats', href: href('chats') },
          { key: 'plans', label: 'Plans', href: href('plans') },
          ...(owner ? [{ key: 'usage', label: 'Usage', href: href('usage') }] : []),
        ]}
        current={current}
      />

      {chats && (
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>{everyone ? 'Everyone’s chats' : 'Your chats'}</h2>
              <span className={table.count}>{number(chats.total)}</span>
            </div>
            {owner && (
              <div className={table.toolbarActions}>
                <Link href={href('chats', !everyone)} className={table.action}>
                  {everyone ? 'Show only mine' : 'Show everyone’s'}
                </Link>
              </div>
            )}
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Chat</th>
                  {everyone && <th className={table.th} scope="col">By</th>}
                  <th className={table.th} scope="col">Last message</th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">Messages</th>
                  <th className={table.th} scope="col">Plans</th>
                </tr>
              </thead>
              <tbody>
                {chats.rows.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={everyone ? 5 : 4}>
                      <p className={table.emptyTitle}>No chats yet.</p>
                      <p className={table.emptyHint}>
                        Open {COPILOT.short} from the top of any page and ask it something. Every chat is kept here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  chats.rows.map((chat) => (
                    <tr key={chat.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>
                        <Link href={`/copilot/${chat.id}`} className={table.link}>
                          {chat.title}
                        </Link>
                        {chat.open && chat.mine && <span className={table.sub}>Open in the panel now</span>}
                      </td>
                      {everyone && <td className={`${table.td} ${table.nowrap}`}>{chat.mine ? 'You' : chat.by}</td>}
                      <td className={`${table.td} ${table.nowrap}`}>{formatRelative(chat.lastAt, now)}</td>
                      <td className={`${table.td} ${table.numeric}`}>{chat.turns}</td>
                      <td className={`${table.td} ${table.nowrap}`}>
                        {chat.plans === 0 ? (
                          <span className={table.muted}>None</span>
                        ) : (
                          `${chat.carriedOut} of ${chat.plans} carried out`
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {runs && (
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>{everyone ? 'Everyone’s plans' : 'Your plans'}</h2>
              <span className={table.count}>{number(runs.total)}</span>
            </div>
            {owner && (
              <div className={table.toolbarActions}>
                <Link href={href('plans', !everyone)} className={table.action}>
                  {everyone ? 'Show only mine' : 'Show everyone’s'}
                </Link>
              </div>
            )}
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">Plan</th>
                  {everyone && <th className={table.th} scope="col">For</th>}
                  <th className={table.th} scope="col">Laid out</th>
                  <th className={table.th} scope="col">State</th>
                  <th className={table.th} scope="col">What it did</th>
                </tr>
              </thead>
              <tbody>
                {runs.rows.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={everyone ? 5 : 4}>
                      <p className={table.emptyTitle}>No plans yet.</p>
                      <p className={table.emptyHint}>
                        When {COPILOT.short} is asked to set something up, it lays the steps out as a plan. Each one
                        is listed here with who confirmed it and what it made.
                      </p>
                    </td>
                  </tr>
                ) : (
                  runs.rows.map((run) => {
                    const state = PLAN_STATE[run.status] ?? { label: run.status, badge: '' };
                    return (
                      <tr key={run.id} className={table.tr}>
                        <td className={`${table.td} ${table.primary}`}>
                          <Link href={`/copilot/${run.chatId}`} className={table.link}>
                            {run.summary}
                          </Link>
                          <span className={table.sub}>
                            {run.steps} {run.steps === 1 ? 'step' : 'steps'}
                          </span>
                        </td>
                        {everyone && <td className={`${table.td} ${table.nowrap}`}>{run.by}</td>}
                        <td className={`${table.td} ${table.nowrap}`}>{formatShortDate(run.at)}</td>
                        <td className={table.td}>
                          <span className={`${forms.badge} ${state.badge}`}>{state.label}</span>
                        </td>
                        <td className={table.td}>
                          {run.outcomes.length === 0 ? (
                            <span className={table.muted}>
                              {run.status === 'pending' ? 'Nothing yet' : 'Nothing was changed'}
                            </span>
                          ) : (
                            <ul className={page.outcomes}>
                              {run.outcomes.map((outcome, index) => (
                                <li key={index} data-failed={outcome.failed ? '' : undefined}>
                                  {outcome.href ? (
                                    <Link href={outcome.href} className={table.link}>
                                      {outcome.summary}
                                    </Link>
                                  ) : (
                                    outcome.summary
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {usage && (
        <div className={styles.stack}>
          {[
            { title: 'By agent, this month', first: 'Agent', rows: usage.surfaces },
            { title: `${COPILOT.short} by person, this month`, first: 'Person', rows: usage.people },
          ].map((block) => (
            <div key={block.title} className={table.frame}>
              <div className={table.toolbar}>
                <div className={table.toolbarText}>
                  <h2 className={table.title}>{block.title}</h2>
                  <span className={table.count}>Since {formatShortDate(monthStart)}</span>
                </div>
              </div>
              <div className={table.scroll}>
                <table className={`${table.table} ${table.compact}`}>
                  <thead>
                    <tr>
                      <th className={table.th} scope="col">{block.first}</th>
                      <th className={`${table.th} ${table.numericHead}`} scope="col">Chats</th>
                      <th className={`${table.th} ${table.numericHead}`} scope="col">Messages</th>
                      <th className={`${table.th} ${table.numericHead}`} scope="col">Tokens read</th>
                      <th className={`${table.th} ${table.numericHead}`} scope="col">Tokens written</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.length === 0 ? (
                      <tr>
                        <td className={table.emptyCell} colSpan={5}>
                          <p className={table.emptyTitle}>Nothing used yet this month.</p>
                        </td>
                      </tr>
                    ) : (
                      block.rows.map((row) => (
                        <tr key={row.name} className={table.tr}>
                          <td className={`${table.td} ${table.primary}`}>{row.name}</td>
                          <td className={`${table.td} ${table.numeric}`}>{number(row.chats)}</td>
                          <td className={`${table.td} ${table.numeric}`}>{number(row.messages)}</td>
                          <td className={`${table.td} ${table.numeric}`}>{number(row.inputTokens)}</td>
                          <td className={`${table.td} ${table.numeric}`}>{number(row.outputTokens)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className={styles.note}>
            Tokens are what the provider bills by. The cost in money is on the provider’s invoice, which is the
            figure that counts.
          </p>
        </div>
      )}
    </main>
  );
}
