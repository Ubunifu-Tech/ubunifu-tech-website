'use client';

import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { toPlainText } from '@/lib/chat-links';
import { replyPromise } from '@/content/site';
import styles from './Assistant.module.css';

/**
 * The chat assistant, on the website and in the client portal.
 *
 * On the website it answers questions from what the site says and hands a
 * real need to the team as an enquiry. In the portal it answers from the
 * client's own projects and hands things over as a request. What each can
 * see and do is decided on the server; this is only the window.
 *
 * There is always a way to a person. "Talk to a person" is one tap away, and
 * a failure the assistant cannot get past opens that form under one plain
 * sentence instead of a dead end. The thread lives on the server, so closing
 * the panel or changing page does not lose it, and nothing typed is lost:
 * the hand-off form keeps its fields until it is sent.
 */

// Replies are formatted, but the formatter is only fetched once the chat is
// used; until it arrives a reply shows as plain text.
const ChatMarkdown = lazy(() => import('./ChatMarkdown'));

type Turn = { id: string; role: string; content: string };

type Variant = 'site' | 'portal';

/** What the window says happened after a hand-off. Only what the server confirmed. */
type HandedOff =
  | { kind: 'site'; outcome: 'created' | 'appended'; acknowledged: boolean }
  | { kind: 'portal'; reference: string | null; url: string | null };

type Problem = { text: string; signInHref?: string };

type HandoffDraft = {
  name: string;
  email: string;
  details: string;
  website: string;
  /** Kept for the whole draft, so a retry through the contact form is not sent twice. */
  submissionId: string;
};

/** The longest the window waits for an answer before offering a person instead. */
const ANSWER_TIMEOUT_MS = 65_000;

const TEAM_EMAIL = 'info@ubunifutech.com';

const COPY: Record<
  Variant,
  {
    endpoint: string;
    title: string;
    subtitle: string;
    launcher: string;
    opener: string;
    placeholder: string;
    starters: string[];
  }
> = {
  site: {
    endpoint: '/api/assistant',
    title: 'Chat with Ubunifu',
    subtitle: 'An assistant answers. A person follows up.',
    launcher: 'Chat with us',
    opener:
      'Hello. Ask me anything about what we do, or tell me what you are working on and I will pass it to the team.',
    placeholder: 'Ask us anything…',
    starters: ['What do you do?', 'Tell me about your products', 'I have a project in mind'],
  },
  portal: {
    endpoint: '/api/portal/assistant',
    title: 'Help',
    subtitle: 'Knows your projects. The team is one tap away.',
    launcher: 'Help',
    opener:
      'Hello. Ask me about your projects, documents or invoices, or tell me what you need and I will pass it to the team.',
    placeholder: 'Ask about your projects…',
    starters: ['How is my project going?', 'What do you need from us?', 'Anything to pay?'],
  },
};

/** The card after a hand-off, in words, for the screen and for screen readers. */
function handedOffText(handedOff: HandedOff): string {
  if (handedOff.kind === 'portal') {
    return handedOff.reference
      ? `With the team as ${handedOff.reference}. They reply there.`
      : 'With the team. They reply in Requests.';
  }
  if (handedOff.outcome === 'appended') return 'Added to what you sent. The team has been told.';
  return handedOff.acknowledged
    ? `Sent to the team. We have emailed you a confirmation. ${replyPromise}`
    : `Sent to the team. ${replyPromise}`;
}

function newSubmissionId(): string {
  return crypto.randomUUID();
}

function emptyDraft(): HandoffDraft {
  return { name: '', email: '', details: '', website: '', submissionId: newSubmissionId() };
}

/** Anything on the page can open the chat: a button, a link, an email. */
export const OPEN_CHAT_EVENT = 'ubunifu:open-chat';

export function openChat() {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
}

