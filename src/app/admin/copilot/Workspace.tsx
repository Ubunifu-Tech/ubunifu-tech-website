'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, PanelRight, SquarePen, X } from 'lucide-react';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import { CardView, DiffView, PlanTable, ReadChips, cardLabel, type Card, type Item, type Plan, type ReadRef } from './parts';
import thread from './Thread.module.css';
import styles from './Copilot.module.css';

/**
 * Ubunifu Copilot, as a place of its own: the chats down the side, the
 * conversation in the middle, and what it shows open beside it.
 *
 * It reads records, shows them and lays out changes. A change arrives as a
 * plan, a table of steps written by the server from what it checked, and
 * nothing in it happens until Confirm is pressed. This screen only shows what
 * the server sends and posts what was typed or pressed: every rule is
 * enforced there.
 */

export type ChatLink = { id: string; title: string; when: string; open: boolean };
export type About = { path: string; label: string; card: Card | null };

async function post(body: object): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await fetch('/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, data };
}

/** Offered in an empty chat: one about where they came from, then the common jobs. */
function starters(about: string | null): string[] {
  return [
    ...(about ? [`Summarise ${about} and what it needs next`] : []),
    'What is owed to us, and what is overdue?',
    'Add a new client and start their first project',
    'Draft a service agreement for a project',
  ].slice(0, 4);
}

type Message = Extract<Item, { type: 'message' }>;

