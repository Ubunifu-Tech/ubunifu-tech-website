'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUp, MessageSquareText, SquarePen, X } from 'lucide-react';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import styles from './AssistantDock.module.css';

/**
 * The console assistant: a chat that stays beside the page while staff move
 * around the console.
 *
 * It can look records up and lay out changes. A change arrives as a plan, a
 * table of steps written by the server from what it checked, and nothing in
 * it happens until Confirm is pressed. This window only shows what the server
 * sends and posts what was typed or pressed: every rule is enforced there.
 */

type StepView = { action: string; label: string; subject: string; details: string[]; sends?: string };
type StepOutcome =
  | { state: 'done'; summary: string; href?: string }
  | { state: 'failed'; message: string }
  | { state: 'not_run' };
type Plan = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'stopped' | 'discarded' | 'superseded';
  summary: string;
  steps: StepView[];
  outcomes: StepOutcome[] | null;
};
type Item =
  | { type: 'message'; id: string; role: 'user' | 'assistant'; content: string }
  | { type: 'plan'; plan: Plan }
  | { type: 'notice'; id: string; text: string; signIn?: boolean };

const OPEN_KEY = 'ubu-console-assistant-open';
const STARTERS = [
  'Add a new client and start their first project',
  'What can be invoiced on a project right now?',
  'Draft a service agreement for a project',
];

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
        { type: 'message', id: `a${Date.now()}`, role: 'assistant', content: String(data.reply ?? '') },
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
        <span>Assistant</span>
      </button>

      <aside
        id="console-assistant"
        className={styles.dock}
        data-assistant-dock={open ? 'open' : 'closed'}
        aria-label="Assistant"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') show(false);
        }}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>Assistant</h2>
          <div className={styles.headActions}>
            <button type="button" className={styles.iconButton} onClick={startAgain} disabled={Boolean(busy) || items.length === 0}>
              <SquarePen size={16} aria-hidden />
              <span>New chat</span>
            </button>
            <button type="button" className={styles.iconButton} onClick={() => show(false)} aria-label="Close the assistant">
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={threadRef} className={styles.thread} aria-live="polite">
          {empty && (
            <div className={styles.empty}>
              <p className={styles.emptyLead}>
                Ask about a client or a project, or say what needs setting up. Changes are laid out for you to confirm
                first.
              </p>
              <ul className={styles.starters}>
                {STARTERS.map((starter) => (
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
              <div key={item.id} className={styles.reply}>
                <ChatMarkdown text={item.content} variant="staff" />
              </div>
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
            Message the assistant
          </label>
          <textarea
            id="console-assistant-input"
            ref={inputRef}
            className={styles.input}
            rows={2}
            maxLength={6000}
            placeholder="Ask, or say what to set up"
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

const PLAN_STATE: Record<Plan['status'], string> = {
  pending: 'Waiting for you',
  running: 'In progress',
  done: 'Done',
  stopped: 'Stopped part way',
  discarded: 'Discarded',
  superseded: 'Replaced',
};

function PlanTable({
  plan,
  busy,
  onConfirm,
  onDiscard,
  onChange,
}: {
  plan: Plan;
  busy: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  onChange: () => void;
}) {
  const pending = plan.status === 'pending';
  const sends = plan.steps.filter((step) => step.sends);

  return (
    <section className={styles.plan} data-status={plan.status} aria-label={plan.summary}>
      <header className={styles.planHead}>
        <h3 className={styles.planTitle}>{plan.summary}</h3>
        <span className={styles.planState} data-status={plan.status}>
          {PLAN_STATE[plan.status]}
        </span>
      </header>

      <table className={styles.steps}>
        <thead>
          <tr>
            <th scope="col" className={styles.num}>
              <span className="srOnly">Step</span>
            </th>
            <th scope="col">Step</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {plan.steps.map((step, index) => {
            const outcome = plan.outcomes?.[index];
            return (
              <tr key={index} data-outcome={outcome?.state}>
                <td className={styles.num}>{index + 1}</td>
                <th scope="row">
                  <span className={styles.stepLabel}>{step.label}</span>
                  <span className={styles.stepSubject}>{step.subject}</span>
                </th>
                <td>
                  <ul className={styles.details}>
                    {step.details.map((detail, at) => (
                      <li key={at}>{detail}</li>
                    ))}
                    {step.sends && pending && <li className={styles.sends}>{step.sends}</li>}
                  </ul>
                  {outcome?.state === 'done' && (
                    <p className={styles.done}>
                      {outcome.summary}
                      {outcome.href && (
                        <>
                          {'. '}
                          <Link href={outcome.href}>Open</Link>
                        </>
                      )}
                    </p>
                  )}
                  {outcome?.state === 'failed' && <p className={styles.failed}>{outcome.message}</p>}
                  {outcome?.state === 'not_run' && <p className={styles.skipped}>Not carried out</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pending && (
        <footer className={styles.planFoot}>
          <p className={styles.planNote}>
            Nothing changes until you confirm.
            {sends.length > 0 && ` ${sends.length === 1 ? 'One step sends' : `${sends.length} steps send`} an email.`}
          </p>
          <div className={styles.planActions}>
            <button type="button" className={styles.quiet} onClick={onDiscard} disabled={busy}>
              Discard
            </button>
            <button type="button" className={styles.quiet} onClick={onChange} disabled={busy}>
              Change
            </button>
            <button type="button" className={styles.confirm} onClick={onConfirm} disabled={busy}>
              Confirm
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
