'use client';

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './Contact.module.css';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    submissionId.current = null;
    if (status === 'error') {
      setStatus('idle');
      setErrorMsg('');
    }
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.subject) {
      setStatus('error');
      setErrorMsg('Please choose a subject for your message.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      submissionId.current ??= createSubmissionId();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          submissionId: submissionId.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '', company_url: '' });
      submissionId.current = null;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

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
            {hideIntro ? (
              <>
                <span className="eyebrow">What happens next</span>
                <h2 className={styles.heading}>A direct conversation with the people doing the work.</h2>
                <p className={styles.text}>
                  We read every brief ourselves. If we are a useful fit, the
                  first response will focus the problem before proposing a path.
                </p>
              </>
            ) : (
              <>
                <span className="eyebrow">Contact</span>
                <h2 className={styles.heading}>Tell us what you&apos;re building</h2>
                <p className={styles.text}>
                  Trying one of our products, or starting a custom build? Write to
                  us. The team reviews enquiries directly.
                </p>
              </>
            )}

            <ol className={styles.nextSteps}>
              <li className={styles.step}>
                <span className={styles.stepNum}>01</span>
                <span className={styles.stepText}>You tell us what you need.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>02</span>
                <span className={styles.stepText}>We review the context and whether we can help.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>03</span>
                <span className={styles.stepText}>If useful, we suggest a short call. No obligation.</span>
              </li>
            </ol>

            <div className={styles.methods}>
              <div className={styles.method}>
                <div className={styles.methodIcon}><Mail size={18} /></div>
                <div>
                  <p className={styles.methodLabel}>Email</p>
                  <a href="mailto:info@ubunifutech.com" className={styles.methodLink}>
                    info@ubunifutech.com
                  </a>
                </div>
              </div>

              <div className={styles.method}>
                <div className={styles.methodIcon}><Phone size={18} /></div>
                <div>
                  <p className={styles.methodLabel}>Phone / WhatsApp</p>
                  <a href="tel:+255748548816" className={styles.methodLink}>
                    +255 748 548 816
                  </a>
                </div>
              </div>

              <div className={styles.method}>
                <div className={styles.methodIcon}><MapPin size={18} /></div>
                <div>
                  <p className={styles.methodLabel}>Location</p>
                  <span className={styles.methodText}>Arusha, Tanzania</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.form
            className={styles.form}
            onSubmit={handleSubmit}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.formHeader}>
              <span>Start with the problem</span>
              <span>Direct to the Ubunifu Technologies team</span>
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
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@company.com"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="subject" className={styles.label}>What can we help with?</label>
              <select
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={styles.input}
              >
                <option value="" disabled>Select an enquiry type</option>
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="message" className={styles.label}>Message</label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                minLength={20}
                maxLength={5000}
                placeholder="What needs to work better, and what would a useful outcome look like?"
                rows={5}
                className={`${styles.input} ${styles.textarea}`}
              />
            </div>

            {status === 'success' && (
              <div className={styles.statusSuccess} role="status" aria-live="polite">
                <CheckCircle size={18} />
                Message sent to the Ubunifu team.
              </div>
            )}

            {status === 'error' && (
              <div className={styles.statusError} role="alert">
                <AlertCircle size={18} />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className={styles.submitBtn}
            >
              {status === 'sending' ? (
                <>
                  <span className={styles.spinner} />
                  Sending...
                </>
              ) : (
                <>
                  Send message
                  <Send size={16} />
                </>
              )}
            </button>
            <p className={styles.privacyNote}>
              Please do not send passwords or sensitive records. By submitting,
              you agree that we may use this information to respond to your enquiry.{' '}
              <a href="/privacy">Privacy details</a>
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
