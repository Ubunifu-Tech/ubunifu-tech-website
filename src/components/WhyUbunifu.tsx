import React from 'react';
import Link from 'next/link';
import { pillars } from '@/content/pillars';
import { ScrollReveal } from './ScrollReveal';
import styles from './WhyUbunifu.module.css';

/**
 * The first thing after the hero, so it is a statement rather than a study.
 *
 * It used to be four outlined cards, each carrying an icon, a paragraph, three
 * bullets and a link. That is a great deal of reading to put immediately under a
 * dark, confident hero — the energy of the page fell off a cliff at exactly the
 * point a stranger decides whether to keep going — and it repeated the card
 * device used further down for the engagement paths.
 *
 * Now the sentence is the section. One claim, set large, stating how we work in
 * the order it happens; beneath it a thin ledger where each clause gets a single
 * checkable fact. The claim invites, the ledger proves, and neither asks anyone
 * to read a paragraph before the page has earned it.
 *
 * The detail did not disappear — it moved to where someone who wants it is
 * already going. Each column links there.
 */
export function WhyUbunifu() {
  return (
    <section className={styles.section} aria-labelledby="why-ubunifu-title">
      <div className="container">
        <ScrollReveal>
          {/* The statement is the heading. A separate "Why Ubunifu" label above
              it would be a small eyebrow saying what the sentence already says. */}
          <h2 id="why-ubunifu-title" className={styles.statement}>
            We understand locally, ship real work,{' '}
            <span className={styles.statementAccent}>use AI deliberately</span>, and stay
            accountable after launch.
          </h2>
        </ScrollReveal>

        <ul className={styles.ledger}>
          {pillars.map(({ key, title, proof, href, linkLabel }) => (
            <li key={key} className={styles.entry}>
              <span className={styles.mark} aria-hidden="true" />
              <h3 className={styles.entryTitle}>{title}</h3>
              <p className={styles.proof}>{proof}</p>
              <Link href={href} className={styles.entryLink}>
                {linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
