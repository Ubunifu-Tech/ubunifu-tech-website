'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { site } from '@/content/site';
import { ContactSubjectSelect } from './ContactSubjectSelect';
import styles from './Contact.module.css';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const REQUEST_TIMEOUT_MS = 20_000;
const SEND_FALLBACK =
  'We could not send your message. Please try again or email info@ubunifutech.com directly.';

function createSubmissionId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const SUBJECT_OPTIONS = [
  'Project enquiry',
  'Product question',
  'Hosting, domains & email',
  'Branding & design',
  'Support',
  'Partnership',
  'Careers',
  'Other',
] as const;

function validInitialSubject(subject: string | undefined): string {
  return SUBJECT_OPTIONS.includes(subject as (typeof SUBJECT_OPTIONS)[number]) ? subject ?? '' : '';
}

export const Contact: React.FC<{ hideIntro?: boolean }> = ({ hideIntro = false }) => {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    company_url: '', // honeypot - must stay empty
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const submissionId = useRef<string | null>(null);
  const subjectRef = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const subject = validInitialSubject(new URLSearchParams(window.location.search).get('subject') ?? undefined);
    if (subject) setForm((current) => current.subject ? current : { ...current, subject });
  }, []);

  const updateField = (name: string, value: string) => {
    submissionId.current = null;
    if (status !== 'idle') {
      setStatus('idle');
      setErrorMsg('');
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateField(e.target.name, e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'sending') return;

    if (!form.subject) {
      setStatus('error');
      setErrorMsg('Please choose a subject for your message.');
      subjectRef.current?.focus();
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      submissionId.current ??= createSubmissionId();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          submissionId: submissionId.current,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = SEND_FALLBACK;
        try {
          const data: unknown = await res.json();
          if (
            data &&
            typeof data === 'object' &&
            'error' in data &&
            typeof data.error === 'string'
          ) {
            message = data.error;
          }
        } catch {
          // Keep the useful fallback when an upstream error is not JSON.
        }
        throw new Error(message);
      }

      setStatus('success');
      formRef.current?.reset();
      setForm({ name: '', email: '', subject: '', message: '', company_url: '' });
      submissionId.current = null;
    } catch (err) {
      setStatus('error');
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Sending took too long. Please try again or email info@ubunifutech.com directly.');
      } else if (err instanceof Error && err.message && err.message !== 'Failed to fetch') {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(SEND_FALLBACK);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const isSending = status === 'sending';

  return (
    <section id="contact" className={`section ${styles.contact}`}>
      <div className="container">
        <div className={styles.layout}>
          {/* Left: info */}
          <motion.div
            className={styles.info}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className={styles.heading}>
              {hideIntro ? (
                <>
                  Write to <span className={styles.headingAccent}>us</span>
                </>
              ) : (
                <>
                  Tell us about your <span className={styles.headingAccent}>project</span>.
                </>
              )}
            </h2>
            {/* Says the same thing the acknowledgement email says, so the promise
                a sender reads here is the one they get back in writing. */}
            <p className={styles.text}>
              We read everything that comes in and reply to you directly. If email is slow
              for you, WhatsApp reaches us just as well.
            </p>

            {/* Values come from content/site.ts, which is the single source of
                truth for them — they used to be typed into this component. */}
            <div className={styles.methods}>
              <div className={styles.method} data-hue="brand">
                <span className={styles.methodIcon} aria-hidden="true">
                  <Mail size={18} />
                </span>
                <div>
                  <p className={styles.methodLabel}>Email</p>
                  <a href={`mailto:${site.contact.email}`} className={styles.methodLink}>
                    {site.contact.email}
                  </a>
                </div>
              </div>

              <div className={styles.method} data-hue="primary">
                <span className={styles.methodIcon} aria-hidden="true">
                  <MessageCircle size={18} />
                </span>
                <div>
                  <p className={styles.methodLabel}>WhatsApp</p>
                  <a
                    href={`https://wa.me/${site.contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.methodLink}
                  >
                    Message us
                    <span className="srOnly"> on WhatsApp (opens in a new tab)</span>
                  </a>
                </div>
              </div>

              <div className={styles.method} data-hue="accent">
                <span className={styles.methodIcon} aria-hidden="true">
                  <Phone size={18} />
                </span>
                <div>
                  <p className={styles.methodLabel}>Phone</p>
                  <a href={`tel:${site.contact.phoneTel}`} className={styles.methodLink}>
                    {site.contact.phone}
                  </a>
                </div>
              </div>

              <div className={styles.method} data-hue="ink">
                <span className={styles.methodIcon} aria-hidden="true">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className={styles.methodLabel}>Location</p>
                  <span className={styles.methodText}>{site.location}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.form
            ref={formRef}
            className={styles.form}
            onSubmit={handleSubmit}
            aria-busy={isSending}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>Your enquiry</h3>
              <p className={styles.requiredNote}>
                <span className={styles.requiredDot} aria-hidden="true" />
                All fields are required.
              </p>
            </div>

            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="company_url">Company website (leave this empty)</label>
              <input
                type="text"
                id="company_url"
                name="company_url"
                value={form.company_url}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isSending}
                  required
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  placeholder="Your name"
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isSending}
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@company.com"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label id="subject-label" htmlFor="subject" className={styles.label}>What can we help with?</label>
              <ContactSubjectSelect
                value={form.subject}
                options={SUBJECT_OPTIONS}
                onChange={(value) => updateField('subject', value)}
                buttonRef={subjectRef}
                invalid={status === 'error' && !form.subject}
                disabled={isSending}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="message" className={styles.label}>Message</label>
                <span id="message-limit" className={styles.fieldHint}>20 to 5,000 characters</span>
              </div>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                disabled={isSending}
                aria-describedby="message-limit"
                required
                minLength={20}
                maxLength={5000}
                placeholder="Tell us about your project or question."
                rows={5}
                className={`${styles.input} ${styles.textarea}`}
              />
            </div>

            {status === 'success' && (
              <div className={styles.statusSuccess} role="status" aria-live="polite">
                <CheckCircle size={18} aria-hidden="true" />
                Message sent to the Ubunifu team.
              </div>
            )}

            {status === 'error' && (
              <div id="contact-error" className={styles.statusError} role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                {errorMsg}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={isSending}
                className={styles.submitBtn}
              >
                {isSending ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send message
                    <Send size={16} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className={styles.privacyNote}>
                Please do not send passwords or sensitive records. By submitting,
                you agree that we may use this information to respond to your enquiry.{' '}
                <Link href="/privacy">Privacy details</Link>
              </p>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
