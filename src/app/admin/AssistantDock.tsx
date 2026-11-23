'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUp, History, MessageSquareText, SquarePen, X } from 'lucide-react';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import { PlanTable, Reply, type Card, type Item, type Plan, type ReadRef } from './copilot/parts';
import styles from './AssistantDock.module.css';

/**
 * Ubunifu Copilot, beside the page: a chat that stays with staff while they
 * move around the console and knows which record they are looking at.
 *
 * It reads records, shows them as cards and lays out changes. A change
 * arrives as a plan, a table of steps written by the server from what it
 * checked, and nothing in it happens until Confirm is pressed. This window
 * only shows what the server sends and posts what was typed or pressed:
 * every rule is enforced there. Past chats are on the Copilot page.
 */

/** What the page they are on is about, said in the composer so they know what "this" means. */
function lookingAt(pathname: string): string | null {
  const match = /^\/(projects|clients|documents|invoices)\/([A-Za-z0-9_-]+)$/.exec(pathname);
  if (!match || match[2] === 'new') return null;
  const [, kind, ref] = match;
  if (kind === 'documents' || kind === 'invoices') return ref!.toUpperCase();
  return `this ${kind === 'projects' ? 'project' : 'client'}`;
}

const OPEN_KEY = 'ubu-console-assistant-open';
/** Offered in an empty chat: one for wherever they are, then the common jobs. */
function starters(context: string | null): string[] {
  return [
    ...(context ? [`Summarise ${context} and what it needs next`] : []),
    'Add a new client and start their first project',
    'What can be invoiced right now?',
    'Draft a service agreement for a project',
  ].slice(0, 3);
}

async function post(body: object): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await fetch('/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, data };
}

export function AssistantDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'turn' | 'plan' | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Whether it was open is remembered per browser. Storage can be unavailable,
  // and then it simply starts closed.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(OPEN_KEY) === '1') setOpen(true);
    } catch {}
  }, []);

  const show = useCallback((next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {}
    if (!next) triggerRef.current?.focus();
  }, []);

  // The thread so far, fetched the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch('/assistant')
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items?: Item[] }) => {
        if (cancelled) return;
        setItems((current) => (current.length > 0 ? current : (data.items ?? [])));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // "Carry on" from a past chat lands here with the panel asked for: the chat
  // was made the open one, so it is read back afresh.
  useEffect(() => {
    const onResume = () => {
      setItems([]);
      setLoaded(false);
      show(true);
    };
    window.addEventListener('copilot:resume', onResume);
    return () => window.removeEventListener('copilot:resume', onResume);
  }, [show]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [items, busy, open]);

  const notice = (text: string, signIn = false) =>
    setItems((current) => [...current, { type: 'notice', id: `n${Date.now()}`, text, signIn }]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const id = `u${Date.now()}`;
    setDraft('');
    setBusy('turn');
    // A new message leaves earlier notices behind and retires a plan that was
    // waiting only if the reply brings a new one.
    setItems((current) => [
      ...current.filter((item) => item.type !== 'notice'),
      { type: 'message', id, role: 'user', content: message },
    ]);
    try {
      const { status, data } = await post({ message, page: pathname });
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
        if (status === 409) setLoaded(false);
        return;
      }
      const decided = data.plan as Plan;
      setItems((current) =>
        current.map((item) => (item.type === 'plan' && item.plan.id === decided.id ? { type: 'plan', plan: decided } : item)),
      );
      // The page behind may be showing what just changed.
      if (decision === 'confirm') router.refresh();
    } catch {
      notice('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function startAgain() {
    if (busy) return;
    await post({ reset: true }).catch(() => null);
    setItems([]);
    setDraft('');
    inputRef.current?.focus();
  }

  const empty = loaded && items.length === 0;
  const context = lookingAt(pathname);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="console-assistant"
        onClick={() => show(!open)}
      >
        <MessageSquareText size={16} aria-hidden />
        <span>{COPILOT.short}</span>
      </button>

      <aside
        id="console-assistant"
        className={styles.dock}
        data-assistant-dock={open ? 'open' : 'closed'}
        aria-label={COPILOT.name}
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') show(false);
        }}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>{COPILOT.short}</h2>
          <div className={styles.headActions}>
            <Link href="/copilot" className={styles.iconButton}>
              <History size={16} aria-hidden />
              <span>History</span>
            </Link>
            <button type="button" className={styles.iconButton} onClick={startAgain} disabled={Boolean(busy) || items.length === 0}>
              <SquarePen size={16} aria-hidden />
              <span>New chat</span>
            </button>
            <button type="button" className={styles.iconButton} onClick={() => show(false)} aria-label={`Close ${COPILOT.short}`}>
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={threadRef} className={styles.thread} aria-live="polite">
          {empty && (
            <div className={styles.empty}>
              <p className={styles.emptyLead}>
                Ask about anything in the console, or say what needs setting up. {COPILOT.short} reads and prepares;
                nothing changes until you confirm it.
              </p>
              <ul className={styles.starters}>
                {starters(context).map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      className={styles.starter}
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
                <p key={item.id} className={styles.notice} role="status">
                  {item.text}{' '}
                  {item.signIn && (
                    <a href="/sign-in" target="_blank" rel="noreferrer">
                      Sign in
                    </a>
                  )}
                </p>
              );
            }
            return item.role === 'user' ? (
              <p key={item.id} className={styles.mine}>
                {item.content}
              </p>
            ) : (
              <Reply key={item.id} content={item.content} cards={item.cards} read={item.read} />
            );
          })}

          {busy === 'turn' && (
            <p className={styles.working} role="status">
              Working on it
              <span className={styles.dots} aria-hidden />
            </p>
          )}
        </div>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label className="srOnly" htmlFor="console-assistant-input">
            Message {COPILOT.short}
          </label>
          {context && (
            <p className={styles.context}>
              <span className={styles.contextDot} aria-hidden />
              Looking at {context}
            </p>
          )}
          <textarea
            id="console-assistant-input"
            ref={inputRef}
            className={styles.input}
            rows={2}
            maxLength={6000}
            placeholder={context ? 'Ask about it, or say what to do' : 'Ask, or say what to set up'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          <button type="submit" className={styles.send} disabled={Boolean(busy) || draft.trim().length === 0} aria-label="Send">
            <ArrowUp size={18} aria-hidden />
          </button>
        </form>
      </aside>
    </>
  );
}
