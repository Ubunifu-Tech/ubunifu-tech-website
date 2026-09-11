'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { pillars } from '@/content/pillars';
import styles from './WhyUbunifu.module.css';

/** The principle shown before anyone interacts. */
const DEFAULT_KEY = pillars[0]?.key ?? '';

/**
 * The operating philosophy, directly beneath the hero.
 *
 * It is deliberately NOT four columns. Four equal cells state four unrelated
 * merits; a single sentence states one way of working, in the order it actually
 * happens — before, during, after. The hierarchy the section was missing comes
 * from that: one large statement, one small piece of proof, nothing else.
 *
 * Pointing at a clause swaps the fact that backs it. That is the whole idea —
 * the section made claims and showed no evidence, so the evidence now sits
 * beside the claim and links to somewhere the visitor can check it.
 *
 * One principle is always shown rather than waiting for a hover. Evidence that
 * only exists after an interaction is still a page that opens by making four
 * unsupported claims, and a reserved-but-empty panel reads as a broken section.
 *
 * No icons. A row of small accent glyphs is the stock-feature-grid signal this
 * section was reading as, and nothing here needs illustrating.
 *
 * No shader either. The violet field belongs to the section immediately below
 * and stays unique to it; this one is quiet white type, which is what makes the
 * two read as different rather than as one long gradient page.
 */
export function WhyUbunifu() {
  const [activeKey, setActiveKey] = useState(DEFAULT_KEY);
  const statementRef = useRef<HTMLParagraphElement>(null);

  return (
    <section className={styles.section} aria-labelledby="why-ubunifu-title">
      <div className={`container ${styles.layout}`}>
        {/* The statement below is the visible heading. This keeps the section's
            name in the document outline without printing a label above a
            sentence that already says the same thing. */}
        <h2 id="why-ubunifu-title" className="srOnly">
          Why Ubunifu
        </h2>

        <p
          ref={statementRef}
          className={styles.statement}
          /* Pointer only: returns to the resting principle when the cursor
             leaves the sentence. Keyboard focus is deliberately NOT cleared on
             blur, so a keyboard user can tab onward into the link they just
             revealed instead of watching it vanish as they reach for it — which
             is also why a stray mouse movement must not reset the panel while a
             clause still holds focus. */
          onMouseLeave={() => {
            if (statementRef.current?.contains(document.activeElement)) return;
            setActiveKey(DEFAULT_KEY);
          }}
        >
          We{' '}
          {pillars.map((pillar, i) => (
            <React.Fragment key={pillar.key}>
              {/* A span carrying button semantics, not a <button>. Browsers
                  coerce a button back to inline-block, which makes a long
                  clause one atomic box the width of the column: the sentence
                  can then only break between clauses, and trailing punctuation
                  is pushed onto a line of its own. This has to wrap as running
                  text, so it is an inline element with the button role and the
                  keyboard behaviour written out. */}
              <span
                role="button"
                tabIndex={0}
                className={`${styles.clause} ${activeKey === pillar.key ? styles.clauseActive : ''}`}
                aria-expanded={activeKey === pillar.key}
                aria-controls="why-ubunifu-proof"
                onMouseEnter={() => setActiveKey(pillar.key)}
                onFocus={() => setActiveKey(pillar.key)}
                onClick={() => setActiveKey(pillar.key)}
                onKeyDown={(event) => {
                  // A real button answers to both; the role promises the same.
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  setActiveKey(pillar.key);
                }}
              >
                {pillar.clause}
              </span>
              {i === pillars.length - 1 ? '.' : i === pillars.length - 2 ? ', and ' : ', '}
            </React.Fragment>
          ))}
        </p>

        {/* Every proof is stacked in one grid cell, so the tallest one sets the
            height once and revealing a shorter one cannot reflow the page. This
            section sits high on the home page; a hover that shifts everything
            below it would be worse than no hover at all. */}
        <div className={styles.proof} id="why-ubunifu-proof" aria-live="polite">
          <ul className={styles.proofList}>
            {pillars.map((pillar) => (
              <li
                key={pillar.key}
                className={`${styles.proofItem} ${activeKey === pillar.key ? styles.proofItemActive : ''}`}
              >
                {/* Carries the proof on touch, where there is no sentence
                    highlight to say which principle this belongs to. */}
                <p className={styles.proofClause}>{pillar.clause}</p>
                <p className={styles.proofBody}>{pillar.body}</p>
                <p className={styles.proofEvidence}>{pillar.evidence}</p>
                <Link href={pillar.href} className={styles.proofLink}>
                  {pillar.linkLabel} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