export function Assistant({ variant = 'site' }: { variant?: Variant }) {
  const copy = COPY[variant];
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [handedOff, setHandedOff] = useState<HandedOff | null>(null);
  const [asking, setAsking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** A new thread began while an earlier one was showing. */
  const [freshStart, setFreshStart] = useState(false);
  /** What a screen reader hears: each new reply once, and the hand-off card. */
  const [announcement, setAnnouncement] = useState('');
  const [handoff, setHandoff] = useState<HandoffDraft>(emptyDraft);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const focusCard = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  }, []);

  // Opened by other parts of the page, and by ?chat=open in a link.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, show);

    const url = new URL(window.location.href);
    if (url.searchParams.get('chat') === 'open') {
      show();
      url.searchParams.delete('chat');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return () => window.removeEventListener(OPEN_CHAT_EVENT, show);
  }, []);

  // The thread is fetched only once the panel is opened, so a visitor who
  // never uses it costs nothing.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);

    fetch(copy.endpoint)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          messages?: Turn[];
          sent?: boolean;
          reference?: string | null;
          signIn?: boolean;
        };
        if (response.status === 401 && data.signIn) {
          setProblem({ text: 'You have been signed out.', signInHref: signInHref() });
          return;
        }
        setTurns(data.messages ?? []);
        if (data.sent) {
          setHandedOff(
            variant === 'portal'
              ? {
                  kind: 'portal',
                  reference: data.reference ?? null,
                  url: data.reference ? `/portal/requests/${data.reference}` : null,
                }
              : // What was confirmed at the time is not known now, so no email is claimed.
                { kind: 'site', outcome: 'created', acknowledged: false },
          );
        }
      })
      .catch(() => {
        // A failed history fetch is not worth an error: a new chat still works.
      });
  }, [open, loaded, copy.endpoint, variant]);

  useEffect(() => {
    if (!open) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: still ? 'auto' : 'smooth',
    });
  }, [turns, busy, open, problem, asking, handedOff]);

  useEffect(() => {
    if (open && !asking) input.current?.focus();
  }, [open, asking]);

  // A successful hand-off moves focus to what it says.
  useEffect(() => {
    if (handedOff && focusCard.current) {
      focusCard.current = false;
      card.current?.focus();
    }
  }, [handedOff]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      // Escape inside the hand-off form must not throw away what is typed there.
      if (event.target instanceof Element && event.target.closest('form[data-handoff]')) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // The composer grows with what is typed, up to its maximum height.
  useEffect(() => {
    const box = input.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }, [draft, open, asking]);

  /** Internal links close the sheet on a phone, where it covers the page they open. */
  const onInternalNavigate = useCallback(() => {
    if (window.matchMedia('(max-width: 40rem)').matches) setOpen(false);
  }, []);

  const theirWords = turns
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content)
    .join('\n\n');
  const enquiryExists = handedOff?.kind === 'site';

  const openForm = useCallback(() => {
    // Seeded once with their own words, unless there is already an enquiry to add to.
    setHandoff((current) =>
      current.details || enquiryExists ? current : { ...current, details: theirWords },
    );
    setAsking(true);
  }, [enquiryExists, theirWords]);

  const onHandedOff = useCallback(
    (result: HandedOff) => {
      focusCard.current = true;
      setAsking(false);
      setProblem(null);
      setHandedOff(result);
      setHandoff(emptyDraft());
      setAnnouncement(handedOffText(result));
    },
    [],
  );

  const send = useCallback(
    async (text?: string) => {
      const message = (text ?? draft).trim();
      if (!message || busy) return;

      setDraft('');
      setProblem(null);
      setBusy(true);
      const optimistic = `local-${Date.now()}`;
      setTurns((current) => [...current, { id: optimistic, role: 'user', content: message }]);
      const withdraw = () => {
        setTurns((current) => current.filter((turn) => turn.id !== optimistic));
        setDraft(message);
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANSWER_TIMEOUT_MS);
      try {
        const response = await fetch(copy.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message,
            page: window.location.pathname,
            // The window was showing an earlier thread, so a fresh start can be said.
            hadThread: turns.length > 0,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          reply?: string;
          error?: string;
          fallback?: boolean;
          fresh?: boolean;
          signIn?: boolean;
          handoff?:
            | { outcome: 'created' | 'appended'; acknowledged: boolean }
            | { reference: string; url: string }
            | null;
        };

        if (response.status === 401 && data.signIn) {
          withdraw();
          setProblem({ text: 'You have been signed out.', signInHref: signInHref() });
          return;
        }

        if (!response.ok || !data.reply) {
          setProblem({ text: data.error ?? 'The assistant is not available right now.' });
          if (data.fallback === false) {
            // Trying again is the answer: the words go back into the box.
            withdraw();
          } else {
            openForm();
          }
          return;
        }

        const reply = data.reply;
        if (data.fresh) {
          // A new thread began on the server: show only it, under a divider.
          setFreshStart(true);
          setHandedOff(null);
          setTurns([
            { id: optimistic, role: 'user', content: message },
            { id: `reply-${Date.now()}`, role: 'assistant', content: reply },
          ]);
        } else {
          setTurns((current) => [
            ...current,
            { id: `reply-${Date.now()}`, role: 'assistant', content: reply },
          ]);
        }
        setAnnouncement(`Reply: ${toPlainText(reply)}`);

        if (data.handoff && 'outcome' in data.handoff) {
          onHandedOff({ kind: 'site', ...data.handoff });
        } else if (data.handoff && 'reference' in data.handoff) {
          onHandedOff({ kind: 'portal', reference: data.handoff.reference, url: data.handoff.url });
        }
      } catch (error) {
        setProblem({
          text:
            error instanceof DOMException && error.name === 'AbortError'
              ? 'The assistant took too long to answer.'
              : 'We could not reach the assistant.',
        });
        openForm();
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [draft, busy, copy.endpoint, turns.length, openForm, onHandedOff],
  );

  const shown =
    turns.length > 0 ? turns : [{ id: 'opener', role: 'assistant', content: copy.opener }];

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ''} ${
          variant === 'portal' ? styles.launcherPortal : ''
        }`}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        {open ? (
          <X size={20} strokeWidth={2} aria-hidden="true" />
        ) : (
          <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
        )}
        <span className={styles.launcherLabel}>{open ? 'Close' : copy.launcher}</span>
      </button>

      {open && (
        // data-lenis-prevent: the page's smooth scrolling would otherwise take
        // the wheel, and the thread could not be scrolled.
        <section
          id="assistant-panel"
          className={styles.panel}
          role="dialog"
          aria-label={copy.title}
          data-lenis-prevent
        >
          <header className={styles.head}>
            {asking ? (
              <button
                type="button"
                className={styles.back}
                onClick={() => {
                  setAsking(false);
                  setProblem(null);
                  requestAnimationFrame(() => input.current?.focus());
                }}
              >
                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
                Back to the chat
              </button>
            ) : (
              <div className={styles.headText}>
                <span className={styles.avatar} aria-hidden="true">
                  <MessageCircle size={16} strokeWidth={2} />
                </span>
                <div>
                  <p className={styles.title}>{copy.title}</p>
                  <p className={styles.subtitle}>{copy.subtitle}</p>
                </div>
              </div>
            )}
            <button type="button" className={styles.close} onClick={close} aria-label="Close">
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>

          <p className={styles.srOnly} aria-live="polite">
            {announcement}
          </p>

          <div className={styles.thread} ref={scroller} role="log" aria-label="Conversation">
            {!asking && freshStart && (
              <p className={styles.divider}>
                <span>New conversation</span>
              </p>
            )}

            {!asking &&
              shown.map((turn) =>
                turn.role === 'user' ? (
                  <p key={turn.id} className={styles.fromVisitor}>
                    {turn.content}
                  </p>
                ) : (
                  <div key={turn.id} className={styles.fromUs}>
                    <Suspense fallback={<div className={styles.plainReply}>{turn.content}</div>}>
                      <ChatMarkdown
                        text={turn.content}
                        variant={variant}
                        onInternalNavigate={onInternalNavigate}
                      />
                    </Suspense>
                  </div>
                ),
              )}

            {!asking && turns.length === 0 && !busy && (
              <div className={styles.starters}>
                {copy.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className={styles.starter}
                    onClick={() => void send(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <p className={styles.typing} role="status">
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.srOnly}>Thinking</span>
              </p>
            )}

            {problem && (
              <p className={styles.error} role="alert">
                {problem.text}
                {problem.signInHref && (
                  <>
                    {' '}
                    <Link href={problem.signInHref}>Sign in again</Link>
                  </>
                )}
              </p>
            )}

            {handedOff && !busy && !asking && (
              <div className={styles.sent} role="status" tabIndex={-1} ref={card}>
                {handedOffText(handedOff)}
                {handedOff.kind === 'portal' && (
                  <>
                    {' '}
                    <Link href={handedOff.url ?? '/portal/requests'}>
                      {handedOff.url ? 'Open the request' : 'Open Requests'}
                    </Link>
                  </>
                )}
              </div>
            )}

            {asking &&
              (variant === 'site' ? (
                <MessageForm
                  value={handoff}
                  onChange={setHandoff}
                  adding={enquiryExists}
                  onSent={onHandedOff}
                />
              ) : (
                <RequestForm value={handoff} onChange={setHandoff} onSent={onHandedOff} />
              ))}
          </div>

          {!asking && (
            <>
              <form
                className={styles.composer}
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <label className={styles.srOnly} htmlFor="assistant-input">
                  Your message
                </label>
                <textarea
                  id="assistant-input"
                  ref={input}
                  className={styles.input}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends, shift+enter makes a new line.
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={copy.placeholder}
                  disabled={busy}
                />
                <button
                  type="submit"
                  className={styles.send}
                  disabled={busy || draft.trim().length === 0}
                  aria-label="Send"
                >
                  <Send size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </form>

              <button type="button" className={styles.person} onClick={openForm}>
                <UserRound size={14} strokeWidth={2} aria-hidden="true" />
                Talk to a person
              </button>
            </>
          )}
        </section>
      )}
    </>
  );
}

/** The portal's sign-in page, returning to where they were. */
function signInHref(): string {
  return `/portal/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
}

