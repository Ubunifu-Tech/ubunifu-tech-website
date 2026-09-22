'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import styles from './Assistant.module.css';

/**
 * The assistant on the public site.
 *
 * It answers questions about what Ubunifu does and, when somebody has a real
 * need, passes the conversation to a person as an ordinary enquiry. It cannot
 * quote, cannot promise and cannot look anything up — that is enforced on the
 * server, where the tool list lives, not here.
 *
 * The thread is on the server, keyed by a cookie, so closing the panel or
 * reloading the page does not lose it.
 */

type Turn = { id: string; role: string; content: string };

const OPENER =
  'Hello. I can tell you what Ubunifu does, help you work out what you need, and pass you to somebody here when it is worth a real conversation. What brings you by?';

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // The thread is fetched only once the panel is opened, so a visitor who never
  // uses it costs nothing.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);

    fetch('/api/assistant')
      .then((response) => (response.ok ? response.json() : { messages: [] }))
      .then((data: { messages?: Turn[]; sent?: boolean }) => {
        setTurns(data.messages ?? []);
        setSent(Boolean(data.sent));
      })
      .catch(() => {
        // A failed history fetch is not worth an error message — the visitor
        // can still start a fresh conversation.
      });
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Escape closes it, which is what every other dialog on the web does.
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
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        sent?: boolean;
      };

      if (!response.ok || !data.reply) {
        setError(data.error ?? 'Something went wrong. Email info@ubunifutech.com and we will pick it up.');
        return;
      }

      setTurns((current) => [
        ...current,
        { id: `reply-${current.length}`, role: 'assistant', content: data.reply! },
      ]);
      if (data.sent) setSent(true);
    } catch {
      setError('We could not reach the assistant. Email info@ubunifutech.com and we will pick it up.');
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }, [draft, busy]);

  const shown = turns.length > 0 ? turns : [{ id: 'opener', role: 'assistant', content: OPENER }];

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        {open ? (
          <X size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
        )}
        <span className={styles.launcherLabel}>{open ? 'Close' : 'Ask us anything'}</span>
      </button>

      {open && (
        <section
          id="assistant-panel"
          className={styles.panel}
          role="dialog"
          aria-label="Ask Ubunifu"
        >
          <header className={styles.head}>
            <div>
              <p className={styles.title}>Ask Ubunifu</p>
              <p className={styles.subtitle}>
                An assistant. A person reads anything you send.
              </p>
            </div>
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
            {shown.map((turn) => (
              <p
                key={turn.id}
                className={turn.role === 'user' ? styles.fromVisitor : styles.fromUs}
              >
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

            {sent && !busy && (
              <p className={styles.sent} role="status">
                This has been passed to the team. Somebody replies within a working day.
              </p>
            )}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>

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
                // Enter sends, shift+enter makes a new line — what people
                // expect of a chat box.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="A booking site for a safari company…"
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

          <p className={styles.foot}>
            Prefer email? <a href="mailto:info@ubunifutech.com">info@ubunifutech.com</a>
          </p>
        </section>
      )}
    </>
  );
}
