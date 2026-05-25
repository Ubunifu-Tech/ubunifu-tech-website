'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './Contact.module.css';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow">Contact</span>
            <h2 className={styles.heading}>Let&apos;s work together</h2>
            <p className={styles.text}>
              Have a question about our products, or interested in working with us?
              Send us a message — we respond to every inquiry.
            </p>

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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
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
                  placeholder="you@company.com"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="subject" className={styles.label}>Subject</label>
              <select
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={styles.input}
              >
                <option value="" disabled>Select a topic</option>
                <option value="Product inquiry">Product inquiry</option>
                <option value="Custom build / Consulting">Custom build / Consulting</option>
                <option value="Partnership">Partnership</option>
                <option value="Careers">Careers</option>
                <option value="Other">Other</option>
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
                placeholder="Tell us about your project or question..."
                rows={5}
                className={`${styles.input} ${styles.textarea}`}
              />
            </div>

            {status === 'success' && (
              <div className={styles.statusSuccess}>
                <CheckCircle size={18} />
                Message sent! We&apos;ll get back to you shortly.
              </div>
            )}

            {status === 'error' && (
              <div className={styles.statusError}>
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
          </motion.form>
        </div>
      </div>
    </section>
  );
};