export function Workspace({
  chats,
  owner,
  about,
  ask,
}: {
  chats: ChatLink[];
  owner: boolean;
  about: About | null;
  /** What to put in the box to begin with, when a page sent them here with a job in mind. */
  ask?: string;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState(ask ?? '');
  const [busy, setBusy] = useState<'turn' | 'plan' | 'switch' | null>(null);
  // Which reply's cards are open beside the conversation. Null follows the latest.
  const [focus, setFocus] = useState<string | null>(null);
  // The record they came from, until they set it aside.
  const [context, setContext] = useState<About | null>(about);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    let cancelled = false;
    fetch('/assistant')
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items?: Item[] }) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const element = threadRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [items, busy]);

  const notice = (text: string, signIn = false) =>
    setItems((current) => [...current, { type: 'notice', id: `n${Date.now()}`, text, signIn }]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const id = `u${Date.now()}`;
    setDraft('');
    setBusy('turn');
    setFocus(null);
    // A new message leaves earlier notices behind and retires a plan that was
    // waiting only if the reply brings a new one.
    setItems((current) => [
      ...current.filter((item) => item.type !== 'notice'),
      { type: 'message', id, role: 'user', content: message },
    ]);
    try {
      const { status, data } = await post({ message, page: context?.path ?? '/copilot' });
      if (status !== 200) {
        // No answer came, so the words go back in the box to send again.
        setItems((current) => current.filter((item) => !(item.type === 'message' && item.id === id)));
        setDraft(message);
        notice(String(data.error ?? 'That did not go through. Try again.'), status === 401);
        return;
      }
      const plan = (data.plan as Plan | null) ?? null;
      setItems((current) => [
        ...current.filter((item) => !(plan && item.type === 'plan' && item.plan.status === 'pending')),
        {
          type: 'message',
          id: `a${Date.now()}`,
          role: 'assistant',
          content: String(data.reply ?? ''),
          cards: (data.cards as Card[] | undefined) ?? [],
          read: (data.read as ReadRef[] | undefined) ?? [],
        },
        ...(plan ? [{ type: 'plan' as const, plan }] : []),
      ]);
      // The first message names the chat, so the list beside it is read again.
      router.refresh();
    } catch {
      setItems((current) => current.filter((item) => !(item.type === 'message' && item.id === id)));
      setDraft(message);
      notice('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function decide(plan: Plan, decision: 'confirm' | 'discard') {
    if (busy) return;
    setBusy('plan');
    try {
      const { status, data } = await post({ [decision]: plan.id });
      if (status !== 200) {
        notice(String(data.error ?? 'That did not go through. Try again.'), status === 401);
        if (status === 409) load();
        return;
      }
      const decided = data.plan as Plan;
      setItems((current) =>
        current.map((item) => (item.type === 'plan' && item.plan.id === decided.id ? { type: 'plan', plan: decided } : item)),
      );
    } catch {
      notice('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  /** A new chat, or one of theirs brought back. Either way the one that was open is kept. */
  async function switchTo(body: { reset: true } | { resume: string }) {
    if (busy) return;
    setBusy('switch');
    try {
      await post(body);
      setItems([]);
      setLoaded(false);
      setFocus(null);
      setDraft('');
      load();
      router.refresh();
      inputRef.current?.focus();
    } finally {
      setBusy(null);
    }
  }

  const replies = items.filter((item): item is Message => item.type === 'message' && item.role === 'assistant');
  const withCards = replies.filter((reply) => (reply.cards?.length ?? 0) > 0);
  const focused = withCards.find((reply) => reply.id === focus) ?? withCards[withCards.length - 1] ?? null;
  // Beside the conversation: what the chosen reply showed, or before anything
  // has been shown, the record they came from.
  const onCanvas: Card[] = focused?.cards ?? (context?.card ? [context.card] : []);
  // A plan that is waiting and would rewrite something: its changes are what
  // the person needs in front of them before they confirm.
  const waiting = [...items].reverse().find((item): item is Extract<Item, { type: 'plan' }> => item.type === 'plan' && item.plan.status === 'pending');
  const diffs = focus === null ? (waiting?.plan.steps.flatMap((step) => (step.diff ? [step.diff] : [])) ?? []) : [];
  const beside = diffs.length > 0 || onCanvas.length > 0;
  const empty = loaded && items.length === 0;

  return (
    <main className={styles.workspace} data-canvas={beside ? '' : undefined}>
      <nav className={styles.rail} aria-label="Your chats">
        <button type="button" className={styles.newChat} onClick={() => switchTo({ reset: true })} disabled={busy !== null || empty}>
          <SquarePen size={16} aria-hidden />
          New chat
        </button>
        <p className={styles.railLabel}>Your chats</p>
        <ul className={styles.chats}>
          {chats.length === 0 && <li className={styles.railEmpty}>None yet. Each one is kept here.</li>}
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className={styles.chat}
                aria-current={chat.open ? 'true' : undefined}
                disabled={busy !== null}
                onClick={() => (chat.open ? undefined : switchTo({ resume: chat.id }))}
              >
                <span className={styles.chatTitle}>{chat.title}</span>
                <span className={styles.chatWhen}>{chat.when}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.railFoot}>
          <Link href="/copilot?view=chats">All chats</Link>
          <Link href="/copilot?view=plans">Plans and what they made</Link>
          {owner && <Link href="/copilot?view=usage">Usage</Link>}
          <Link href="/settings/copilot">Instructions and notes</Link>
        </div>
      </nav>

      <section className={styles.conversation} aria-label={COPILOT.name}>
        <div ref={threadRef} className={styles.thread} aria-live="polite">
          <div className={styles.column}>
            {empty && (
              <div className={styles.welcome}>
                <h1 className={styles.welcomeTitle}>{COPILOT.name}</h1>
                <p className={styles.welcomeLead}>
                  Ask about anything in the console, or say what needs setting up. It reads, shows and prepares.
                  Nothing changes until you confirm it.
                </p>
                <ul className={styles.starters}>
                  {starters(context?.label ?? null).map((starter) => (
                    <li key={starter}>
                      <button
                        type="button"
                        className={thread.starter}
                        onClick={() => {
                          setDraft(starter);
                          inputRef.current?.focus();
                        }}
                      >
                        {starter}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {items.map((item) => {
              if (item.type === 'plan') {
                return (
                  <PlanTable
                    key={item.plan.id}
                    plan={item.plan}
                    busy={busy !== null}
                    onConfirm={() => decide(item.plan, 'confirm')}
                    onDiscard={() => decide(item.plan, 'discard')}
                    onChange={() => inputRef.current?.focus()}
                  />
                );
              }
              if (item.type === 'notice') {
                return (
                  <p key={item.id} className={thread.notice} role="status">
                    {item.text}{' '}
                    {item.signIn && (
                      <a href="/sign-in" target="_blank" rel="noreferrer">
                        Sign in
                      </a>
                    )}
                  </p>
                );
              }
              if (item.role === 'user') {
                return (
                  <p key={item.id} className={thread.mine}>
                    {item.content}
                  </p>
                );
              }
              const cards = item.cards ?? [];
              return (
                <div key={item.id} className={thread.turn}>
                  {/* On a narrow screen there is no room beside, so what was shown sits in the thread. */}
                  <div className={styles.inline}>
                    {cards.map((card, index) => (
                      <CardView key={index} card={card} />
                    ))}
                  </div>
                  <div className={thread.reply}>
                    <ChatMarkdown text={item.content} variant="staff" />
                  </div>
                  {cards.length > 0 && (
                    <p className={styles.shown}>
                      <button
                        type="button"
                        className={styles.shownButton}
                        aria-pressed={focused?.id === item.id}
                        onClick={() => setFocus(item.id)}
                      >
                        <PanelRight size={14} aria-hidden />
                        {cards.length === 1 ? cardLabel(cards[0]!) : `${cards.length} views`}
                      </button>
                    </p>
                  )}
                  <ReadChips read={item.read ?? []} />
                </div>
              );
            })}

            {busy === 'turn' && (
              <p className={thread.working} role="status">
                Working on it
                <span className={thread.dots} aria-hidden />
              </p>
            )}
          </div>
        </div>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <div className={styles.column}>
            {context && (
              <p className={styles.context}>
                <Link href={context.path} className={styles.contextBack}>
                  <ArrowLeft size={14} aria-hidden />
                  Back
                </Link>
                <span className={styles.contextAbout}>About {context.label}</span>
                <button type="button" className={styles.contextDrop} onClick={() => setContext(null)} aria-label={`Stop asking about ${context.label}`}>
                  <X size={14} aria-hidden />
                </button>
              </p>
            )}
            <div className={styles.box}>
              <label className="srOnly" htmlFor="copilot-input">
                Message {COPILOT.short}
              </label>
              <textarea
                id="copilot-input"
                ref={inputRef}
                className={thread.input}
                rows={2}
                maxLength={6000}
                placeholder={context ? `Ask about ${context.label}, or say what to do` : 'Ask, or say what to set up'}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
              />
              <button type="submit" className={thread.send} disabled={busy !== null || draft.trim().length === 0} aria-label="Send">
                <ArrowUp size={18} aria-hidden />
              </button>
            </div>
          </div>
        </form>
      </section>

      {beside && (
        <aside className={styles.canvas} aria-label="What Copilot is showing">
          {diffs.length > 0 ? (
            <>
              <p className={styles.canvasLabel}>Waiting for you to confirm</p>
              {diffs.map((diff, index) => (
                <DiffView key={index} diff={diff} />
              ))}
            </>
          ) : (
            <>
              <p className={styles.canvasLabel}>{focused ? 'Shown' : 'Where you came from'}</p>
              {onCanvas.map((card, index) => (
                <CardView key={index} card={card} />
              ))}
              {focused && <ReadChips read={focused.read ?? []} />}
            </>
          )}
        </aside>
      )}
    </main>
  );
}