/** Focuses a form's heading when it opens, so the form is announced and Tab starts there. */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

/**
 * The website's way to a person: name, email and what they need, sent with
 * the chat attached. If our own endpoint is down, it falls back to the
 * contact form's, which can email the team even without the database.
 */
function MessageForm({
  value,
  onChange,
  adding,
  onSent,
}: {
  value: HandoffDraft;
  onChange: (next: HandoffDraft) => void;
  /** They already sent something from this chat, so this adds to it. */
  adding: boolean;
  onSent: (result: HandedOff) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ text: string; blocked?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const heading = useFocusOnMount<HTMLParagraphElement>();
  const fields = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    details: useRef<HTMLTextAreaElement>(null),
  };
  const set = (field: keyof HandoffDraft) => (event: { target: { value: string } }) =>
    onChange({ ...value, [field]: event.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    const { name, email, details, website, submissionId } = value;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoff: { name, email, details, website } }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        outcome?: 'created' | 'appended';
        acknowledged?: boolean;
      };
      if (response.ok) {
        return onSent({
          kind: 'site',
          outcome: data.outcome ?? 'created',
          acknowledged: data.acknowledged === true,
        });
      }
      if (response.status === 429) {
        setProblem({ text: data.error ?? `That did not go through.`, blocked: true });
        return;
      }
      if (response.status < 500) {
        const text = data.error ?? 'Check the details and try again.';
        setProblem({ text });
        // Focus goes to the field the sentence is about.
        const field = /name/i.test(text) ? 'name' : /email/i.test(text) ? 'email' : 'details';
        fields[field].current?.focus();
        return;
      }
      throw new Error(String(response.status));
    } catch {
      // Second route: the contact form's endpoint emails the team directly.
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            subject: 'Other',
            message: details.length >= 20 ? details : `${details} (sent from the website chat)`,
            submissionId,
          }),
        });
        // Whether a confirmation went is not known by this route, so none is claimed.
        if (response.ok) return onSent({ kind: 'site', outcome: 'created', acknowledged: false });
      } catch {
        // Falls through to the address below.
      }
      setProblem({ text: 'That did not go through.', blocked: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.handoff} onSubmit={submit} data-handoff aria-labelledby="handoff-title">
      <p className={styles.handoffTitle} id="handoff-title" tabIndex={-1} ref={heading}>
        {adding ? 'Add to what you sent' : 'Send it to the team'}
      </p>
      <p className={styles.handoffText}>{replyPromise}</p>
      <label className={styles.field}>
        <span>Your name</span>
        <input
          ref={fields.name}
          value={value.name}
          onChange={set('name')}
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input
          ref={fields.email}
          type="email"
          value={value.email}
          onChange={set('email')}
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label className={styles.field}>
        <span>What do you need?</span>
        <textarea
          ref={fields.details}
          value={value.details}
          onChange={set('details')}
          required
          minLength={10}
          maxLength={5000}
          rows={4}
        />
      </label>
      {/* Hidden from people. Bots fill it in. */}
      <label className={styles.trap} aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={value.website} onChange={set('website')} />
      </label>
      <p className={styles.privacy}>
        Please do not send passwords or payment details. <Link href="/privacy">Privacy details</Link>
      </p>
      {problem && (
        <p className={styles.error} role="alert">
          {problem.blocked ? (
            <>
              That did not go through. Email <a href={`mailto:${TEAM_EMAIL}`}>{TEAM_EMAIL}</a> and we
              will pick it up.{' '}
              <button
                type="button"
                className={styles.copy}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(value.details)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
              >
                {copied ? 'Copied' : 'Copy what you wrote'}
              </button>
            </>
          ) : (
            problem.text
          )}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}

/** The portal's way to a person: a request, with the chat attached. */
function RequestForm({
  value,
  onChange,
  onSent,
}: {
  value: HandoffDraft;
  onChange: (next: HandoffDraft) => void;
  onSent: (result: HandedOff) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useFocusOnMount<HTMLParagraphElement>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoff: { details: value.details } }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        reference?: string;
        url?: string;
        error?: string;
      };
      if (response.ok && data.reference && data.url) {
        return onSent({ kind: 'portal', reference: data.reference, url: data.url });
      }
      setProblem(data.error ?? 'That did not go through.');
    } catch {
      setProblem('That did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={styles.handoff}
      onSubmit={submit}
      data-handoff
      aria-labelledby="request-title"
    >
      <p className={styles.handoffTitle} id="request-title" tabIndex={-1} ref={heading}>
        Send it to the team
      </p>
      <p className={styles.handoffText}>
        It becomes a request, with this chat attached. The team replies there.
      </p>
      <label className={styles.field}>
        <span>What do you need?</span>
        <textarea
          value={value.details}
          onChange={(event) => onChange({ ...value, details: event.target.value })}
          required
          minLength={10}
          maxLength={4000}
          rows={5}
        />
      </label>
      {problem && (
        <p className={styles.error} role="alert">
          {problem} You can also <Link href="/portal/requests">raise a request</Link> yourself.
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? 'Sending…' : 'Send to the team'}
      </button>
    </form>
  );
}
