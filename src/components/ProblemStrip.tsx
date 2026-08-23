import React from 'react';
import Link from 'next/link';
import { Topography } from './Topography';
import styles from './ProblemStrip.module.css';

const stages = [
  {
    number: '01',
    title: 'Understand',
    body: 'We get close to the workflow, the people, and the constraint before proposing a solution.',
  },
  {
    number: '02',
    title: 'Design',
    body: 'We shape the strategy, experience, brand, and system as one connected piece of work.',
  },
  {
    number: '03',
    title: 'Build',
    body: 'We ship in useful increments, using the right level of technology for the problem.',
  },
  {
    number: '04',
    title: 'Run',
    body: 'We host, support, measure, and improve what we launch. Delivery is not the finish line.',
  },
] as const;

export const ProblemStrip: React.FC = () => (
  <section className={styles.strip}>
    <Topography className={styles.topo} />
    <div className={`container ${styles.inner}`}>
      <div className={styles.intro}>
        <p className={styles.kicker}>How we work</p>
        <h2 className={styles.heading}>From uncertainty to a system that stays running.</h2>
        <p className={styles.copy}>
          Strategy, design, engineering, and support belong in the same
          conversation. Our work moves through one continuous loop, with the
          people doing the work present from the first call onward.
        </p>
        <Link href="/build" className={styles.link}>
          See how we engage <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <ol className={styles.stages}>
        {stages.map((stage) => (
          <li key={stage.number} className={styles.stage}>
            <span className={styles.number}>{stage.number}</span>
            <div>
              <h3>{stage.title}</h3>
              <p>{stage.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
