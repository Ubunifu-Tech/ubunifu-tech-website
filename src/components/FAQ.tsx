'use client';

import React, { useState } from 'react';
import styles from './FAQ.module.css';

const faqs = [
  {
    q: 'What types of documents does Insight work with?',
    a: 'PDFs, Word documents (.docx), plain text, CSV, and Markdown files. Support for images and scanned documents with OCR is on the roadmap.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your documents are stored in your own workspace and are never used to train shared AI models. Each workspace is fully isolated from others.',
  },
  {
    q: 'What languages does Insight support?',
    a: 'Questions and answers work well in English and Swahili.',
  },
  {
    q: 'How does pay-as-you-go work?',
    a: 'You purchase credits in advance and use them for actions like indexing a document, asking a question, or running an extraction. There is no monthly fee — you only pay when you use the product. Credits do not expire.',
  },
  {
    q: 'Can I use Insight with my whole team?',
    a: 'Yes. You can invite colleagues to your workspace with role-based access — admin, editor, or viewer. Each workspace has its own document library.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'M-Pesa (Tanzania) and major credit/debit cards. More local payment methods are being added. Contact us if you need to pay by bank transfer.',
  },
];

export const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className={styles.section}>
      <div className="container">
        <span className="eyebrow">FAQ</span>
        <h2 className={styles.heading}>Common questions</h2>

        <div className={styles.list}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles.item}>
              <button
                className={styles.question}
                onClick={() => setOpen(open === index ? null : index)}
                aria-expanded={open === index}
              >
                <span>{faq.q}</span>
                <span className={`${styles.icon} ${open === index ? styles.iconOpen : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {open === index && (
                <p className={styles.answer}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
