'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Topography } from './Topography';
import styles from './ProblemStrip.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

const stageVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.075 },
  },
};

const ruleVariants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.7, ease } },
};

const numberVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.42, ease } },
};

const copyVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.52, ease } },
};

const stages = [
  {
    number: '01',
    title: 'Understand',
    body: 'We get close to the workflow, the people, and the constraint before proposing a solution.',
  },
  {
    number: '02',
    title: 'Shape',
    body: 'We shape the strategy, experience, brand, and system as one connected piece of work.',
  },
  {
    number: '03',
    title: 'Build',
    body: 'We ship in useful increments, using the right level of technology for the problem.',
  },
  {
    number: '04',
    title: 'Operate',
    body: 'When ongoing support is agreed, we can host, monitor, and improve what we launch.',
  },
] as const;

export const ProblemStrip: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.strip}>
      <Topography className={styles.topo} />
      <div className={`container ${styles.inner}`}>
        <motion.div
          className={styles.intro}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.58, ease }}
        >
        <p className={styles.kicker}>How we work</p>
        <h2 className={styles.heading}>From uncertainty to a system that stays running.</h2>
        <p className={styles.copy}>
          Strategy, design, engineering, and support belong in the same
          conversation. Our work moves through one continuous loop, with the
          people doing the work present from the first call onward.
        </p>
        <Link href="/build" className={styles.link}>
          See how we engage <span aria-hidden="true">→</span>
        </Link>
        </motion.div>

        <ol className={styles.stages}>
          {stages.map((stage) => (
            <motion.li
              key={stage.number}
              className={styles.stage}
              variants={stageVariants}
              initial={reduceMotion ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.62, margin: '0px 0px -32px' }}
            >
              <motion.span className={styles.stageRule} variants={ruleVariants} aria-hidden="true" />
              <motion.span className={styles.number} variants={numberVariants}>
                {stage.number}
              </motion.span>
              <motion.div variants={copyVariants}>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
};
