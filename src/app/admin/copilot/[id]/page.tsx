import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/console/auth';
import { formatShortDate, formatTime } from '@/lib/console/money';
import { chatFor } from '@/lib/console/staff-agent/history';
import { CarryOn } from '../CarryOn';
import { PlanTable, Reply } from '../parts';
import styles from '../../Admin.module.css';
import dock from '../Thread.module.css';
import page from '../Copilot.module.css';

export const metadata = { title: 'Copilot chat' };

/**
 * One chat, as it happened: what was asked, what Copilot read and showed, each
 * plan and what came of it. Read by the person whose chat it is, and by an
 * owner. Nothing here can be pressed to change a record: a plan still waiting
 * is confirmed in the chat itself, by the person it was laid out for.
 */
export default async function CopilotChatPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const chat = await chatFor(staff, id);
  if (!chat) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/copilot?view=chats" className={styles.backLink}>
            ← Chats
          </Link>
          <h1 className={styles.heading}>{chat.title}</h1>
          <p className={styles.facts}>
            <span>
              <span className={styles.factLabel}>By</span> {chat.mine ? 'you' : chat.by}
            </span>
            <span>
              <span className={styles.factLabel}>Started</span> {formatShortDate(chat.createdAt)}, {formatTime(chat.createdAt)}
            </span>
            <span>
              <span className={styles.factLabel}>Used</span>{' '}
              {(chat.inputTokens + chat.outputTokens).toLocaleString('en-GB')} tokens
              {chat.model ? ` on ${chat.model}` : ''}
            </span>
          </p>
        </div>
        <div className={styles.headActions}>{chat.mine && <CarryOn chatId={chat.id} />}</div>
      </div>

      <div className={page.transcript}>
        {chat.items.length === 0 && <p className={styles.note}>Nothing was said in this chat.</p>}
        {chat.items.map((item) =>
          item.type === 'plan' ? (
            <PlanTable key={item.plan.id} plan={item.plan} />
          ) : item.role === 'user' ? (
            <p key={item.id} className={dock.mine}>
              {item.content}
            </p>
          ) : (
            <Reply key={item.id} content={item.content} cards={item.cards} read={item.read} />
          ),
        )}
      </div>
    </main>
  );
}
