'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Send, UserRound, X } from 'lucide-react';
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
 * any failure (no model, over a limit, a network error) turns the window into
 * that form instead of a dead end. The thread lives on the server, so closing
 * the panel or changing page does not lose it.
 */

type Turn = { id: string; role: string; content: string };

type Variant = 'site' | 'portal';

const COPY: Record<
  Variant,
  {
    endpoint: string;
    title: string;
    subtitle: string;
    launcher: string;
    opener: string;
    placeholder: string;
  }
> = {
  site: {
    endpoint: '/api/assistant',
    title: 'Chat with Ubunifu',
    subtitle: 'An assistant answers. A person follows up.',
    launcher: 'Chat with us',
    opener:
      'Hello. Ask me anything about what we do, or tell me what you are working on and I will pass it to the team.',
    placeholder: 'A booking site for a safari company…',
  },
  portal: {
    endpoint: '/api/portal/assistant',
    title: 'Help',
    subtitle: 'Knows your projects. The team is one tap away.',
    launcher: 'Help',
    opener:
      'Hello. Ask me about your projects, documents or invoices, or tell me what you need and I will pass it to the team.',
    placeholder: 'When is the next update due?',
  },
};

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
  const [error, setError] = useState<string | null>(null);
  const [handedOff, setHandedOff] = useState<{ reference?: string; url?: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

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
      .then((response) => (response.ok ? response.json() : { messages: [] }))
      .then((data: { messages?: Turn[]; sent?: boolean; reference?: string | null }) => {
        setTurns(data.messages ?? []);
        if (data.sent) {
          setHandedOff(
            data.reference
              ? { reference: data.reference, url: `/portal/requests/${data.reference}` }
              : {},
          );
        }
      })
      .catch(() => {
        // A failed history fetch is not worth an error: a new chat still works.
      });
  }, [open, loaded, copy.endpoint]);

  useEffect(() => {
    if (!open) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy, open, error, asking, handedOff]);

  useEffect(() => {
    if (open && !asking) input.current?.focus();
  }, [open, asking]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;

    setDraft('');
    setError(null);
    setBusy(true);
    setTurns((current) => [
      ...current,
      { id: `local-${current.length}`, role: 'user', content: message },
    ]);

    try {
      const response = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: window.location.pathname }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        sent?: boolean;
        fallback?: boolean;
      };

      if (!response.ok || !data.reply) {
        setError(data.error ?? 'The assistant is not answering right now.');
        // When the assistant itself cannot help, the next step is a person,
        // not a retry button.
        if (data.fallback || response.status >= 500) setAsking(true);
        return;
      }

      setTurns((current) => [
        ...current,
        { id: `reply-${current.length}`, role: 'assistant', content: data.reply! },
      ]);
      if (data.sent) setHandedOff({});
    } catch {
      setError('We could not reach the assistant.');
      setAsking(true);
    } finally {
      setBusy(false);
    }
  }, [draft, busy, copy.endpoint]);

  const shown = turns.length > 0 ? turns : [{ id: 'opener', role: 'assistant', content: copy.opener }];
  const theirWords = turns
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content)
    .join('\n\n');

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ''}`}
        onClick={() => setOpen((current) => !current)}
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
        <section id="assistant-panel" className={styles.panel} role="dialog" aria-label={copy.title}>
          <header className={styles.head}>
            {asking ? (
              <button
                type="button"
                className={styles.back}
                onClick={() => {
                  setAsking(false);
                  setError(null);
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
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.thread} ref={scroller}>
            {!asking &&
              shown.map((turn) => (
                <p key={turn.id} className={turn.role === 'user' ? styles.fromVisitor : styles.fromUs}>
                  {turn.content}
                </p>
              ))}

            {busy && (
              <p className={styles.typing} role="status">
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.srOnly}>Thinking</span>
              </p>
            )}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            {handedOff && !busy && (
              <p className={styles.sent} role="status">
                {variant === 'portal' && handedOff.reference && handedOff.url ? (
                  <>
                    With the team as {handedOff.reference}. They reply there.{' '}
                    <Link href={handedOff.url}>Open the request</Link>
                  </>
                ) : variant === 'portal' ? (
                  <>
                    With the team. They reply in <Link href="/portal/requests">Requests</Link>.
                  </>
                ) : (
                  'With the team. A person replies by email within a working day.'
                )}
              </p>
            )}

            {asking &&
              (variant === 'site' ? (
                <MessageForm
                  initial={theirWords}
                  onSent={() => {
                    setAsking(false);
                    setError(null);
                    setHandedOff({});
                  }}
                />
              ) : (
                <RequestForm
                  initial={theirWords}
                  onSent={(reference, url) => {
                    setAsking(false);
                    setError(null);
                    setHandedOff({ reference, url });
                  }}
                />
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
                    if (event.key === 'Enter' && !event.shiftKey) {
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

              <button type="button" className={styles.person} onClick={() => setAsking(true)}>
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

/**
 * The website's way to a person: name, email and what they need, sent with
 * the chat attached. If our own endpoint is down, it falls back to the
 * contact form's, which can email the team even without the database.
 */
function MessageForm({ initial, onSent }: { initial: string; onSent: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState(initial);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    const body = { name, email, details, website };

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoff: body }),
      });
      if (response.ok) return onSent();
      if (response.status < 500) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setProblem(data.error ?? 'Check the details and try again.');
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
            submissionId: crypto.randomUUID(),
          }),
        });
        if (response.ok) return onSent();
      } catch {
        // Falls through to the address below.
      }
      setProblem('That did not go through. Email info@ubunifutech.com and we will pick it up.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.handoff} onSubmit={submit}>
      <p className={styles.handoffTitle}>Send it to the team</p>
      <p className={styles.handoffText}>A person replies by email, usually within a working day.</p>
      <label className={styles.field}>
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" />
      </label>
      <label className={styles.field}>
        <span>What do you need?</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} required minLength={10} maxLength={5000} rows={4} />
      </label>
      {/* Hidden from people. Bots fill it in. */}
      <label className={styles.trap} aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {problem && (
        <p className={styles.error} role="alert">
          {problem}
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
  initial,
  onSent,
}: {
  initial: string;
  onSent: (reference: string, url: string) => void;
}) {
  const [details, setDetails] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoff: { details } }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        reference?: string;
        url?: string;
        error?: string;
      };
      if (response.ok && data.reference && data.url) return onSent(data.reference, data.url);
      setProblem(data.error ?? 'That did not go through.');
    } catch {
      setProblem('That did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.handoff} onSubmit={submit}>
      <p className={styles.handoffTitle}>Send it to the team</p>
      <p className={styles.handoffText}>
        It becomes a request, with this chat attached. The team replies there.
      </p>
      <label className={styles.field}>
        <span>What do you need?</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} required minLength={10} maxLength={4000} rows={5} />
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
