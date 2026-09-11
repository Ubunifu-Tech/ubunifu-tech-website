import React from 'react';
import Link from 'next/link';
import { pillars } from '@/content/pillars';
import { ScrollReveal } from './ScrollReveal';
import styles from './WhyUbunifu.module.css';

/**
 * The operating philosophy, directly beneath the hero.
 *
 * Heading, one-sentence lead, then a card each. The lead states the four ideas
 * as one sequence — before, during, after — so the cards read as one way of
 * working rather than four unrelated merits, which is all a bare feature grid
 * would say.
 *
 * Each card carries its own evidence as points. That is the part to preserve
 * through any future restyling: this section used to make four claims and show
 * nothing behind them. The points are the proof, and each card links to where a
 * visitor can check it. They are listed openly rather than tucked behind a
 * hover, because proof that only appears on interaction is proof a phone user
 * and a skim-reader never see.
 *
 * Orange is the only accent here. The section immediately below is anchored by
 * a violet field and owns that colour; keeping this one orange is what stops the
 * top of the home page reading as one continuous wash.
 */
export function WhyUbunifu() {
  return (
    <section className={styles.section} aria-labelledby="why-ubunifu-title">
      <div className="container">
        <ScrollReveal className={styles.intro}>
          <h2 id="why-ubunifu-title" className={styles.heading}>
            Why <span className={styles.headingAccent}>Ubunifu</span>
          </h2>
          <p className={styles.lead}>
            We understand locally, ship real work, use AI deliberately, and stay accountable
            after launch.
          </p>
        </ScrollReveal>

        <ul className={styles.grid}>
          {pillars.map(({ key, icon: Icon, title, body, points, href, linkLabel }) => (
            <li key={key} className={styles.card}>
              {/* Bare mark, not a filled chip. A tinted rounded badge behind
                  every icon is the pattern this brand deliberately avoids. */}
              <span className={styles.icon} aria-hidden="true">
                <Icon size={24} strokeWidth={1.75} />
              </span>

              <h3 className={styles.title}>{title}</h3>
              <p className={styles.body}>{body}</p>

              <ul className={styles.points}>
                {points.map((point) => (
                  <li key={point} className={styles.point}>
                    {point}
                  </li>
                ))}
              </ul>

              {/* Pushed to the card's foot, so the links sit on one line across
                  the row however unevenly the copy above them falls. */}
              <Link href={href} className={styles.cardLink}>
                {linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
